'use client';

import type { MapSprite } from '@/services/map-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { SeasonStrengthMeter } from '@/components/marine/SeasonStrengthMeter';
import { NatureStatusBadge } from '@/components/nature/NatureStatusBadge';

interface Props {
  sprites: MapSprite[];
  selectedId: string | null;
  openZoneSlug: string | null;
  onSelect: (sprite: MapSprite) => void;
}

/**
 * 데스크톱 좌측 레일 — 지금 지도 위에 있는 것들.
 * 지도를 대신하지 않고, 지도를 읽는 다른 통로가 된다.
 */
export function MapSideList({ sprites, selectedId, openZoneSlug, onSelect }: Props) {
  return (
    <aside aria-label="지도 위 목록" className="hidden min-h-0 flex-col lg:flex">
      <h2 className="mb-2 px-0.5 text-[12px] font-medium tracking-wide text-[color:var(--color-faint)]">
        지금 지도 위에
      </h2>

      {sprites.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[color:var(--color-line)] px-3 py-4 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
          이 조건에 해당하는 것이 없습니다. 필터를 풀거나 아래 슬라이더를 움직여 보세요.
        </p>
      ) : (
        <ul className="scrollbar-none min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {sprites.map((sprite) => {
            const active =
              sprite.subject.kind === 'zone'
                ? sprite.subject.marker.zone.slug === openZoneSlug
                : sprite.selectionId === selectedId;

            return (
              <li key={sprite.key}>
                <button
                  type="button"
                  onClick={() => onSelect(sprite)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    active
                      ? 'border-[color:var(--color-ink)]/30 bg-white'
                      : 'border-transparent hover:bg-white'
                  }`}
                >
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ background: `${sprite.accent}1f` }}
                  >
                    {sprite.entity ? (
                      <SpeciesSprite entity={sprite.entity} size={15} />
                    ) : (
                      <span className="text-[11px] font-semibold">권역</span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium">{sprite.name}</span>
                      {sprite.restricted && (
                        <span className="shrink-0 rounded bg-[color:var(--color-restricted-soft)] px-1 py-px text-[10px] font-medium text-[color:var(--color-restricted)]">
                          규정
                        </span>
                      )}
                    </span>

                    <span className="mt-0.5 flex items-center gap-1.5">
                      {sprite.subject.kind === 'marine' && (
                        <SeasonStrengthMeter
                          state={sprite.subject.item.state}
                          size="sm"
                          showLabel={false}
                        />
                      )}
                      {sprite.subject.kind === 'nature' && (
                        <NatureStatusBadge
                          status={sprite.subject.resolved.status}
                          polarity={sprite.subject.resolved.occurrence.polarity}
                        />
                      )}
                      <span className="truncate text-[11.5px] text-[color:var(--color-muted)]">
                        {sprite.placeLabel}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
