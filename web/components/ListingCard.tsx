'use client';

import { FoodListing, ListingStatus, FoodCategory } from '@/types';
import { Button } from '@/components/ui/button';

interface ListingCardProps {
    listing: FoodListing;
    onSelect?: (id: string) => void;
    onClaim?: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    isSelected?: boolean;
    showActions?: boolean;
    variant?: 'compact' | 'detailed';
}

const STATUS_CONFIG: Record<ListingStatus, { label: string; color: string; icon: string }> = {
    available: { label: 'Available', color: 'bg-green-100 text-green-800', icon: '✅' },
    reserved: { label: 'Reserved', color: 'bg-blue-100 text-blue-800', icon: '🔒' },
    assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-800', icon: '📋' },
    picked_up: { label: 'Picked Up', color: 'bg-amber-100 text-amber-800', icon: '📦' },
    delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', icon: '🎉' },
    expired: { label: 'Expired', color: 'bg-red-100 text-red-800', icon: '⏰' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: '🚫' },
};

const CATEGORY_CONFIG: Record<FoodCategory, { label: string; icon: string; color: string }> = {
    perishable: { label: 'Perishable', icon: '🥗', color: 'bg-green-50 text-green-700' },
    non_perishable: { label: 'Non-Perishable', icon: '🥫', color: 'bg-amber-50 text-amber-700' },
    prepared: { label: 'Prepared', icon: '🍱', color: 'bg-orange-50 text-orange-700' },
    bakery: { label: 'Bakery', icon: '🥖', color: 'bg-yellow-50 text-yellow-700' },
    produce: { label: 'Produce', icon: '🥬', color: 'bg-lime-50 text-lime-700' },
    dairy: { label: 'Dairy', icon: '🥛', color: 'bg-blue-50 text-blue-700' },
    meat: { label: 'Meat', icon: '🥩', color: 'bg-red-50 text-red-700' },
    mixed: { label: 'Mixed', icon: '📦', color: 'bg-gray-50 text-gray-700' },
};

export default function ListingCard({
    listing,
    onSelect,
    onClaim,
    onEdit,
    onDelete,
    isSelected = false,
    showActions = false,
    variant = 'detailed',
}: ListingCardProps) {
    const status = STATUS_CONFIG[listing.status] || STATUS_CONFIG.available;
    const category = CATEGORY_CONFIG[listing.food_category || 'mixed'];

    const expiresAt = new Date(listing.expires_at);
    const now = new Date();
    const hoursUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    const isUrgent = hoursUntilExpiry <= 4 && hoursUntilExpiry > 0;
    const isExpired = hoursUntilExpiry <= 0;

    const formatTimeRemaining = () => {
        if (isExpired) return 'Expired';
        if (hoursUntilExpiry < 1) {
            const mins = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
            return `${mins}m left`;
        }
        if (hoursUntilExpiry < 24) return `${hoursUntilExpiry}h left`;
        const days = Math.floor(hoursUntilExpiry / 24);
        return `${days}d left`;
    };

    const formatPickupWindow = () => {
        if (!listing.pickup_window_start || !listing.pickup_window_end) return null;
        const start = new Date(listing.pickup_window_start);
        const end = new Date(listing.pickup_window_end);
        return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    };

    if (variant === 'compact') {
        return (
            <div
                onClick={() => onSelect?.(listing.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                        ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{listing.title}</p>
                        <p className="text-sm text-gray-500">{listing.quantity_kg} kg</p>
                    </div>
                    <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                            {status.label}
                        </span>
                        <p className={`text-xs mt-1 ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {formatTimeRemaining()}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`bg-white rounded-2xl border overflow-hidden transition-all ${isSelected
                    ? 'border-green-400 ring-2 ring-green-100 shadow-lg'
                    : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                }`}
        >
            {/* Header */}
            <div className="p-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center`}>
                            <span className="text-2xl">{category.icon}</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                            <p className="text-sm text-gray-500">{category.label}</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon} {status.label}
                    </span>
                </div>

                {listing.description && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">{listing.description}</p>
                )}

                {/* Details Grid */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">📦</span>
                        <span className="font-medium text-gray-900">{listing.quantity_kg} kg</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${isUrgent ? 'text-red-600' : ''}`}>
                        <span className="text-gray-400">⏰</span>
                        <span className={`font-medium ${isExpired ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-900'}`}>
                            {formatTimeRemaining()}
                        </span>
                    </div>
                    {listing.address && (
                        <div className="flex items-center gap-2 text-sm col-span-2">
                            <span className="text-gray-400">📍</span>
                            <span className="text-gray-600 truncate">{listing.address}</span>
                        </div>
                    )}
                    {formatPickupWindow() && (
                        <div className="flex items-center gap-2 text-sm col-span-2">
                            <span className="text-gray-400">🕐</span>
                            <span className="text-gray-600">Pickup: {formatPickupWindow()}</span>
                        </div>
                    )}
                </div>

                {/* Food Safety Indicators */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {listing.requires_refrigeration && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                            ❄️ Refrigerated
                        </span>
                    )}
                    {listing.allergens && listing.allergens.length > 0 && (
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs">
                            ⚠️ Allergens: {listing.allergens.join(', ')}
                        </span>
                    )}
                    {listing.is_recurring && (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs">
                            🔄 Recurring
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            {showActions && (
                <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
                    <div className="flex gap-2">
                        {onEdit && listing.status === 'available' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(listing.id)}
                            >
                                Edit
                            </Button>
                        )}
                        {onDelete && listing.status === 'available' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => onDelete(listing.id)}
                            >
                                Delete
                            </Button>
                        )}
                    </div>
                    {onClaim && listing.status === 'available' && (
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                            onClick={() => onClaim(listing.id)}
                        >
                            Claim
                        </Button>
                    )}
                    {onSelect && (
                        <Button
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onSelect(listing.id)}
                        >
                            {isSelected ? '✓ Selected' : 'Select'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
