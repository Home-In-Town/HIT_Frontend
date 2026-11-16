// Small display helpers shared by the owner-side plot-map screens.

/** "21 Nov, 3:40 pm" in the viewer's locale; empty for a missing/invalid date. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Time left until `iso`, in words ("2 din 3 ghante", "45 min", "expire ho chuki"). */
export function timeLeft(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms)) return '';
  if (ms <= 0) return 'expire ho chuki';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ghante`;
  return `${Math.floor(h / 24)} din ${h % 24} ghante`;
}

const digits = (phone: string) => phone.replace(/\D/g, '');

/** tel: link, or null when there is no usable number. */
export function telHref(phone: string | null | undefined): string | null {
  const d = digits(phone ?? '');
  return d.length >= 7 ? `tel:+${d.length === 10 ? '91' : ''}${d}` : null;
}

/** wa.me link; a bare 10-digit number is an Indian mobile. */
export function whatsappHref(phone: string | null | undefined, text?: string): string | null {
  const d = digits(phone ?? '');
  if (d.length < 10) return null;
  const n = d.length === 10 ? `91${d}` : d;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
