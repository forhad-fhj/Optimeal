'use client';

export default function CookiesPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Cookie Policy</h1>
                <p className="text-sm text-slate-500 mb-8">Last updated: February 2026</p>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 space-y-6 text-slate-600 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">1. What Are Cookies</h2>
                        <p>Cookies are small text files stored on your device when you visit a website. They help us provide a better user experience by remembering your preferences and session state.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">2. How We Use Cookies</h2>
                        <p>OptiMeal uses cookies for authentication (keeping you signed in), storing your user preferences, and basic analytics to improve our platform.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Essential Cookies</h2>
                        <p>These cookies are required for the platform to function correctly. They include session cookies for authentication and CSRF protection tokens.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Managing Cookies</h2>
                        <p>You can control cookies through your browser settings. Note that disabling essential cookies may prevent you from using certain features of OptiMeal.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
