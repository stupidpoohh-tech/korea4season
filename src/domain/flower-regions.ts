/* ────────────────────────────────────────────────────────────
 * 개화는 남에서 북으로 올라온다.
 *
 * 단풍과 정확히 반대다. 단풍은 북쪽 높은 산에서 시작해 내려오고,
 * 꽃은 따뜻한 남쪽 바닷가에서 시작해 올라온다. 지도에서 이 두 방향이
 * 반대로 읽혀야 '지금 산' 이 한 해를 도는 화면이 된다.
 *
 * 배열 순서가 곧 개화 전선이 올라가는 순서다 (남 → 북).
 *
 * offsetDays 는 데이터가 아니라 **설계 의도**다.
 * data-sources/flower/blooms.json 의 날짜가 이 간격으로 잡혀 있다.
 * 개나리 → 진달래 → 벚꽃이 이어달리기하듯 피어서, 세 종을 합치면
 * 3월 초부터 4월 말까지 파동이 끊기지 않는다.
 * ──────────────────────────────────────────────────────────── */

export interface FlowerRegionConfig {
  id: string;
  label: string;
  /** 헤더 한 줄에 들어갈 짧은 이름 ("남부 절정 · 중부 시작") */
  shortLabel: string;
  /** 이 권역의 색을 정하는 명소들 (locations.json 의 slug) */
  locationSlugs: string[];
  /** 제주보다 며칠 늦게 피는가 — blooms.json 을 잡은 기준 */
  offsetDays: number;
}

export const FLOWER_REGIONS: FlowerRegionConfig[] = [
  {
    id: 'jeju',
    label: '제주',
    shortLabel: '제주',
    locationSlugs: ['jeju-city', 'seogwipo', 'gapado'],
    offsetDays: 0,
  },
  {
    id: 'south-coast',
    label: '남해안',
    shortLabel: '남해안',
    locationSlugs: ['gwangyang', 'suncheonbay'],
    offsetDays: 2,
  },
  {
    id: 'yeongnam',
    label: '부산·경남',
    shortLabel: '경남',
    locationSlugs: ['busan', 'jinhae'],
    offsetDays: 5,
  },
  {
    id: 'honam',
    label: '호남',
    shortLabel: '호남',
    locationSlugs: ['gurye', 'mudeungsan', 'naejangsan'],
    offsetDays: 6,
  },
  {
    id: 'gyeongbuk',
    label: '경북',
    shortLabel: '경북',
    locationSlugs: ['gyeongju', 'gayasan', 'juwangsan'],
    offsetDays: 9,
  },
  {
    id: 'chungcheong',
    label: '충청',
    shortLabel: '충청',
    locationSlugs: ['buyeo-gungnamji', 'gyeryongsan', 'taean', 'songnisan'],
    offsetDays: 12,
  },
  {
    id: 'capital',
    label: '수도권',
    shortLabel: '수도권',
    locationSlugs: ['yeouido', 'seoul-forest', 'bukhansan', 'seoul'],
    offsetDays: 15,
  },
  {
    id: 'gangwon',
    label: '강원',
    shortLabel: '강원',
    locationSlugs: ['gangneung', 'pyeongchang', 'chiaksan', 'odaesan', 'seoraksan'],
    offsetDays: 19,
  },
];

/** slug → 권역 id */
export const FLOWER_REGION_BY_LOCATION: Record<string, string> = Object.fromEntries(
  FLOWER_REGIONS.flatMap((region) =>
    region.locationSlugs.map((slug) => [slug, region.id] as const),
  ),
);

/**
 * 지도의 개화 파동을 이끄는 세 종.
 *
 * 데이터에는 동백 · 매화 · 산수유 · 유채 · 철쭉처럼 다른 꽃도 함께 있다.
 * 그것들은 명소 표시로 남되 권역의 개화 상태를 정하지는 않는다 —
 * 피는 시기가 제각각이라 섞으면 남 → 북 흐름이 잡음에 묻힌다.
 */
export const FLOWER_WAVE_SPECIES = ['forsythia', 'azalea', 'king-cherry'] as const;
