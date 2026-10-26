/* ────────────────────────────────────────────────────────────
 * 2026 공식 단풍절정 예측.
 *
 * 공식 지도가 말하는 사실은 하나다.
 *
 *   location × treeGroup × peakForecastDate
 *
 * 그 외에는 아무것도 없다. 첫 단풍일 · 낙엽 종료일 · 지금 몇 % 물들었는가 ·
 * 시작/한창/끝물 같은 상태는 공식 자료에 없으므로 **여기서 만들지 않는다.**
 * 비어 있는 수종 칸을 다른 수종의 날짜로 메우지도 않는다 — 없으면 없는 것이다.
 *
 * 이 파일은 값만 들고 있다. 날짜를 화면의 색으로 옮기는 일은
 * services/official-foliage-service.ts 가 한다.
 * ──────────────────────────────────────────────────────────── */

export const FOLIAGE_TREE_GROUPS = ['MAPLE', 'GINKGO', 'OAK'] as const;
export type FoliageTreeGroup = (typeof FOLIAGE_TREE_GROUPS)[number];

export const TREE_GROUP_LABEL: Record<FoliageTreeGroup, string> = {
  MAPLE: '단풍나무류',
  GINKGO: '은행나무',
  OAK: '참나무류',
};

/** 공식 지도가 절정으로 삼는 기준. 수종이 달라도 문구는 같다. */
export const PEAK_CRITERION = '단풍 50% 이상';

export interface OfficialFoliageForecast {
  year: 2026;
  locationId: string;
  locationName: string;
  treeGroup: FoliageTreeGroup;
  /** YYYY-MM-DD */
  peakForecastDate: string;
  criterion: string;
  sourceType: 'OFFICIAL_FORECAST';
  isMock: false;
}

/*
 * 출처 메타데이터.
 *
 * 받은 것은 예측지도 이미지뿐이라 발행처 · 발행일 · URL 을 확인할 수 없다.
 * 확인하지 못한 것을 적어 두면 화면이 그것을 사실로 말하게 되므로 비워 둔다.
 */
export const OFFICIAL_FORECAST_SOURCE = {
  year: 2026 as const,
  sourceType: 'OFFICIAL_FORECAST' as const,
  criterion: PEAK_CRITERION,
  /** TODO(unverified): 발행 기관 이름 — 이미지에서 확인되지 않음 */
  publisher: null,
  /** TODO(unverified): 원문 주소 */
  sourceUrl: null,
  /** TODO(unverified): 발행일 */
  publishedAt: null,
};

/** [locationId, 표기 이름, MAPLE, GINKGO, OAK] — 없는 칸은 null 이다 */
type Row = [string, string, string | null, string | null, string | null];

