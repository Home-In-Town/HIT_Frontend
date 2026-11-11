'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

// Before: a throw while rendering the layout-editor map (e.g. the overlay bounds
// TypeError) unmounted the whole page into Next's "Application error: a
// client-side exception". Now only the map area is replaced by this message and
// the rest of the editor stays usable.
export default class MapErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Layout editor map failed', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-gray-700">The map could not be drawn. Please reload the page.</p>
        <button
          type="button"
          className="rounded bg-orange-500 px-4 py-2 text-sm text-white"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
