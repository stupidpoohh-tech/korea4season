'use client';

import { SEASON_FILTERS, type MapCounts, type MapMode } from '@/services/map-service';

/* ────────────────────────────────────────────────────────────
 * LEVEL 1 — 지금 바다가 어떤 상태인가.
 *
 * 이 영역은 버튼이 아니다. 누를 것을 찾기 전에 무엇을 보고 있는지
 * 먼저 읽히게 하는 것이 목적이므로 테두리도 배경도 주지 않는다.
 *
 * 두 번째 줄은 첫 줄을 되풀이하지 않는다 — 총합을 쪼갠 내역이다.
 * 절정 + 좋음 + 보통 = 총합이 눈으로 확인되므로,
 * 숫자끼리 충돌한다는 인상이 생기지 않는다.
 *
 * 여기 수는 '조건에 맞는 대상 수' 다. 과밀로 접힌 것을 뺀 '지금 그려진 수' 는
 * 타임라인이 따로 말한다 — 같은 숫자를 두 곳에서 다르게 말하지 않도록
 * 문구로 뜻을 갈라 둔다.
 * ──────────────────────────────────────────────────────────── */

interface Props {
  mode: MapMode;
  /** 지금 조건에 맞는 대상 수 */
  count: number;
  filtered: boolean;
  counts: MapCounts;
  /**
   * 모바일에서는 내역 줄을 접는다.
   * 이 화면에서 세로 한 줄은 곧 지도 크기다 — 분할은 필터 시트가,
   * 지금 걸린 조건은 아래 칩이 이미 말한다.
   */
  compact?: boolean;
}

export function CurrentStateSummary({ mode, count, filtered, counts, compact = false }: Props) {
  const unit = mode === 'zone' ? '곳' : '종';

  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-baseline gap-x-1.5 leading-[19px]">
        <span className="text-[15px] font-semibold tracking-tight sm:text-[16px]">지금, 바다</span>
        <span className="text-[13px] text-[color:var(--color-ink-soft)] sm:text-[13.5px]">
          <span className="tabular font-semibold text-[color:var(--color-ink)]">{count}</span>
          {unit}
          {mode === 'zone' ? '에서 만날 수 있어요' : ' 활동 중'}
        </span>
      </p>

      {!compact && (
        <p className="truncate text-[11px] leading-[15px] text-[color:var(--color-muted)]">
          <Breakdown mode={mode} counts={counts} filtered={filtered} unit={unit} />
        </p>
      )}
    </div>
  );
}

function Breakdown({
  mode,
  counts,
  filtered,
  unit,
}: {
  mode: MapMode;
  counts: MapCounts;
  filtered: boolean;
  unit: string;
}) {
  if (filtered) {
    return (
      <span className="text-[color:var(--color-accent-strong)]">
        필터 적용 중 · 전체 {counts.season.all}
        {unit} 가운데
      </span>
    );
  }

  // 권역에는 시즌 강도 분할이 없다 — 대신 눈에 띄는 두 축만 말한다
  const parts =
    mode === 'zone'
      ? [
          counts.starting > 0 ? `시작 중 ${counts.starting}곳` : null,
          counts.restricted > 0 ? `규정 있음 ${counts.restricted}곳` : null,
        ]
      : SEASON_FILTERS.filter((f) => f.id !== 'all' && counts.season[f.id] > 0).map(
          (f) => `${f.label} ${counts.season[f.id]}`,
        );

  const shown = parts.filter(Boolean);
  if (shown.length === 0) return <>지금 시즌인 것이 없습니다</>;

  return <>{shown.join(' · ')}</>;
}
