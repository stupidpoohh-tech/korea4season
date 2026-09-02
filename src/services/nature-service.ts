import type { DateKey } from '@/domain/date';
import { addDays, diffDays, endOfWeek, startOfWeek } from '@/domain/date';
import {
  compareByRelevance,
  isHappeningNow,
  isOnMap,
  resolveOccurrence,
} from '@/domain/occurrence';
import { projectGeo, type MapPosition } from '@/domain/projection';
import { object, subject } from '@/domain/korean';
import type {
  Location,
  NatureCategory,
  NatureEntity,
  NatureOccurrence,
  OccurrenceStatus,
  ResolvedOccurrence,
} from '@/domain/types';
import { getNatureIndex } from '@/repositories/nature-repository';

/** 지도에 동시에 그릴 sprite 상한. 레이어를 다 켜도 화면이 무너지지 않게 한다. (요구사항 #8) */
export const MAX_SPRITES = 30;

export interface NatureQuery {
  date: DateKey;
  /** 비어 있으면 전체 */
  categories?: NatureCategory[];
  regions?: string[];
}

function ctx() {
  const index = getNatureIndex();
  return { entities: index.entityById, locations: index.locationById };
}

function matchesQuery(occ: NatureOccurrence, entity: NatureEntity, query: NatureQuery) {
  if (query.categories?.length && !query.categories.includes(entity.category)) return false;
  if (query.regions?.length) {
    const hit = occ.regions.some((r) => query.regions!.includes(r));
    if (!hit) return false;
  }
  return true;
}

/** 선택 날짜 기준으로 전체 occurrence 를 해석한다 */
export function resolveAll(query: NatureQuery): ResolvedOccurrence[] {
  const index = getNatureIndex();
  const c = ctx();
  const out: ResolvedOccurrence[] = [];

  for (const occ of index.occurrences) {
    const entity = index.entityById.get(occ.entityId);
    if (!entity || !matchesQuery(occ, entity, query)) continue;
    const resolved = resolveOccurrence(occ, query.date, c);
    if (resolved) out.push(resolved);
  }
  return out.sort(compareByRelevance);
}

/** 지도에 올릴 것들 (진행 중인 것만) */
export function resolveOnMap(query: NatureQuery): ResolvedOccurrence[] {
  return resolveAll(query).filter((r) => isOnMap(r.status));
}

/** '지금 일어나는 중' */
export function resolveHappeningNow(query: NatureQuery): ResolvedOccurrence[] {
  return resolveAll(query).filter((r) => isHappeningNow(r.status));
}

/* ── 지도 sprite 배치 ──────────────────────────────────────── */

export interface MapSprite {
  key: string;
  resolved: ResolvedOccurrence;
  location: Location;
  /** 겹침 분산이 적용된 최종 위치 */
  position: MapPosition;
  basePosition: MapPosition;
}

export interface MapSpriteLayout {
  sprites: MapSprite[];
  /** 상한 때문에 표시하지 않은 개수 */
  hiddenCount: number;
  totalCount: number;
}

export function locationPosition(location: Location): MapPosition {
  return location.mapPosition ?? projectGeo(location.geo);
}

/** 같은 장소에 여러 개가 겹칠 때 작은 원형으로 흩어 놓는다 */
function spread(base: MapPosition, index: number, total: number): MapPosition {
  if (total <= 1) return base;
  const ratio = 1000 / 1300; // viewWidth / viewHeight — 픽셀상 원형이 되도록 보정
  const radius = total <= 3 ? 0.022 : 0.034;
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: Math.min(0.99, Math.max(0.01, base.x + Math.cos(angle) * radius)),
    y: Math.min(0.99, Math.max(0.01, base.y + Math.sin(angle) * radius * ratio)),
  };
}

