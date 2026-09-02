'use client';

import { Sheet } from '@/components/common/Sheet';
import { SEASON_FILTERS, type MapCounts, type MapMode } from '@/services/map-service';
import { useMapStore } from '@/store/map-store';
import { useActiveFilterCount } from './FilterTrigger';

/* ────────────────────────────────────────────────────────────
 * 필터는 지도보다 먼저 시선을 빼앗지 않는다 — 필요할 때만 열린다.
 *
 * 시트 안에서도 축을 섞지 않는다.
 *   시즌 강도 — 상호배타적 분할. 세 값의 합이 '전체' 와 같다.
 *   시점      — '시작 중' 은 강도와 겹치므로 따로 켜고 끈다.
 *   규정      — '잡아도 되는가'. 시즌과 아예 다른 축이다.
 *
 * 고른 즉시 지도에 반영된다. '적용' 은 확정이 아니라 시트를 닫는 버튼이므로
 * 데스크톱에서는 시트 밖의 지도가 이미 바뀐 것을 보면서 고를 수 있다.
 * ──────────────────────────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  mode: MapMode;
  counts: MapCounts;
}

export function MarineFilterSheet({ open, onClose, mode, counts }: Props) {
  const seasonFilter = useMapStore((s) => s.seasonFilter);
  const setSeason = useMapStore((s) => s.setSeasonFilter);
  const startingOnly = useMapStore((s) => s.startingOnly);
  const toggleStarting = useMapStore((s) => s.toggleStartingOnly);
  const legalOnly = useMapStore((s) => s.legalOnly);
  const toggleLegal = useMapStore((s) => s.toggleLegalOnly);
  const reset = useMapStore((s) => s.resetFilters);

  const active = useActiveFilterCount();
  const unit = mode === 'zone' ? '권역' : '어종';

  const showStarting = mode === 'species' && (counts.starting > 0 || startingOnly);
  const showLegal = counts.restricted > 0 || legalOnly;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="지도 필터"
      header={
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">
            {mode === 'zone' ? '어떤 권역을 볼까요?' : '어떤 상태를 볼까요?'}
          </h2>
          <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
            고르는 즉시 지도에 반영됩니다
          </p>
        </div>
      }
    >
      {mode === 'species' && (
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-medium text-[color:var(--color-faint)]">
            시즌 강도 — 세 값을 더하면 전체가 됩니다
          </legend>

          <div className="space-y-0.5">
            {SEASON_FILTERS.map((filter) => {
              const on = seasonFilter === filter.id;
              return (
                <label
                  key={filter.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors ${
                    on ? 'bg-[color:var(--color-accent-soft)]' : 'hover:bg-[color:var(--color-line-soft)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="season-filter"
                    checked={on}
                    onChange={() => setSeason(filter.id)}
                    className="h-4 w-4 shrink-0 accent-[color:var(--color-accent-strong)]"
                  />
                  <span
                    className={`flex-1 text-[14px] ${on ? 'font-semibold text-[color:var(--color-accent-strong)]' : 'text-[color:var(--color-ink-soft)]'}`}
                  >
                    {filter.label}
                  </span>
                  <span className="tabular text-[13px] text-[color:var(--color-muted)]">
                    {counts.season[filter.id]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/*
        0 건인 축은 아예 그리지 않는다 — 누를 수 없는 빈 줄은 정보가 아니다.
        이미 켜 둔 필터가 0 건이 된 경우에는 끌 수 있어야 하므로 남긴다.
      */}
      {(showStarting || showLegal) && (
        <div className="space-y-0.5 border-t border-[color:var(--color-line-soft)] pt-3">
          <p className="mb-1 text-[12px] font-medium text-[color:var(--color-faint)]">
            {mode === 'zone' ? '따로 보기' : '시즌 강도와는 다른 축입니다'}
          </p>

          {showStarting && (
            <CheckRow
              checked={startingOnly}
              onChange={toggleStarting}
              label="이제 막 시작한 시즌만"
              hint="강도와 겹칩니다 — 좋음이면서 시작 중일 수 있어요"
              count={counts.starting}
            />
          )}

          {showLegal && (
            <CheckRow
              checked={legalOnly}
              onChange={toggleLegal}
              label={`규정 있는 ${unit}만`}
              hint="지금 잡을 수 없는 것 — 지도에서 지우지 않고 표시만 붙습니다"
              count={counts.restricted}
            />
          )}
        </div>
      )}

      {mode === 'zone' && (
        <p className="rounded-xl bg-[color:var(--color-line-soft)] px-3 py-2.5 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          {!showLegal && '지금은 좁힐 조건이 없습니다. '}
          권역은 어종 묶음이라 시즌 강도로 거르지 않습니다. &lsquo;절정인 권역&rsquo;은
          절정인 어종을 하나라도 가진 권역이 되어, 칩의 숫자와 지도가 서로 다른 것을
          가리키게 되기 때문입니다. 강도로 좁히려면 어종별 보기로 바꾸세요.
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={reset}
          disabled={active === 0}
          className="rounded-xl border border-[color:var(--color-line)] px-3.5 py-2.5 text-[13px] font-medium text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-ink)]/25 disabled:opacity-40"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-[color:var(--color-ink)] px-3.5 py-2.5 text-[13.5px] font-semibold text-white"
        >
          적용
        </button>
      </div>
    </Sheet>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  hint,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
  count: number;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors ${
        checked ? 'bg-[color:var(--color-accent-soft)]' : 'hover:bg-[color:var(--color-line-soft)]'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--color-accent-strong)]"
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[14px] ${checked ? 'font-semibold text-[color:var(--color-accent-strong)]' : 'text-[color:var(--color-ink-soft)]'}`}
        >
          {label}
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[color:var(--color-faint)]">
          {hint}
        </span>
      </span>
      <span className="tabular shrink-0 text-[13px] text-[color:var(--color-muted)]">{count}</span>
    </label>
  );
}
