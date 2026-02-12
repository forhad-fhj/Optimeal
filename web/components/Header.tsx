'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useAuthSync } from '../lib/hooks/useAuthSync';
import { Menu, X, LogOut, Settings, User } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Activate sync
    useAuthSync();

    // Warm up API on mount (prevents Render cold start delay)
    useEffect(() => {
        fetch('/api/v1/listings?page=1&page_size=1').catch(() => { });
    }, []);

    const isActive = (path: string) => pathname === path
        ? 'text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full'
        : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50 px-3 py-1 rounded-full transition-all';

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo & Desktop Nav */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-emerald-700 transition-colors">
                            O
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">OptiMeal</span>
                    </Link>

                    {/* Desktop Navigation — role-based */}
                    <nav className="hidden md:flex gap-2">
                        {(!session?.user?.role || session.user.role === 'donor') && (
                            <Link href="/donor" className={isActive('/donor')}>Donor</Link>
                        )}
                        {(!session?.user?.role || session.user.role === 'volunteer') && (
                            <Link href="/volunteer" className={isActive('/volunteer')}>Volunteer</Link>
                        )}
                        {(!session?.user?.role || session.user.role === 'charity') && (
                            <Link href="/charity" className={isActive('/charity')}>Charity</Link>
                        )}
                        {session?.user?.role === 'admin' && (
                            <Link href="/admin" className={isActive('/admin')}>Admin</Link>
                        )}
                    </nav>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    {session ? (
                        <div className="flex items-center gap-2">
                            <Link href="/profile" className="hidden sm:flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-3 rounded-full border border-transparent hover:border-slate-200 transition-all">
                                {session.user?.image ? (
                                    <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                                        {session.user?.name?.[0] || 'U'}
                                    </div>
                                )}
                                <div className="text-xs text-left">
                                    <p className="font-semibold text-slate-700 leading-tight">{session.user?.name?.split(' ')[0]}</p>
                                    <p className="text-slate-400">View Profile</p>
                                </div>
                            </Link>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('optimeal_user_id');
                                    signOut({ callbackUrl: '/' });
                                }}
                                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-full border border-slate-200 hover:border-red-200 transition-all"
                                title="Sign Out"
                            >
                                <LogOut size={14} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    ) : (
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all rounded-full px-6"
                            onClick={() => signIn('google')}
                        >
                            Sign In
                        </Button>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-slate-100 bg-white p-4 space-y-2 absolute w-full shadow-lg">
                    {(!session?.user?.role || session.user.role === 'donor') && (
                        <Link href="/donor" className="block p-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium" onClick={() => setIsMenuOpen(false)}>Donor Dashboard</Link>
                    )}
                    {(!session?.user?.role || session.user.role === 'volunteer') && (
                        <Link href="/volunteer" className="block p-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium" onClick={() => setIsMenuOpen(false)}>Volunteer Map</Link>
                    )}
                    {(!session?.user?.role || session.user.role === 'charity') && (
                        <Link href="/charity" className="block p-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium" onClick={() => setIsMenuOpen(false)}>Charity Hub</Link>
                    )}
                    {session?.user?.role === 'admin' && (
                        <Link href="/admin" className="block p-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium" onClick={() => setIsMenuOpen(false)}>Admin Dashboard</Link>
                    )}
                    <div className="pt-2 border-t border-slate-100">
                        {session ? (
                            <>
                                <Link href="/profile" className="block p-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('optimeal_user_id');
                                        signOut({ callbackUrl: '/' });
                                    }}
                                    className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-red-50 text-red-600 font-medium transition-colors"
                                >
                                    <LogOut size={16} />
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <button className="w-full text-left p-3 text-emerald-600 font-semibold" onClick={() => signIn('google')}>Sign In</button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
