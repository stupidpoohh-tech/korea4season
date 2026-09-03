/* ────────────────────────────────────────────────────────────
 * 링크로 건네졌을 때 이 서비스가 어떻게 보이는가.
 *
 * 카카오톡 · 슬랙 · 페이스북은 전부 Open Graph 를 읽는다.
 * 카카오는 특히 두 가지에 엄격하다.
 *
 *   1. og:image 는 절대 주소여야 한다 (상대 경로는 그냥 무시한다)
 *   2. 큰 카드로 펴 주는 것은 가로 800px 이상 · 가로세로 2:1 안팎일 때다
 *      — 작으면 오른쪽 구석의 작은 네모로 접힌다
 *
 * 그래서 1200×630 (1.90:1) 한 장을 두고, 주소는 metadataBase 로 절대화한다.
 * ──────────────────────────────────────────────────────────── */

/** 운영 주소. 미리보기 이미지의 절대 주소가 여기서 나온다. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://korea4season.stupidpoohh.workers.dev';

export const SITE_NAME = '지금日지도';

export const SITE_TAGLINE = '가장 좋은날은 언제나 지금!';

export const SITE_DESCRIPTION =
  '지금 대한민국의 자연에서는 무슨 일이 일어나고 있을까. 금어기, 개화, 단풍, 철새를 하나의 살아있는 지도 위에서 시간과 함께 봅니다.';

/**
 * 미리보기 이미지.
 *
 * width · height 를 함께 적는다. 크롤러가 이미지를 내려받기 전에
 * 큰 카드로 펼지 작은 네모로 접을지 정하는 근거가 이 두 값이다.
 */
export const OG_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
  type: 'image/png',
};

/**
 * 하위 화면이 openGraph 를 다시 쓰면 부모의 것이 통째로 대체된다
 * (Next 는 이 항목을 합쳐 주지 않는다). 그래서 이미지를 이렇게 나눠 쓴다.
 */
export const OG_BASE = {
  siteName: SITE_NAME,
  locale: 'ko_KR',
  images: [OG_IMAGE],
};
