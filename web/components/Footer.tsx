export default function Footer() {
    return (
        <footer className="border-t bg-gray-50 mt-auto">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">OptiMeal</h3>
                        <p className="text-sm text-gray-500">
                            Connecting surplus food with those in need through optimized rescue logistics.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Platform</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><a href="/donor" className="hover:text-green-600">Donate Food</a></li>
                            <li><a href="/volunteer" className="hover:text-green-600">Volunteer</a></li>
                            <li><a href="/charity" className="hover:text-green-600">Charity Access</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Contact</h4>
                        <p className="text-sm text-gray-500">
                            support@optimeal.org<br />
                            +1 (555) 123-4567
                        </p>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} OptiMeal. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
