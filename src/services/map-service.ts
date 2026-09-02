import type { DateKey } from '@/domain/date';
import { isOnMap } from '@/domain/occurrence';
import { MAP_ASPECT, nearestSeaPoint } from '@/domain/land';
import type { MapPosition } from '@/domain/projection';
import type { NatureCategory, NatureEntity, ResolvedOccurrence } from '@/domain/types';
import { SEASON_STRENGTH_ORDER, type SeaRegion, type SeasonState } from '@/domain/marine';
import { isLegallyBlocked, type LegalStatusCode } from '@/domain/regulation';
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
 *
 * 같은 이유로 이 파일 안에서도 두 축을 섞지 않는다.
 *   시즌  → 크기 · 불투명도 · accent
 *   규정  → restricted / legalStatus (표시만)
 * ──────────────────────────────────────────────────────────── */

export type MapMode = 'species' | 'zone';

/**
 * 시즌 강도 필터 — '지금 얼마나 좋은가' 한 축만 다룬다.
 *
 * 'all' 을 뺀 값들은 서로 겹치지 않는 **분할**이다 —
 *   절정 + 좋음 + 보통 = 전체
 * 가 항상 성립한다. 예전 'good'(= peak 이상)처럼 서로를 포함하는 값을 두면
 * 사용자가 두 칩의 숫자를 더해 보고 총합과 어긋난다고 읽는다.
 * 'fair'(보통)는 남는 것을 전부 받는 칸이다. 지금 데이터에는 fair 아래가
 * 없지만, 생기더라도 합이 총합과 어긋나지 않게 하려는 것이다.
 *
 * 다른 축은 여기에 섞지 않는다.
 *   시점   — '시작 중' 은 startingOnly (시즌 강도와 겹친다: 좋음이면서 시작 중일 수 있다)
 *   규정   — '잡아도 되는가' 는 legalOnly
 */
export type SeasonFilter = 'all' | 'peak' | 'good' | 'fair';

export const SEASON_FILTERS: { id: SeasonFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'peak', label: '절정' },
  { id: 'good', label: '좋음' },
  { id: 'fair', label: '보통' },
];

export type MapSubject =
  | { kind: 'nature'; resolved: ResolvedOccurrence }
  | { kind: 'marine'; item: MarineMapItem }
  | { kind: 'zone'; marker: ZoneMarker };

export interface MapSprite {
  key: string;
  /** 선택 상태를 식별하는 값 */
  selectionId: string;
  /** 이모지 폴백 · 일러스트 경로를 가진 주체. 권역 마커는 대표 어종을 쓴다. */
  entity: NatureEntity | null;
  name: string;
  placeLabel: string;
  position: MapPosition;
  basePosition: MapPosition;
  /** 0.6~1. 시즌이 좋을수록 또렷하게 그린다. */
  prominence: number;
  /** 시즌 상태 — 크기와 accent 를 정한다. 자연 레이어는 null. */
  seasonState: SeasonState | null;
  /** 시즌이 막 열리는 중 — 존재감을 한 단계 낮춘다 */
  starting: boolean;
  /** 규정으로 지금 잡을 수 없음 — sprite 는 지우지 않고 표시만 붙인다 */
  restricted: boolean;
  /** 규정 상태. 금어기와 조건부를 다르게 표시하기 위해 코드까지 넘긴다. */
  legalStatus: LegalStatusCode;
  /** 시즌 강도를 나타내는 색. 규정은 이 색을 바꾸지 않는다. */
  accent: string;
  /** 권역 마커에 붙는 어종 수 배지. 어종 모드에서는 없다. */
  badgeCount?: number;
  subject: MapSubject;
}

export interface MapLayout {
  sprites: MapSprite[];
  /** 과밀 때문에 접어 둔 수 */
  hiddenCount: number;
  totalCount: number;
  mode: MapMode;
}

