import { toDateKey, todayKey } from '@/domain/date';
import type {
  FishingMethod,
  FishingObservation,
  FishingOccurrence,
  FishingSpot,
  FishingSpotType,
  FishingZone,
  MarineSpecies,
  QuantityLevel,
  SeaRegion,
  SeasonStrength,
  WaterType,
} from '@/domain/marine';
import type {
  LegalRule,
  LegalRuleKind,
  LegalSource,
  MeasurementRule,
  RuleOverride,
  RuleScope,
} from '@/domain/regulation';
import type { Confidence, Location, NatureOccurrence, SourceRef } from '@/domain/types';
import observationsRaw from './observations.json';
import regulationsRaw from './regulations.json';
import seasonsRaw from './seasons.json';
import speciesRaw from './species.json';
import spotsRaw from './spots.json';
import zonesRaw from './zones.json';

/* ────────────────────────────────────────────────────────────
 * 바다의 NOW 어댑터.
 *
 * 네 레이어를 각각 normalize 하고 절대 하나로 합치지 않는다.
 *   species / zones+spots / seasons / regulations (+ observations)
 *
 * 지도·타임라인이 쓰는 generic NatureOccurrence 는
 * 시즌 레이어에서만 파생된다. 규정은 절대 sprite 를 만들지 않는다.
 * ──────────────────────────────────────────────────────────── */

const SPRITE_DIR = speciesRaw.meta.spriteDir;

/** 에셋이 들어오면 자동으로 이모지를 대체한다. 아직 목록에 없으면 undefined. */
const AVAILABLE_SPRITES = new Set<string>([
  // public/sprites/species/<slug>.svg 를 추가한 뒤 여기에 slug 를 넣는다.
]);

/* ── 어종 ─────────────────────────────────────────────────── */

interface RawSpecies {
  code: string;
  name: string;
  aliases?: string[];
  speciesName?: string;
  icon: string;
  rarity?: number;
  seaRegions: string[];
  discovery: boolean;
  regulated: boolean;
  summary: string;
  description?: string;
}

export function loadSpecies(): MarineSpecies[] {
  return (speciesRaw.species as RawSpecies[]).map((row) => ({
    id: `marine:${row.code}`,
    slug: row.code,
    category: 'fishing',
    name: row.name,
    aliases: row.aliases,
    speciesName: row.speciesName,
    icon: row.icon,
    illustration: AVAILABLE_SPRITES.has(row.code) ? `${SPRITE_DIR}/${row.code}.svg` : undefined,
    summary: row.summary,
    description: row.description,
    rarity: (row.rarity as MarineSpecies['rarity']) ?? 2,
    tags: row.seaRegions,
    seaRegions: row.seaRegions as SeaRegion[],
    discovery: row.discovery,
    regulated: row.regulated,
  }));
}

/* ── 권역 · 장소 ──────────────────────────────────────────── */

interface RawZone {
  code: string;
  name: string;
  region: string;
  subregion?: string;
  seaRegion: string;
  lat: number;
  lng: number;
  waterType: string;
  shoreTypes: string[];
  description?: string;
}

export function loadZones(): FishingZone[] {
  return (zonesRaw.zones as RawZone[]).map((row) => ({
    id: `zone:${row.code}`,
    slug: row.code,
    name: row.name,
    region: row.region,
    subregion: row.subregion,
    seaRegion: row.seaRegion as SeaRegion,
    geo: { lat: row.lat, lng: row.lng },
    waterType: row.waterType as WaterType,
    shoreTypes: row.shoreTypes as FishingSpotType[],
    description: row.description,
    // 권역 자체는 넓은 단위라 공개해도 특정 포인트가 드러나지 않는다
    publicVisibility: 'REGION',
  }));
}

/** 권역을 generic Location 으로도 등록해 지도 좌표계를 공유한다 */
export function zonesAsLocations(zones: FishingZone[]): Location[] {
  return zones.map((zone) => ({
    id: zone.id,
    slug: zone.slug,
    name: zone.name,
    region: zone.region,
    subregion: zone.subregion,
    type: 'sea',
    geo: zone.geo,
    description: zone.description,
  }));
}

interface RawSpot {
  code: string;
  zone: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  publicKnownSpot: boolean;
  accessInfo?: string;
}

export function loadSpots(): FishingSpot[] {
  return (spotsRaw.spots as RawSpot[]).map((row) => ({
    id: `spot:${row.code}`,
    slug: row.code,
    zoneId: `zone:${row.zone}`,
    name: row.name,
    geo: { lat: row.lat, lng: row.lng },
    type: row.type as FishingSpotType,
    publicKnownSpot: row.publicKnownSpot,
    accessInfo: row.accessInfo,
  }));
}

/* ── 시즌 ─────────────────────────────────────────────────── */

