'use client';

import { useEffect, type RefObject } from 'react';
import type { MapLayerId } from '@/domain/nature-categories';
import { PEAK_CRITERION } from '@/domain/official-foliage-forecast';
import { PEAK_REACHED_PROGRESS, mountainColorAt } from '@/services/terrain-season';
import { FLOWER_COLOR } from '@/services/flower-service';
import { FLOWER_WAVE_LABEL } from '@/domain/flower-labels';
import type { MountainPhase } from '@/services/mountain-service';
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


/*
 * 철새는 같은 그림의 존재감만 바뀐다 — 상태마다 다른 캐릭터로 갈아 끼우지 않는다.
 * 그래서 범례도 색이 아니라 크기와 진하기로 설명한다.
 */
const BIRD_LEGEND: { state: string; label: string; hint: string; scale: number; opacity: number }[] =
  [
    { state: 'PEAK', label: '가장 많은 시기', hint: '또렷하고 조금 큽니다', scale: 1.05, opacity: 1 },
    { state: 'GOOD', label: '머무는 중', hint: '기본 크기입니다', scale: 1, opacity: 0.9 },
    { state: 'STARTING', label: '도래 시작', hint: '한 단계 옅습니다', scale: 0.92, opacity: 0.7 },
    { state: 'ENDING', label: '떠나는 중', hint: '더 옅고 색이 빠집니다', scale: 0.96, opacity: 0.6 },
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
  layer,
  phase,
  mode,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  layer: MapLayerId;
  /** 지금 산에서 무엇이 일어나고 있는가 — 범례가 달라진다 */
  phase: MountainPhase;
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

  if (layer === 'bird') {
    return (
      <div
        role="dialog"
        aria-label="지도 보는 법"
        className="absolute inset-x-0 top-full z-30 mt-1.5 space-y-2 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-3 text-[11.5px] leading-relaxed shadow-[var(--shadow-soft)]"
      >
        <p className="text-[13px] font-semibold tracking-tight">지도 보는 법</p>

        <ul className="space-y-1">
          {BIRD_LEGEND.map((row) => (
            <li key={row.state} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--color-ink-soft)]"
                style={{ opacity: row.opacity, transform: `scale(${row.scale})` }}
              />
              <span className="font-medium text-[color:var(--color-ink-soft)]">{row.label}</span>
              <span className="text-[color:var(--color-faint)]">{row.hint}</span>
            </li>
          ))}
        </ul>

        <p className="border-t border-[color:var(--color-line-soft)] pt-2 text-[color:var(--color-muted)]">
          새 한 마리는 <span className="text-[color:var(--color-ink-soft)]">그 지역에서 만날 수 있다</span>는
          뜻입니다. 날짜를 옮기면 자리는 그대로 있고 존재감만 바뀝니다 —
          이 지도는 이동 경로도, 무리도 그리지 않습니다.
        </p>

        <p className="text-[color:var(--color-faint)]">
          전국 화면에는 모든 기록을 올리지 않습니다. 접힌 것은 지금 없는 것이 아니라
          이번 화면에 올리지 않은 것입니다. 상태를 판단할 수 없는 기록은 아예
          <span className="text-[color:var(--color-ink-soft)]"> 그리지 않습니다</span> —
          &lsquo;모른다&rsquo;와 &lsquo;지금 없다&rsquo;는 다른 말이기 때문입니다.
        </p>
      </div>
    );
  }

  if (layer === 'mountain' && phase === 'flower') {
    return (
      <div
        role="dialog"
        aria-label="지도 보는 법"
        className="absolute inset-x-0 top-full z-30 mt-1.5 space-y-2 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-3 text-[11.5px] leading-relaxed shadow-[var(--shadow-soft)]"
      >
        <p className="text-[13px] font-semibold tracking-tight">지도 보는 법</p>

        <ul className="space-y-1">
          {Object.entries(FLOWER_WAVE_LABEL).map(([slug, name]) => (
            <li key={slug} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: FLOWER_COLOR[slug]?.petal }}
              />
              <span className="font-medium text-[color:var(--color-ink-soft)]">{name}</span>
            </li>
          ))}
        </ul>

        <p className="border-t border-[color:var(--color-line-soft)] pt-2 text-[color:var(--color-muted)]">
          숲과 산자락에 얹힌 꽃송이가 그 지역의 개화입니다. 촘촘할수록 활짝 핀 것이고,
          날짜를 넘기면 그 자리가 남쪽에서 북쪽으로 올라갑니다.
        </p>

        <p className="text-[color:var(--color-faint)]">
          꽃은 계절이 바꿔 줍니다 — 3월에는 개나리와 진달래, 4월에는 벚꽃이 앞에 섭니다.
          어느 명소인지 짚어 보려면 명소별로 바꾸세요.
        </p>
      </div>
    );
  }

  if (layer === 'mountain') {
    return (
      <div
        role="dialog"
        aria-label="지도 보는 법"
        className="absolute inset-x-0 top-full z-30 mt-1.5 space-y-2 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-3 text-[11.5px] leading-relaxed shadow-[var(--shadow-soft)]"
      >
        <p className="text-[13px] font-semibold tracking-tight">지도 보는 법</p>

        <ul className="space-y-1">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: mountainColorAt(0).face }}
            />
            <span className="font-medium text-[color:var(--color-ink-soft)]">예측일 전</span>
            <span className="text-[color:var(--color-faint)]">지도 원래 색 그대로</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: mountainColorAt(PEAK_REACHED_PROGRESS).face }}
            />
            <span className="font-medium text-[color:var(--color-ink-soft)]">예측일 도달</span>
            <span className="text-[color:var(--color-faint)]">공식 절정 예측일이 지났습니다</span>
          </li>
        </ul>

        {/*
          신뢰 경계. 지도가 보여 주는 것이 '지금 단풍 현황' 이 아니라는 것을
          여기서 분명히 말한다 — 공식 자료가 주는 것은 날짜뿐이다.
        */}
        <p className="border-t border-[color:var(--color-line-soft)] pt-2 text-[color:var(--color-muted)]">
          2026 공식 단풍절정 예측지도 기반. 각 수종의 {PEAK_CRITERION} 시점을 절정 기준으로
          사용합니다. 지도 색 변화는 공식 절정 예측일의 시간적 흐름을 시각화한 것입니다.
        </p>

        <p className="text-[color:var(--color-faint)]">
          실시간 단풍 현황이 아닙니다. 시작일 · 종료일 · 현재 단풍률은 공식 자료에 없으므로
          표시하지 않습니다. 공식 예측 지점이 없는 지역에는 단풍색을 입히지 않습니다
          (겨울과 신록은 공식 예측과 별개 축이라 그 지역에도 나타납니다).
        </p>
      </div>
    );
  }

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