export interface MapQuery {
  date: DateKey;
  /** 비어 있으면 전체 */
  categories?: NatureCategory[];
  season?: SeasonFilter;
  /** 이제 막 열리는 시즌만 본다 — 시즌 강도와 겹치는 별개의 축이다 */
  startingOnly?: boolean;
  /** 규정이 걸린 대상만 본다 — 시즌 필터와 독립적으로 걸린다 */
  legalOnly?: boolean;
  mode?: MapMode;
  /**
   * 0 = 기본, 1 = 확대. 확대하면 접어 두었던 sprite 를 더 펼친다.
   * 연속값을 그대로 받으면 핀치 중 매 프레임 재배치가 일어난다.
   */
  detail?: 0 | 1;
}

const STATE_PROMINENCE: Record<SeasonState, number> = {
  peak: 1,
  good: 0.86,
  fair: 0.74,
  low: 0.64,
  off: 0.6,
};

/**
 * 시즌 색. 규정 색(빨강)은 여기에 없다 — 규정은 배지로만 말한다.
 * 생물의 시각적 존재감은 자연에서의 occurrence 를 뜻해야 한다.
 */
const ACCENT: Record<SeasonState | 'nature', string> = {
  peak: 'var(--color-peak)',
  good: 'var(--color-accent)',
  fair: 'var(--color-sea)',
  low: 'var(--color-sea)',
  off: 'var(--color-faint)',
  nature: 'var(--color-accent)',
};

function includeCategory(categories: NatureCategory[] | undefined, category: NatureCategory) {
  return !categories?.length || categories.includes(category);
}

