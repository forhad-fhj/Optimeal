'use client';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
                <p className="text-sm text-slate-500 mb-8">Last updated: February 2026</p>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 space-y-6 text-slate-600 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Information We Collect</h2>
                        <p>We collect information you provide directly, including your name, email address, phone number, and location data when using our food rescue services. We use Google OAuth for authentication and do not store your password.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">2. How We Use Your Information</h2>
                        <p>Your information is used to facilitate food donations, coordinate deliveries, match volunteers with nearby pickups, and improve our platform. Location data is used solely for route optimization and finding nearby food listings.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Data Sharing</h2>
                        <p>We do not sell your personal data. Limited information (name, pickup location) is shared between donors and volunteers only to facilitate food rescue deliveries.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Data Security</h2>
                        <p>We implement industry-standard security measures to protect your information, including encrypted connections and secure database storage.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Contact Us</h2>
                        <p>If you have questions about this privacy policy, please contact us at <span className="text-emerald-600 font-medium">support@optimeal.app</span>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
