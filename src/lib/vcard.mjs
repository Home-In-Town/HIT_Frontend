// Contact helpers for the public visiting card page (src/app/card/[code]):
// the vCard (.vcf) behind "Save contact", plus the tel:/wa.me/http(s) links.
//
// WHY a plain .mjs: same reason as layoutTools.mjs. HIT_Frontend has no test
// framework and `node --test` runs this file directly. TS callers get types
// from the JSDoc (tsconfig has allowJs). Keep it free of React, DOM and npm
// imports.
//
// The vCard matches HIT_Mobile src/lib/cardImage.ts buildVCard (same field
// order, escaping and N split), so a contact saved from the app and one saved
// from homeintown.in look the same in the phone book.

/**
 * @typedef {{
 *   code?: string | null;
 *   name?: string | null;
 *   designation?: string | null;
 *   companyName?: string | null;
 *   phone?: string | null;
 *   email?: string | null;
 *   website?: string | null;
 *   reraAgentNo?: string | null;
 *   address?: { line?: string | null; city?: string | null; state?: string | null; pinCode?: string | null } | null;
 * }} VCardInput
 */

export const PUBLIC_CARD_ORIGIN = 'https://homeintown.in';

/** Same pattern the page checks before it calls the backend. */
export const CARD_CODE_RE = /^[a-z0-9-]{3,48}$/;

/** @param {string} code */
export function publicCardUrl(code) {
  return `${PUBLIC_CARD_ORIGIN}/card/${encodeURIComponent(code)}`;
}

/** @param {unknown} v */
const clean = (v) => String(v ?? '').trim();

/**
 * vCard 3.0 text escaping (RFC 2426 §5, RFC 6350 §3.4). Backslash first, or
 * the escapes added for `,` and `;` would themselves be doubled.
 * @param {unknown} s
 */
export function vcardEscape(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * Returns the URL only when it parses as http(s). The backend already
 * normalises links, but a `javascript:` or `data:` value must never reach an
 * href on a public page.
 * @param {unknown} u
 * @returns {string | null}
 */
export function safeHttpUrl(u) {
  const s = clean(u);
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Digits for wa.me. A bare 10-digit number is Indian, so it gets the 91
 * country code; anything else (already 91-prefixed, foreign) is sent as-is.
 * @param {unknown} phone
 */
export function phoneDigits(phone) {
  const d = clean(phone).replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
}

/**
 * @param {unknown} phone
 * @returns {string | null}
 */
export function whatsAppUrl(phone) {
  const d = phoneDigits(phone);
  return d ? `https://wa.me/${d}` : null;
}

/**
 * @param {unknown} phone
 * @returns {string | null}
 */
export function telHref(phone) {
  const d = phoneDigits(phone);
  return d ? `tel:+${d}` : null;
}

/**
 * vCard 3.0 with CRLF line endings. Empty fields are left out. Components of
 * N and ADR are escaped one by one; the `;` between them are separators.
 * Long lines are not folded: folding is optional in 3.0 and the Android and
 * iOS contact importers accept long lines.
 * @param {VCardInput} card
 */
export function buildVCard(card) {
  const name = clean(card.name);
  const parts = name.split(/\s+/).filter(Boolean);
  // Indian names: last word as the family name, the rest as given names.
  const family = parts.length > 1 ? parts[parts.length - 1] : '';
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || '';

  /** @type {string[]} */
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  /**
   * @param {string} prop
   * @param {unknown} value
   */
  const add = (prop, value) => {
    const v = clean(value);
    if (v) lines.push(`${prop}:${vcardEscape(v)}`);
  };

  if (name) {
    lines.push(`N:${vcardEscape(family)};${vcardEscape(given)};;;`);
    lines.push(`FN:${vcardEscape(name)}`);
  }
  add('ORG', card.companyName);
  add('TITLE', card.designation);
  const digits = phoneDigits(card.phone);
  if (digits) add('TEL;TYPE=CELL', `+${digits}`);
  add('EMAIL;TYPE=INTERNET', card.email);
  add('URL', safeHttpUrl(card.website));

  const a = card.address || {};
  const adr = [a.line, a.city, a.state, a.pinCode].map(clean);
  if (adr.some(Boolean)) lines.push(`ADR;TYPE=WORK:;;${adr.map(vcardEscape).join(';')};India`);

  const note = [
    clean(card.reraAgentNo) ? `RERA Agent No: ${clean(card.reraAgentNo)}` : '',
    card.code ? `Digital card: ${publicCardUrl(card.code)}` : '',
  ].filter(Boolean).join('\n');
  add('NOTE', note);

  lines.push('END:VCARD');
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * "<name>.vcf". Only characters Windows/Android refuse in a file name are
 * removed; spaces stay so the download reads like the person's name.
 * @param {unknown} name
 */
export function vcardFileName(name) {
  const base = clean(name).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '').trim().slice(0, 60);
  return `${base || 'contact'}.vcf`;
}
