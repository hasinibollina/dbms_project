import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone. Are you sure you want to proceed?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-sand text-ink rounded-2xl max-w-md w-full border border-sand-dark shadow-poster p-6 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-ink/50 hover:text-ink p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isDanger ? 'bg-red-100 text-red-700' : 'bg-wine/10 text-wine'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-heading text-lg uppercase tracking-tight text-ink">
            {title}
          </h3>
        </div>

        <p className="text-sm text-ink/80 leading-relaxed mb-6">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-sand-dark text-xs font-semibold uppercase tracking-wider text-ink hover:bg-sand-dark/40 transition-colors focus:outline-none focus:ring-2 focus:ring-sand-dark"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-heading uppercase tracking-wider font-bold transition-all shadow-sm focus:outline-none focus:ring-2 ${
              isDanger
                ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-500'
                : 'bg-wine text-sand hover:bg-wine-dark focus:ring-wine-light'
            } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
