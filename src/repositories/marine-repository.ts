import { todayKey } from '@/domain/date';
import type {
  FishingObservation,
  FishingOccurrence,
  FishingSpot,
  FishingZone,
  MarineSpecies,
} from '@/domain/marine';
import type { LegalRule, LegalSource } from '@/domain/regulation';
import {
  loadFishingOccurrences,
  loadLegalRules,
  loadLegalSources,
  loadObservations,
  loadSpecies,
  loadSpots,
  loadZones,
} from '@/data-sources/marine/adapter';

/**
 * 해양 레이어 인덱스.
 *
 * 시즌 · 규정 · 관측을 각각 따로 담는다.
 * 하나의 합쳐진 "물고기 상태" 테이블을 만들지 않는다.
 */
export interface MarineIndex {
  species: MarineSpecies[];
  speciesById: ReadonlyMap<string, MarineSpecies>;
  speciesBySlug: ReadonlyMap<string, MarineSpecies>;

  zones: FishingZone[];
  zoneById: ReadonlyMap<string, FishingZone>;
  zoneBySlug: ReadonlyMap<string, FishingZone>;

  spots: FishingSpot[];
  spotsByZone: ReadonlyMap<string, FishingSpot[]>;

  occurrences: FishingOccurrence[];
  occurrencesBySpecies: ReadonlyMap<string, FishingOccurrence[]>;
  occurrencesByZone: ReadonlyMap<string, FishingOccurrence[]>;

  rules: LegalRule[];
  sources: ReadonlyMap<string, LegalSource>;

  observations: FishingObservation[];
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function build(): MarineIndex {
  const species = loadSpecies();
  const zones = loadZones();
  const spots = loadSpots();
  const occurrences = loadFishingOccurrences();

  return {
    species,
    speciesById: new Map(species.map((s) => [s.id, s])),
    speciesBySlug: new Map(species.map((s) => [s.slug, s])),

    zones,
    zoneById: new Map(zones.map((z) => [z.id, z])),
    zoneBySlug: new Map(zones.map((z) => [z.slug, z])),

    spots,
    spotsByZone: groupBy(spots, (s) => s.zoneId),

    occurrences,
    occurrencesBySpecies: groupBy(occurrences, (o) => o.speciesId),
    occurrencesByZone: groupBy(occurrences, (o) => o.zoneId),

    rules: loadLegalRules(),
    sources: new Map(loadLegalSources().map((s) => [s.id, s])),

    // 관측은 '오늘' 기준 상대일로 만들어지므로 날짜가 바뀌면 다시 만든다
    observations: loadObservations(),
  };
}

let cached: { day: string; index: MarineIndex } | null = null;

export function getMarineIndex(): MarineIndex {
  const day = todayKey();
  if (!cached || cached.day !== day) cached = { day, index: build() };
  return cached.index;
}
