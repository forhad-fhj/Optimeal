import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { postData } from '../api';

export function useAuthSync() {
    const { data: session } = useSession();

    useEffect(() => {
        const syncUser = async () => {
            if (session?.user?.email) {
                try {
                    const user = await postData('/api/auth/sync', {
                        email: session.user.email,
                        name: session.user.name || 'Unknown',
                        image_url: session.user.image,
                        provider_id: 'google', // Simplification
                        provider: 'google'
                    });

                    localStorage.setItem('optimeal_user_id', user.id);
                    console.log('User synced:', user);
                } catch (error) {
                    console.error('Failed to sync user:', error);
                }
            }
        };

        syncUser();
    }, [session]);
}
