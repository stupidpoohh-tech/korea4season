'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * 모바일에서는 bottom sheet, 데스크톱에서는 우측 floating card.
 * 어느 쪽에서도 지도를 밀어내지 않는다. (요구사항 #34)
 */
export function Sheet({
  open,
  onClose,
  label,
  header,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  header: ReactNode;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[color:var(--color-ink)]/18 lg:hidden"
            aria-hidden
          />

          <motion.aside
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={reducedMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }
            }
            className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-y-auto rounded-t-2xl border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-sheet)] lg:inset-auto lg:right-5 lg:top-1/2 lg:max-h-[80vh] lg:w-[390px] lg:-translate-y-1/2 lg:rounded-2xl lg:border"
          >
            <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-[color:var(--color-line-soft)] bg-[color:var(--color-surface)]/95 px-4 pb-3 pt-4 backdrop-blur-sm">
              <div className="min-w-0 flex-1">{header}</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-line-soft)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-4 pb-6 pt-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function SheetRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-[72px] shrink-0 text-[12.5px] text-[color:var(--color-faint)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
        {children}
      </dd>
    </div>
  );
}
