import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

const getFocusableElements = (container) => {
  if (!container) return [];
  const selector = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    return (
      el.offsetWidth > 0 ||
      el.offsetHeight > 0 ||
      el.getClientRects().length > 0
    );
  });
};

/**
 * Canonical confirmation dialog primitive with accessible alertdialog semantics,
 * initial focus placement, keyboard focus trap, and trigger focus restoration.
 * Rendered via React Portal directly to document.body with z-[70].
 */
const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
}) => {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;

    const triggerElement = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Hide background app from screen readers
    const rootEl = document.getElementById('root');
    if (rootEl) rootEl.setAttribute('aria-hidden', 'true');

    // Place initial focus on Cancel button (safest action for alertdialog)
    const timer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusables = getFocusableElements(dialogRef.current);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        dialogRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancelRef.current?.();
        return;
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return;
        const focusables = getFocusableElements(dialogRef.current);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (rootEl) rootEl.removeAttribute('aria-hidden');

      // Restore focus to trigger
      setTimeout(() => {
        if (triggerElement && typeof triggerElement.focus === 'function') {
          if (triggerElement.isConnected) {
            triggerElement.focus();
          } else {
            const table = document.querySelector('[role="region"][aria-label="Employees table"]');
            table?.focus?.();
          }
        }
      }, 20);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const iconColorClass = isDanger
    ? 'text-red-600 dark:text-red-400'
    : isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-[rgb(var(--color-primary))]';

  const iconBgClass = isDanger
    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50'
    : isWarning
    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'
    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50';

  const confirmBtnClass = isDanger
    ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500'
    : isWarning
    ? 'bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-500'
    : 'bg-[rgb(var(--color-primary))] hover:brightness-110 text-white focus-visible:ring-[rgb(var(--color-primary))]';

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slide-up focus:outline-none my-auto"
      >
        <div className="p-6 text-center">
          {/* Variant Icon */}
          <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center mx-auto mb-4 ${iconBgClass}`}>
            {isDanger ? (
              <AlertCircle size={28} className={iconColorClass} aria-hidden="true" />
            ) : isWarning ? (
              <AlertTriangle size={28} className={iconColorClass} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={28} className={iconColorClass} aria-hidden="true" />
            )}
          </div>

          <h3 id={titleId} className="text-lg font-display font-bold text-slate-900 dark:text-white mb-2 text-balance">
            {title}
          </h3>

          {message && (
            <p id={descId} className="text-sm text-slate-600 dark:text-slate-300 mb-6 text-pretty leading-relaxed">
              {message}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 min-h-[44px]"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-h-[44px] ${confirmBtnClass}`}
            >
              {loading ? 'Processing…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
