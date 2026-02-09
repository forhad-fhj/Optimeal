'use client';

interface ImpactCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    colorScheme?: 'green' | 'amber' | 'blue' | 'purple' | 'rose';
    size?: 'sm' | 'md' | 'lg';
}

const COLOR_SCHEMES = {
    green: {
        bg: 'bg-gradient-to-br from-green-50 to-emerald-100',
        iconBg: 'bg-green-100',
        text: 'text-green-700',
        trend: 'text-green-600',
    },
    amber: {
        bg: 'bg-gradient-to-br from-amber-50 to-orange-100',
        iconBg: 'bg-amber-100',
        text: 'text-amber-700',
        trend: 'text-amber-600',
    },
    blue: {
        bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
        iconBg: 'bg-blue-100',
        text: 'text-blue-700',
        trend: 'text-blue-600',
    },
    purple: {
        bg: 'bg-gradient-to-br from-purple-50 to-violet-100',
        iconBg: 'bg-purple-100',
        text: 'text-purple-700',
        trend: 'text-purple-600',
    },
    rose: {
        bg: 'bg-gradient-to-br from-rose-50 to-pink-100',
        iconBg: 'bg-rose-100',
        text: 'text-rose-700',
        trend: 'text-rose-600',
    },
};

const SIZE_CLASSES = {
    sm: {
        card: 'p-4',
        icon: 'w-10 h-10 text-xl',
        value: 'text-2xl',
        title: 'text-xs',
    },
    md: {
        card: 'p-5',
        icon: 'w-12 h-12 text-2xl',
        value: 'text-3xl',
        title: 'text-sm',
    },
    lg: {
        card: 'p-6',
        icon: 'w-14 h-14 text-3xl',
        value: 'text-4xl',
        title: 'text-base',
    },
};

export default function ImpactCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    colorScheme = 'green',
    size = 'md',
}: ImpactCardProps) {
    const colors = COLOR_SCHEMES[colorScheme];
    const sizes = SIZE_CLASSES[size];

    const formatValue = (val: string | number) => {
        if (typeof val === 'number') {
            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
            return val.toLocaleString();
        }
        return val;
    };

    return (
        <div className={`${colors.bg} rounded-2xl ${sizes.card} shadow-lg hover:shadow-xl transition-shadow`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className={`${sizes.title} font-medium ${colors.text} uppercase tracking-wide`}>
                        {title}
                    </p>
                    <p className={`${sizes.value} font-bold text-gray-900 mt-1`}>
                        {formatValue(value)}
                    </p>
                    {subtitle && (
                        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                    )}
                    {trend && (
                        <div className={`flex items-center mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
                            <span className="text-sm font-medium">
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-gray-500 ml-1">vs last week</span>
                        </div>
                    )}
                </div>
                <div className={`${colors.iconBg} ${sizes.icon} rounded-xl flex items-center justify-center`}>
                    <span>{icon}</span>
                </div>
            </div>
        </div>
    );
}

// Export preset variants for common impact metrics
export function MealsRescuedCard({ value, trend }: { value: number; trend?: { value: number; isPositive: boolean } }) {
    return (
        <ImpactCard
            title="Meals Rescued"
            value={value}
            icon="🍽️"
            colorScheme="green"
            trend={trend}
        />
    );
}

export function FoodSavedCard({ value, unit = 'kg', trend }: { value: number; unit?: string; trend?: { value: number; isPositive: boolean } }) {
    return (
        <ImpactCard
            title="Food Saved"
            value={`${value.toLocaleString()} ${unit}`}
            icon="📦"
            colorScheme="amber"
            trend={trend}
        />
    );
}

export function CO2ReducedCard({ value, trend }: { value: number; trend?: { value: number; isPositive: boolean } }) {
    return (
        <ImpactCard
            title="CO₂ Reduced"
            value={`${value.toLocaleString()} kg`}
            icon="🌱"
            colorScheme="blue"
            trend={trend}
        />
    );
}

export function DeliveriesCard({ value, trend }: { value: number; trend?: { value: number; isPositive: boolean } }) {
    return (
        <ImpactCard
            title="Deliveries"
            value={value}
            icon="🚚"
            colorScheme="purple"
            trend={trend}
        />
    );
}
