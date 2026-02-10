'use client';

import { Heart, Users, Truck, Target, Leaf, Globe } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero */}
            <section className="relative py-20 px-6 text-center bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">About OptiMeal</h1>
                    <p className="text-lg text-emerald-100">
                        We connect surplus food with people who need it most, reducing waste and fighting hunger through smart logistics.
                    </p>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">
                {/* Mission */}
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Target className="text-emerald-600" size={24} /> Our Mission
                    </h2>
                    <p className="text-slate-600 leading-relaxed">
                        OptiMeal is a food rescue logistics platform that bridges the gap between food donors — restaurants, bakeries, grocery stores — and communities in need. We use route optimization technology to ensure volunteers can pick up and deliver surplus food efficiently, minimizing waste and maximizing impact.
                    </p>
                </section>

                {/* How it Works */}
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: Heart, title: 'Donors List Food', desc: 'Restaurants and stores list surplus food with pickup details and location.' },
                            { icon: Truck, title: 'Volunteers Deliver', desc: 'Nearby volunteers claim deliveries with AI-optimized routes.' },
                            { icon: Users, title: 'Charities Receive', desc: 'Charitable organizations receive fresh food for those who need it.' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
                                <item.icon className="mx-auto mb-3 text-emerald-600" size={32} />
                                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Values */}
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Our Values</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { icon: Leaf, title: 'Sustainability', desc: 'Every meal rescued is waste prevented and a step towards a greener planet.' },
                            { icon: Globe, title: 'Community', desc: 'We believe in building local networks of care powered by everyday people.' },
                            { icon: Heart, title: 'Compassion', desc: 'No one should go hungry when there is food to spare.' },
                            { icon: Target, title: 'Efficiency', desc: 'Smart route planning means more food delivered with less effort.' },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 items-start p-4 bg-slate-50 rounded-lg">
                                <item.icon className="text-emerald-600 mt-1 flex-shrink-0" size={20} />
                                <div>
                                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                                    <p className="text-sm text-slate-500">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
