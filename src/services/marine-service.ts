import { diffDays, todayKey, type DateKey } from '@/domain/date';
import { object, topic } from '@/domain/korean';
import {
  SEASON_STRENGTH_ORDER,
  type FishingObservation,
  type FishingSpot,
  type FishingZone,
  type MarineSpecies,
  type ObservationSummary,
  type SeaRegion,
  type SeasonState,
} from '@/domain/marine';
import {
  evaluateMarineState,
  evaluateSeason,
  summarizeObservations,
  type MarineState,
  type SeasonEvaluation,
} from '@/domain/marine-state';
import { isLegallyBlocked, type LegalEvaluation } from '@/domain/regulation';
import { projectGeo, type MapPosition } from '@/domain/projection';
import { getMarineIndex } from '@/repositories/marine-repository';

/* ────────────────────────────────────────────────────────────
 * 바다의 NOW 질의 계층.
 *
 * 질문 우선순위를 코드에서도 지킨다.
 *   WHAT → WHERE → WHEN → ACTUAL NOW → LEGAL
 * ──────────────────────────────────────────────────────────── */

/** 현장 관측을 신뢰할 수 있는 날짜 범위. 이 밖이면 관측을 보여주지 않는다. */
export const OBSERVATION_RELEVANT_DAYS = 3;

function deps() {
  const index = getMarineIndex();
  return {
    occurrences: index.occurrences,
    rules: index.rules,
    sources: index.sources,
    observations: index.observations,
  };
}

/**
 * 관측은 '실제 지금' 의 데이터다.
 * 사용자가 슬라이더로 4월을 보고 있을 때 오늘의 제보를 섞어 보여주면 거짓말이 된다.
 */
export function observationApplies(date: DateKey): boolean {
  return Math.abs(diffDays(todayKey(), date)) <= OBSERVATION_RELEVANT_DAYS;
}

export function evaluateSpecies(
  speciesId: string,
  date: DateKey,
  options: { zoneId?: string } = {},
): MarineState {
  const index = getMarineIndex();
  const zone = options.zoneId ? index.zoneById.get(options.zoneId) : undefined;

  return evaluateMarineState(
    {
      speciesId,
      date,
      zoneId: options.zoneId,
      seaRegion: zone?.seaRegion,
      adminRegion: zone?.region,
    },
    deps(),
  );
}

/* ── 지도용 집계 ──────────────────────────────────────────── */

export interface ZoneSeason {
  zone: FishingZone;
  season: SeasonEvaluation;
}

/**
 * 지도 위 해양 항목 하나.
 * 어종 × 해역 단위로 묶는다 — 권역 단위로 그리면 sprite 가 100개를 넘어
 * "지금 바다에 뭐가 있나" 가 오히려 안 보인다.
 */
export interface MarineMapItem {
  key: string;
  species: MarineSpecies;
  seaRegion: SeaRegion;
  /** 이 날짜에 시즌인 권역들 */
  activeZones: ZoneSeason[];
  /** 활성 권역의 중심 */
  position: MapPosition;
  state: SeasonState;
  season: SeasonEvaluation;
  legal: LegalEvaluation;
  observation?: ObservationSummary;
}

export function zonePosition(zone: FishingZone): MapPosition {
  return zone.mapPosition ?? projectGeo(zone.geo);
}

function centroid(positions: MapPosition[]): MapPosition {
  if (!positions.length) return { x: 0.5, y: 0.5 };
  const sum = positions.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / positions.length, y: sum.y / positions.length };
}

/**
 * 선택 날짜에 지도에 올릴 해양 항목.
 * 시즌이 아닌 어종은 제외한다 — 규정 때문이 아니라 자연적으로 없기 때문이다.
 * 금어기인 어종은 sprite 를 유지하고 제한 표시만 붙인다.
 */
