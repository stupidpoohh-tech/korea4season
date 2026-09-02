'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { formatKoreanDate, toDateKey, type DateKey } from '@/domain/date';
import { FISHING_METHOD_LABEL, SEASON_STRENGTH_LABEL } from '@/domain/marine';
import type { MarineMapItem } from '@/services/marine-service';
import { Sheet, SheetRow } from '@/components/common/Sheet';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { DemoBadge } from '@/components/common/DemoBadge';
import { useDexStore } from '@/store/dex-store';
import { SeasonStrengthMeter } from './SeasonStrengthMeter';
import { LegalNotice } from './LegalNotice';
import { ObservationSummaryLine } from './ObservationList';

interface Props {
  item: MarineMapItem | null;
  date: DateKey;
  onClose: () => void;
  onOpenZone?: (zoneSlug: string) => void;
}

/**
 * 어종 상세 — season first.
 *
 * 순서가 곧 제품 방향이다.
 *   지금 시즌 → 시기 → 어디서 → 어떻게 → 실제 지금 → 규정
 * 규정을 맨 위로 올리면 다시 금어기 앱이 된다.
 */
export function MarineDetailSheet({ item, date, onClose, onOpenZone }: Props) {
  const discover = useDexStore((s) => s.discover);

  useEffect(() => {
    if (item) discover(item.species.id, date);
  }, [item, date, discover]);

  return (
    <Sheet
      open={Boolean(item)}
      onClose={onClose}
      label={item ? `${item.species.name} 상세` : ''}
      header={
        item && (
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-sky-soft)]"
            >
              <SpeciesSprite entity={item.species} size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="text-[17px] font-semibold tracking-tight">{item.species.name}</h2>
                {item.species.aliases?.length ? (
                  <span className="text-[12px] text-[color:var(--color-muted)]">
                    {item.species.aliases.join(' · ')}
                  </span>
                ) : null}
                <DemoBadge />
              </div>
              {item.species.speciesName && (
                <p className="mt-0.5 text-[11.5px] italic text-[color:var(--color-faint)]">
                  {item.species.speciesName}
                </p>
              )}
            </div>
          </div>
        )
      }
    >
      {item && (
        <>
          {/* 1. 지금 시즌 */}
          <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] px-3.5 py-3">
            <p className="text-[12px] text-[color:var(--color-faint)]">지금 시즌</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <SeasonStrengthMeter state={item.state} />
              {item.season.daysToNextChange !== undefined && item.season.nextChangeLabel && (
                <span className="text-[12.5px] text-[color:var(--color-muted)]">
                  {item.season.nextChangeLabel}{' '}
                  <span className="font-semibold tabular text-[color:var(--color-ink)]">
                    {item.season.daysToNextChange}일
                  </span>
                </span>
              )}
            </div>
          </div>

          <p className="text-[13.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
            {item.species.summary}
          </p>

          {/* 2. 시기 */}
          <dl className="divide-y divide-[color:var(--color-line-soft)] border-y border-[color:var(--color-line-soft)]">
            <SheetRow label="주요 시기">
              <span className="tabular">
                {formatKoreanDate(toDateKey(new Date(`${item.season.window.start}T00:00:00Z`)))} ~{' '}
                {formatKoreanDate(toDateKey(new Date(`${item.season.window.end}T00:00:00Z`)))}
              </span>
            </SheetRow>
            {item.season.peakWindow && (
              <SheetRow label="피크">
                <span className="tabular">
                  {formatKoreanDate(toDateKey(new Date(`${item.season.peakWindow.start}T00:00:00Z`)))} ~{' '}
                  {formatKoreanDate(toDateKey(new Date(`${item.season.peakWindow.end}T00:00:00Z`)))}
                </span>
              </SheetRow>
            )}
            <SheetRow label="해역">{item.seaRegion}</SheetRow>
          </dl>

          {/* 3. 어디서 */}
          <section>
            <h3 className="mb-2 text-[13px] font-semibold">지금 만나기 좋은 권역</h3>
            <ul className="space-y-1">
              {item.activeZones.slice(0, 6).map(({ zone, season }) => (
                <li key={zone.id}>
                  <button
                    type="button"
                    onClick={() => onOpenZone?.(zone.slug)}
                    className="flex w-full items-center gap-2 rounded-lg border border-[color:var(--color-line)] px-2.5 py-2 text-left transition-colors hover:border-[color:var(--color-ink)]/25"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {zone.name}
                    </span>
                    <SeasonStrengthMeter state={season.state} size="sm" showLabel={false} />
                    <span className="text-[11.5px] text-[color:var(--color-muted)]">
                      {SEASON_STRENGTH_LABEL[season.state]}
                    </span>
                    <span aria-hidden className="text-[color:var(--color-faint)]">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. 어떻게 */}
          <MethodList item={item} />

          {/* 5. 실제 지금 */}
          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold">최근 관측</h3>
            {item.observation ? (
              <ObservationSummaryLine summary={item.observation} />
            ) : (
              <p className="text-[12.5px] text-[color:var(--color-muted)]">
                선택한 날짜에는 현장 관측이 적용되지 않습니다. 관측은 실제 오늘 기준입니다.
              </p>
            )}
          </section>

          {/* 6. 규정 — 행동 직전의 safety layer */}
          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold">잡아도 되나요</h3>
            <LegalNotice legal={item.legal} />
          </section>

          <Link
            href={`/species/${item.species.slug}`}
            className="block rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-center text-[13px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]"
          >
            어종 자세히 보기
          </Link>

          <p className="text-[11px] leading-relaxed text-[color:var(--color-faint)]">
            시즌 데이터는 개발용 DEMO 이며 근거를 대조하지 않았습니다. 실제 어황은 해마다 수온과
            조류에 따라 크게 달라집니다.
          </p>
        </>
      )}
    </Sheet>
  );
}

function MethodList({ item }: { item: MarineMapItem }) {
  const methods = [...new Set(item.activeZones.flatMap((z) => z.season.methods ?? []))];
  if (methods.length === 0) return null;
  return (
    <section>
      <h3 className="mb-1.5 text-[13px] font-semibold">추천 낚시 방식</h3>
      <p className="text-[13px] text-[color:var(--color-ink-soft)]">
        {methods.map((m) => FISHING_METHOD_LABEL[m]).join(' · ')}
      </p>
    </section>
  );
}

