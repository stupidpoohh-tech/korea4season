/**
 * base map asset 경로.
 *
 * 기본값은 scripts/generate-base-map.mjs 가 굽는 SVG 다.
 * 원본 일러스트(PNG/WebP)를 public/map/ 에 넣었다면 이 상수만 바꾸면
 * 나머지 좌표계(0~1 normalized)는 그대로 맞는다. viewBox 비율만 지킬 것.
 *   src/domain/map-bounds.json 의 viewWidth : viewHeight = 1000 : 1300
 */
export const BASE_MAP_SRC = '/map/korea-base.svg';

/** 지도 이미지의 고유 종횡비 */
export const BASE_MAP_ASPECT = '1000 / 1300';
