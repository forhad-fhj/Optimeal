'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";
import { PlatformAnalytics } from "@/types";
import ImpactCard, { FoodSavedCard, CO2ReducedCard, MealsRescuedCard } from "@/components/ImpactCard";
import { signIn } from "next-auth/react";

export default function Home() {
  const [stats, setStats] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    analyticsApi.getPlatform()
      .then(data => setStats(data as PlatformAnalytics))
      .catch(err => console.error("Failed to fetch stats", err));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">

      {/* HERO SECTION */}
      <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-br from-green-50 via-white to-amber-50">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-green-100 text-green-700 font-medium text-sm animate-fade-in-up">
            🌱 Revolutionizing Food Rescue
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight">
            Rescue <span className="text-green-600">Surplus Food.</span><br />
            Feed <span className="text-amber-500">Local Communities.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            OptiMeal connects restaurants with surplus food to volunteer drivers and charities instantly.
            Join the movement to end hunger and waste.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 rounded-xl bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all"
              onClick={() => signIn('google', { callbackUrl: '/volunteer' })}
            >
              Get Started as Volunteer
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 rounded-xl border-2 border-gray-200 hover:border-green-600 hover:text-green-600 bg-white"
              onClick={() => signIn('google', { callbackUrl: '/donor' })}
            >
              Partner as Donor
            </Button>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Sign in with Google to create your account instantly. No credit card required.
          </p>
        </div>

        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-green-200/20 blur-3xl animate-blob"></div>
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-amber-200/20 blur-3xl animate-blob animation-delay-2000"></div>
        </div>
      </section>

      {/* PLATFORM STATS */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Our Real-time Impact</h2>
            <p className="text-gray-500 mt-2">Together we are making a measurable difference.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <MealsRescuedCard value={stats?.total_meals_rescued ?? 0} />
            <FoodSavedCard value={stats?.total_kg_saved ?? 0} />
            <CO2ReducedCard value={stats?.total_co2_reduced_kg ?? 0} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How OptiMeal Works</h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
              Our Just-In-Time logistics engine ensures food is rescued and delivered within its safety window.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative max-w-6xl mx-auto">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-green-200 via-amber-200 to-green-200 -z-10"></div>

            {/* Step 1 */}
            <div className="relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all text-center group">
              <div className="w-24 h-24 mx-auto bg-green-50 rounded-full flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                🥦
              </div>
              <h3 className="text-xl font-bold mb-3">1. Donors Post</h3>
              <p className="text-gray-600">
                Restaurants & grocers list surplus food in seconds. Our system verifies safety and eligibility automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all text-center group">
              <div className="w-24 h-24 mx-auto bg-amber-50 rounded-full flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                🚗
              </div>
              <h3 className="text-xl font-bold mb-3">2. Volunteers Rescue</h3>
              <p className="text-gray-600">
                Nearby drivers get notified. Smart routing optimizes their path for quick pickup and delivery.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all text-center group">
              <div className="w-24 h-24 mx-auto bg-blue-50 rounded-full flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                🏠
              </div>
              <h3 className="text-xl font-bold mb-3">3. Charities Receive</h3>
              <p className="text-gray-600">
                Food arrives at local shelters and food banks. Digital confirmation ensures chain of custody.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES BY ROLE */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">

            {/* Donor Card */}
            <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="text-3xl mb-4">🍽️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Donors</h3>
              <ul className="space-y-3 mb-8 text-gray-600">
                <li className="flex items-center gap-2">✓ Tax deductible receipts</li>
                <li className="flex items-center gap-2">✓ Reduce waste disposal costs</li>
                <li className="flex items-center gap-2">✓ Real-time impact tracking</li>
              </ul>
              <Link href="/donor">
                <Button className="w-full bg-white text-green-700 border border-green-200 hover:bg-green-50">
                  Donor Dashboard &rarr;
                </Button>
              </Link>
            </div>

            {/* Volunteer Card */}
            <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="text-3xl mb-4">🚗</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Volunteers</h3>
              <ul className="space-y-3 mb-8 text-gray-600">
                <li className="flex items-center gap-2">✓ Flexible schedule</li>
                <li className="flex items-center gap-2">✓ Optimized route navigation</li>
                <li className="flex items-center gap-2">✓ Earn community service hours</li>
              </ul>
              <Link href="/volunteer">
                <Button className="w-full bg-white text-amber-700 border border-amber-200 hover:bg-amber-50">
                  Volunteer Map &rarr;
                </Button>
              </Link>
            </div>

            {/* Charity Card */}
            <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="text-3xl mb-4">❤️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Charities</h3>
              <ul className="space-y-3 mb-8 text-gray-600">
                <li className="flex items-center gap-2">✓ Reliable food sourcing</li>
                <li className="flex items-center gap-2">✓ Advance delivery notifications</li>
                <li className="flex items-center gap-2">✓ Digital inventory management</li>
              </ul>
              <Link href="/charity">
                <Button className="w-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-50">
                  Charity Hub &rarr;
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-green-900 text-white overflow-hidden relative">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6">Ready to make a difference?</h2>
          <p className="text-green-100 mb-10 max-w-2xl mx-auto text-lg">
            Join thousands of others in the OptiMeal community. Whether you have food to give,
            time to share, or neighbors to feed — there is a place for you here.
          </p>
          <Button
            size="lg"
            className="text-lg px-10 py-6 bg-white text-green-900 hover:bg-green-50 font-bold rounded-xl shadow-2xl skew-x-[-2deg] hover:skew-x-0 transition-transform"
            onClick={() => signIn('google')}
          >
            Create Free Account
          </Button>
        </div>

        {/* Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute left-0 bottom-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
        </div>
      </section>

    </div>
  );
}