export function buildMapLayout(query: NatureQuery): MapSpriteLayout {
  const resolved = resolveOnMap(query);

  const candidates: Omit<MapSprite, 'position'>[] = [];
  for (const item of resolved) {
    for (const location of item.locations) {
      candidates.push({
        key: `${item.occurrence.id}::${location.id}`,
        resolved: item,
        location,
        basePosition: locationPosition(location),
      });
    }
  }

  const totalCount = candidates.length;
  const visible = candidates.slice(0, MAX_SPRITES);

  const byLocation = new Map<string, typeof visible>();
  for (const sprite of visible) {
    const list = byLocation.get(sprite.location.id);
    if (list) list.push(sprite);
    else byLocation.set(sprite.location.id, [sprite]);
  }

  const sprites: MapSprite[] = [];
  for (const group of byLocation.values()) {
    group.forEach((sprite, i) => {
      sprites.push({ ...sprite, position: spread(sprite.basePosition, i, group.length) });
    });
  }

  // 위에 있는 것부터 그려 아래쪽 sprite 가 겹쳐 보이도록 정렬
  sprites.sort((a, b) => a.position.y - b.position.y);

  return { sprites, hiddenCount: Math.max(0, totalCount - visible.length), totalCount };
}

/* ── 오늘의 자연 / Nature Now ─────────────────────────────── */

export interface NatureHeadline {
  id: string;
  icon: string;
  /** 자동 생성된 한 문장 */
  text: string;
  placeLabel: string;
  resolved: ResolvedOccurrence;
}

function primaryPlace(item: ResolvedOccurrence): string {
  const first = item.locations[0];
  if (!first) return item.occurrence.regions.join(' · ');
  return item.locations.length > 1 ? `${first.name} 외 ${item.locations.length - 1}곳` : first.name;
}

/**
 * NatureEvent 데이터에서 문장을 만든다. CMS 가 아니다. (요구사항 #9)
 * 꽃 · 단풍 · 철새 · 자연현상 · 금어기는 같은 상태라도 어울리는 서술이 다르므로
 * 분류별 어휘를 나눠 둔다.
 */
type Phrase = (name: string, place: string, days: number) => string;
type PhraseSet = Record<OccurrenceStatus, Phrase>;

const BLOOM: PhraseSet = {
  starting: (n, p) => `${p}에 ${subject(n)} 피기 시작했습니다`,
  peak: (n, p) => `${p} ${subject(n)} 절정입니다`,
  active: (n, p) => `${p}에서 ${object(n)} 볼 수 있습니다`,
  ending: (n, p) => `${p} ${subject(n)} 지고 있습니다`,
  ended: (n, p) => `${p} ${subject(n)} 졌습니다`,
  upcoming: (n, p, d) => `${p} ${n} 개화까지 ${d}일 남았습니다`,
};

const FOLIAGE: PhraseSet = {
  starting: (n, p) => `${p}에 ${subject(n)} 물들기 시작했습니다`,
  peak: (n, p) => `${p} ${subject(n)} 절정입니다`,
  active: (n, p) => `${p} ${subject(n)} 물들고 있습니다`,
  ending: (n, p) => `${p} ${subject(n)} 저물고 있습니다`,
  ended: (n, p) => `${p} ${subject(n)} 끝났습니다`,
  upcoming: (n, p, d) => `${p} ${n} 절정까지 ${d}일 남았습니다`,
};

const VISITOR: PhraseSet = {
  starting: (n, p) => `${p}에 ${subject(n)} 찾아왔습니다`,
  peak: (n, p) => `${p}에 ${subject(n)} 가장 많이 머무는 시기입니다`,
  active: (n, p) => `${p}에 ${subject(n)} 머물고 있습니다`,
  ending: (n, p) => `${p} ${subject(n)} 곧 떠납니다`,
  ended: (n, p) => `${p} ${subject(n)} 떠났습니다`,
  upcoming: (n, p, d) => `${p} ${n} 도래까지 ${d}일 남았습니다`,
};

