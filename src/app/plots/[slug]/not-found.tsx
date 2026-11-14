import Link from 'next/link';
// An unknown or unpublished slug used to fall through to Next's built-in 404,
// which has no <main> landmark (axe: landmark-one-main, region) and no way
// back. This keeps the same wording as the "Layout not available" state.
export default function PlotsNotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
      <h1 className="text-xl font-bold text-gray-900">Layout not available</h1>
      <p className="max-w-sm text-sm text-gray-700">This project has no plot layout to show yet, or the link is not right.</p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
      >
        Go to HomeInTown
      </Link>
    </main>
  );
}