export function buildMarineMapItems(date: DateKey): MarineMapItem[] {
  const index = getMarineIndex();
  const d = deps();
  const showObservation = observationApplies(date);

  const buckets = new Map<string, ZoneSeason[]>();

  for (const occ of index.occurrences) {
    const zone = index.zoneById.get(occ.zoneId);
    if (!zone) continue;
    const season = evaluateSeason(occ, date);
    if (season.state === 'off') continue;

    const key = `${occ.speciesId}::${zone.seaRegion}`;
    const list = buckets.get(key) ?? [];
    // 같은 권역이 두 번 들어가지 않게 (봄·가을 창이 겹치는 경우)
    const existing = list.find((z) => z.zone.id === zone.id);
    if (existing) {
      if (SEASON_STRENGTH_ORDER[season.state] > SEASON_STRENGTH_ORDER[existing.season.state]) {
        existing.season = season;
      }
    } else {
      list.push({ zone, season });
    }
    buckets.set(key, list);
  }

  const items: MarineMapItem[] = [];

  for (const [key, zoneSeasons] of buckets) {
    const [speciesId, seaRegion] = key.split('::') as [string, SeaRegion];
    const species = index.speciesById.get(speciesId);
    if (!species || !species.discovery) continue;

    const best = zoneSeasons.reduce((a, b) =>
      SEASON_STRENGTH_ORDER[b.season.state] > SEASON_STRENGTH_ORDER[a.season.state] ? b : a,
    );

    // 규정은 해역 대표 권역 기준으로 평가한다 (권역별 차이는 상세에서 보여 준다)
    const legal = evaluateMarineState(
      {
        speciesId,
        date,
        zoneId: best.zone.id,
        seaRegion,
        adminRegion: best.zone.region,
      },
      d,
    ).regulation;

    const observation = showObservation
      ? summarizeObservations(
          d.observations.filter(
            (o) =>
              o.speciesId === speciesId &&
              zoneSeasons.some((z) => z.zone.id === o.zoneId),
          ),
          date,
        )
      : undefined;

    items.push({
      key: `marine:${speciesId}:${seaRegion}`,
      species,
      seaRegion,
      activeZones: zoneSeasons.sort(
        (a, b) => SEASON_STRENGTH_ORDER[b.season.state] - SEASON_STRENGTH_ORDER[a.season.state],
      ),
      position: centroid(zoneSeasons.map((z) => zonePosition(z.zone))),
      state: best.season.state,
      season: best.season,
      legal,
      observation,
    });
  }

  return items.sort(
    (a, b) =>
      SEASON_STRENGTH_ORDER[b.state] - SEASON_STRENGTH_ORDER[a.state] ||
      a.species.name.localeCompare(b.species.name, 'ko'),
  );
}

/* ── 권역 모드 ────────────────────────────────────────────── */

export interface ZoneMarker {
  zone: FishingZone;
  position: MapPosition;
  /** 이 권역에서 지금 시즌인 어종들 */
  entries: { species: MarineSpecies; season: SeasonEvaluation; blocked: boolean }[];
  best: SeasonState;
}

