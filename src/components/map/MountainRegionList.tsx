'use client';

/* ────────────────────────────────────────────────────────────
 * 지역별 보기의 좌측 레일.
 *
 * 지도에는 그림이 하나도 없으므로 목록이 지도의 색을 읽는 통로가 된다.
 * 순서는 전선이 지나가는 순서 그대로다 — 봄은 남에서 북으로,
 * 가을은 북에서 남으로. 위에서부터 읽으면 그것이 곧 전선이다.
 *
 * 색 조각만 두지 않고 상태 이름을 함께 적는다.
 * 색만으로 뜻을 전하면 색을 구분하기 어려운 사람에게는 아무 말도 하지 않는 셈이다.
 * ──────────────────────────────────────────────────────────── */

export interface RegionRow {
  id: string;
  label: string;
  /** 상태 이름 (절정 · 개화 중 · 끝물 …) */
  stateLabel: string;
  /** 왼쪽 색 조각 */
  color: string;
  /** 상태 이름에 쓰는 진한 색 */
  strongColor: string;
  /** 아랫줄 — 대표 명소와 남은 날 */
  detail: string;
  active: boolean;
  onSelect: () => void;
}

export function MountainRegionList({
  title,
  rows,
}: {
  /** "북쪽부터 남쪽으로" / "남쪽부터 북쪽으로" */
  title: string;
  rows: RegionRow[];
}) {
  return (
    <aside aria-label="지역별 상태" className="hidden min-h-0 flex-col lg:flex">
      <h2 className="mb-2 px-0.5 text-[12px] font-medium tracking-wide text-[color:var(--color-faint)]">
        {title}
      </h2>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[color:var(--color-line)] px-3 py-4 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
          이 시기에는 산이 조용합니다. 아래 슬라이더를 봄이나 가을로 옮겨 보세요.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={row.onSelect}
                aria-pressed={row.active}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  row.active
                    ? 'border-[color:var(--color-ink)]/30 bg-white'
                    : 'border-transparent hover:bg-white'
                }`}
              >
                <span
                  aria-hidden
                  className="h-7 w-2 shrink-0 rounded-full transition-colors duration-300"
                  style={{ background: row.color }}
                />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-[13px] font-medium">{row.label}</span>
                    <span
                      className="shrink-0 text-[11px] font-semibold"
                      style={{ color: row.strongColor }}
                    >
                      {row.stateLabel}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-[color:var(--color-muted)]">
                    {row.detail}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
