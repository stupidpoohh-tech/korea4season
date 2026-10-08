'use client';

import { useEffect, useRef } from 'react';
import { Sheet } from '@/components/common/Sheet';
import type { ForecastRow, OfficialForecastNow } from '@/services/official-foliage-service';
import { ForecastList } from './ForecastList';

export function ForecastSheet({ open, onClose, forecast, onSelect, selectedId }: {
  open: boolean;
  onClose: () => void;
  forecast: OfficialForecastNow;
  onSelect: (row: ForecastRow) => void;
  selectedId: string | null;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = contentRef.current?.closest('[role="dialog"]');
    if (!dialog) return;
    const buttons = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex="0"]'));
    buttons()[0]?.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = buttons();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    dialog.addEventListener('keydown', trap as EventListener);
    return () => {
      dialog.removeEventListener('keydown', trap as EventListener);
      previous?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} label="예측 장소·날짜 보기"
      header={<h2 className="text-[16px] font-semibold">예측 장소·날짜 보기</h2>}>
      <div ref={contentRef}><ForecastList forecast={forecast} onSelect={onSelect} selectedId={selectedId} embedded /></div>
    </Sheet>
  );
}
