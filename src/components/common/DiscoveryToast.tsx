'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getNatureIndex } from '@/repositories/nature-repository';
import { useDexStore } from '@/store/dex-store';

/**
 * 처음 만난 자연을 도감에 넣었다는 짧은 확인. (요구사항 #30)
 * 매번 요란한 축하를 하지 않는다 — 2.4초 뒤 조용히 사라진다.
 */
export function DiscoveryToast() {
  const reducedMotion = useReducedMotion() ?? false;
  const lastDiscovered = useDexStore((s) => s.lastDiscovered);
  const clear = useDexStore((s) => s.clearLastDiscovered);

  useEffect(() => {
    if (!lastDiscovered) return;
    const timer = setTimeout(clear, 2400);
    return () => clearTimeout(timer);
  }, [lastDiscovered, clear]);

  const entity = lastDiscovered ? getNatureIndex().entityById.get(lastDiscovered) : null;

  return (
    <AnimatePresence>
      {entity && (
        <motion.div
          role="status"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-none fixed left-1/2 top-4 z-[60] lg:top-[68px] -translate-x-1/2 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/96 px-3.5 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur-sm"
        >
          <p className="flex items-center gap-2 text-[13px]">
            <span aria-hidden className="text-[16px]">
              {entity.icon}
            </span>
            <span>
              <span className="font-semibold">{entity.name}</span>
              <span className="text-[color:var(--color-muted)]"> · 자연도감에 기록했습니다</span>
            </span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