interface RawSeasonWindow {
  zones: string[];
  start: string;
  end: string;
  peakStart?: string;
  peakEnd?: string;
  strength: string;
  methods: string[];
  note?: string;
}

interface RawSeason {
  species: string;
  windows: RawSeasonWindow[];
}

const SEASON_CONFIDENCE = seasonsRaw.meta.isDemo ? 'demo' : 'estimated';

export const SEASON_DISCLAIMER = seasonsRaw.meta.disclaimer;

export function loadFishingOccurrences(): FishingOccurrence[] {
  const out: FishingOccurrence[] = [];

  for (const season of seasonsRaw.seasons as RawSeason[]) {
    season.windows.forEach((window, windowIndex) => {
      for (const zoneCode of window.zones) {
        out.push({
          id: `focc:${season.species}:${zoneCode}:${windowIndex}`,
          speciesId: `marine:${season.species}`,
          zoneId: `zone:${zoneCode}`,
          startDate: window.start,
          endDate: window.end,
          peakStartDate: window.peakStart,
          peakEndDate: window.peakEnd,
          seasonStrength: window.strength as SeasonStrength,
          confidence: SEASON_CONFIDENCE as Confidence,
          recommendedMethods: window.methods as FishingMethod[],
          sourceIds: [],
          // 근거를 대조하지 않았으므로 비워 둔다. UI 는 이것으로 '미검증' 을 표시한다.
          lastVerifiedAt: undefined,
          note: window.note,
        });
      }
    });
  }

  return out;
}

/* ── 규정 ─────────────────────────────────────────────────── */

interface RawRuleScope {
  mode?: string;
  seaRegions?: string[];
  zoneIds?: string[];
  adminRegions?: string[];
  methods?: string[];
  description?: string;
}

interface RawOverride {
  id: string;
  scope: RawRuleScope;
  windows?: { start: string; end: string; note?: string }[];
  measurements?: MeasurementRule[];
  reason: string;
  sourceId?: string;
}

interface RawRule {
  id: string;
  species: string;
  kind: string;
  scope: RawRuleScope;
  windows?: { start: string; end: string; note?: string }[];
  measurements?: MeasurementRule[];
  overrides?: RawOverride[];
  exceptions?: { id: string; description: string; appliesTo?: RawRuleScope }[];
  waivers?: { id: string; scope: RawRuleScope; from: string; to: string; reason: string }[];
  sourceId: string;
  note?: string;
}

function toScope(raw?: RawRuleScope): RuleScope {
  return {
    mode: raw?.mode === 'exclude' ? 'exclude' : 'include',
    seaRegions: raw?.seaRegions as SeaRegion[] | undefined,
    zoneIds: raw?.zoneIds?.map((z) => (z.startsWith('zone:') ? z : `zone:${z}`)),
    adminRegions: raw?.adminRegions,
    methods: raw?.methods as FishingMethod[] | undefined,
    description: raw?.description,
  };
}

const REGULATION_CONFIDENCE = (regulationsRaw.meta.isDemo ? 'demo' : 'official') as Confidence;

export const REGULATION_DISCLAIMER = regulationsRaw.meta.disclaimer;

export function loadLegalSources(): LegalSource[] {
  return regulationsRaw.sources as LegalSource[];
}

export function loadLegalRules(): LegalRule[] {
  return (regulationsRaw.rules as RawRule[]).map((row) => ({
    id: row.id,
    speciesId: `marine:${row.species}`,
    kind: row.kind as LegalRuleKind,
    scope: toScope(row.scope),
    windows: row.windows ?? [],
    measurements: row.measurements ?? [],
    overrides: (row.overrides ?? []).map<RuleOverride>((o) => ({
      id: o.id,
      scope: toScope(o.scope),
      windows: o.windows,
      measurements: o.measurements,
      reason: o.reason,
      sourceId: o.sourceId,
    })),
    exceptions: (row.exceptions ?? []).map((e) => ({
      id: e.id,
      description: e.description,
      appliesTo: e.appliesTo ? toScope(e.appliesTo) : undefined,
    })),
    waivers: (row.waivers ?? []).map((w) => ({
      id: w.id,
      scope: toScope(w.scope),
      from: w.from,
      to: w.to,
      reason: w.reason,
    })),
    sourceId: row.sourceId,
    confidence: REGULATION_CONFIDENCE,
    // 원문 대조 전이므로 비워 둔다
    lastVerifiedAt: undefined,
    note: row.note,
  }));
}

/* ── 관측 ─────────────────────────────────────────────────── */

interface RawObservation {
  species: string;
  zone: string;
  spot?: string;
  daysAgo: number;
  quantityLevel?: string;
  catchSizeCm?: number;
  method?: string;
  verificationCount: number;
}