/** 시즌 강도 한 축만 본다. 시점(시작 중)과 규정은 여기에 관여하지 않는다. */
function passesSeason(filter: SeasonFilter, state: SeasonState): boolean {
  if (filter === 'all') return true;
  // '보통' 은 남는 것을 전부 받는다 — 분할의 합이 총합과 어긋나지 않게
  if (filter === 'fair') return SEASON_STRENGTH_ORDER[state] <= SEASON_STRENGTH_ORDER.fair;
  return state === filter;
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

/* ── 밀도 조절 ────────────────────────────────────────────── */

/**
 * 지도 전체에 올릴 최대 수. 확대하면 늘어난다.
 * "데이터가 많아 보이는 것" 보다 "무엇이 중요한지 읽히는 것" 이 먼저다.
 */
const TOTAL_CAP = [22, 30] as const;

/**
 * 한 해역이 혼자 지도를 채우지 않게 하는 상한.
 *
 * 바다마다 sprite 를 놓을 수 있는 물의 넓이가 다르다. 제주는 섬 둘레의 좁은
 * 고리뿐이라 같은 수를 놓으면 겹칠 수밖에 없다 — 분산으로 풀 문제가 아니라
 * 애초에 덜 올려야 하는 문제다.
 */
const REGION_CAP: Record<SeaRegion | 'default', readonly [number, number]> = {
  서해: [6, 9],
  남해: [6, 9],
  동해: [6, 9],
  제주: [3, 4],
  default: [6, 9],
};

/** 절정인 어종에 더 주는 자리 */
const PEAK_BONUS = 2;

/**
 * 표시 우선순위. 시즌이 강한 것이 먼저 남는다.
 * PEAK 은 항상, GOOD 은 대부분, FAIR 이하는 자리가 남을 때만.
 */
const DISPLAY_ORDER: Record<SeasonState, number> = {
  peak: 0,
  good: 1,
  fair: 2,
  low: 3,
  off: 4,
};

function displayRank(sprite: MapSprite): number {
  return sprite.seasonState ? DISPLAY_ORDER[sprite.seasonState] : DISPLAY_ORDER.good;
}

/** 어떤 해역(또는 권역)에 속하는가 — 해역 편중을 막는 데 쓴다 */
function bucketOf(sprite: MapSprite): string {
  switch (sprite.subject.kind) {
    case 'marine':
      return sprite.subject.item.seaRegion;
    case 'zone':
      return sprite.subject.marker.zone.seaRegion;
    default:
      return `land:${sprite.placeLabel}`;
  }
}

function bucketCap(bucket: string, detail: 0 | 1): number {
  return (REGION_CAP[bucket as SeaRegion] ?? REGION_CAP.default)[detail];
}

/**
 * 과밀을 줄인다.
 *
 * 그냥 앞에서 잘라내면 서해가 30개를 채우고 동해가 통째로 비는 날이 생긴다.
 * 그래서 두 단계로 거른다.
 *   1) 해역별 상한 — 한 바다가 지도를 독차지하지 못하게
 *   2) 전체 상한   — 시즌이 강한 것부터
 * 잘려 나간 수는 숨기지 않고 hiddenCount 로 알린다.
 */
function thin(sprites: MapSprite[], detail: 0 | 1): { visible: MapSprite[]; hidden: number } {
  const ranked = [...sprites].sort(
    (a, b) => displayRank(a) - displayRank(b) || a.name.localeCompare(b.name, 'ko'),
  );

  const perBucket = new Map<string, number>();
  const kept: MapSprite[] = [];

  for (const sprite of ranked) {
    const bucket = bucketOf(sprite);
    const used = perBucket.get(bucket) ?? 0;
    /*
     * PEAK 에는 여유를 더 주되 무한정 열어 두지 않는다.
     * 10월 서해처럼 한 해역의 절정이 몰리는 날에는 상한을 풀어 버리면
     * 그 바다에만 열 마리가 겹쳐 앉아 결국 아무것도 안 읽힌다.
     */
    const regionCap = bucketCap(bucket, detail);
    const cap = sprite.seasonState === 'peak' ? regionCap + PEAK_BONUS : regionCap;
    if (used >= cap) continue;
    perBucket.set(bucket, used + 1);
    kept.push(sprite);
  }

  const visible = kept.slice(0, TOTAL_CAP[detail]);
  return { visible, hidden: sprites.length - visible.length };
}

/* ── 조립 ─────────────────────────────────────────────────── */

function marineSprites(query: MapQuery): MapSprite[] {
  if (!includeCategory(query.categories, 'fishing')) return [];
  const season = query.season ?? 'all';

  return buildMarineMapItems(query.date)
    .filter((item) => {
      if (query.legalOnly && !isLegallyBlocked(item.legal.overallStatus)) return false;
      if (query.startingOnly && item.season.status !== 'starting') return false;
      return passesSeason(season, item.state);
    })
    .map((item) => {
      const restricted = isLegallyBlocked(item.legal.overallStatus);
      const starting = item.season.status === 'starting';
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
        // 이제 막 열리는 시즌은 한 단계 물러서서 그린다
        prominence: STATE_PROMINENCE[item.state] - (starting ? 0.08 : 0),
        seasonState: item.state,
        starting,
        restricted,
        legalStatus: item.legal.overallStatus,
        accent: ACCENT[item.state],
        subject: { kind: 'marine', item },
      } satisfies MapSprite;
    });
}

function natureSprites(query: MapQuery): MapSprite[] {
  // 시즌·규정 필터는 해양 개념이라 다른 레이어에는 아무 필터도 없을 때만 그린다
  if ((query.season ?? 'all') !== 'all' || query.startingOnly || query.legalOnly) return [];

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
        seasonState: null,
        starting: false,
        restricted: false,
        legalStatus: 'open',
        accent: item.status === 'peak' ? ACCENT.peak : ACCENT.nature,
        subject: { kind: 'nature', resolved: item },
      });
    }
  }

  return out;
}

/**
 * 권역 모드.
 *
 * 어종 상태 필터를 그대로 물려받지 않는다 — 권역은 어종 묶음이라
 * "절정인 권역" 은 "절정인 어종을 하나라도 가진 권역" 이 되고,
 * 그러면 칩의 숫자와 지도의 뜻이 서로 다른 것을 가리킨다.
 * 두 모드에서 뜻이 같은 축은 규정 하나뿐이므로 그것만 남긴다.
 */
