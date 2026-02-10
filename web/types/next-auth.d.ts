import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"
import { UserRole } from "./types"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            role: UserRole
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: UserRole
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        id: string
        role: UserRole
    }
}