/** "어디로 가야 하는가" 를 지도에서 직접 묻는 모드 */
export function buildZoneMarkers(date: DateKey): ZoneMarker[] {
  const index = getMarineIndex();
  const d = deps();

  return index.zones
    .map((zone) => {
      const entries = (index.occurrencesByZone.get(zone.id) ?? [])
        .map((occ) => {
          const species = index.speciesById.get(occ.speciesId);
          if (!species || !species.discovery) return null;
          const season = evaluateSeason(occ, date);
          if (season.state === 'off') return null;
          const legal = evaluateMarineState(
            { speciesId: occ.speciesId, date, zoneId: zone.id, seaRegion: zone.seaRegion, adminRegion: zone.region },
            d,
          ).regulation;
          return { species, season, blocked: isLegallyBlocked(legal.overallStatus) };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .sort(
          (a, b) => SEASON_STRENGTH_ORDER[b.season.state] - SEASON_STRENGTH_ORDER[a.season.state],
        );

      // 같은 어종이 두 창에 걸치면 강한 쪽만 남긴다
      const seen = new Set<string>();
      const unique = entries.filter((e) => {
        if (seen.has(e.species.id)) return false;
        seen.add(e.species.id);
        return true;
      });

      return {
        zone,
        position: zonePosition(zone),
        entries: unique,
        best: unique[0]?.season.state ?? ('off' as SeasonState),
      };
    })
    .filter((marker) => marker.entries.length > 0)
    .sort(
      (a, b) =>
        SEASON_STRENGTH_ORDER[b.best] - SEASON_STRENGTH_ORDER[a.best] ||
        b.entries.length - a.entries.length,
    );
}

/* ── 권역 상세 ────────────────────────────────────────────── */

export interface ZoneDetail {
  zone: FishingZone;
  spots: FishingSpot[];
  entries: {
    species: MarineSpecies;
    season: SeasonEvaluation;
    legal: LegalEvaluation;
    observation?: ObservationSummary;
  }[];
  /** 이 권역에서 규정 확인이 필요한 어종 */
  restricted: MarineSpecies[];
  recentObservations: FishingObservation[];
}

export function getZoneDetail(zoneSlug: string, date: DateKey): ZoneDetail | null {
  const index = getMarineIndex();
  const zone = index.zoneBySlug.get(zoneSlug);
  if (!zone) return null;

  const d = deps();
  const showObservation = observationApplies(date);

  const seen = new Set<string>();
  const entries: ZoneDetail['entries'] = [];

  for (const occ of index.occurrencesByZone.get(zone.id) ?? []) {
    const species = index.speciesById.get(occ.speciesId);
    if (!species) continue;
    const season = evaluateSeason(occ, date);
    if (season.state === 'off') continue;
    if (seen.has(species.id)) continue;
    seen.add(species.id);

    const state = evaluateMarineState(
      { speciesId: species.id, date, zoneId: zone.id, seaRegion: zone.seaRegion, adminRegion: zone.region },
      d,
    );

    entries.push({
      species,
      season,
      legal: state.regulation,
      observation: showObservation ? state.observation : undefined,
    });
  }

  entries.sort(
    (a, b) => SEASON_STRENGTH_ORDER[b.season.state] - SEASON_STRENGTH_ORDER[a.season.state],
  );

  const recentObservations = showObservation
    ? d.observations
        .filter((o) => o.zoneId === zone.id)
        .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1))
        .slice(0, 8)
    : [];

  return {
    zone,
    spots: index.spotsByZone.get(zone.id) ?? [],
    entries,
    restricted: entries
      .filter((e) => isLegallyBlocked(e.legal.overallStatus))
      .map((e) => e.species),
    recentObservations,
  };
}

/* ── Marine Now · 오늘의 바다 ─────────────────────────────── */

/** 지금 바다에서 만날 수 있는 것들 (지도용 — 해역 단위) */
export function getMarineNow(date: DateKey, limit = 8): MarineMapItem[] {
  return buildMarineMapItems(date).slice(0, limit);
}

export interface MarineNowEntry {
  species: MarineSpecies;
  state: SeasonState;
  seaRegions: SeaRegion[];
  zoneCount: number;
  legal: LegalEvaluation;
  observation?: ObservationSummary;
  /** 대표 항목 (지도 focus 용) */
  primary: MarineMapItem;
}

/**
 * 목록용 집계 — 어종 단위.
 * 지도는 해역별로 나눠 보여주지만 목록에서 같은 어종이 세 번 나오면 읽히지 않는다.
 */