const PHENOMENON: PhraseSet = {
  starting: (n, p) => `${p}에 ${subject(n)} 나타나기 시작했습니다`,
  peak: (n, p) => `${p}에서 ${object(n)} 관찰하기 가장 좋은 시기입니다`,
  active: (n, p) => `${p}에서 ${object(n)} 볼 수 있습니다`,
  ending: (n, p) => `${p} ${subject(n)} 곧 끝납니다`,
  ended: (n, p) => `${p} ${subject(n)} 끝났습니다`,
  upcoming: (n, p, d) => `${p} ${n}까지 ${d}일 남았습니다`,
};

const CLOSED_SEASON: PhraseSet = {
  starting: (n) => `${n} 금어기가 시작됐습니다`,
  peak: (n) => `${n} 금어기가 진행 중입니다`,
  active: (n) => `${n} 금어기가 진행 중입니다`,
  ending: (n, _p, d) => `${n} 금어기 해제까지 ${d}일 남았습니다`,
  ended: (n) => `${n} 금어기가 해제됐습니다`,
  upcoming: (n, _p, d) => `${n} 금어기까지 ${d}일 남았습니다`,
};

function phraseSetFor(item: ResolvedOccurrence): PhraseSet {
  if (item.occurrence.polarity === 'restricted') return CLOSED_SEASON;
  switch (item.entity.category) {
    case 'flower':
      return BLOOM;
    case 'foliage':
      return FOLIAGE;
    case 'bird':
      return VISITOR;
    default:
      return PHENOMENON;
  }
}

export function toHeadline(item: ResolvedOccurrence): NatureHeadline {
  const place = primaryPlace(item);
  const phrase = phraseSetFor(item)[item.status];
  const text = phrase(item.entity.name, place, item.daysToNextChange ?? 0);

  return { id: item.occurrence.id, icon: item.entity.icon, text, placeLabel: place, resolved: item };
}

/** 다가오는 것까지 섞어 '오늘의 자연' 을 구성한다 */
export function getTodayHeadlines(date: DateKey, limit = 4): NatureHeadline[] {
  const all = resolveAll({ date });

  const happening = all.filter((r) => isHappeningNow(r.status));
  const justChanged = all.filter(
    (r) => r.status === 'ended' && (r.daysToNextChange ?? 999) > 0,
  );
  const soon = all.filter(
    (r) => r.status === 'upcoming' && (r.daysToNextChange ?? 999) <= 30,
  );

  const picked: ResolvedOccurrence[] = [];
  const seenEntity = new Set<string>();

  for (const bucket of [happening, justChanged, soon]) {
    for (const item of bucket) {
      if (picked.length >= limit) break;
      if (seenEntity.has(item.entity.id)) continue;
      seenEntity.add(item.entity.id);
      picked.push(item);
    }
  }

  return picked.slice(0, limit).map(toHeadline);
}

/* ── 이번 주 어디 갈까 ────────────────────────────────────── */

export interface WeekPick {
  region: string;
  items: ResolvedOccurrence[];
}

/**
 * 이번 주(월~일) 안에 볼 수 있는 것들을 지역별로 묶는다.
 * 랭킹: 절정 여부 > weight > 주 중 겹치는 일수
 */
export function getWeekPicks(date: DateKey, limit = 6): WeekPick[] {
  const from = startOfWeek(date);
  const to = endOfWeek(date);

  const scored = new Map<string, { item: ResolvedOccurrence; score: number }[]>();

  // 주 중 하루라도 관찰 가능한 것을 모은다
  const seen = new Set<string>();
  for (let i = 0; i <= 6; i += 1) {
    const day = addDays(from, i);
    for (const item of resolveOnMap({ date: day })) {
      if (item.occurrence.polarity !== 'observable') continue;
      const key = item.occurrence.id;
      if (seen.has(key)) continue;
      seen.add(key);

      const peakBonus = item.status === 'peak' ? 1 : 0;
      const overlap = Math.min(
        7,
        diffDays(item.window.start, item.window.end) + 1,
        diffDays(from, to) + 1,
      );
      const score =
        peakBonus * 2 + (item.occurrence.weight ?? 0.5) + Math.min(overlap, 7) / 20;

      for (const region of item.occurrence.regions) {
        const list = scored.get(region) ?? [];
        list.push({ item, score });
        scored.set(region, list);
      }
    }
  }

  return [...scored.entries()]
    .map(([region, list]) => ({
      region,
      items: list
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((entry) => entry.item),
      top: Math.max(...list.map((entry) => entry.score)),
    }))
    .sort((a, b) => b.top - a.top || b.items.length - a.items.length)
    .slice(0, limit)
    .map(({ region, items }) => ({ region, items }));
}

