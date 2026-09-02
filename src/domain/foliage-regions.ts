/* ────────────────────────────────────────────────────────────
 * 단풍은 '점'이 아니라 '띠'로 내려온다.
 *
 * 명소를 각각 지도에 찍으면 사용자는 마커의 개수를 세게 된다.
 * 실제로 일어나는 일은 북쪽 산이 먼저 물들고, 그 색이 한 달에 걸쳐
 * 남쪽으로 내려오는 것이다. 그래서 지도의 산과 숲은 '자기가 속한 권역의 색'을
 * 입는다 — 바뀌는 것은 마커 수가 아니라 **색의 위치**다.
 *
 * 배열 순서가 곧 전선이 내려오는 순서다 (북 → 남).
 *
 * offsetDays 는 데이터가 아니라 **설계 의도**다.
 * data-sources/foliage/foliage.json 의 날짜가 이 간격으로 잡혀 있다.
 * 권역 사이가 5~32일이라 한 날짜에 여러 상태가 동시에 존재한다 —
 * 간격이 2~3일이면 전국이 같은 주에 물들어 '북에서 내려온다' 가 보이지 않는다.
 * ──────────────────────────────────────────────────────────── */

export interface FoliageRegionConfig {
  id: string;
  label: string;
  /** 헤더 한 줄에 들어갈 짧은 이름 ("강원 절정 · 수도권 시작") */
  shortLabel: string;
  /** 이 권역의 색을 정하는 명소들 (locations.json 의 slug) */
  locationSlugs: string[];
  /** 첫 단풍이 설악산보다 며칠 늦은가 — foliage.json 을 잡은 기준 */
  offsetDays: number;
}

export const FOLIAGE_REGIONS: FoliageRegionConfig[] = [
  {
    id: 'north-gangwon',
    label: '북부 강원',
    shortLabel: '강원 북부',
    locationSlugs: ['seoraksan', 'odaesan'],
    offsetDays: 0,
  },
  {
    id: 'central-gangwon',
    label: '중부 강원',
    shortLabel: '강원 중부',
    locationSlugs: ['chiaksan'],
    offsetDays: 5,
  },
  {
    id: 'capital',
    label: '서울·수도권',
    shortLabel: '수도권',
    locationSlugs: ['bukhansan', 'seoul'],
    offsetDays: 10,
  },
  {
    id: 'chungcheong',
    label: '충청·소백',
    shortLabel: '충청',
    locationSlugs: ['sobaeksan', 'woraksan', 'songnisan', 'gyeryongsan'],
    offsetDays: 16,
  },
  {
    id: 'southeast',
    label: '영남',
    shortLabel: '영남',
    locationSlugs: ['juwangsan', 'gayasan'],
    offsetDays: 21,
  },
  {
    id: 'south',
    label: '지리·덕유',
    shortLabel: '지리산',
    locationSlugs: ['deogyusan', 'jirisan'],
    offsetDays: 27,
  },
  {
    id: 'southwest',
    label: '호남',
    shortLabel: '호남',
    locationSlugs: ['mudeungsan', 'naejangsan'],
    offsetDays: 28,
  },
  {
    id: 'jeju',
    label: '제주',
    shortLabel: '제주',
    locationSlugs: ['hallasan'],
    offsetDays: 34,
  },
];

/** slug → 권역 id. 어느 권역에도 없는 명소는 지도 색을 바꾸지 않는다. */
export const REGION_BY_LOCATION: Record<string, string> = Object.fromEntries(
  FOLIAGE_REGIONS.flatMap((region) =>
    region.locationSlugs.map((slug) => [slug, region.id] as const),
  ),
);