const ROWS: Row[] = [
  ['seoraksan', '설악산', '10-20', null, '10-25'],
  ['gwangdeoksan', '광덕산', '10-22', null, null],
  ['hwaaksan', '화악산', '10-20', '10-21', '10-23'],
  ['chungnyeongsan', '축령산', '10-26', '10-25', '10-25'],
  ['jeombongsan', '점봉산', '10-21', null, '10-21'],
  ['soribong-pocheon', '소리봉(포천)', '10-30', '10-30', '10-31'],
  ['national-arboretum', '국립수목원', '10-29', '10-31', '11-02'],
  ['seoul-botanic-park', '서울식물원', '11-02', null, null],
  ['mulhyanggi-arboretum', '물향기수목원', '11-06', '11-06', '11-04'],
  ['gangwon-arboretum', '강원도립화목원', '10-28', '10-27', '10-31'],
  ['yongmunsan', '용문산', '10-23', '10-29', '10-24'],
  ['surisan', '수리산', '11-02', '11-04', '11-03'],
  ['midongsan-arboretum', '미동산수목원', '10-27', '10-29', '10-31'],
  ['sobaeksan', '소백산', '10-20', null, '10-16'],
  ['juwangsan', '주왕산', '10-26', '10-29', '11-06'],
  ['gayasan-chungnam', '가야산(충남)', '10-31', '10-26', '10-31'],
  ['geumgang-arboretum', '금강수목원', '11-02', '11-04', '11-03'],
  ['songnisan', '속리산', '10-28', '10-23', '10-30'],
  ['palgongsan', '팔공산', '10-30', null, '11-01'],
  ['gyeryongsan', '계룡산', '11-01', '10-25', '10-28'],
  ['daegu-arboretum', '대구수목원', '11-06', '11-04', '11-14'],
  ['daea-arboretum', '대아수목원', '11-01', '11-02', '11-04'],
  ['gayasan-gyeongbuk', '가야산(경북)', '10-28', null, '10-21'],
  ['geumwonsan', '금원산', null, '10-16', '10-26'],
  ['byeonsanbando', '변산반도', '11-04', null, null],
  ['naejangsan', '내장산', '11-04', null, '10-26'],
  ['jirisan', '지리산', '10-27', '10-26', '10-25'],
  ['gyeongnam-arboretum', '경남수목원', '11-08', '11-05', '11-16'],
  ['duryunsan', '두륜산', '11-11', null, null],
  ['wolchulsan', '월출산', '11-09', '10-28', '11-11'],
  ['wando-arboretum', '완도수목원', '11-09', '11-12', '11-16'],
  ['halla-arboretum', '한라수목원', '11-19', '11-16', '11-16'],
  ['sanghwangbong', '상황봉', '11-11', null, null],
  ['hallasan-1100', '한라산(1100도로)', '11-06', null, '10-25'],
  ['gyoraegotjawal', '교래곶자왈', '11-02', null, null],
];

function build(): OfficialFoliageForecast[] {
  const out: OfficialFoliageForecast[] = [];
  for (const [locationId, locationName, maple, ginkgo, oak] of ROWS) {
    const byGroup: [FoliageTreeGroup, string | null][] = [
      ['MAPLE', maple],
      ['GINKGO', ginkgo],
      ['OAK', oak],
    ];
    for (const [treeGroup, md] of byGroup) {
      if (!md) continue;
      out.push({
        year: 2026,
        locationId,
        locationName,
        treeGroup,
        peakForecastDate: `2026-${md}`,
        criterion: PEAK_CRITERION,
        sourceType: 'OFFICIAL_FORECAST',
        isMock: false,
      });
    }
  }
  return out;
}

export const OFFICIAL_FOLIAGE_FORECAST_2026: OfficialFoliageForecast[] = build();

/** 공식 예측이 있는 해. 다른 해의 자료는 받지 않았으므로 지도를 칠하지 않는다. */
export const FORECAST_YEAR = 2026;

/* ────────────────────────────────────────────────────────────
 * 공식 지점 → 지도 anchor.
 *
 * 이름이 확실히 같은 것만 잇는다. 좌표를 새로 만들거나 '대충 그 지역 가운데'
 * 에 찍지 않는다 — 그러면 공식 자료가 없는 자리에 공식처럼 보이는 점이 생긴다.
 *
 * 잇지 못한 지점은 지우지 않는다. unmappedForecasts() 로 그대로 남아
 * 목록에는 나오고 지도에만 오르지 않는다.
 *
 * 판단이 갈린 두 곳을 적어 둔다.
 *
 *   가야산(경북)  저장소의 `gayasan`(35.822, 128.121)이 가야산 국립공원이다.
 *                 공식 자료의 가야산(충남)은 예산·서산 쪽의 다른 산이므로
 *                 둘을 섞지 않는다. 충남 쪽은 잇지 않았다.
 *   한라산(1100도로)  괄호 안은 한라산 안의 관측 지점 이름이다. 산은 하나뿐이라
 *                 `hallasan` 에 잇는다.
 * ──────────────────────────────────────────────────────────── */

export const FORECAST_LOCATION_ANCHOR: Record<string, string> = {
  seoraksan: 'seoraksan',
  sobaeksan: 'sobaeksan',
  juwangsan: 'juwangsan',
  songnisan: 'songnisan',
  gyeryongsan: 'gyeryongsan',
  'gayasan-gyeongbuk': 'gayasan',
  naejangsan: 'naejangsan',
  jirisan: 'jirisan',
  'hallasan-1100': 'hallasan',
};
