'use client';

// Uploads the confirmed layout (R1.5, R2.12, R3.4, R3.5, R21.2): the
// Layout_Image, a Preview_Copy, a Detail_Copy and, for a PDF, the Source_PDF,
// all in parallel. Nothing here writes the project: the server stores no
// overlay field on upload (R7.8), so the keys sit in `pending` until Save.
//
// Save is enabled only when every item is done. A failed item keeps the
// preview open with Retry; Retry re-sends only the failed items from the blobs
// held in a ref, so a retry never re-encodes or re-reads the file. The saved
// overlay is never touched by a failed upload.

import { useCallback, useRef, useState } from 'react';
import { LayoutUploadError, uploadLayoutFile } from '@/lib/api';
import type { LayoutUploadType } from '@/lib/api';
import { makeReducedCopy } from '@/lib/reducedCopy';
import type { UploadItem } from './UploadProgress';

export interface UploadedFile {
  key: string;
  url?: string;
  width?: number;
  height?: number;
}

export interface PendingUploads {
  image?: UploadedFile;
  preview?: UploadedFile;
  detail?: UploadedFile;
  sourcePdf?: UploadedFile & { page: number; extraRotationDeg: 0 | 90 | 180 | 270 };
  imageSize?: { width: number; height: number };
}

export interface UploadInput {
  /** The confirmed Layout_Image (already rotated/rasterised). */
  image: Blob;
  imageName: string;
  imageSize: { width: number; height: number };
  /** Present only when the layout came from a PDF. */
  pdf?: { file: File; page: number; extraRotationDeg: 0 | 90 | 180 | 270 };
}

type Job = { id: string; type: LayoutUploadType; label: string; blob: Blob; name: string };

const failureText = (e: unknown): string => {
  if (e instanceof LayoutUploadError) {
    switch (e.reason) {
      case 'stalled': return 'Upload stalled for 60 seconds.';
      case 'network': return 'Network error. Check your connection.';
      case 'unauthorized': return 'Your session ended. Sign in again.';
      case 'forbidden': return 'You do not have permission to edit this layout.';
      case 'too-large': return 'The file is too large for the server.';
      case 'aborted': return 'Upload cancelled.';
      default: return e.message;
    }
  }
  return e instanceof Error ? e.message : 'Upload failed.';
};

export function useOverlayUploads(projectId: string) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [pending, setPending] = useState<PendingUploads>({});
  const [preparing, setPreparing] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const jobsRef = useRef<Job[]>([]);
  const inputRef = useRef<UploadInput | null>(null);
  const pendingRef = useRef<PendingUploads>({});
  const abortRef = useRef<AbortController | null>(null);
  // Ids of jobs whose last attempt failed; Retry re-sends exactly these.
  const failedRef = useRef<Set<string>>(new Set());

  const patchItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const runJobs = useCallback(async (jobs: Job[]) => {
    const input = inputRef.current;
    if (!input) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    await Promise.all(jobs.map(async (job) => {
      patchItem(job.id, { status: 'uploading', percent: 0, error: undefined });
      try {
        const r = await uploadLayoutFile(job.blob, job.name, projectId, job.type, (p) => patchItem(job.id, { percent: p }), ctrl.signal);
        const file: UploadedFile = { key: r.fileKey, url: r.fileUrl, width: r.width, height: r.height };
        const next: PendingUploads = { ...pendingRef.current, imageSize: input.imageSize };
        if (job.id === 'image') next.image = file;
        else if (job.id === 'preview') next.preview = file;
        else if (job.id === 'detail') next.detail = file;
        else if (job.id === 'pdf' && input.pdf) next.sourcePdf = { ...file, page: input.pdf.page, extraRotationDeg: input.pdf.extraRotationDeg };
        pendingRef.current = next;
        failedRef.current.delete(job.id);
        setPending(next);
        patchItem(job.id, { status: 'done', percent: 100 });
      } catch (e) {
        failedRef.current.add(job.id);
        patchItem(job.id, { status: 'failed', error: failureText(e) });
      }
    }));
  }, [patchItem, projectId]);

  /** Make the two copies, then upload everything in parallel. */
  const start = useCallback(async (input: UploadInput) => {
    inputRef.current = input;
    pendingRef.current = {};
    failedRef.current = new Set();
    setPending({});
    setPrepError(null);
    setPreparing(true);
    // Detail first from the confirmed image, preview from the detail, so only
    // one full-size decode happens (design 3.1).
    const detail = await makeReducedCopy(input.image, 'detail').catch(() => null);
    const preview = detail ? await makeReducedCopy(detail.blob, 'preview').catch(() => null) : null;
    setPreparing(false);
    if (!detail || !preview) {
      setPrepError('Could not prepare the smaller copies of this image. Try a smaller file.');
      return;
    }
    const ext = (m: string) => (m === 'image/webp' ? 'webp' : 'jpg');
    const jobs: Job[] = [
      { id: 'image', type: 'overlay', label: 'Layout image', blob: input.image, name: input.imageName },
      { id: 'preview', type: 'overlay-preview', label: 'Preview copy', blob: preview.blob, name: `preview.${ext(preview.mime)}` },
      { id: 'detail', type: 'overlay-detail', label: 'Detail copy', blob: detail.blob, name: `detail.${ext(detail.mime)}` },
    ];
    if (input.pdf) jobs.push({ id: 'pdf', type: 'layout-source', label: 'Source PDF', blob: input.pdf.file, name: input.pdf.file.name });
    jobsRef.current = jobs;
    setItems(jobs.map((j) => ({ id: j.id, label: j.label, percent: 0, status: 'waiting' as const })));
    await runJobs(jobs);
  }, [runJobs]);

  /** Re-send only the failed items. */
  const retry = useCallback(async () => {
    await runJobs(jobsRef.current.filter((j) => failedRef.current.has(j.id)));
  }, [runJobs]);

  const cancel = useCallback(() => { abortRef.current?.abort(); }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    jobsRef.current = [];
    inputRef.current = null;
    pendingRef.current = {};
    failedRef.current = new Set();
    setItems([]);
    setPending({});
    setPrepError(null);
    setPreparing(false);
  }, []);

  const uploading = preparing || items.some((i) => i.status === 'uploading' || i.status === 'waiting');
  const allDone = items.length > 0 && items.every((i) => i.status === 'done');

  return { items, pending, uploading, allDone, preparing, prepError, start, retry, cancel, reset };
}
