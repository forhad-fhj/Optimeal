'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";
import { PlatformAnalytics } from "@/types";
import ImpactCard, { FoodSavedCard, CO2ReducedCard, MealsRescuedCard } from "@/components/ImpactCard";
import { signIn } from "next-auth/react";
import { ArrowRight, Star, Quote } from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    analyticsApi.getPlatform()
      .then(data => setStats(data as PlatformAnalytics))
      .catch(err => console.error("Failed to fetch stats", err));
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans">

      {/* HERO SECTION */}
      <section className="relative py-24 lg:py-36 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-50 via-slate-50 to-white">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-green-100/50 border border-green-200 text-green-700 font-medium text-sm animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Revolutionizing Food Rescue
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1] animate-fade-in-up animation-delay-2000">
            Rescue <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-500">Surplus Food.</span><br />
            Feed <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Local Communities.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-2000">
            OptiMeal connects restaurants with surplus food to volunteer drivers and charities instantly.
            Join the movement to end hunger and waste.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-4000">
            <Button
              size="lg"
              className="group text-lg px-8 py-6 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 hover:shadow-2xl hover:shadow-emerald-600/30 transition-all duration-300"
              onClick={() => signIn('google', { callbackUrl: '/volunteer' })}
            >
              Get Started as Volunteer
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 rounded-full border-slate-200 hover:border-emerald-600 hover:text-emerald-600 bg-white shadow-sm hover:shadow-lg transition-all duration-300"
              onClick={() => signIn('google', { callbackUrl: '/donor' })}
            >
              Partner as Donor
            </Button>
          </div>

          <p className="mt-8 text-sm text-slate-400 animate-fade-in-up animation-delay-4000">
            No credit card | instant setup | 501(c)(3) compliant
          </p>
        </div>

        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-300/10 blur-[100px] animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-200/10 blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-blue-200/10 blur-[100px] animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* TRUST SIGNALS */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-8">Trusted by Community Leaders</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholder Logos */}
            <div className="flex items-center gap-2 text-xl font-bold text-slate-600"><span className="text-2xl">🏪</span> FreshMarket</div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-600"><span className="text-2xl">🥐</span> DailyBread</div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-600"><span className="text-2xl">🥗</span> GreenEats</div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-600"><span className="text-2xl">🏫</span> CityShelter</div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-600"><span className="text-2xl">🍲</span> SoupKitchen</div>
          </div>
        </div>
      </section>

      {/* PLATFORM STATS */}
      <section className="py-24 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Our Real-time Impact</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">Every donation counts. See how our community is making a measurable difference in fighting hunger.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <MealsRescuedCard value={stats?.total_meals_rescued ?? 0} />
            <FoodSavedCard value={stats?.total_kg_saved ?? 0} />
            <CO2ReducedCard value={stats?.total_co2_reduced_kg ?? 0} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How OptiMeal Works</h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">
              Our Just-In-Time logistics engine ensures food is rescued and delivered safety and efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative max-w-6xl mx-auto z-10">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-emerald-200 via-amber-200 to-emerald-200 -z-10"></div>

            {/* Step 1 */}
            <div className="group relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                🥦
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">1. Donors Post</h3>
              <p className="text-slate-600 leading-relaxed">
                Restaurants & grocers list surplus food in seconds. Our system verifies safety and eligibility automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-inner">
                🚗
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">2. Volunteers Rescue</h3>
              <p className="text-slate-600 leading-relaxed">
                Nearby drivers get notified instantly using our smart routing engine for the fastest pickup path.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center">
              <div className="w-24 h-24 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                🏠
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">3. Charities Receive</h3>
              <p className="text-slate-600 leading-relaxed">
                Food arrives at local shelters and food banks. Digital confirmation ensures complete chain of custody for safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Community Voices</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Hear from the people powering the movement.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { quote: "OptiMeal made it incredibly easy for our bakery to donate surplus. No more wasted bread!", author: "Sarah J.", role: "Bakery Owner", bg: "bg-emerald-50" },
              { quote: "Driving for OptiMeal is my favorite way to give back. The app makes the routes so simple.", author: "Mike T.", role: "Volunteer Driver", bg: "bg-blue-50" },
              { quote: "The reliability of food deliveries has transformed how we serve our shelter guests.", author: "Elena R.", role: "Shelter Manager", bg: "bg-amber-50" }
            ].map((item, i) => (
              <div key={i} className={`p-8 rounded-3xl border border-slate-100 bg-white hover:shadow-lg transition-shadow relative overflow-hidden`}>
                <Quote className="absolute top-6 right-6 text-slate-100 w-12 h-12" />
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-700 mb-6 italic relative z-10">"{item.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-600 ${item.bg}`}>{item.author[0]}</div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.author}</p>
                    <p className="text-slate-500 text-xs">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES BY ROLE */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">

            {/* Donor Card */}
            <div className="p-8 rounded-3xl border border-slate-200 bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 group">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🍽️</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Donors</h3>
              <ul className="space-y-3 mb-8 text-slate-600">
                <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Tax deductible receipts</li>
                <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Reduce waste disposal costs</li>
                <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Real-time impact tracking</li>
              </ul>
              <Link href="/donor">
                <Button className="w-full bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-xl">
                  Donor Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Volunteer Card */}
            <div className="p-8 rounded-3xl border border-slate-200 bg-white hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 group">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🚗</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Volunteers</h3>
              <ul className="space-y-3 mb-8 text-slate-600">
                <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Flexible schedule</li>
                <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Optimized route navigation</li>
                <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Earn community service hours</li>
              </ul>
              <Link href="/volunteer">
                <Button className="w-full bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-xl">
                  Volunteer Map <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Charity Card */}
            <div className="p-8 rounded-3xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">❤️</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">For Charities</h3>
              <ul className="space-y-3 mb-8 text-slate-600">
                <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Reliable food sourcing</li>
                <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Advance delivery notifications</li>
                <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Digital inventory management</li>
              </ul>
              <Link href="/charity">
                <Button className="w-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-xl">
                  Charity Hub <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-emerald-900 text-white overflow-hidden relative">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Ready to make a difference?</h2>
          <p className="text-emerald-100 mb-10 max-w-2xl mx-auto text-xl leading-relaxed">
            Join thousands of others in the OptiMeal community. Whether you have food to give,
            time to share, or neighbors to feed.
          </p>
          <Button
            size="lg"
            className="text-lg px-10 py-8 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-full shadow-2xl hover:scale-105 transition-transform"
            onClick={() => signIn('google')}
          >
            Create Free Account
          </Button>
        </div>

        {/* Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[128px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute left-0 bottom-0 w-[500px] h-[500px] bg-amber-500 rounded-full blur-[128px] opacity-20 -translate-x-1/2 translate-y-1/2"></div>
        </div>
      </section>

    </div>
  );
}
