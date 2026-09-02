'use client';

import { useState } from 'react';
import type { MapMode } from '@/services/map-service';

/* ────────────────────────────────────────────────────────────
 * 마커가 무엇을 뜻하는지 말한다.
 *
 * 지도 위 그림이 서식지인지, 최근 조황인지, 추천 지역인지가
 * 화면만 봐서는 구분되지 않았다. 이 안내가 그 모호함을 없앤다.
 *
 * 모바일에서는 한 줄도 아깝다 — 지도가 주인공이므로 작은 버튼으로 접어 둔다.
 * 자리가 있는 데스크톱 레일에서는 안내 문장을 그대로 노출한다.
 * ──────────────────────────────────────────────────────────── */

const MEANING: Record<MapMode, { short: string; long: string }> = {
  species: {
    short: '현재 시즌 기준 대표 출현 권역',
    long: '지도 표시는 선택한 날짜에 그 어종을 노리기 좋은 대표 권역을 나타냅니다. 정확한 서식지나 최근 조황 위치, 개인 포인트가 아닙니다.',
  },
  zone: {
    short: '권역별로 지금 노릴 수 있는 어종 묶음',
    long: '숫자는 선택한 날짜에 그 권역에서 시즌인 어종 수입니다. 그림은 그중 시즌이 가장 강한 대표 어종입니다.',
  },
};

const ITEMS: { swatch: string; label: string; hint: string }[] = [
  { swatch: 'var(--color-peak)', label: '피크', hint: '시즌 절정' },
  { swatch: 'var(--color-accent)', label: '시즌 좋음', hint: '노릴 만함' },
  { swatch: 'var(--color-sea)', label: '보통 · 곧 시작', hint: '작고 옅게' },
];

export function MapLegend({ mode, compact = false }: { mode: MapMode; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const meaning = MEANING[mode];

  return (
    <div className="min-w-0 text-[11.5px] leading-relaxed text-[color:var(--color-muted)]">
      <div className="flex items-center gap-1.5">
        {!compact && <span className="truncate">{meaning.short}</span>}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[color:var(--color-line)] bg-white/70 px-2 py-1 text-[11.5px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]/30"
        >
          <span aria-hidden>ⓘ</span>
          마커 뜻
        </button>
      </div>

      {open && (
        /*
         * 펼칠 때 지도를 밀어내지 않도록 띄워서 얹는다 — 지도가 주인공이다.
         * 기준은 이 컴포넌트가 아니라 컨트롤 묶음 전체다(MapScreen 이 relative 를 준다).
         * 버튼에 붙이면 화면 오른쪽으로 넘쳐 잘린다.
         */
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 space-y-1.5 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5 shadow-[var(--shadow-soft)]">
          <p className="text-[color:var(--color-ink-soft)]">
            {compact ? `${meaning.short} — ${meaning.long}` : meaning.long}
          </p>

          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {ITEMS.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: item.swatch }}
                />
                <span className="text-[color:var(--color-ink-soft)]">{item.label}</span>
                <span className="text-[color:var(--color-faint)]">{item.hint}</span>
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                style={{ background: 'var(--color-restricted)' }}
              >
                !
              </span>
              <span className="text-[color:var(--color-ink-soft)]">금어기</span>
              <span className="text-[color:var(--color-faint)]">있지만 잡으면 안 됩니다</span>
            </li>
          </ul>

          <p className="border-t border-[color:var(--color-line-soft)] pt-1.5 text-[color:var(--color-faint)]">
            그림 크기는 시즌 강도입니다. 규정은 그림 색을 바꾸지 않고 모서리 표시로만 알립니다 —
            <span className="text-[color:var(--color-ink-soft)]"> 지금 없는 것</span>과
            <span className="text-[color:var(--color-ink-soft)]"> 있지만 잡으면 안 되는 것</span>은
            다릅니다. 체장·성별 같은 조건부 규정은 어종을 눌러 상세에서 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
}
