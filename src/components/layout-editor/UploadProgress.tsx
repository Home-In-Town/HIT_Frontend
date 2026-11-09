'use client';

// Upload progress list (R1.9, R1.10): 0-100 % per file, the failure reason, and
// a Retry that does not reload the page. The parent disables the picker and
// Save while any item is uploading.

export type UploadItemStatus = 'waiting' | 'uploading' | 'done' | 'failed';

export interface UploadItem {
  id: string;
  label: string;
  percent: number;
  status: UploadItemStatus;
  error?: string;
}

export default function UploadProgress({
  items,
  onRetry,
}: {
  items: UploadItem[];
  onRetry: () => void;
}) {
  if (!items.length) return null;
  const failed = items.some((i) => i.status === 'failed');
  return (
    <div className="flex flex-col gap-2" aria-label="Upload progress">
      {items.map((it) => (
        <div key={it.id}>
          <div className="flex justify-between text-gray-600">
            <span>{it.label}</span>
            <span>
              {it.status === 'done' ? 'Done' : it.status === 'failed' ? 'Failed' : it.status === 'waiting' ? 'Waiting' : `${it.percent}%`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${it.label} upload`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={it.status === 'done' ? 100 : it.percent}
            className="h-2 rounded bg-gray-200 overflow-hidden"
          >
            <div
              className={`h-full ${it.status === 'failed' ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${it.status === 'done' ? 100 : it.percent}%` }}
            />
          </div>
          {it.error && <p className="text-red-700 mt-1">{it.error}</p>}
        </div>
      ))}
      {failed && (
        <button type="button" onClick={onRetry} className="min-h-[44px] border rounded-lg py-2 font-medium">
          Retry failed uploads
        </button>
      )}
    </div>
  );
}
