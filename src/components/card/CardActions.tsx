'use client';
// The two buttons on the public card that need the browser: Save contact
// (vCard download) and Share. Everything else on the page is server-rendered.
import { Share2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildVCard, vcardFileName } from '@/lib/vcard.mjs';
import type { PublicCardData } from './PublicCard';

/** Only what the vCard needs: props of a client component are serialised into the page. */
export type CardActionsCard = Pick<PublicCardData, 'code' | 'name' | 'designation' | 'companyName' | 'phone' | 'email' | 'website' | 'reraAgentNo' | 'address'>;

export default function CardActions({ card, shareUrl, className }: { card: CardActionsCard; shareUrl: string; className: string }) {
  const saveContact = () => {
    const blob = new Blob([buildVCard(card)], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = vcardFileName(card.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking in the same tick can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = async () => {
    const title = [card.name, card.companyName].filter(Boolean).join(' — ');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: title, url: shareUrl });
        return;
      } catch (e) {
        // The user closing the share sheet is not an error worth a fallback.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  return (
    <>
      <button type="button" onClick={saveContact} className={className}>
        <UserPlus className="h-4 w-4" aria-hidden /> Save contact
      </button>
      <button type="button" onClick={share} className={className}>
        <Share2 className="h-4 w-4" aria-hidden /> Share
      </button>
    </>
  );
}
