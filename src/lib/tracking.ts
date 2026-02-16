// Tracking Service for Dynamic Sales Website

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sales-website-backend-624770114041.asia-south1.run.app/api';

interface TrackingParams {
    projectId: string;
    source?: string;
    leadId?: string;
    visitId?: string;
}

// Track page view on load
export async function trackPageView(params: TrackingParams): Promise<void> {
    try {
        await fetch(`${API_URL}/track/pageview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: params.projectId,
                source: params.source,
                leadId: params.leadId,
                visitId: params.visitId,
                timestamp: Date.now(),
            }),
        });
    } catch (error) {
        console.error('Failed to track page view:', error);
    }
}

// Track time spent on page
export async function trackTimeSpent(params: TrackingParams, duration: number): Promise<void> {
    try {
        const data = JSON.stringify({
            projectId: params.projectId,
            source: params.source,
            leadId: params.leadId,
            visitId: params.visitId,
            duration, // in seconds
            timestamp: Date.now(),
        });

        // Use fetch with keepalive for better CORS compatibility
        // This works better than sendBeacon for cross-origin requests
        fetch(`${API_URL}/track/time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            keepalive: true,
            mode: 'cors',
        }).catch(() => {
            // Silently fail - this is expected on page unload
        });
    } catch (error) {
        console.error('Failed to track time spent:', error);
    }
}

// Track CTA clicks
export async function trackCTAClick(
    params: TrackingParams,
    ctaType: 'call' | 'whatsapp' | 'form'
): Promise<void> {
    try {
        await fetch(`${API_URL}/track/cta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: params.projectId,
                source: params.source,
                leadId: params.leadId,
                visitId: params.visitId,
                ctaType,
                timestamp: Date.now(),
            }),
        });
    } catch (error) {
        console.error('Failed to track CTA click:', error);
    }
}

// Track form submissions
export async function trackFormSubmit(
    params: TrackingParams,
    formData: Record<string, unknown>
): Promise<void> {
    try {
        await fetch(`${API_URL}/track/form`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: params.projectId,
                source: params.source,
                leadId: params.leadId,
                visitId: params.visitId,
                formData,
                timestamp: Date.now(),
            }),
        });
        console.log('📡 Form submission tracked for lead:', params.leadId);
    } catch (error) {
        console.error('Failed to track form submission:', error);
    }
}
