import type { NatureDataSet, NatureDataSource } from '../types';
import {
  loadFishingOccurrences,
  loadSpecies,
  loadZones,
  toGenericOccurrences,
  zonesAsLocations,
} from './adapter';

/**
 * 해양 소스가 generic 레이어에 내보내는 것은 '시즌' 뿐이다.
 * 규정·관측은 marine-repository 를 통해 별도로 읽는다.
 */
export const marineDataSource: NatureDataSource = {
  id: 'marine',
  label: '바다',
  category: 'fishing',
  load(): NatureDataSet {
    const zones = loadZones();
    const occurrences = loadFishingOccurrences();
    return {
      entities: loadSpecies(),
      locations: zonesAsLocations(zones),
      occurrences: toGenericOccurrences(occurrences, zones),
    };
  },
};
