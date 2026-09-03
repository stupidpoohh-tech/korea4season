'use client';

import { CategorySelector } from './CategorySelector';
import type { MapLayerId } from '@/domain/nature-categories';
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
  layer: MapLayerId;
  /** 지금 산 한 줄 — 개수가 아니라 지금 계절이 어디까지 왔는가 */
  mountainHeadline: string;
  mode: MapMode;
  /** 지금 조건에 맞는 대상 수 */
  count: number;
  filtered: boolean;
  counts: MapCounts;
  /**
   * 모바일에서는 내역 줄을 접고 제목을 서비스명으로 쓴다.
   *
   * 모바일에는 전역 헤더가 없어서(lg 이상에서만 그린다) 이 줄이 화면의
   * 좌측 최상단이다. 서비스가 무엇인지 여기서 한 번은 말해야 한다.
   * 세로 한 줄은 곧 지도 크기이므로 상태는 아랫줄로 내린다.
   */
  compact?: boolean;
}

export function CurrentStateSummary({
  layer,
  mountainHeadline,
  mode,
  count,
  filtered,
  counts,
  compact = false,
}: Props) {
  const unit = layer === 'mountain' ? '곳' : mode === 'zone' ? '곳' : '종';

  return (
    <div className="min-w-0">
      {compact ? (
        <>
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-semibold leading-[19px] tracking-tight">지금日지도</p>
            <span aria-hidden className="text-[color:var(--color-line)]">|</span>
            <CategorySelector compact />
          </div>
          <p className="truncate text-[11.5px] leading-[15px] text-[color:var(--color-muted)]">
            {layer === 'mountain' ? (
              /*
               * 산은 마커 수를 세지 않는다.
               * 지도에서 바뀌는 것은 표시의 개수가 아니라 계절이 어디까지 왔는가다.
               */
              <>
                <span className="font-semibold text-[color:var(--color-ink-soft)]">
                  {mountainHeadline}
                </span>
                {filtered && ` · 지도에 ${count}곳`}
              </>
            ) : (
              <>
                지금 바다에{' '}
                <span className="tabular font-semibold text-[color:var(--color-ink-soft)]">
                  {count}
                </span>
                {unit}
                {filtered && ` · 전체 ${counts.season.all}${unit} 가운데`}
              </>
            )}
          </p>
        </>
      ) : (
        <>
          {/* CategorySelector 가 div 를 그리므로 p 로 감싸면 안 된다 (HTML 위반 → hydration 오류) */}
          <div className="flex flex-wrap items-baseline gap-x-1.5 leading-[19px]">
            <CategorySelector />
            {layer === 'mountain' ? (
              <span className="text-[13.5px] font-semibold text-[color:var(--color-ink)]">
                {mountainHeadline}
              </span>
            ) : (
              <span className="text-[13.5px] text-[color:var(--color-ink-soft)]">
                <span className="tabular font-semibold text-[color:var(--color-ink)]">{count}</span>
                {unit}
                {mode === 'zone' ? '에서 만날 수 있어요' : ' 활동 중'}
              </span>
            )}
          </div>
          {/*
            산은 아래 권역 목록이 곧 내역이다 — 같은 말을 숫자로 한 번 더 하지 않는다.
          */}
          {layer !== 'mountain' && (
            <p className="truncate text-[11px] leading-[15px] text-[color:var(--color-muted)]">
              <Breakdown mode={mode} counts={counts} filtered={filtered} unit={unit} />
            </p>
          )}
          {layer === 'mountain' && filtered && (
            <p className="truncate text-[11px] leading-[15px] text-[color:var(--color-accent-strong)]">
              필터 적용 중
            </p>
          )}
        </>
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
