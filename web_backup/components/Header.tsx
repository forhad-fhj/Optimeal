'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useAuthSync } from '../lib/hooks/useAuthSync';

export default function Header() {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Activate sync
    useAuthSync();

    const isActive = (path: string) => pathname === path ? 'text-green-600 font-bold' : 'text-gray-600 hover:text-green-600';

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container flex h-16 items-center justify-between mx-auto px-4">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-3xl font-extrabold tracking-tight text-green-700">OptiMeal</span>
                    </Link>
                    <nav className="hidden md:flex gap-6">
                        <Link href="/donor" className={`text-sm font-medium transition-colors ${isActive('/donor')}`}>
                            Donor
                        </Link>
                        <Link href="/volunteer" className={`text-sm font-medium transition-colors ${isActive('/volunteer')}`}>
                            Volunteer
                        </Link>
                        <Link href="/charity" className={`text-sm font-medium transition-colors ${isActive('/charity')}`}>
                            Charity
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {session ? (
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-700 hidden sm:block">
                                {session.user?.image && (
                                    <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full inline-block mr-2" />
                                )}
                                {session.user?.name}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                                localStorage.removeItem('optimeal_user_id');
                                signOut();
                            }}>
                                Sign Out
                            </Button>
                        </div>
                    ) : (
                        <Button size="sm" onClick={() => signIn('google')}>
                            Login with Google
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