function zoneSprites(query: MapQuery): MapSprite[] {
  return buildZoneMarkers(query.date)
    .map((marker) => {
      const entries = query.legalOnly
        ? marker.entries.filter((entry) => entry.blocked)
        : marker.entries;
      return { ...marker, entries };
    })
    .filter((marker) => marker.entries.length > 0)
    .map((marker) => {
      const top = marker.entries[0]!;
      const best = top.season.state;
      const restricted = marker.entries.some((e) => e.blocked);
      return {
        key: `zone:${marker.zone.id}`,
        selectionId: `zone:${marker.zone.slug}`,
        // 권역 마커도 대표 어종 그림으로 그린다 — 숫자만 있는 알약은 뜻이 안 읽힌다
        entity: top.species,
        name: marker.zone.name,
        placeLabel: `${marker.entries.length}종`,
        position: marker.position,
        basePosition: marker.position,
        prominence: STATE_PROMINENCE[best],
        seasonState: best,
        starting: top.season.status === 'starting',
        restricted,
        legalStatus: restricted ? 'closed-season' : 'open',
        accent: ACCENT[best],
        badgeCount: marker.entries.length,
        subject: { kind: 'zone', marker },
      } satisfies MapSprite;
    });
}

export function buildMapLayout(query: MapQuery): MapLayout {
  const mode = query.mode ?? 'species';
  const detail = query.detail ?? 0;

  const candidates =
    mode === 'zone' ? zoneSprites(query) : [...marineSprites(query), ...natureSprites(query)];

  const { visible, hidden } = thin(candidates, detail);
  const sprites = separate(visible);

  // 위에 있는 것부터 그려 아래쪽 sprite 가 앞에 오도록 정렬
  sprites.sort((a, b) => a.position.y - b.position.y);

  return { sprites, hiddenCount: hidden, totalCount: candidates.length, mode };
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

export interface MapCounts {
  /**
   * 시즌 강도별 수. `all` 을 뺀 값들은 서로 겹치지 않고 합이 `all` 과 같다.
   * 화면에서 이 숫자를 더해 보는 사용자가 총합과 어긋난다고 읽지 않게 하는 것이
   * 이 분할의 목적이다.
   */
  season: Record<SeasonFilter, number>;
  /** 이제 막 열리는 시즌 수 — 강도와 겹치므로 위 분할에 넣지 않는다 */
  starting: number;
  /** 규정이 걸린 대상 수 — 시즌 필터와 같은 줄에 두지 않는다 */
  restricted: number;
  /** 지금 시즌인 해역 수 */
  seaRegions: number;
}

/**
 * 필터 칩의 수는 지금 보고 있는 모드의 단위와 같아야 한다.
 * 권역 모드에서 "전체 23" 이 어종 수라면 사용자는 그것을 권역 수로 읽는다.
 *
 * 권역 모드에는 시즌 강도 필터가 없으므로(zoneSprites 주석 참고)
 * 강도별 수는 전부 전체와 같은 값을 돌려준다 — 화면이 쓰지 않는다.
 */
export function countMap(date: DateKey, mode: MapMode = 'species'): MapCounts {
  const items = buildMarineMapItems(date);
  const seaRegions = new Set<SeaRegion>();
  for (const item of items) seaRegions.add(item.seaRegion);

  if (mode === 'zone') {
    const markers = buildZoneMarkers(date);
    const zonesWith = (predicate: (entry: ZoneMarker['entries'][number]) => boolean) =>
      markers.filter((m) => m.entries.some(predicate)).length;

    return {
      season: { all: markers.length, peak: 0, good: 0, fair: 0 },
      starting: zonesWith((e) => e.season.status === 'starting'),
      restricted: zonesWith((e) => e.blocked),
      seaRegions: seaRegions.size,
    };
  }

  const inBucket = (filter: SeasonFilter) =>
    items.filter((i) => passesSeason(filter, i.state)).length;

  return {
    season: {
      all: items.length,
      peak: inBucket('peak'),
      good: inBucket('good'),
      fair: inBucket('fair'),
    },
    starting: items.filter((i) => i.season.status === 'starting').length,
    restricted: items.filter((i) => isLegallyBlocked(i.legal.overallStatus)).length,
    seaRegions: seaRegions.size,
  };
}
