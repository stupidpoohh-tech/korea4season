import { MAP_BOUNDS } from '@/domain/projection';

/**
 * base map asset 경로.
 *
 * 기본값은 scripts/generate-base-map.mjs 가 굽는 SVG 다.
 * 원본 일러스트(PNG/WebP)를 public/map/ 에 넣었다면 이 상수만 바꾸면
 * 나머지 좌표계(0~1 normalized)는 그대로 맞는다. viewBox 비율만 지킬 것.
 *   src/domain/map-bounds.json 의 viewWidth : viewHeight
 */
export const BASE_MAP_SRC = '/map/korea-base.svg';

/** 지도 이미지의 고유 종횡비. map-bounds.json 이 유일한 출처다. */
export const BASE_MAP_ASPECT = `${MAP_BOUNDS.viewWidth} / ${MAP_BOUNDS.viewHeight}`;

/**
 * 컨테이너 폭 대비 지도 높이 (%).
 * 폭이 정해진 칸에서 지도가 차지할 최대 높이를 cqw 로 쓰기 위한 값이다.
 */
export const BASE_MAP_HEIGHT_CQW = (MAP_BOUNDS.viewHeight / MAP_BOUNDS.viewWidth) * 100;
