import { birdDataSource } from './bird/adapter';
import { fishingDataSource } from './fishing/adapter';
import { flowerDataSource } from './flower/adapter';
import { foliageDataSource } from './foliage/adapter';
import { wildlifeDataSource } from './wildlife/adapter';
import type { NatureDataSource } from './types';

/**
 * 데이터 소스 레지스트리.
 * 새 자연현상을 붙일 때는 여기 adapter 를 추가하기만 하면
 * 지도 · 타임라인 · 도감 · 추천이 전부 따라온다.
 */
export const dataSources: NatureDataSource[] = [
  fishingDataSource,
  flowerDataSource,
  foliageDataSource,
  birdDataSource,
  wildlifeDataSource,
];

export type { NatureDataSource, NatureDataSet } from './types';
