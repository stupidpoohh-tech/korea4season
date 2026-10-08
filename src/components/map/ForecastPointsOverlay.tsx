'use client';

import type { DateKey } from '@/domain/date';
import { shortDate, type PaintAnchor } from '@/services/official-foliage-service';

export function ForecastPointsOverlay({ anchors, date, selectedId, onSelect }: {
  anchors: PaintAnchor[];
  date: DateKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-label="절정 예측 지점">
      {anchors.map((a) => {
        const selected = selectedId === a.id;
        const today = date === a.peakForecastDate;
        const passed = date > a.peakForecastDate;
        const state = today ? '선택 날짜에 절정 예측' : passed ? '예측일 지남' : '예측일 전';
        return (
          <button key={a.id} type="button"
            aria-label={`${a.name} · ${shortDate(a.peakForecastDate)} · ${state}`}
            aria-pressed={selected} title={`${a.name} · ${shortDate(a.peakForecastDate)} · ${state}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSelect(a.id); }}
            className="pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            style={{ left: `${a.anchor.x * 100}%`, top: `${a.anchor.y * 100}%`, zIndex: selected ? 2 : 1 }}>
            <span className={`block rounded-full border-2 ${selected ? 'h-4 w-4 ring-4 ring-amber-200' : 'h-3 w-3'} ${today ? 'border-white bg-[#b8532a]' : passed ? 'border-white bg-[#6c7883]' : 'border-[#6c7883] bg-white'}`} />
          </button>
        );
      })}
    </div>
  );
}
