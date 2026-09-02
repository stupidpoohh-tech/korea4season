import type { DateKey } from '@/domain/date';
import { isOnMap } from '@/domain/occurrence';
import { MAP_ASPECT, nearestSeaPoint } from '@/domain/land';
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

/** sprite 중심끼리 최소로 벌어져야 하는 거리 (지도 가로폭 대비) */
const MIN_SEPARATION = 0.088;

/** 원래 자리에서 이만큼 넘게 밀려나지 않는다 — 바다를 벗어나면 뜻이 달라진다 */
const MAX_DRIFT = 0.11;

/** 원래 자리로 되돌리는 힘. 크면 위치는 정확해지고 겹침은 남는다. */
const SPRING = 0.035;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 가까이 붙은 sprite 를 서로 밀어낸다.
 *
 * 같은 좌표일 때만 흩는 방식으로는 부족하다. 권역들이 20~40px 씩 떨어져 있으면
 * "다른 자리" 로 판정돼 흩어지지 않는데, sprite 자체가 그보다 크기 때문이다.
 *
 * 반복 완화(relaxation)로 겹친 쌍을 밀어내되, 매 회 원래 자리로 약하게 당기고
 * 총 이동량을 제한해 어종이 엉뚱한 바다로 흘러가지 않게 한다.
 * 입력 순서가 결정적이므로 결과도 항상 같다.
 */
function separate(sprites: MapSprite[]): MapSprite[] {
  if (sprites.length < 2) return sprites;

  const base = sprites.map((s) => s.basePosition);
  const pos = base.map((p) => ({ x: p.x, y: p.y }));
  // 바다 생물은 물 밖으로 나가면 뜻이 달라진다
  const seaBound = sprites.map((s) => s.subject.kind !== 'nature');

  for (let step = 0; step < 140; step += 1) {
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = i + 1; j < pos.length; j += 1) {
        let dx = pos[j]!.x - pos[i]!.x;
        let dy = (pos[j]!.y - pos[i]!.y) * MAP_ASPECT;
        let d = Math.hypot(dx, dy);

        if (d < 1e-6) {
          // 완전히 겹친 경우 결정적인 방향으로 살짝 떼어 놓는다
          const angle = (i * 2.399963) % (Math.PI * 2);
          dx = Math.cos(angle) * 1e-3;
          dy = Math.sin(angle) * 1e-3;
          d = 1e-3;
        }
        if (d >= MIN_SEPARATION) continue;

        const push = (MIN_SEPARATION - d) / 2;
        const ux = (dx / d) * push;
        const uy = (dy / d) * push;
        pos[i]!.x -= ux;
        pos[i]!.y -= uy / MAP_ASPECT;
        pos[j]!.x += ux;
        pos[j]!.y += uy / MAP_ASPECT;
      }
    }

    for (let i = 0; i < pos.length; i += 1) {
      // 원래 자리로 약하게 되돌린다
      pos[i]!.x += (base[i]!.x - pos[i]!.x) * SPRING;
      pos[i]!.y += (base[i]!.y - pos[i]!.y) * SPRING;

      // 육지 보정은 루프 안에서 해야 한다.
      // 밖에서 한 번만 하면 애써 벌려 놓은 간격이 그때 다시 무너진다.
      if (seaBound[i]) {
        const fixed = nearestSeaPoint(pos[i]!, base[i]!);
        pos[i]!.x = fixed.x;
        pos[i]!.y = fixed.y;
      }
    }
  }

  return sprites.map((sprite, i) => {
    const b = base[i]!;
    const p = pos[i]!;
    const dx = p.x - b.x;
    const dy = (p.y - b.y) * MAP_ASPECT;
    const drift = Math.hypot(dx, dy);
    const k = drift > MAX_DRIFT ? MAX_DRIFT / drift : 1;

    const moved = {
      x: clamp(b.x + dx * k, 0.03, 0.97),
      y: clamp(b.y + (dy * k) / MAP_ASPECT, 0.03, 0.97),
    };

    return { ...sprite, position: seaBound[i] ? nearestSeaPoint(moved, b) : moved };
  });
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

  const sprites = separate(visible);

  // 위에 있는 것부터 그려 아래쪽 sprite 가 앞에 오도록 정렬
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
