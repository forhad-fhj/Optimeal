import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { postData } from '../api';
import { User } from '../../types';

export function useAuthSync() {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const syncUser = async () => {
            if (session?.user?.email) {
                try {
                    const user = await postData<User>('/api/auth/sync', {
                        email: session.user.email,
                        name: session.user.name || 'Unknown',
                        image_url: session.user.image,
                        provider_id: 'google', // Simplification
                        provider: 'google'
                    });

                    localStorage.setItem('optimeal_user_id', user.id);
                    console.log('User synced:', user);

                    // Onboarding Check
                    // If phone is missing, force onboarding
                    // Skip if already on the onboarding page to avoid loops
                    if (!user.phone && pathname !== '/onboarding') {
                        router.push('/onboarding');
                    }
                } catch (error) {
                    console.error('Failed to sync user:', error);
                }
            }
        };

        syncUser();
    }, [session, pathname, router]);
}
