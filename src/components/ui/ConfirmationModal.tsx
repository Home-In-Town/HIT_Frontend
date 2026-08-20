'use client';

import { useEffect } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}: ConfirmationModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white border border-[#E7E5E4] rounded-[2.5rem] shadow-2xl transform transition-all p-10 animate-in fade-in zoom-in duration-300">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-[#2A2A2A] font-serif mb-4 tracking-tight">{title}</h3>
          <p className="text-[#57534E] leading-relaxed">{message}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end items-stretch sm:items-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#57534E] bg-white border border-[#E7E5E4] rounded-2xl hover:bg-[#FAF7F2] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-[#B45309] rounded-2xl hover:bg-[#92400E] shadow-lg shadow-[#B45309]/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
