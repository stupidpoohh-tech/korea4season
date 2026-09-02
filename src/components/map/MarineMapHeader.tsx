'use client';

import { useCallback, useRef, useState } from 'react';
import type { MapLayerId } from '@/domain/nature-categories';
import type { FoliageCounts } from '@/services/foliage-service';
import type { MapCounts, MapMode } from '@/services/map-service';
import { ActiveFilterChips } from './ActiveFilterChips';
import { CurrentStateSummary } from './CurrentStateSummary';
import { FilterTrigger } from './FilterTrigger';
import { LegendTrigger, MarkerLegendPopover } from './MarkerLegendPopover';
import { ViewModeToggle } from './ViewModeToggle';

/* ────────────────────────────────────────────────────────────
 * 지도 상단 — 읽는 순서가 곧 구조다.
 *
 *   1. 지금 바다가 어떤 상태인가   (텍스트. 누르는 것이 아니다)
 *   2. 무엇을 기준으로 볼 것인가   (이 화면의 유일한 primary control)
 *   3. 필요할 때 좁힌다            (보조. 닫혀 있는 것이 기본)
 *   ─. 도움말                       (아이콘 하나)
 *
 * 예전에는 이 넷이 같은 크기의 흰 버튼으로 한 줄에 늘어서서
 * 무엇이 무엇인지 구분되지 않았다. 지금은 surface 자체를 다르게 준다 —
 * 채움 / 외곽선 / 텍스트.
 * ──────────────────────────────────────────────────────────── */

interface Props {
  layer: MapLayerId;
  mode: MapMode;
  counts: MapCounts;
  foliage: FoliageCounts;
  /** 지금 조건에 맞는 대상 수 */
  count: number;
  filtered: boolean;
  onOpenFilter: () => void;
  /** 데스크톱 좌측 레일에서는 세로로 쌓는다 */
  stacked?: boolean;
}

export function MarineMapHeader({
  layer,
  mode,
  counts,
  foliage,
  count,
  filtered,
  onOpenFilter,
  stacked = false,
}: Props) {
  // 팝오버의 '바깥' 판정 기준. 트리거와 팝오버를 함께 담는다.
  const boxRef = useRef<HTMLDivElement>(null);

  /*
   * 도움말 열림 상태는 이 헤더의 것이다.
   *
   * 모바일 바와 데스크톱 레일이 동시에 마운트되어 있으므로(보이는 쪽만 다르다)
   * 상태를 위에서 공유하면, 숨어 있는 쪽의 '바깥 클릭' 판정이 먼저 닫고
   * 보이는 쪽의 클릭이 다시 열어서 ⓘ 를 다시 눌러도 닫히지 않는다.
   */
  const [legendOpen, setLegendOpen] = useState(false);
  const closeLegend = useCallback(() => setLegendOpen(false), []);
  const openFilter = useCallback(() => {
    setLegendOpen(false);
    onOpenFilter();
  }, [onOpenFilter]);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-start gap-2">
        <CurrentStateSummary
          layer={layer}
          foliage={foliage}
          mode={mode}
          count={count}
          filtered={filtered}
          counts={counts}
          compact={!stacked}
        />
        <div className="ml-auto shrink-0">
          <LegendTrigger open={legendOpen} onToggle={() => setLegendOpen((v) => !v)} />
        </div>
      </div>

      {/* 모바일에서는 필터가 왼쪽, 보기 방식이 오른쪽 */}
      <div className={stacked ? 'mt-2 space-y-1.5' : 'mt-1 flex items-center gap-2'}>
        {stacked ? (
          <>
            <ViewModeToggle layer={layer} full />
            <FilterTrigger onOpen={openFilter} full />
          </>
        ) : (
          <>
            <FilterTrigger onOpen={openFilter} />
            <div className="ml-auto">
              <ViewModeToggle layer={layer} />
            </div>
          </>
        )}
      </div>

      <div className="mt-1 empty:mt-0">
        {/* 데스크톱 레일에서는 요약 줄이 이미 '전체 N종 가운데' 를 말한다 */}
        <ActiveFilterChips
          layer={layer}
          mode={mode}
          total={stacked ? undefined : counts.season.all}
          unit={mode === 'zone' ? '곳' : '종'}
        />
      </div>

      <MarkerLegendPopover
        open={legendOpen}
        onClose={closeLegend}
        mode={mode}
        anchorRef={boxRef}
      />
    </div>
  );
}
