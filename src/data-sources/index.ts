import { birdDataSource } from './bird/adapter';
import { flowerDataSource } from './flower/adapter';
import { foliageDataSource } from './foliage/adapter';
import { marineDataSource } from './marine';
import { wildlifeDataSource } from './wildlife/adapter';
import type { NatureCategory } from '@/domain/types';
import type { NatureDataSource } from './types';

/**
 * 데이터 소스 레지스트리.
 *
 * Phase 1 은 바다, Phase 2 는 단풍이다.
 * 꽃 · 철새 · 자연현상 소스는 삭제하지 않고 enabled 만 false 로 둔다.
 * 데이터 파일과 adapter 는 그대로 살아 있으므로
 * 다시 켤 때는 이 플래그 하나만 바꾸면 지도 · 타임라인 · 도감 · 추천이 전부 따라온다.
 */
interface RegisteredSource {
  source: NatureDataSource;
  /** 이 소스가 실제로 내보내는 카테고리들 */
  categories: NatureCategory[];
  enabled: boolean;
}

const REGISTRY: RegisteredSource[] = [
  { source: marineDataSource, categories: ['fishing'], enabled: true },
  { source: flowerDataSource, categories: ['flower'], enabled: false },
  { source: foliageDataSource, categories: ['foliage'], enabled: true },
  { source: birdDataSource, categories: ['bird'], enabled: false },
  // wildlife 는 해양생물(물범·돌고래)과 자연현상(반딧불이·상고대)을 함께 담는다
  { source: wildlifeDataSource, categories: ['marine', 'nature'], enabled: false },
];

export const dataSources: NatureDataSource[] = REGISTRY.filter((r) => r.enabled).map(
  (r) => r.source,
);

/** 지금 켜져 있는 카테고리. 레이어 필터가 이 목록만 그린다. */
export const ENABLED_CATEGORIES: NatureCategory[] = [
  ...new Set(REGISTRY.filter((r) => r.enabled).flatMap((r) => r.categories)),
];

/** 카테고리가 하나뿐이면 레이어 선택 자체가 의미 없다 */
export const SHOW_LAYER_FILTER = ENABLED_CATEGORIES.length > 1;

export type { NatureDataSource, NatureDataSet } from './types';
