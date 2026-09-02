'use client';

import { useEffect, useRef, useState } from 'react';
import { NATURE_CATEGORIES, layerConfig, type MapLayerId } from '@/domain/nature-categories';
import { useMapStore } from '@/store/map-store';

/* ────────────────────────────────────────────────────────────
 * 무슨 자연을 볼 것인가.
 *
 * 이 서비스의 제목 자체가 선택지다 — '지금, 바다 ⌄' 를 눌러 단풍으로 옮긴다.
 * 아직 없는 카테고리도 목록에는 둔다. 앞으로 무엇이 올지 보이는 편이
 * "낚시 앱" 이 아니라 "자연의 시간을 보는 지도" 로 읽히기 때문이다.
 * 다만 준비 중인 것을 누르면 화면을 만들지 않고 그렇다고만 말한다.
 * ──────────────────────────────────────────────────────────── */

export function CategorySelector({ compact = false }: { compact?: boolean }) {
  const layer = useMapStore((s) => s.layer);
  const setLayer = useMapStore((s) => s.setLayer);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const current = layerConfig(layer);

  const pick = (id: MapLayerId, enabled: boolean, message?: string) => {
    if (!enabled) {
      setNotice(message ?? '준비 중이에요.');
      return;
    }
    setLayer(id);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1 rounded-lg font-semibold tracking-tight transition-colors hover:bg-[color:var(--color-line-soft)] ${
          compact ? '-mx-1 px-1 text-[15px]' : '-mx-1 px-1 text-[16px]'
        }`}
      >
        {current.headline}
        <span
          aria-hidden
          className={`text-[10px] text-[color:var(--color-faint)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 w-[168px] overflow-hidden rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-1 shadow-[var(--shadow-soft)]"
        >
          {NATURE_CATEGORIES.map((category) => {
            const on = category.id === layer;
            return (
              <button
                key={category.id}
                type="button"
                role="menuitem"
                onClick={() => pick(category.id, category.enabled, category.comingSoonMessage)}
                aria-current={on}
                aria-disabled={!category.enabled}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13.5px] transition-colors ${
                  category.enabled
                    ? on
                      ? 'bg-[color:var(--color-accent-soft)] font-semibold text-[color:var(--color-accent-strong)]'
                      : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-line-soft)]'
                    : 'text-[color:var(--color-faint)]'
                }`}
              >
                <span aria-hidden className="text-[15px]">
                  {category.icon}
                </span>
                {category.label}
                {!category.enabled && (
                  <span className="ml-auto text-[11px] text-[color:var(--color-faint)]">준비 중</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded-lg bg-[color:var(--color-ink)] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-[var(--shadow-soft)]"
        >
          {notice}
        </p>
      )}
    </div>
  );
}
