import { Award, Star, TrendingUp, ShieldCheck, Heart } from 'lucide-react';
import { User } from '@/types';

interface BadgeProps {
    user: User;
}

export default function GamificationBadges({ user }: BadgeProps) {
    // Logic to determine earned badges
    const badges = [
        {
            id: 'early_adopter',
            name: 'Early Adopter',
            description: 'Joined in the early days',
            icon: Star,
            color: 'text-yellow-500 bg-yellow-50',
            earned: true // Everyone gets this for now as it's beta
        },
        {
            id: 'reliable',
            name: 'Reliable Hero',
            description: 'Maintained 90%+ reliability',
            icon: ShieldCheck,
            color: 'text-blue-500 bg-blue-50',
            earned: (user.reliability_score || 0) >= 90
        },
        {
            id: 'power_giver',
            name: 'Power Giver',
            description: 'Donated/Delivered 10+ times',
            icon: Heart,
            color: 'text-rose-500 bg-rose-50',
            earned: (user.total_donations || 0) + (user.total_deliveries || 0) >= 10
        },
        {
            id: 'eco_warrior',
            name: 'Eco Warrior',
            description: 'Part of the sustainability movement',
            icon: TrendingUp,
            color: 'text-emerald-500 bg-emerald-50',
            earned: ((user.total_deliveries || 0) * 5) > 50 // Rough calc: 5kg per delivery * 10 = 50kg
        },
        {
            id: 'master',
            name: 'Optimeal Master',
            description: 'Completed 50+ total activities',
            icon: Award,
            color: 'text-purple-500 bg-purple-50',
            earned: (user.total_donations || 0) + (user.total_deliveries || 0) >= 50
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Award className="text-emerald-600" size={20} />
                Achievements
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {badges.map(badge => (
                    <div
                        key={badge.id}
                        className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${badge.earned
                                ? `${badge.color} border-slate-200 shadow-sm`
                                : 'bg-slate-50 border-slate-100 opacity-50 grayscale'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${badge.earned ? 'bg-white shadow-sm' : 'bg-slate-200'}`}>
                            <badge.icon size={24} />
                        </div>
                        <p className="font-bold text-sm text-slate-900 mb-1">{badge.name}</p>
                        <p className="text-xs text-slate-500 leading-tight">{badge.description}</p>
                        {!badge.earned && <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">Locked</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
