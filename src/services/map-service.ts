import type { DateKey } from '@/domain/date';
import { isOnMap } from '@/domain/occurrence';
import type { MapPosition } from '@/domain/projection';
import type { NatureCategory, NatureEntity, ResolvedOccurrence } from '@/domain/types';
import { SEASON_STRENGTH_ORDER, type SeasonState } from '@/domain/marine';
import { isLegallyBlocked } from '@/domain/regulation';
import { locationPosition, resolveAll } from './nature-service';
import {
  buildMarineMapItems,
  buildZoneMarkers,
  type MarineMapItem,
  type ZoneMarker,
} from './marine-service';

/* ────────────────────────────────────────────────────────────
 * 지도 위 표현을 한 곳에서 조립한다.
 *
 * 지도에 올라가는 것은 '시즌' 이지 '규정' 이 아니다.
 * 금어기라고 sprite 를 지우면 사용자는
 *   "이 생물이 지금 없다"  와
 *   "있지만 잡으면 안 된다" 를 구분하지 못한다.
 * 그래서 금어기 어종은 그대로 두고 작은 제한 표시만 붙인다.
 * ──────────────────────────────────────────────────────────── */

export const MAX_SPRITES = 30;

export type MapMode = 'species' | 'zone';

/** 지금 상태로 걸러 보는 보조 필터. 금어기는 메인 내비게이션이 아니다. */
export type StateFilter = 'all' | 'good' | 'starting' | 'restricted';

export const STATE_FILTERS: { id: StateFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'good', label: '잡기 좋은 때' },
  { id: 'starting', label: '곧 시작' },
  { id: 'restricted', label: '규정 확인' },
];

export type MapSubject =
  | { kind: 'nature'; resolved: ResolvedOccurrence }
  | { kind: 'marine'; item: MarineMapItem }
  | { kind: 'zone'; marker: ZoneMarker };

export interface MapSprite {
  key: string;
  /** 선택 상태를 식별하는 값 */
  selectionId: string;
  /** 이모지 폴백 · 일러스트 경로를 가진 주체. 권역 마커는 없다. */
  entity: NatureEntity | null;
  name: string;
  placeLabel: string;
  position: MapPosition;
  basePosition: MapPosition;
  /** 0.6~1. 시즌이 좋을수록 또렷하게 그린다. */
  prominence: number;
  /** 규정으로 지금 잡을 수 없음 — sprite 는 지우지 않고 표시만 붙인다 */
  restricted: boolean;
  /** 지도에서 강조할 링 색 */
  accent: string;
  subject: MapSubject;
}

export interface MapLayout {
  sprites: MapSprite[];
  hiddenCount: number;
  totalCount: number;
}

export interface MapQuery {
  date: DateKey;
  /** 비어 있으면 전체 */
  categories?: NatureCategory[];
  state?: StateFilter;
  mode?: MapMode;
}

const STATE_PROMINENCE: Record<SeasonState, number> = {
  peak: 1,
  good: 0.86,
  fair: 0.74,
  low: 0.64,
  off: 0.6,
};

const ACCENT = {
  peak: 'var(--color-peak)',
  good: 'var(--color-accent)',
  fair: 'var(--color-sea)',
  restricted: 'var(--color-restricted)',
  nature: 'var(--color-accent)',
};

function includeCategory(categories: NatureCategory[] | undefined, category: NatureCategory) {
  return !categories?.length || categories.includes(category);
}

function passesStateFilter(
  filter: StateFilter,
  opts: { state?: SeasonState; starting: boolean; restricted: boolean },
): boolean {
  switch (filter) {
    case 'good':
      return !opts.restricted && (opts.state === 'peak' || opts.state === 'good');
    case 'starting':
      return opts.starting;
    case 'restricted':
      return opts.restricted;
    default:
      return true;
  }
}

/* ── 겹침 분산 ────────────────────────────────────────────── */

function spread(base: MapPosition, index: number, total: number): MapPosition {
  if (total <= 1) return base;
  const ratio = 1000 / 1300;
  const radius = total <= 3 ? 0.024 : 0.036;
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: Math.min(0.97, Math.max(0.03, base.x + Math.cos(angle) * radius)),
    y: Math.min(0.97, Math.max(0.03, base.y + Math.sin(angle) * radius * ratio)),
  };
}

/* ── 조립 ─────────────────────────────────────────────────── */

function marineSprites(query: MapQuery): MapSprite[] {
  if (!includeCategory(query.categories, 'fishing')) return [];
  const filter = query.state ?? 'all';

  return buildMarineMapItems(query.date)
    .filter((item) =>
      passesStateFilter(filter, {
        state: item.state,
        starting: item.season.status === 'starting',
        restricted: isLegallyBlocked(item.legal.overallStatus),
      }),
    )
    .map((item) => {
      const restricted = isLegallyBlocked(item.legal.overallStatus);
      return {
        key: item.key,
        selectionId: item.key,
        entity: item.species,
        name: item.species.name,
        placeLabel:
          item.activeZones.length > 1
            ? `${item.seaRegion} · ${item.activeZones.length}개 권역`
            : (item.activeZones[0]?.zone.name ?? item.seaRegion),
        position: item.position,
        basePosition: item.position,
        prominence: STATE_PROMINENCE[item.state],
        restricted,
        accent: restricted
          ? ACCENT.restricted
          : item.state === 'peak'
            ? ACCENT.peak
            : item.state === 'good'
              ? ACCENT.good
              : ACCENT.fair,
        subject: { kind: 'marine', item },
      } satisfies MapSprite;
    });
}

