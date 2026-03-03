/**
 * Utility to determine the Lead Filtration system URL based on the current environment.
 */
export function getLeadGenUrl(): string {
    // Check if we are running in a browser environment
    if (typeof window !== 'undefined') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (isLocal) {
            return 'http://localhost:5173';
        }
    }

    // Deployed production URL
    return 'https://www.oneemployee.in';
}
