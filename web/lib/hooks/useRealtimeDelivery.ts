import { useState, useEffect, useCallback, useRef } from 'react';
import { deliveriesApi } from '../api';
import { DeliveryTracking, DeliveryStatus } from '@/types';

interface UseRealtimeDeliveryOptions {
    deliveryId: string;
    enabled?: boolean;
    pollingInterval?: number; // in ms
    onStatusChange?: (oldStatus: DeliveryStatus, newStatus: DeliveryStatus) => void;
    onArrival?: () => void;
}

interface UseRealtimeDeliveryReturn {
    tracking: DeliveryTracking | null;
    isLoading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    isPolling: boolean;
}

/**
 * Hook for real-time delivery tracking with automatic polling.
 * Polls the tracking endpoint at specified intervals and triggers callbacks on status changes.
 */
export function useRealtimeDelivery({
    deliveryId,
    enabled = true,
    pollingInterval = 10000, // 10 seconds default
    onStatusChange,
    onArrival,
}: UseRealtimeDeliveryOptions): UseRealtimeDeliveryReturn {
    const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const previousStatusRef = useRef<DeliveryStatus | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchTracking = useCallback(async () => {
        if (!deliveryId) return;

        try {
            setError(null);
            const data = await deliveriesApi.track(deliveryId) as DeliveryTracking;

            // Check for status change
            if (previousStatusRef.current && data.status !== previousStatusRef.current) {
                onStatusChange?.(previousStatusRef.current, data.status);

                // Check for arrival
                if (data.status === 'delivered' || data.status === 'confirmed') {
                    onArrival?.();
                }
            }

            previousStatusRef.current = data.status;
            setTracking(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch tracking'));
        } finally {
            setIsLoading(false);
        }
    }, [deliveryId, onStatusChange, onArrival]);

    // Initial fetch
    useEffect(() => {
        if (enabled && deliveryId) {
            setIsLoading(true);
            fetchTracking();
        }
    }, [enabled, deliveryId, fetchTracking]);

    // Polling
    useEffect(() => {
        if (!enabled || !deliveryId) {
            setIsPolling(false);
            return;
        }

        // Don't poll if delivery is in terminal state
        const terminalStates: DeliveryStatus[] = ['delivered', 'confirmed', 'failed', 'cancelled'];
        if (tracking && terminalStates.includes(tracking.status)) {
            setIsPolling(false);
            return;
        }

        setIsPolling(true);
        intervalRef.current = setInterval(fetchTracking, pollingInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, deliveryId, pollingInterval, tracking?.status, fetchTracking]);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        await fetchTracking();
    }, [fetchTracking]);

    return {
        tracking,
        isLoading,
        error,
        refresh,
        isPolling,
    };
}

/**
 * Hook for tracking multiple deliveries at once.
 * Useful for charity/volunteer dashboards.
 */
export function useRealtimeDeliveries(
    deliveryIds: string[],
    options?: Omit<UseRealtimeDeliveryOptions, 'deliveryId'>
) {
    const [trackingMap, setTrackingMap] = useState<Record<string, DeliveryTracking>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const pollingInterval = options?.pollingInterval ?? 15000;
    const enabled = options?.enabled ?? true;

    const fetchAll = useCallback(async () => {
        if (deliveryIds.length === 0) {
            setIsLoading(false);
            return;
        }

        try {
            setError(null);
            const results = await Promise.allSettled(
                deliveryIds.map(id => deliveriesApi.track(id) as Promise<DeliveryTracking>)
            );

            const newMap: Record<string, DeliveryTracking> = {};
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    newMap[deliveryIds[index]] = result.value;
                }
            });

            setTrackingMap(newMap);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch tracking'));
        } finally {
            setIsLoading(false);
        }
    }, [deliveryIds]);

    useEffect(() => {
        if (enabled) {
            setIsLoading(true);
            fetchAll();
        }
    }, [enabled, fetchAll]);

    useEffect(() => {
        if (!enabled || deliveryIds.length === 0) return;

        const interval = setInterval(fetchAll, pollingInterval);
        return () => clearInterval(interval);
    }, [enabled, pollingInterval, fetchAll, deliveryIds.length]);

    return {
        trackingMap,
        isLoading,
        error,
        refresh: fetchAll,
    };
}
