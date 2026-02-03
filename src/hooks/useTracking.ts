'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackPageView, trackTimeSpent, trackCTAClick } from '@/lib/tracking';

interface UseTrackingOptions {
    projectId: string;
    trackTimeInterval?: number; // in seconds, default 30
}

export function useTracking({ projectId, trackTimeInterval = 30 }: UseTrackingOptions) {
    const searchParams = useSearchParams();
    const startTimeRef = useRef<number>(Date.now());
    const lastTrackedTimeRef = useRef<number>(0);

    const [visitId] = useState(() => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    });

    const source = searchParams.get('source') || undefined;
    const leadId = searchParams.get('leadId') || undefined;

    const trackingParams = { projectId, source, leadId, visitId };

    // Track page view on mount - only when projectId is valid
    useEffect(() => {
        // Don't track if projectId is empty
        if (!projectId) {
            return;
        }

        const currentTrackingParams = { projectId, source, leadId, visitId };

        trackPageView(currentTrackingParams);
        startTimeRef.current = Date.now();
        lastTrackedTimeRef.current = 0;

        // Track time spent periodically
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            if (elapsed > lastTrackedTimeRef.current) {
                trackTimeSpent(currentTrackingParams, elapsed - lastTrackedTimeRef.current);
                lastTrackedTimeRef.current = elapsed;
            }
        }, trackTimeInterval * 1000);

        // Track time on page unload
        const handleUnload = () => {
            const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const newDuration = totalTime - lastTrackedTimeRef.current;
            if (newDuration > 0) {
                trackTimeSpent(currentTrackingParams, newDuration);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleUnload();
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, source, leadId, visitId, trackTimeInterval]);

    // CTA click handlers - only track with valid projectId
    const handleCallClick = useCallback(() => {
        if (projectId) {
            trackCTAClick(trackingParams, 'call');
        }
    }, [projectId, trackingParams]);

    const handleWhatsAppClick = useCallback(() => {
        if (projectId) {
            trackCTAClick(trackingParams, 'whatsapp');
        }
    }, [projectId, trackingParams]);

    const handleFormSubmit = useCallback(() => {
        if (projectId) {
            trackCTAClick(trackingParams, 'form');
        }
    }, [projectId, trackingParams]);

    return {
        handleCallClick,
        handleWhatsAppClick,
        handleFormSubmit,
        source,
        leadId,
    };
}