/**
 * 관측은 '실제 지금' 을 다루므로 절대 날짜가 아니라 오늘 기준 상대일로 저장한다.
 * 선택 날짜(selectedDate)가 아니라 실제 오늘을 기준으로 삼는 것이 핵심이다.
 */
export function loadObservations(now: number = Date.now()): FishingObservation[] {
  const today = todayKey(now);

  return (observationsRaw.observations as RawObservation[]).map((row, index) => {
    const observedDay = toDateKey(
      new Date(new Date(`${today}T00:00:00Z`).getTime() - row.daysAgo * 86_400_000),
    );
    return {
      id: `obs:demo:${index}`,
      speciesId: `marine:${row.species}`,
      zoneId: `zone:${row.zone}`,
      spotId: row.spot ? `spot:${row.spot}` : undefined,
      observedAt: `${observedDay}T09:00:00+09:00`,
      quantityLevel: row.quantityLevel as QuantityLevel | undefined,
      catchSizeCm: row.catchSizeCm,
      fishingMethod: row.method as FishingMethod | undefined,
      verificationCount: row.verificationCount,
      sourceType: 'IMPORTED',
      locationVisibility: row.spot ? 'EXACT' : 'REGION',
    };
  });
}

export const OBSERVATION_DISCLAIMER = observationsRaw.meta.disclaimer;

/* ── generic 레이어로 내보내기 ────────────────────────────── */

const SEASON_SOURCE: SourceRef = {
  name: seasonsRaw.meta.name,
  updatedAt: seasonsRaw.meta.updatedAt,
  note: seasonsRaw.meta.disclaimer,
};

/**
 * 지도·타임라인·도감이 공유하는 generic occurrence.
 *
 * 권역 단위로 그대로 내보내면 sprite 가 100개를 넘어 지도가 무너지므로
 * 해역(서해·남해·동해·제주) 단위로 묶는다. 권역별 상세는 marine 레이어가 갖는다.
 *
 * polarity 는 항상 'observable' 이다 — 시즌은 '만날 수 있는 기간' 이지
 * '잡으면 안 되는 기간' 이 아니다. 그 판단은 규정 레이어가 한다.
 */
export function toGenericOccurrences(
  occurrences: FishingOccurrence[],
  zones: FishingZone[],
): NatureOccurrence[] {
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const grouped = new Map<string, FishingOccurrence[]>();

  for (const occ of occurrences) {
    const zone = zoneById.get(occ.zoneId);
    if (!zone) continue;
    const key = `${occ.speciesId}::${zone.seaRegion}`;
    const list = grouped.get(key);
    if (list) list.push(occ);
    else grouped.set(key, [occ]);
  }

  const out: NatureOccurrence[] = [];

  for (const [key, group] of grouped) {
    const [speciesId, seaRegion] = key.split('::') as [string, SeaRegion];
    const slug = `${speciesId.replace('marine:', '')}-${romanizeSeaRegion(seaRegion)}`;

    // 해역 안에서 가장 넓은 창을 대표로 삼는다 (권역별 차이는 상세에서 보여 준다)
    const widest = group.reduce((best, o) =>
      spanDays(o.startDate, o.endDate) > spanDays(best.startDate, best.endDate) ? o : best,
    );

    out.push({
      id: `occ:marine:${speciesId.replace('marine:', '')}:${romanizeSeaRegion(seaRegion)}`,
      slug,
      entityId: speciesId,
      locationIds: group.map((o) => o.zoneId),
      regions: [seaRegion],
      recurrence: 'annual',
      startDate: widest.startDate,
      endDate: widest.endDate,
      peakStartDate: widest.peakStartDate,
      peakEndDate: widest.peakEndDate,
      polarity: 'observable',
      confidence: SEASON_CONFIDENCE as Confidence,
      source: SEASON_SOURCE,
      weight: widest.seasonStrength === 'peak' ? 0.95 : widest.seasonStrength === 'good' ? 0.8 : 0.6,
      isDemo: true,
      metadata: { seaRegion, zoneIds: group.map((o) => o.zoneId) },
    });
  }

  return out;
}

const SEA_REGION_SLUG: Record<SeaRegion, string> = {
  서해: 'west',
  남해: 'south',
  동해: 'east',
  제주: 'jeju',
};

function romanizeSeaRegion(region: SeaRegion): string {
  return SEA_REGION_SLUG[region] ?? 'sea';
}

/** MM-DD 구간의 대략적 길이 (연말 넘김 포함) */
function spanDays(start: string, end: string): number {
  const toDay = (md: string) => Number(md.slice(0, 2)) * 31 + Number(md.slice(3, 5));
  const s = toDay(start);
  const e = toDay(end);
  return e >= s ? e - s : 12 * 31 - s + e;
}