export function getWeekRange(date: DateKey) {
  return { from: startOfWeek(date), to: endOfWeek(date) };
}

/* ── 단건 조회 ────────────────────────────────────────────── */

export function getOccurrenceBySlug(slug: string) {
  return getNatureIndex().occurrenceBySlug.get(slug) ?? null;
}

export function getEntityBySlug(slug: string) {
  return getNatureIndex().entityBySlug.get(slug) ?? null;
}

export function resolveBySlug(slug: string, date: DateKey): ResolvedOccurrence | null {
  const occ = getOccurrenceBySlug(slug);
  if (!occ) return null;
  return resolveOccurrence(occ, date, ctx());
}

export function listOccurrenceSlugs(): string[] {
  return getNatureIndex().occurrences.map((o) => o.slug);
}

/** 한 entity 의 모든 occurrence 를 날짜 기준으로 해석 */
export function resolveByEntity(entityId: string, date: DateKey): ResolvedOccurrence[] {
  const index = getNatureIndex();
  const c = ctx();
  return (index.occurrencesByEntityId.get(entityId) ?? [])
    .map((occ) => resolveOccurrence(occ, date, c))
    .filter((r): r is ResolvedOccurrence => Boolean(r))
    .sort(compareByRelevance);
}

export function listEntities(): NatureEntity[] {
  return [...getNatureIndex().entities].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name, 'ko');
  });
}

export function getLocation(id: string) {
  return getNatureIndex().locationById.get(id) ?? null;
}

export function hasDemoData(): boolean {
  return getNatureIndex().hasDemoData;
}

/* ── 자연도감 ─────────────────────────────────────────────── */

export interface DexEntry {
  entity: NatureEntity;
  /** 대표 occurrence slug (상세로 이동) */
  slug: string | null;
  /** '봄 · 여름' 같은 등장 계절 */
  seasonLabel: string;
  regions: string[];
  monthRange: string;
}

const SEASON_BY_MONTH = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];

function monthsOf(occ: NatureOccurrence): number[] {
  const start = Number((occ.recurrence === 'annual' ? occ.startDate : occ.startDate.slice(5)).slice(0, 2));
  const end = Number((occ.recurrence === 'annual' ? occ.endDate : occ.endDate.slice(5)).slice(0, 2));
  const months: number[] = [];
  let m = start;
  for (let i = 0; i < 12; i += 1) {
    months.push(m);
    if (m === end) break;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
}

/**
 * 도감 목록. 발견 여부는 클라이언트(로컬 저장소)에서 합친다.
 * 서버는 '무엇이 존재하는가' 만 안다.
 */
export function getDexEntries(): DexEntry[] {
  const index = getNatureIndex();

  return listEntities().map((entity) => {
    const occurrences = index.occurrencesByEntityId.get(entity.id) ?? [];
    const months = new Set<number>();
    const regions = new Set<string>();

    for (const occ of occurrences) {
      for (const m of monthsOf(occ)) months.add(m);
      for (const r of occ.regions) regions.add(r);
    }

    const seasons = [...new Set([...months].map((m) => SEASON_BY_MONTH[m - 1]!))];
    const sorted = [...months].sort((a, b) => a - b);

    return {
      entity,
      slug: occurrences[0]?.slug ?? null,
      seasonLabel: seasons.length ? seasons.join(' · ') : '연중',
      regions: [...regions],
      monthRange:
        sorted.length >= 12
          ? '연중'
          : sorted.length
            ? `${sorted[0]}월 ~ ${sorted[sorted.length - 1]}월`
            : '—',
    };
  });
}