export function getMarineNowBySpecies(date: DateKey, limit = 6): MarineNowEntry[] {
  const grouped = new Map<string, MarineMapItem[]>();

  for (const item of buildMarineMapItems(date)) {
    const list = grouped.get(item.species.id);
    if (list) list.push(item);
    else grouped.set(item.species.id, [item]);
  }

  return [...grouped.values()]
    .map((items) => {
      const primary = items.reduce((a, b) =>
        SEASON_STRENGTH_ORDER[b.state] > SEASON_STRENGTH_ORDER[a.state] ? b : a,
      );
      const recentCount = items.reduce((n, i) => n + (i.observation?.recentCount ?? 0), 0);
      return {
        species: primary.species,
        state: primary.state,
        seaRegions: [...new Set(items.map((i) => i.seaRegion))],
        zoneCount: items.reduce((n, i) => n + i.activeZones.length, 0),
        legal: primary.legal,
        observation: primary.observation
          ? { ...primary.observation, recentCount }
          : undefined,
        primary,
      };
    })
    .sort(
      (a, b) =>
        SEASON_STRENGTH_ORDER[b.state] - SEASON_STRENGTH_ORDER[a.state] ||
        b.zoneCount - a.zoneCount ||
        a.species.name.localeCompare(b.species.name, 'ko'),
    )
    .slice(0, limit);
}

export interface SeaHeadline {
  id: string;
  item: MarineMapItem;
  text: string;
}

/** 오늘의 바다 — occurrence 데이터에서 문장을 만든다 */
export function getSeaHeadlines(date: DateKey, limit = 3): SeaHeadline[] {
  const items = buildMarineMapItems(date);

  const peak = items.filter((i) => i.state === 'peak');
  const starting = items.filter((i) => i.season.status === 'starting');
  const blocked = items.filter((i) => isLegallyBlocked(i.legal.overallStatus));
  const rest = items.filter((i) => i.state === 'good');

  const picked: MarineMapItem[] = [];
  const seen = new Set<string>();
  for (const bucket of [peak, starting, blocked, rest]) {
    for (const item of bucket) {
      if (picked.length >= limit) break;
      if (seen.has(item.species.id)) continue;
      seen.add(item.species.id);
      picked.push(item);
    }
  }

  return picked.map((item) => ({
    id: item.key,
    item,
    text: seaHeadlineText(item),
  }));
}

function seaHeadlineText(item: MarineMapItem): string {
  const where = item.seaRegion;
  const name = item.species.name;

  if (isLegallyBlocked(item.legal.overallStatus)) {
    return `${topic(name)} ${where}에서 시즌이지만 규정을 확인해야 합니다`;
  }
  if (item.state === 'peak') return `${where} ${name} 시즌이 절정입니다`;
  if (item.season.status === 'starting') return `${where} ${name} 시즌이 시작되고 있습니다`;
  if (item.season.status === 'ending') return `${where} ${name} 시즌이 저물고 있습니다`;
  return `${where}에서 ${object(name)} 만날 수 있습니다`;
}

/* ── 이번 주 뭐 잡으러 갈까 ───────────────────────────────── */

export interface FishingPick {
  species: MarineSpecies;
  zone: FishingZone;
  season: SeasonEvaluation;
  legal: LegalEvaluation;
  observation?: ObservationSummary;
  /** 0~5 별점 */
  score: number;
}

/**
 * 초기 랭킹: 시즌 강도 + 피크 여부 + 최근 관측 + 권역 다양성.
 * 법적으로 막힌 어종은 '잡으러 갈 대상' 으로 추천하지 않는다.
 */
