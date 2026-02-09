import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-200 mt-auto">
            {/* Main Content */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white mb-2">OptiMeal</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Connecting surplus food with those in need through optimized rescue logistics.
                            Join us in fighting hunger and reducing waste.
                        </p>
                        <div className="flex space-x-4 pt-2">
                            <a href="#" className="hover:text-emerald-400 transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="hover:text-emerald-400 transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="hover:text-emerald-400 transition-colors"><Instagram size={20} /></a>
                            <a href="#" className="hover:text-emerald-400 transition-colors"><Linkedin size={20} /></a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/donor" className="hover:text-emerald-400 transition-colors">Donate Food</Link></li>
                            <li><Link href="/volunteer" className="hover:text-emerald-400 transition-colors">Volunteer</Link></li>
                            <li><Link href="/charity" className="hover:text-emerald-400 transition-colors">Charity Access</Link></li>
                            <li><Link href="/About" className="hover:text-emerald-400 transition-colors">About Us</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                            <li><Link href="/cookies" className="hover:text-emerald-400 transition-colors">Cookie Policy</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">Contact Us</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start space-x-3">
                                <Mail size={18} className="mt-0.5 text-emerald-500" />
                                <span>support@optimeal.org</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <Phone size={18} className="mt-0.5 text-emerald-500" />
                                <span>+1 (555) 123-4567</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <MapPin size={18} className="mt-0.5 text-emerald-500" />
                                <span>123 Green Street, Tech City, TC 90210</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-800 bg-slate-950">
                <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
                    <p>© {new Date().getFullYear()} OptiMeal. All rights reserved.</p>
                    <div className="mt-2 md:mt-0 flex space-x-6">
                        <span className="flex items-center space-x-2">
                            Designed for Impact 🌍
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
