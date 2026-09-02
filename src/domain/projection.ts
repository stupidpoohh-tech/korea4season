import bounds from './map-bounds.json';

/**
 * 지도 좌표 추상화.
 *
 * 이 앱의 base map 은 GIS 타일이 아니라 하나의 일러스트 asset 이다.
 * 따라서 모든 sprite 위치는 0~1 normalized coordinate 로 다루고,
 * 컨테이너 크기에 곱해서 화면 좌표로 변환한다. (요구사항 #19)
 *
 * 데이터에는 실제 lat/lng 를 함께 보관한다.
 * mapPosition 이 명시되지 않은 Location 은 아래 등장방형도법으로 투영한다.
 * 울릉도/독도처럼 base map 에서 위치를 압축해 표현한 대상은
 * Location.mapPosition 으로 직접 override 한다.
 */
export const MAP_BOUNDS = bounds;

export interface MapPosition {
  /** 0~1, 왼쪽에서 오른쪽 */
  x: number;
  /** 0~1, 위에서 아래 */
  y: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** lat/lng -> normalized map position (0~1) */
export function projectGeo({ lat, lng }: GeoPoint): MapPosition {
  const { west, east, south, north } = MAP_BOUNDS;
  return {
    x: clamp01((lng - west) / (east - west)),
    y: clamp01((north - lat) / (north - south)),
  };
}

/** normalized map position -> lat/lng (역투영) */
export function unprojectGeo({ x, y }: MapPosition): GeoPoint {
  const { west, east, south, north } = MAP_BOUNDS;
  return {
    lng: west + x * (east - west),
    lat: north - y * (north - south),
  };
}

/** normalized -> base map SVG viewBox 좌표 */
export function toViewBox({ x, y }: MapPosition) {
  return { x: x * MAP_BOUNDS.viewWidth, y: y * MAP_BOUNDS.viewHeight };
}

export const MAP_ASPECT_RATIO = MAP_BOUNDS.viewWidth / MAP_BOUNDS.viewHeight;
