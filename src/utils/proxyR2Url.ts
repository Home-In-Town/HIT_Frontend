/**
 * Converts a direct R2 URL to a proxied URL that avoids CORS issues.
 * In development, R2 doesn't have localhost in its CORS policy,
 * so we route through Next.js rewrites.
 *
 * Usage: <img src={proxyR2Url(imageUrl)} />
 */
const R2_PUBLIC_HOST = 'pub-daa9113fecb449cfb19044d3d822effd.r2.dev';

export function proxyR2Url(url: string | null | undefined): string {
  if (!url) return '';

  // Only proxy in development (when running on localhost)
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return url;
  }

  // If it's an R2 URL, rewrite it to go through the Next.js proxy
  if (url.includes(R2_PUBLIC_HOST)) {
    const path = url.split(R2_PUBLIC_HOST)[1]; // e.g. /projects/xxx/cover/yyy.jpg
    return `/r2-assets${path}`;
  }

  return url;
}
