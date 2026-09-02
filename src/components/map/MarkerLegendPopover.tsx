'use client';

import { useEffect, type RefObject } from 'react';
import type { MapMode } from '@/services/map-service';

/* ────────────────────────────────────────────────────────────
 * 마커가 무엇을 뜻하는지 말한다.
 *
 * 도움말은 보조 정보다. 예전에는 'ⓘ 마커 뜻' 이 필터·모드와 같은 크기의
 * 버튼이라 주요 기능처럼 읽혔다. 지금은 아이콘 하나로 접어 두고,
 * 누를 때만 펼친다.
 * ──────────────────────────────────────────────────────────── */

const MEANING: Record<MapMode, string> = {
  species:
    '지도 표시는 선택한 날짜에 그 어종을 노리기 좋은 대표 권역을 나타냅니다. 정확한 서식지나 최근 조황 위치, 개인 포인트가 아닙니다.',
  zone: '숫자는 선택한 날짜에 그 권역에서 시즌인 어종 수입니다. 그림은 그중 시즌이 가장 강한 대표 어종입니다.',
};

/** 상태 어휘는 꽃·단풍·철새까지 그대로 쓸 수 있게 한곳에서만 정한다 */
const ITEMS: { swatch: string; label: string; hint: string }[] = [
  { swatch: 'var(--color-peak)', label: '절정', hint: '가장 크고 또렷하게' },
  { swatch: 'var(--color-accent)', label: '좋음', hint: '노릴 만함' },
  { swatch: 'var(--color-sea)', label: '보통 · 시작 중', hint: '작고 옅게' },
];

export function LegendTrigger({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label="지도 보는 법"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] transition-colors ${
        open
          ? 'bg-[color:var(--color-ink)] text-white'
          : 'text-[color:var(--color-faint)] hover:bg-[color:var(--color-line-soft)] hover:text-[color:var(--color-ink-soft)]'
      }`}
    >
      <span aria-hidden>ⓘ</span>
    </button>
  );
}

/**
 * 펼칠 때 지도를 밀어내지 않도록 띄워서 얹는다 — 지도가 주인공이다.
 * 기준은 이 컴포넌트가 아니라 헤더 묶음 전체다(부모가 relative 를 준다).
 */
export function MarkerLegendPopover({
  open,
  onClose,
  mode,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  mode: MapMode;
  /**
   * 트리거까지 포함하는 바깥 상자.
   * 팝오버만 기준으로 삼으면 ⓘ 를 다시 눌러 닫을 때
   * pointerdown 이 먼저 닫고 click 이 다시 열어 버린다.
   */
  anchorRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="지도 보는 법"
      className="absolute inset-x-0 top-full z-30 mt-1.5 space-y-2 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-3 text-[11.5px] leading-relaxed shadow-[var(--shadow-soft)]"
    >
      <p className="text-[13px] font-semibold tracking-tight">지도 보는 법</p>

      <ul className="space-y-1">
        {ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: item.swatch }}
            />
            <span className="font-medium text-[color:var(--color-ink-soft)]">{item.label}</span>
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
          <span className="font-medium text-[color:var(--color-ink-soft)]">규정 있음</span>
          <span className="text-[color:var(--color-faint)]">있지만 잡으면 안 됩니다</span>
        </li>
      </ul>

      <p className="border-t border-[color:var(--color-line-soft)] pt-2 text-[color:var(--color-muted)]">
        {MEANING[mode]}
      </p>

      <p className="text-[color:var(--color-faint)]">
        그림 크기는 시즌 강도입니다. 규정은 그림 색을 바꾸지 않고 모서리 표시로만 알립니다 —
        <span className="text-[color:var(--color-ink-soft)]"> 지금 없는 것</span>과
        <span className="text-[color:var(--color-ink-soft)]"> 있지만 잡으면 안 되는 것</span>은
        다릅니다. 체장·성별 같은 조건부 규정은 어종을 눌러 상세에서 확인하세요.
      </p>
    </div>
  );
}
