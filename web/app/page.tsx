import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-20">
      <section className="text-center space-y-6 max-w-3xl">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          Rescue Food. <span className="text-green-600">Feed People.</span>
        </h1>
        <p className="text-xl text-gray-600">
          OptiMeal connects restaurants with surplus food to volunteer drivers and local charities instantly.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/volunteer">
            <Button size="lg" className="text-lg px-8">Join as Volunteer</Button>
          </Link>
          <Link href="/donor">
            <Button variant="outline" size="lg" className="text-lg px-8">Start Donating</Button>
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-bold mb-4">🍽️ For Donors</h2>
          <p className="text-gray-600 mb-4">Post surplus food listings in seconds. Set pickup windows and track rescue status.</p>
          <Link href="/donor"><Button variant="link">Donor Dashboard &rarr;</Button></Link>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-bold mb-4">🚗 For Volunteers</h2>
          <p className="text-gray-600 mb-4">Find nearby pickups. Get optimized routes to collect and deliver food efficiently.</p>
          <Link href="/volunteer"><Button variant="link">Volunteer Map &rarr;</Button></Link>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-bold mb-4">🏠 For Charities</h2>
          <p className="text-gray-600 mb-4">Receive notifications of incoming food and confirm deliveries digitally.</p>
          <Link href="/charity"><Button variant="link">Charity Hub &rarr;</Button></Link>
        </div>
      </div>
    </div>
  );
}
