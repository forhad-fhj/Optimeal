'use client';

import { DeliveryStatus, DeliveryTracking } from '@/types';

interface DeliveryTrackerProps {
    tracking: DeliveryTracking | null;
    isLoading?: boolean;
    showMap?: boolean;
    onRefresh?: () => void;
}

// Status configuration
const STATUS_STEPS: DeliveryStatus[] = [
    'pending',
    'assigned',
    'en_route_pickup',
    'picked_up',
    'en_route_delivery',
    'delivered',
    'confirmed'
];

const STATUS_LABELS: Record<DeliveryStatus, string> = {
    pending: 'Pending',
    assigned: 'Assigned',
    en_route_pickup: 'Heading to Pickup',
    picked_up: 'Picked Up',
    en_route_delivery: 'On the Way',
    delivered: 'Delivered',
    confirmed: 'Confirmed',
    failed: 'Failed',
    cancelled: 'Cancelled',
};

const STATUS_ICONS: Record<DeliveryStatus, string> = {
    pending: '⏳',
    assigned: '📋',
    en_route_pickup: '🚗',
    picked_up: '📦',
    en_route_delivery: '🚚',
    delivered: '✅',
    confirmed: '🎉',
    failed: '❌',
    cancelled: '🚫',
};

export default function DeliveryTracker({
    tracking,
    isLoading = false,
    showMap = false,
    onRefresh,
}: DeliveryTrackerProps) {
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
        );
    }

    if (!tracking) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center text-gray-500">
                No tracking data available
            </div>
        );
    }

    const currentStepIndex = STATUS_STEPS.indexOf(tracking.status);
    const isTerminal = ['delivered', 'confirmed', 'failed', 'cancelled'].includes(tracking.status);
    const isFailed = ['failed', 'cancelled'].includes(tracking.status);

    const formatETA = (eta: string | undefined) => {
        if (!eta) return '--';
        const date = new Date(eta);
        const now = new Date();
        const diff = date.getTime() - now.getTime();

        if (diff < 0) return 'Arriving now';

        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} min`;

        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${isFailed ? 'bg-red-50' : isTerminal ? 'bg-green-50' : 'bg-blue-50'
                }`}>
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{STATUS_ICONS[tracking.status]}</span>
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {STATUS_LABELS[tracking.status]}
                        </h3>
                        <p className="text-sm text-gray-600">
                            Delivery #{tracking.delivery_id.slice(0, 8)}
                        </p>
                    </div>
                </div>

                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        🔄
                    </button>
                )}
            </div>

            {/* Progress Steps */}
            {!isFailed && (
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                        {STATUS_STEPS.slice(0, -1).map((step, index) => {
                            const isActive = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;

                            return (
                                <div key={step} className="flex flex-col items-center flex-1">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                        ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                                            isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                                    `}>
                                        {isActive && !isCurrent ? '✓' : index + 1}
                                    </div>
                                    <span className={`text-xs mt-1 text-center ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'
                                        }`}>
                                        {STATUS_LABELS[step].split(' ')[0]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, (currentStepIndex / (STATUS_STEPS.length - 2)) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ETA and Details */}
            <div className="px-6 py-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Pickup ETA</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {tracking.status === 'pending' || tracking.status === 'assigned'
                                ? formatETA(tracking.pickup_eta)
                                : '✓ Done'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Delivery ETA</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {formatETA(tracking.delivery_eta)}
                        </p>
                    </div>
                </div>

                {/* Stops Progress */}
                {tracking.total_stops > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Stops completed</span>
                            <span className="font-medium">
                                {tracking.current_stop ?? 0} / {tracking.total_stops}
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 transition-all"
                                style={{
                                    width: `${((tracking.current_stop ?? 0) / tracking.total_stops) * 100}%`
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Live Location Indicator */}
            {tracking.volunteer_location && !isTerminal && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm text-gray-600">
                            Live tracking active
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
