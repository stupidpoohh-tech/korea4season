'use client';

import { formatDaysValue } from '@/domain/date';
import {
  FOLIAGE_STATE_COLOR,
  FOLIAGE_STATE_LABEL,
  type FoliageRegion,
  type FoliageSpot,
} from '@/services/foliage-service';

/* ────────────────────────────────────────────────────────────
 * 지역별 보기의 좌측 레일.
 *
 * 지도에는 그림이 하나도 없으므로 목록이 지도의 색을 읽는 통로가 된다.
 * 순서는 북 → 남 그대로다 — 위에서부터 읽으면 그것이 단풍 전선이다.
 *
 * 색 조각만 두지 않고 상태 이름을 함께 적는다.
 * 색만으로 뜻을 전하면 색을 구분하기 어려운 사람에게는 아무 말도 하지 않는 셈이다.
 * ──────────────────────────────────────────────────────────── */

export function FoliageRegionList({
  regions,
  selectedId,
  onSelect,
}: {
  regions: FoliageRegion[];
  selectedId: string | null;
  onSelect: (spot: FoliageSpot) => void;
}) {
  return (
    <aside aria-label="지역별 단풍" className="hidden min-h-0 flex-col lg:flex">
      <h2 className="mb-2 px-0.5 text-[12px] font-medium tracking-wide text-[color:var(--color-faint)]">
        북쪽부터 남쪽으로
      </h2>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]">
        {regions.map((region) => {
          const color = FOLIAGE_STATE_COLOR[region.state];
          const active = `foliage:${region.lead.location.slug}` === selectedId;

          return (
            <li key={region.id}>
              <button
                type="button"
                onClick={() => onSelect(region.lead)}
                aria-pressed={active}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'border-[color:var(--color-ink)]/30 bg-white'
                    : 'border-transparent hover:bg-white'
                }`}
              >
                <span
                  aria-hidden
                  className="h-7 w-2 shrink-0 rounded-full transition-colors duration-300"
                  style={{ background: color.face }}
                />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-[13px] font-medium">{region.label}</span>
                    <span
                      className="shrink-0 text-[11px] font-semibold"
                      style={{ color: color.faceDark }}
                    >
                      {FOLIAGE_STATE_LABEL[region.state]}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-[color:var(--color-muted)]">
                    {region.lead.location.name}
                    {region.lead.nextChangeLabel && region.lead.daysToNextChange !== undefined
                      ? ` · ${region.lead.nextChangeLabel} ${formatDaysValue(region.lead.daysToNextChange)}`
                      : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
