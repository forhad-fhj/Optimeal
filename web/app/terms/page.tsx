'use client';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
                <p className="text-sm text-slate-500 mb-8">Last updated: February 2026</p>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 space-y-6 text-slate-600 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Acceptance of Terms</h2>
                        <p>By using OptiMeal, you agree to these terms of service. OptiMeal is a food rescue platform that connects donors, volunteers, and charitable organizations.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">2. User Accounts</h2>
                        <p>Each account is assigned a single role (donor, volunteer, or charity). You are responsible for maintaining the security of your account and all activities under it.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Food Safety</h2>
                        <p>Donors are responsible for ensuring that donated food is safe for consumption. Volunteers must handle food according to safety guidelines and deliver within the specified pickup window.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Liability</h2>
                        <p>OptiMeal acts as a platform to connect parties. We are not responsible for the quality or safety of donated food items. Users participate at their own risk.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Modifications</h2>
                        <p>We reserve the right to update these terms at any time. Continued use of the platform constitutes acceptance of updated terms.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
