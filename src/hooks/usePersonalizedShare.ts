'use client';

import { useCallback, useRef } from 'react';
import { shareApi, ShareContactInfo } from '@/lib/api';
import toast from 'react-hot-toast';

/**
 * Hook for personalized sharing — generates trackable share links
 * with the captain/agent's contact details embedded.
 *
 * Usage:
 *   const { shareLink, downloadPdfWithContact, generateQR } = usePersonalizedShare();
 *   await shareLink(projectId);
 *   await downloadPdfWithContact(projectId, pdfGeneratorFn);
 *   await generateQR(projectId, projectName);
 */
export function usePersonalizedShare() {
  // Cache contact info so we don't re-fetch on every PDF download
  const contactCache = useRef<ShareContactInfo | null>(null);

  /**
   * Copy a personalized share link to clipboard.
   * The link resolves to the project page with the sharer's contact details.
   */
  const shareLink = useCallback(async (projectId: string): Promise<string | null> => {
    try {
      const result = await shareApi.generateToken(projectId, 'link');
      await navigator.clipboard.writeText(result.shareUrl);
      toast.success('Personalized link copied!');
      return result.shareUrl;
    } catch (error: any) {
      console.error('Share link error:', error);
      toast.error(error?.message || 'Failed to generate share link');
      return null;
    }
  }, []);

  /**
   * Get the current user's contact info for embedding in PDFs.
   * Cached after first call.
   */
  const getContactInfo = useCallback(async (): Promise<ShareContactInfo | null> => {
    if (contactCache.current) return contactCache.current;

    try {
      const contact = await shareApi.getMyContact();
      contactCache.current = contact;
      return contact;
    } catch (error: any) {
      console.error('Failed to get contact info:', error);
      return null;
    }
  }, []);

  /**
   * Generate a personalized QR code URL.
   * Downloads the QR image with the personalized share link encoded.
   */
  const generateQR = useCallback(async (projectId: string, projectName: string): Promise<string | null> => {
    try {
      const result = await shareApi.generateToken(projectId, 'qr');
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.shareUrl)}`;

      // Download the QR code
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_QR.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('QR code downloading!');
      return result.shareUrl;
    } catch (error: any) {
      console.error('QR generation error:', error);
      toast.error(error?.message || 'Failed to generate QR code');
      return null;
    }
  }, []);

  /**
   * Generate a share token for PDF type (for tracking purposes)
   * and return the contact info to embed in the PDF.
   */
  const getPdfShareData = useCallback(async (projectId: string): Promise<{
    shareUrl: string;
    contact: ShareContactInfo;
  } | null> => {
    try {
      const [tokenResult, contact] = await Promise.all([
        shareApi.generateToken(projectId, 'pdf'),
        getContactInfo(),
      ]);

      if (!contact) {
        toast.error('Could not fetch your contact details');
        return null;
      }

      return {
        shareUrl: tokenResult.shareUrl,
        contact,
      };
    } catch (error: any) {
      console.error('PDF share data error:', error);
      toast.error(error?.message || 'Failed to prepare PDF share data');
      return null;
    }
  }, [getContactInfo]);

  return {
    shareLink,
    generateQR,
    getContactInfo,
    getPdfShareData,
  };
}
