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
                        <Link href="/admin" className={`text-sm font-medium transition-colors ${isActive('/admin')}`}>
                            Admin
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {session ? (
                        <Link href="/profile" className="flex items-center gap-2 hover:bg-gray-100 p-2 rounded-full transition-colors">
                            {session.user?.image ? (
                                <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full" />
                            ) : (
                                <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                                    {session.user?.name?.[0]}
                                </div>
                            )}
                            <span className="font-medium text-sm hidden sm:block">{session.user?.name}</span>
                        </Link>

                    ) : (
                        <Button size="sm" onClick={() => signIn('google')}>
                            Login with Google
                        </Button>
                    )}
                </div>
            </div>
        </header >
    );
}
