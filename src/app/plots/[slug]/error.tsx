'use client';

// Shown when the first server-side fetch of the layout fails for a reason other
// than 404 (backend outage, 5xx). Retry calls reset(), which re-renders the
// route and fetches again; a 404 never lands here (the page calls notFound()).

export default function PlotsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
      <h1 className="text-xl font-bold text-gray-900">The layout could not be loaded</h1>
      <p className="max-w-sm text-sm text-gray-700">Check your internet connection and try again.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="min-h-[44px] min-w-[44px] rounded-lg bg-orange-700 px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
      >
        Retry
      </button>
    </main>
  );
}
