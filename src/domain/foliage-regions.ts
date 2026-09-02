/* ────────────────────────────────────────────────────────────
 * 단풍은 '점'이 아니라 '띠'로 내려온다.
 *
 * 명소 12곳을 각각 지도에 찍으면 사용자는 마커의 개수를 세게 된다.
 * 실제로 일어나는 일은 그것이 아니다 — 북쪽 산이 먼저 물들고,
 * 그 색이 한 달에 걸쳐 남쪽으로 내려온다.
 *
 * 그래서 명소를 권역으로 묶고, 지도의 산과 숲은 '자기가 속한 권역의 색'을
 * 입는다. 지도 위에서 바뀌는 것은 마커 수가 아니라 **색의 위치**다.
 *
 * 순서는 북 → 남이다. 이 배열 순서가 곧 단풍 전선이 내려오는 순서다.
 * ──────────────────────────────────────────────────────────── */

export interface FoliageRegionConfig {
  id: string;
  label: string;
  /** 이 권역의 상태를 정하는 명소들 (locations.json 의 slug) */
  locationSlugs: string[];
}

export const FOLIAGE_REGIONS: FoliageRegionConfig[] = [
  { id: 'north-gangwon', label: '북부 강원', locationSlugs: ['seoraksan', 'odaesan'] },
  { id: 'central-gangwon', label: '중부 강원', locationSlugs: ['chiaksan'] },
  { id: 'capital', label: '서울·수도권', locationSlugs: ['bukhansan', 'seoul'] },
  {
    id: 'chungcheong',
    label: '충청·소백',
    locationSlugs: ['sobaeksan', 'woraksan', 'songnisan', 'gyeryongsan'],
  },
  { id: 'south', label: '지리·덕유', locationSlugs: ['jirisan', 'deogyusan'] },
  { id: 'southwest', label: '호남', locationSlugs: ['naejangsan', 'mudeungsan'] },
  { id: 'jeju', label: '제주', locationSlugs: ['hallasan'] },
];

/** slug → 권역 id. 어느 권역에도 없는 명소는 지도 색을 바꾸지 않는다. */
export const REGION_BY_LOCATION: Record<string, string> = Object.fromEntries(
  FOLIAGE_REGIONS.flatMap((region) =>
    region.locationSlugs.map((slug) => [slug, region.id] as const),
  ),
);
