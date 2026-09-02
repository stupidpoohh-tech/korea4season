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
  species: '그림이 놓인 자리는 그 날짜에 그 어종을 노리기 좋은 권역입니다. 서식지나 조황 위치가 아닙니다.',
  zone: '숫자는 그 권역에서 지금 시즌인 어종 수, 그림은 그중 시즌이 가장 강한 어종입니다.',
};

/** 상태 어휘는 꽃·단풍·철새까지 그대로 쓸 수 있게 한곳에서만 정한다 */
const ITEMS: { swatch: string; label: string; hint: string }[] = [
  { swatch: 'var(--color-peak)', label: '절정', hint: '지금이 가장 좋을 때' },
  { swatch: 'var(--color-accent)', label: '좋음', hint: '노릴 만할 때' },
  { swatch: 'var(--color-sea)', label: '보통', hint: '있긴 있을 때' },
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
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ background: 'rgba(200, 68, 60, 0.52)' }}
          />
          <span className="font-medium text-[color:var(--color-ink-soft)]">붉게 덮인 그림</span>
          <span className="text-[color:var(--color-faint)]">지금은 잡을 수 없어요</span>
        </li>
      </ul>

      <p className="border-t border-[color:var(--color-line-soft)] pt-2 text-[color:var(--color-muted)]">
        {MEANING[mode]}
      </p>

      <p className="text-[color:var(--color-faint)]">
        그림이 클수록 시즌이 좋다는 뜻입니다. 금어기라도 그림은 지우지 않고 붉게 덮습니다 —
        <span className="text-[color:var(--color-ink-soft)]">지금 없는 것</span>과
        <span className="text-[color:var(--color-ink-soft)]">있지만 잡으면 안 되는 것</span>은
        다르기 때문입니다. 체장 같은 조건은 어종을 눌러 확인하세요.
      </p>
    </div>
  );
}