export function getFishingPicks(date: DateKey, limit = 8): FishingPick[] {
  const index = getMarineIndex();
  const d = deps();
  const showObservation = observationApplies(date);

  const candidates: FishingPick[] = [];

  for (const occ of index.occurrences) {
    const zone = index.zoneById.get(occ.zoneId);
    const species = index.speciesById.get(occ.speciesId);
    if (!zone || !species || !species.discovery) continue;

    const season = evaluateSeason(occ, date);
    if (season.state === 'off' || season.state === 'low') continue;

    const state = evaluateMarineState(
      { speciesId: species.id, date, zoneId: zone.id, seaRegion: zone.seaRegion, adminRegion: zone.region },
      d,
    );

    // 규정으로 막힌 대상은 추천하지 않는다 (지도에서는 계속 보인다)
    if (isLegallyBlocked(state.regulation.overallStatus)) continue;

    const observation = showObservation ? state.observation : undefined;

    const base = SEASON_STRENGTH_ORDER[season.state]; // 2~4
    const observationBoost = observation
      ? Math.min(1, observation.recentCount / 6) + (observation.trend === 'up' ? 0.4 : 0)
      : 0;

    candidates.push({
      species,
      zone,
      season,
      legal: state.regulation,
      observation,
      score: Math.min(5, base + observationBoost),
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  // 같은 어종이 목록을 도배하지 않게 어종당 최상위 권역 하나만 남긴다
  const seen = new Set<string>();
  return candidates
    .filter((c) => {
      if (seen.has(c.species.id)) return false;
      seen.add(c.species.id);
      return true;
    })
    .slice(0, limit);
}

/* ── 단건 조회 ────────────────────────────────────────────── */

export function getSpeciesBySlug(slug: string): MarineSpecies | null {
  return getMarineIndex().speciesBySlug.get(slug) ?? null;
}

export function getZoneBySlug(slug: string): FishingZone | null {
  return getMarineIndex().zoneBySlug.get(slug) ?? null;
}

export function listSpeciesSlugs(): string[] {
  return getMarineIndex().species.map((s) => s.slug);
}

export function listZoneSlugs(): string[] {
  return getMarineIndex().zones.map((z) => z.slug);
}

/** 한 어종이 지금 시즌인 모든 권역 */
export function getSpeciesZones(speciesId: string, date: DateKey): ZoneSeason[] {
  const index = getMarineIndex();
  const out = new Map<string, ZoneSeason>();

  for (const occ of index.occurrencesBySpecies.get(speciesId) ?? []) {
    const zone = index.zoneById.get(occ.zoneId);
    if (!zone) continue;
    const season = evaluateSeason(occ, date);
    if (season.state === 'off') continue;
    const existing = out.get(zone.id);
    if (!existing || SEASON_STRENGTH_ORDER[season.state] > SEASON_STRENGTH_ORDER[existing.season.state]) {
      out.set(zone.id, { zone, season });
    }
  }

  return [...out.values()].sort(
    (a, b) => SEASON_STRENGTH_ORDER[b.season.state] - SEASON_STRENGTH_ORDER[a.season.state],
  );
}

/** 시즌이 아니어도 이 어종이 언제 어디서 나오는지 (상세·도감용) */
export function getSpeciesAllZones(speciesId: string): { zone: FishingZone; months: string }[] {
  const index = getMarineIndex();
  const map = new Map<string, { zone: FishingZone; ranges: string[] }>();

  for (const occ of index.occurrencesBySpecies.get(speciesId) ?? []) {
    const zone = index.zoneById.get(occ.zoneId);
    if (!zone) continue;
    const label = `${Number(occ.startDate.slice(0, 2))}월~${Number(occ.endDate.slice(0, 2))}월`;
    const entry = map.get(zone.id) ?? { zone, ranges: [] };
    if (!entry.ranges.includes(label)) entry.ranges.push(label);
    map.set(zone.id, entry);
  }

  return [...map.values()].map(({ zone, ranges }) => ({ zone, months: ranges.join(', ') }));
}

export function getRecentObservations(
  filter: { speciesId?: string; zoneId?: string },
  limit = 8,
): FishingObservation[] {
  return getMarineIndex()
    .observations.filter(
      (o) =>
        (filter.speciesId ? o.speciesId === filter.speciesId : true) &&
        (filter.zoneId ? o.zoneId === filter.zoneId : true),
    )
    .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1))
    .slice(0, limit);
}
