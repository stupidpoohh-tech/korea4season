import type {
  Location,
  NatureCategory,
  NatureEntity,
  NatureOccurrence,
} from '@/domain/types';

/**
 * 모든 원천 데이터는 이 형태로 normalize 되어 repository 로 들어간다.
 * 원본 스키마(법령 별표, 개화 예보, 탐조 기록…)는 adapter 안에서만 다룬다.
 * (요구사항 #23)
 */
export interface NatureDataSet {
  entities: NatureEntity[];
  occurrences: NatureOccurrence[];
  /** source 가 자체적으로 가진 장소. 공통 카탈로그와 병합된다. */
  locations?: Location[];
}

export interface NatureDataSource {
  id: string;
  label: string;
  category: NatureCategory | 'mixed';
  /** 지금은 동기 fixture. 원격 API 로 바뀌어도 시그니처는 유지된다. */
  load(): NatureDataSet;
}
