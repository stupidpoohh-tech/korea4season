'use client';

import { Sheet } from '@/components/common/Sheet';
import type { MapLayerId } from '@/domain/nature-categories';
import { FOLIAGE_STATE_LABEL, type FoliageState } from '@/services/foliage-service';
import { FLOWER_WAVE_LABEL } from '@/domain/flower-labels';
import type { MountainPhase } from '@/services/mountain-service';
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
  layer: MapLayerId;
  mode: MapMode;
  counts: MapCounts;
  /** 지금 산에서 무엇이 일어나고 있는가 — 좁힐 축이 달라진다 */
  phase: MountainPhase;
}

/** 단풍 상태 필터. 바다의 시즌 강도와 같은 자리, 같은 어휘를 쓴다. */
const FOLIAGE_FILTERS: (FoliageState | 'all')[] = ['all', 'peak', 'good', 'starting', 'ending'];

export function MarineFilterSheet({ open, onClose, layer, phase, mode, counts }: Props) {
  const seasonFilter = useMapStore((s) => s.seasonFilter);
  const setSeason = useMapStore((s) => s.setSeasonFilter);
  const startingOnly = useMapStore((s) => s.startingOnly);
  const toggleStarting = useMapStore((s) => s.toggleStartingOnly);
  const legalOnly = useMapStore((s) => s.legalOnly);
  const toggleLegal = useMapStore((s) => s.toggleLegalOnly);
  const reset = useMapStore((s) => s.resetFilters);

  const foliageState = useMapStore((s) => s.foliageState);
  const setFoliageState = useMapStore((s) => s.setFoliageState);
  const flowerSpecies = useMapStore((s) => s.flowerSpecies);
  const setFlowerSpecies = useMapStore((s) => s.setFlowerSpecies);

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
            {layer === 'mountain'
              ? phase === 'flower'
                ? '어떤 꽃을 볼까요?'
                : '어떤 단풍을 볼까요?'
              : mode === 'zone'
                ? '어떤 권역을 볼까요?'
                : '어떤 상태를 볼까요?'}
          </h2>
          <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
            고르는 즉시 지도에 반영됩니다
          </p>
        </div>
      }
    >
      {/* 꽃 시즌에는 종류로 좁힌다. 상태는 지도의 무리 밀도가 이미 말한다. */}
      {layer === 'mountain' && phase === 'flower' && mode === 'species' && (
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-medium text-[color:var(--color-faint)]">
            꽃 종류
          </legend>

          <div className="space-y-0.5">
            {['all', ...Object.keys(FLOWER_WAVE_LABEL)].map((slug) => {
              const on = flowerSpecies === slug;
              return (
                <label
                  key={slug}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors ${
                    on ? 'bg-[color:var(--color-accent-soft)]' : 'hover:bg-[color:var(--color-line-soft)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="flower-filter"
                    checked={on}
                    onChange={() => setFlowerSpecies(slug)}
                    className="h-4 w-4 shrink-0 accent-[color:var(--color-accent-strong)]"
                  />
                  <span
                    className={`flex-1 text-[14px] ${on ? 'font-semibold text-[color:var(--color-accent-strong)]' : 'text-[color:var(--color-ink-soft)]'}`}
                  >
                    {slug === 'all' ? '전체' : FLOWER_WAVE_LABEL[slug]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* 지역별 보기에는 지도에 그림이 없다 — 좁힐 대상 자체가 없으므로 내보내지 않는다 */}
      {layer === 'mountain' && phase === 'foliage' && mode === 'species' && (
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-medium text-[color:var(--color-faint)]">
            단풍 상태
          </legend>

          <div className="space-y-0.5">
            {FOLIAGE_FILTERS.map((state) => {
              const on = foliageState === state;
              return (
                <label
                  key={state}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors ${
                    on ? 'bg-[color:var(--color-accent-soft)]' : 'hover:bg-[color:var(--color-line-soft)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="foliage-filter"
                    checked={on}
                    onChange={() => setFoliageState(state)}
                    className="h-4 w-4 shrink-0 accent-[color:var(--color-accent-strong)]"
                  />
                  <span
                    className={`flex-1 text-[14px] ${on ? 'font-semibold text-[color:var(--color-accent-strong)]' : 'text-[color:var(--color-ink-soft)]'}`}
                  >
                    {state === 'all' ? '전체' : FOLIAGE_STATE_LABEL[state]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {layer !== 'mountain' && mode === 'species' && (
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-medium text-[color:var(--color-faint)]">
            시즌 강도
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
      {layer !== 'mountain' && (showStarting || showLegal) && (
        <div className="space-y-0.5 border-t border-[color:var(--color-line-soft)] pt-3">
          <p className="mb-1 text-[12px] font-medium text-[color:var(--color-faint)]">
            함께 좁히기
          </p>

          {showStarting && (
            <CheckRow
              checked={startingOnly}
              onChange={toggleStarting}
              label="이제 막 시작한 시즌만"
              hint="곧 좋아질 어종"
              count={counts.starting}
            />
          )}

          {showLegal && (
            <CheckRow
              checked={legalOnly}
              onChange={toggleLegal}
              label={`규정 있는 ${unit}만`}
              hint="금어기 등 지금 잡을 수 없는 어종"
              count={counts.restricted}
            />
          )}
        </div>
      )}

      {layer !== 'mountain' && mode === 'zone' && (
        <p className="rounded-xl bg-[color:var(--color-line-soft)] px-3 py-2.5 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          {!showLegal && '지금 이 날짜에는 좁힐 조건이 없습니다. '}
          권역은 여러 어종을 묶어 보여 주기 때문에 시즌 강도로 좁히지 않습니다.
          강도로 보려면 어종별 보기로 바꿔 주세요.
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
