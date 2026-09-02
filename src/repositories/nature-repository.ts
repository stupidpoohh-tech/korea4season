import { dataSources } from '@/data-sources';
import { loadLocations } from '@/data-sources/shared/location-adapter';
import type { Location, NatureEntity, NatureOccurrence } from '@/domain/types';

/**
 * 모든 data source 를 하나의 인덱스로 합친다.
 * 지금은 fixture 기반이라 동기적이지만, 원격 소스로 바뀌면
 * 이 모듈만 async 로 바꾸고 service 시그니처를 유지하면 된다.
 */

export interface NatureIndex {
  entities: NatureEntity[];
  occurrences: NatureOccurrence[];
  locations: Location[];
  entityById: ReadonlyMap<string, NatureEntity>;
  entityBySlug: ReadonlyMap<string, NatureEntity>;
  locationById: ReadonlyMap<string, Location>;
  occurrenceById: ReadonlyMap<string, NatureOccurrence>;
  occurrenceBySlug: ReadonlyMap<string, NatureOccurrence>;
  occurrencesByEntityId: ReadonlyMap<string, NatureOccurrence[]>;
  /** 하나라도 DEMO 데이터가 섞여 있는가 */
  hasDemoData: boolean;
}

function build(): NatureIndex {
  const entities: NatureEntity[] = [];
  const occurrences: NatureOccurrence[] = [];
  const locations: Location[] = loadLocations();

  for (const source of dataSources) {
    const set = source.load();
    entities.push(...set.entities);
    occurrences.push(...set.occurrences);
    if (set.locations) locations.push(...set.locations);
  }

  const entityById = new Map(entities.map((e) => [e.id, e]));
  const entityBySlug = new Map(entities.map((e) => [e.slug, e]));
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const occurrenceById = new Map(occurrences.map((o) => [o.id, o]));
  const occurrenceBySlug = new Map(occurrences.map((o) => [o.slug, o]));

  const occurrencesByEntityId = new Map<string, NatureOccurrence[]>();
  for (const occ of occurrences) {
    const list = occurrencesByEntityId.get(occ.entityId);
    if (list) list.push(occ);
    else occurrencesByEntityId.set(occ.entityId, [occ]);
  }

  return {
    entities,
    occurrences,
    locations,
    entityById,
    entityBySlug,
    locationById,
    occurrenceById,
    occurrenceBySlug,
    occurrencesByEntityId,
    hasDemoData: occurrences.some((o) => o.isDemo),
  };
}

let cached: NatureIndex | null = null;

export function getNatureIndex(): NatureIndex {
  cached ??= build();
  return cached;
}