function natureSprites(query: MapQuery): MapSprite[] {
  const filter = query.state ?? 'all';
  // 상태 필터는 해양 개념이라 다른 레이어에는 '전체' 일 때만 적용한다
  if (filter !== 'all') return [];

  const out: MapSprite[] = [];

  for (const item of resolveAll({ date: query.date })) {
    if (item.entity.category === 'fishing') continue;
    if (!includeCategory(query.categories, item.entity.category)) continue;
    if (!isOnMap(item.status)) continue;

    for (const location of item.locations) {
      const base = locationPosition(location);
      out.push({
        key: `${item.occurrence.id}::${location.id}`,
        selectionId: item.occurrence.id,
        entity: item.entity,
        name: item.entity.name,
        placeLabel: location.name,
        position: base,
        basePosition: base,
        prominence: item.status === 'peak' ? 1 : item.status === 'active' ? 0.86 : 0.76,
        restricted: false,
        accent: item.status === 'peak' ? ACCENT.peak : ACCENT.nature,
        subject: { kind: 'nature', resolved: item },
      });
    }
  }

  return out;
}

function zoneSprites(query: MapQuery): MapSprite[] {
  const filter = query.state ?? 'all';

  return buildZoneMarkers(query.date)
    .map((marker) => {
      // 상태 필터는 권역 모드에서도 뜻이 통해야 한다:
      // '규정 확인' 은 규정이 걸린 어종이 있는 권역만 남긴다.
      const entries = marker.entries.filter((entry) =>
        passesStateFilter(filter, {
          state: entry.season.state,
          starting: entry.season.status === 'starting',
          restricted: entry.blocked,
        }),
      );
      return { ...marker, entries };
    })
    .filter((marker) => marker.entries.length > 0)
    .map((marker) => {
      const best = marker.entries[0]!.season.state;
      const restricted = marker.entries.some((e) => e.blocked);
      return {
        key: `zone:${marker.zone.id}`,
        selectionId: `zone:${marker.zone.slug}`,
        entity: marker.entries[0]?.species ?? null,
        name: marker.zone.name,
        placeLabel: `${marker.entries.length}종`,
        position: marker.position,
        basePosition: marker.position,
        prominence: STATE_PROMINENCE[best],
        restricted,
        accent: best === 'peak' ? ACCENT.peak : best === 'good' ? ACCENT.good : ACCENT.fair,
        subject: { kind: 'zone', marker },
      } satisfies MapSprite;
    });
}

export function buildMapLayout(query: MapQuery): MapLayout {
  const mode = query.mode ?? 'species';

  const candidates =
    mode === 'zone' ? zoneSprites(query) : [...marineSprites(query), ...natureSprites(query)];

  const totalCount = candidates.length;
  const visible = candidates.slice(0, MAX_SPRITES);

  // 같은 자리에 겹치면 작은 원형으로 흩는다
  const byPlace = new Map<string, MapSprite[]>();
  for (const sprite of visible) {
    const key = `${sprite.basePosition.x.toFixed(3)}:${sprite.basePosition.y.toFixed(3)}`;
    const list = byPlace.get(key);
    if (list) list.push(sprite);
    else byPlace.set(key, [sprite]);
  }

  const sprites: MapSprite[] = [];
  for (const group of byPlace.values()) {
    group.forEach((sprite, i) => {
      sprites.push({ ...sprite, position: spread(sprite.basePosition, i, group.length) });
    });
  }

  sprites.sort((a, b) => a.position.y - b.position.y);

  return { sprites, hiddenCount: Math.max(0, totalCount - visible.length), totalCount };
}

/** 레이어 칩에 붙는 개수 */
export function countByCategory(date: DateKey): Record<NatureCategory, number> {
  const counts = {
    fishing: 0,
    flower: 0,
    foliage: 0,
    bird: 0,
    marine: 0,
    nature: 0,
  } as Record<NatureCategory, number>;

  counts.fishing = buildMarineMapItems(date).length;

  for (const item of resolveAll({ date })) {
    if (item.entity.category === 'fishing') continue;
    if (isOnMap(item.status)) counts[item.entity.category] += 1;
  }

  return counts;
}

/** 상태 필터 칩에 붙는 개수 */
export function countByState(date: DateKey): Record<StateFilter, number> {
  const items = buildMarineMapItems(date);
  return {
    all: items.length,
    good: items.filter(
      (i) =>
        !isLegallyBlocked(i.legal.overallStatus) &&
        SEASON_STRENGTH_ORDER[i.state] >= SEASON_STRENGTH_ORDER.good,
    ).length,
    starting: items.filter((i) => i.season.status === 'starting').length,
    restricted: items.filter((i) => isLegallyBlocked(i.legal.overallStatus)).length,
  };
}
