import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { authApi } from "@/lib/api";
import { User, UserRole } from "@/types";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET || "secret",
    callbacks: {
        async jwt({ token, user, account, trigger, session }) {
            if (user && account) {
                try {
                    // Sync user with backend on sign in
                    const syncedUser = await authApi.sync({
                        email: user.email!,
                        name: user.name!,
                        image_url: user.image || undefined,
                        provider: account.provider,
                        provider_id: account.providerAccountId
                    }) as User;

                    // Add backend user info to token
                    token.id = syncedUser.id;
                    token.role = syncedUser.role;
                } catch (error) {
                    console.error("Error syncing user:", error);
                }
            }

            // Handle client-side session updates (e.g. after onboarding)
            if (trigger === "update" && session?.user) {
                token.role = session.user.role;
                if (session.user.id) token.id = session.user.id;
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
            }
            return session;
        }
    },
});

export { handler as GET, handler as POST };
