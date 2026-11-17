'use client';

// File picker for the layout plan (R1.1-R1.4). The checks run on the picked
// file before any request: extension and MIME must agree, the file must not be
// empty, and it must fit the image (25 MB) or PDF (50 MB) cap. The picker only
// reports a File; what happens next (PDF pages, preview, upload) is decided by
// OverlayAlignPanel.

import { useRef, useState } from 'react';
import { checkLayoutFile, IMAGE_MAX_BYTES, PDF_MAX_BYTES } from '@/lib/layoutTools.mjs';

export const LAYOUT_ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf';

const mb = (bytes: number) => `${Math.round(bytes / 1048576)} MB`;

/** Text for a refused file; exported so the panel and tests share one wording. */
export function layoutFileProblem(result: ReturnType<typeof checkLayoutFile>): string | null {
  if (result.ok) return null;
  if (result.reason === 'type') return 'Only PNG, JPG, WEBP or PDF files are accepted.';
  if (result.reason === 'empty') return 'This file is empty (0 bytes). Pick another file.';
  return `This file is larger than ${mb(result.limit)}. Images can be up to ${mb(IMAGE_MAX_BYTES)} and PDFs up to ${mb(PDF_MAX_BYTES)}.`;
}

export default function OverlayFilePicker({
  disabled,
  hasImage,
  onPicked,
  multiple = false,
  label,
}: {
  disabled?: boolean;
  hasImage: boolean;
  onPicked: (file: File, kind: 'image' | 'pdf') => void;
  /**
   * Plot-map import: several files at once. `onPicked` runs once per accepted file, in the order picked,
   * and a refused file does not stop the others (the first refusal is shown with its file name).
   * Previous behaviour, still the default and used by the overlay tool: one file per pick.
   */
  multiple?: boolean;
  /** Button text; defaults to the overlay tool's wording. */
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const handle = (files: FileList | null) => {
    // Copy the files out before clearing the input, which empties the live FileList.
    const list = Array.from(files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (list.length === 0) return;
    let firstProblem: string | null = null;
    for (const file of multiple ? list : list.slice(0, 1)) {
      const result = checkLayoutFile(file);
      const msg = layoutFileProblem(result);
      if (msg || !result.ok) {
        firstProblem = firstProblem ?? (multiple ? `${file.name}: ${msg}` : msg);
        continue;
      }
      onPicked(file, result.kind);
    }
    setProblem(firstProblem);
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Input inside the label so the keyboard focus ring shows on the visible button. */}
      <label
        className={`w-full text-center py-3 min-h-[44px] rounded-lg font-medium cursor-pointer border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 focus-within:ring-2 focus-within:ring-orange-400 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={LAYOUT_ACCEPT}
          className="sr-only"
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handle(e.target.files)}
        />
        {label ?? (hasImage ? 'Replace layout image or PDF' : 'Upload layout image or PDF')}
      </label>
      <p className="text-[11px] text-gray-500">PNG, JPG, WEBP up to {mb(IMAGE_MAX_BYTES)}, or PDF up to {mb(PDF_MAX_BYTES)}.</p>
      <div role="alert" className="min-h-[1rem]">
        {problem && <p className="text-red-700">{problem}</p>}
      </div>
    </div>
  );
}
