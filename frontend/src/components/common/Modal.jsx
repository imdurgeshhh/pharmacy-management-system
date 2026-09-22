import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const getFocusableElements = (container) => {
  if (!container) return [];
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
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
 * Reusable accessible modal dialog rendered via React Portal directly to document.body.
 * Features:
 * - High z-index (z-[60]) above all headers (z-30) and sidebars (z-50)
 * - Soft translucent backdrop (bg-slate-900/40 dark:bg-black/60 with backdrop-blur-sm)
 * - Solid theme-aware card with internal scrollable body
 * - Escape key dismissal, backdrop click dismissal
 * - Focus trapping and focus restoration to trigger element
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
  closeOnBackdrop = true,
}) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Capture triggering element for focus restoration upon close
    const triggerElement = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Hide background app from screen readers
    const rootEl = document.getElementById('root');
    if (rootEl) rootEl.setAttribute('aria-hidden', 'true');

    // Place initial focus inside modal
    const focusTimer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusables = getFocusableElements(dialogRef.current);
      if (focusables.length > 0) {
        // Prioritize first form input/textarea/select if present, else first focusable
        const firstFormInput = focusables.find(el =>
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
        );
        (firstFormInput || focusables[0]).focus();
      } else {
        dialogRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
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
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (rootEl) rootEl.removeAttribute('aria-hidden');

      // Restore focus to trigger element
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose?.(); } : undefined}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slide-up relative flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto focus:outline-none`}
      >
        {/* Modal Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
            <h2 id={titleId} className="text-xl font-display font-bold text-slate-900 dark:text-white text-balance">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
              aria-label="Close dialog"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
