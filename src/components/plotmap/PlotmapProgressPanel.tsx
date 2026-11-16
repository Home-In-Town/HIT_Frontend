'use client';
// A layout is being generated. The job reports only once, when it ends, so the
// progress is indeterminate (A8): "Layout ban raha hai" plus elapsed seconds, not
// a step bar that would pretend to know which step it is on. Polls E6 every 3 s.
import { useEffect, useRef, useState } from 'react';
import { apiCode, plotmapApi } from '@/lib/plotmapApi';
import { generationFailureText, plotmapErrorText } from '@/lib/plotMap.mjs';
import type { LayoutDetail } from '@/types/plotmap';

const POLL_MS = 3000;

export default function PlotmapProgressPanel({
  projectId, layoutId, onFinished, onFailedRetry, onNewImage,
}: {
  projectId: string;
  layoutId: string;
  /** The run ended in `review` (ready to check) or was cancelled/changed elsewhere: reload the page state. */
  onFinished: () => void;
  /** Same image again; only offered when this session still knows the uploaded key. */
  onFailedRetry?: () => void;
  onNewImage: () => void;
}) {
  const [layout, setLayout] = useState<LayoutDetail | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await plotmapApi.getLayout(projectId, layoutId);
        if (!alive) return;
        setLayout(r.layout);
        if (r.layout.state === 'review' || r.layout.state === 'published' || r.layout.state === 'archived') finished.current();
      } catch (e) {
        if (alive) setError(plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined));
      }
    };
    void tick();
    const poll = setInterval(() => { void tick(); }, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(clock); };
  }, [projectId, layoutId]);

  const started = layout?.generation.startedAt ?? layout?.createdAt ?? null;
  const elapsed = started ? Math.max(0, Math.floor((now - new Date(started).getTime()) / 1000)) : (layout?.elapsedSec ?? 0);

  const cancel = async () => {
    setBusy(true);
    try {
      await plotmapApi.cancel(projectId, layoutId);
      setConfirmCancel(false);
      const r = await plotmapApi.getLayout(projectId, layoutId);
      setLayout(r.layout);
    } catch (e) {
      setError(plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined));
    } finally {
      setBusy(false);
    }
  };

  if (layout?.state === 'failed') {
    const f = layout.generation.failure;
    return (
      <section aria-label="Layout nahi bana" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-lg font-bold text-red-900">Layout nahi ban paya</h2>
        <p role="alert" className="text-sm text-red-900">{generationFailureText(f?.code, f?.message)}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onNewImage} className="min-h-[44px] rounded-lg bg-orange-600 px-4 text-sm font-bold text-white">Naya image</button>
          {onFailedRetry && (
            <button type="button" onClick={onFailedRetry} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900">Dobara try</button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Layout ban raha hai" className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-gray-900">Layout ban raha hai…</h2>
      <div role="progressbar" aria-label="Layout ban raha hai" aria-busy="true" className="h-2 overflow-hidden rounded bg-gray-200">
        <div className="h-full w-1/3 animate-pulse rounded bg-orange-500" />
      </div>
      <p role="status" aria-live="polite" className="text-sm text-gray-800">
        {elapsed} second se chal raha hai. Ye 1 se 10 minute le sakta hai (bade layout mein zyada). Aap page khula rakhein.
      </p>
      {layout?.generation.warnings?.map((w) => <p key={w.code} className="text-sm text-yellow-900">{w.message}</p>)}
      <p role="alert" className="min-h-[1.25rem] text-sm text-red-700">{error ?? ''}</p>
      {!confirmCancel ? (
        <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-[44px] self-start rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800">Rok do (Cancel)</button>
      ) : (
        <div role="alertdialog" aria-label="Cancel confirm" className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-gray-900">
          <p>Layout banana rok dein? Aapko naya image dobara dena padega.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className="min-h-[44px] rounded-lg border border-gray-300 bg-white font-semibold">Chalne do</button>
            <button type="button" disabled={busy} onClick={() => void cancel()} className="min-h-[44px] rounded-lg bg-red-700 font-semibold text-white">Haan, rok do</button>
          </div>
        </div>
      )}
    </section>
  );
}
