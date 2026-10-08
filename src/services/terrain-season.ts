import { dayOfYear, type DateKey } from '@/domain/date';

/* ────────────────────────────────────────────────────────────
 * 계절이 지형을 칠하는 색.
 *
 * 이 파일은 색만 안다. "지금 단풍이 어느 단계인가" 는 여기서 정하지 않는다 —
 * 그 판단은 공식 절정 예측일이 하고(services/official-foliage-service.ts),
 * 여기는 그 결과를 받아 산 · 숲 · 땅에 어떤 색을 얹을지만 돌려준다.
 *
 * 네 축이 있다.
 *
 *   progress  가을색의 깊이 (0 = base map 그대로, 1 = 잎을 떨군 산)
 *   bare      늦가을과 연초처럼 잎이 없는 때
 *   fresh     봄에 올라오는 신록
 *   winter    눈
 *
 * progress 를 제외한 셋은 날짜가 바로 정하는 배경 식생이고, 공식 단풍 예측과
 * 무관하다. 권역 offset 은 위도에 따른 배경 그라데이션일
 * 뿐이며 단풍 상태를 뜻하지 않는다.
 * ──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
 * 색은 단계가 아니라 **띠**다.
 *
 * 상태 여섯 개에 색 여섯 개를 두면 날짜가 경계를 넘는 순간 색이 툭 바뀐다.
 * 그러면 지도에서 읽히는 것이 '어디까지 물들었나' 가 아니라
 * '몇 곳이 빨간가' 가 된다. 그래서 진행도(0~1) 하나를 두고 그 위의
 * 색 띠를 이어서 읽는다 — 초록에서 붉은빛으로 곧장 건너뛰지 않는다.
 *
 * 0.0  초록         아직 (base map 이 그린 그대로. 덧칠해도 티가 나지 않아야 한다)
 * 0.10 연둣빛 노랑   물들기 시작 — 여기를 일찍 두어야 '시작 중' 이 초록 안에서 읽힌다
 * 0.30 황금빛        좋음
 * 0.50 주황
 * 0.72 붉은 주황     절정 (0.45~0.78 구간이 절정이므로 그 안이 가장 선명하다)
 * 0.90 바랜 갈색주황 끝물 — 채도는 낮추되 따뜻한 잔색을 남긴다
 * 1.0  겨울 산       낮은 채도의 올리브 — '죽은 산' 이 아니라 겨울로 넘어가는 색
 *
 * 형광색과 순색 빨강(#FF0000)은 쓰지 않는다.
 * ──────────────────────────────────────────────────────────── */

export interface FoliageColor {
  /** 산 앞면 */
  face: string;
  /** 산 그늘면 */
  faceDark: string;
  /** 숲 덩어리 · 나무 몸통 */
  tree: string;
  /** 나무 윗면 (빛 받는 쪽) */
  treeTop: string;
}

interface RampStop extends FoliageColor {
  at: number;
  /** 숲을 이만큼만 물들인다 (0~1). 산이 주인공이고 숲은 거들 뿐이다. */
  forestMix: number;
  /** 땅에 얹는 색과 그 짙기. 산·숲보다 훨씬 옅다 — 강과 해안선이 살아 있어야 한다. */
  land: string;
  landMix: number;
}

/* ── 잎을 떨군 산 ─────────────────────────────────────────────
 * 단풍이 지나간 뒤이자 눈이 오기 전. 색 띠의 끝이면서, 해가 바뀌어
 * 파동이 0 으로 돌아간 1~3월의 산이기도 하다.
 *
 * 초록이 아니다. 이 자리를 초록으로 두면 '단풍이 지고 다시 잎이 났다' 가 된다.
 * ──────────────────────────────────────────────────────────── */

const BARE = {
  face: '#a3937f',
  faceDark: '#7c6d5c',
  tree: '#8b8a76',
  treeTop: '#a5a48d',
  land: '#c8c1ab',
};

const RAMP: RampStop[] = [
  { at: 0, face: '#5cb968', faceDark: '#3b9349', tree: '#3f9e46', treeTop: '#5cb84f', forestMix: 0, land: '#bbe264', landMix: 0 },
  { at: 0.1, face: '#a2c453', faceDark: '#769736', tree: '#84a43b', treeTop: '#a2c453', forestMix: 0.16, land: '#c8d559', landMix: 0.14 },
  { at: 0.3, face: '#e2bb43', faceDark: '#b58c27', tree: '#c39a30', treeTop: '#e2bb43', forestMix: 0.32, land: '#e0c25c', landMix: 0.26 },
  { at: 0.5, face: '#dd8b34', faceDark: '#b0621f', tree: '#bc7028', treeTop: '#dd8b34', forestMix: 0.42, land: '#dda75a', landMix: 0.3 },
  { at: 0.72, face: '#d06034', faceDark: '#a04120', tree: '#ad4c26', treeTop: '#d06034', forestMix: 0.46, land: '#d18f58', landMix: 0.32 },
  { at: 0.9, face: '#b3784a', faceDark: '#885530', tree: '#976139', treeTop: '#b3784a', forestMix: 0.42, land: '#c9a473', landMix: 0.28 },
  /*
   * 끝은 '잎을 떨군 산' 이다. 여기를 올리브로 두었더니 11월 중순 북쪽 산이
   * 다시 초록으로 보였다 — 단풍이 지나간 자리가 새잎이 난 것처럼 읽혔다.
   *
   * forestMix 도 여기서는 높다. 낮게 두면 단풍이 끝날수록 숲이 base 초록으로
   * 되돌아간다(0.85 #62853f → 1.0 #4a964a). 잎이 떨어지는데 숲만 짙어지는 셈이다.
   */
  { at: 1, face: BARE.face, faceDark: BARE.faceDark, tree: BARE.tree, treeTop: BARE.treeTop, forestMix: 1, land: BARE.land, landMix: 0.42 },
];

/* ── 겨울 ─────────────────────────────────────────────────────
 * 단풍이 끝났다고 지도가 계속 가을색으로 남아 있으면 안 된다.
 * 겨울에는 산과 땅의 색이 가라앉는다 — 이것은 단풍 진행도와 무관하게
 * 날짜가 정하는 값이다 (1월의 산은 '아직 안 물든 초록' 이 아니다).
 *
 * 다만 날짜 하나로 전국을 한꺼번에 덮지 않는다. 남쪽은 늦게 들어가고
 * 얕게 지나간다 — 단풍이 쓰는 권역 offset 을 그대로 쓴다.
 * ──────────────────────────────────────────────────────────── */

/* ── 눈 덮인 산 ───────────────────────────────────────────────
 * 앞면은 희고 그늘면은 푸른 회색이다. 둘을 같은 밝기로 두면 산의 부피가
 * 사라져 지도가 한 장의 흰 종이가 된다 — 눈이 쌓인 것이 아니라 화면이
 * 지워진 것으로 보인다. 강 · 호수 · 해안선도 그 아래로 읽혀야 한다.
 * ──────────────────────────────────────────────────────────── */

const SNOW = {
  face: '#f2f7fa',
  faceDark: '#cfdce6',
  tree: '#b9c9c6',
  treeTop: '#e2edeb',
  land: '#eef4f8',
};

/* ── 봄 ───────────────────────────────────────────────────────
 * 눈이 걷힌 뒤 여름의 짙은 녹음까지, 산은 한 번 더 색이 바뀐다.
 * base map 이 그린 초록은 여름의 것이므로 봄은 그보다 밝고 노란 쪽이다.
 * 이것이 없으면 3월부터 8월까지 지도가 한 장으로 멈춰 있다.
 * ──────────────────────────────────────────────────────────── */

const FRESH = {
  face: '#8fd06a',
  faceDark: '#63a844',
  tree: '#63ab3f',
  treeTop: '#96d768',
  land: '#dcf094',
};

/**
 * 신록이 얼마나 올라왔는가 (0~1).
 *
 * 꽃과 마찬가지로 남쪽이 먼저다 — offsetDays 로 권역마다 늦춘다.
 * 4월에 올라와 5월에 가장 연하고, 6월 말이면 여름의 짙은 녹음(= base map)이 된다.
 */
export function freshAmount(date: DateKey, offsetDays = 0): number {
  const day = dayOfYear(date) - offsetDays;
  const ramp = (from: number, to: number) => (day - from) / (to - from);
  const RISE_FROM = 78; // 3월 19일
  const FULL_FROM = 108; // 4월 18일
  const FULL_TO = 145; // 5월 25일
  const FADE_TO = 176; // 6월 25일
  if (day < RISE_FROM || day > FADE_TO) return 0;
  if (day < FULL_FROM) return Math.min(1, Math.max(0, ramp(RISE_FROM, FULL_FROM)));
  if (day <= FULL_TO) return 1;
  return Math.min(1, Math.max(0, 1 - ramp(FULL_TO, FADE_TO)));
}

/* ── 잎이 없는 때 ───────────────────────────────────────────
 *
 * 늦가을은 북에서 남으로, 봄의 새잎은 남에서 북으로 간다.
 * 둘 다 배경 식생이고 공식 단풍 예측과는 무관한 축이다 —
 * 공식 자료는 절정 예측일까지만 말하고 잎이 언제 떨어지는지는
 * 말하지 않으므로, 그 뒤 구간은 지도가 계절로 지나간다.
 */

/** 북쪽에서 잎이 떨어지기 시작하는 날 (11월 5일) 과 다 떨구기까지의 폭 */
const FALL_FROM = 309;
const FALL_SPAN = 28;

/** 남쪽은 얼마나 늦게 떨구는가. offset(0 강원 ~ 34 제주) 하루당. */
const FALL_LAG_PER_OFFSET = 0.55;

/** 남쪽은 얼마나 먼저 새잎을 내는가 */
const SPRING_LEAD_PER_OFFSET = 0.6;

/**
 * 잎이 없는가 (0~1).
 *
 * 두 구간을 덮는다.
 *
 *   늦가을  절정이 지난 뒤부터 눈이 쌓이기 전까지. 북쪽이 먼저 떨군다.
 *           공식 예측 지점이 없는 자리도 이 축으로 함께 지나간다 —
 *           백령도의 섬 나무 하나가 12월까지 초록으로 남던 자리다.
 *
 *   연초    해가 바뀌면 지도가 다시 초록이 되는 구멍을 메운다.
 *           1월 1일부터 신록이 오르기 전까지 산은 잎이 없다.
 *
 * offsetDays 는 winterAt 과 같은 단위다 (0 = 강원 북부, 34 = 제주).
 */
export function bareAmount(date: DateKey, offsetDays = 0): number {
  const lat = Math.min(34, Math.max(0, offsetDays));
  const raw = dayOfYear(date);

  const fallFrom = FALL_FROM + lat * FALL_LAG_PER_OFFSET;
  if (raw >= fallFrom + FALL_SPAN) return 1;
  if (raw >= fallFrom) return (raw - fallFrom) / FALL_SPAN;

  /* 봄은 남쪽이 먼저다 — 신록과 같은 기준일을 쓴다 */
  const day = raw - (34 - lat) * SPRING_LEAD_PER_OFFSET;
  const RISE_FROM = 78; // 3월 19일 — freshAmount 와 같은 날
  const FULL_FROM = 108; // 4월 18일
  if (day <= RISE_FROM) return 1;
  if (day >= FULL_FROM) return 0;
  return 1 - (day - RISE_FROM) / (FULL_FROM - RISE_FROM);
}

/* 11-25 부터 03-20 까지. 연말을 넘어가므로 '11-25 로부터 며칠' 로 센다. */
const WINTER_RISE = 20; // 11-25 → 12-15
const WINTER_HOLD = 87; // → 02-20
const WINTER_FADE = 115; // → 03-20

/** 남쪽이 얼마나 늦게 들어가는가. 권역 offset(0 강원 ~ 34 제주) 하루당. */
const WINTER_LAG_PER_OFFSET = 0.5;

/** 남쪽은 얼마나 얕게 지나가는가. offset 34(제주)에서 이만큼 낮다. */
const WINTER_SOUTH_RELIEF = 0.34;

/**
 * 겨울이 얼마나 깊은가 (0~1).
 *
 * offsetDays 는 단풍 권역의 것(0 = 강원 북부, 34 = 제주)을 그대로 받는다.
 * 남쪽은 열흘 남짓 늦게 들어가고 가장 깊은 때에도 북쪽만큼 가라앉지 않는다.
 * 그래서 한 날짜의 지도에 겨울의 앞머리와 아직 가을이 남은 곳이 함께 있다.
 */
export function winterAt(date: DateKey, offsetDays = 0): number {
  const lag = Math.min(34, Math.max(0, offsetDays)) * WINTER_LAG_PER_OFFSET;
  const since = (((dayOfYear(date) - 329) % 365) + 365) % 365;
  const ceiling = 1 - (Math.min(34, Math.max(0, offsetDays)) / 34) * WINTER_SOUTH_RELIEF;

  /*
   * 남쪽은 늦게 들어가고 **일찍 나온다**.
   * 들어가는 쪽과 나오는 쪽에 같은 부호의 지연을 걸면 3월의 제주가
   * 강원보다 더 깊은 겨울이 된다 — 그래서 나오는 쪽은 반대로 당긴다.
   */
  const riseFrom = lag;
  const riseTo = lag + WINTER_RISE;
  const fadeFrom = WINTER_HOLD - lag * 0.6;
  const fadeTo = WINTER_FADE - lag * 0.6;

  if (since < riseFrom) return 0;
  if (since < riseTo) return ((since - riseFrom) / WINTER_RISE) * ceiling;
  if (since <= fadeFrom) return ceiling;
  if (since <= fadeTo) return (1 - (since - fadeFrom) / (fadeTo - fadeFrom)) * ceiling;
  return 0;
}

/**
 * 나라 전체를 한 값으로 말해야 할 때 (헤더 문구 · 국면 판정).
 * 중부(offset 17)를 기준으로 삼는다 — 북쪽만 보면 남쪽이 아직 가을인데
 * 화면이 겨울이라고 말하게 된다.
 */
export function winterAmount(date: DateKey): number {
  return winterAt(date, 17);
}

/** base map 이 그린 숲 색. 여기서 조금씩만 끌어당긴다. */
const FOREST_BASE = { tree: '#3f9e46', treeTop: '#5cb84f' };

function mixHex(a: string, b: string, k: number): string {
  const t = Math.min(1, Math.max(0, k));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) => Math.round(v + (pb[i]! - v) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

function rampAt(progress: number): RampStop {
  const p = Math.min(1, Math.max(0, progress));
  for (let i = 1; i < RAMP.length; i += 1) {
    const lo = RAMP[i - 1]!;
    const hi = RAMP[i]!;
    if (p <= hi.at) {
      const k = (p - lo.at) / (hi.at - lo.at || 1);
      return {
        at: p,
        face: mixHex(lo.face, hi.face, k),
        faceDark: mixHex(lo.faceDark, hi.faceDark, k),
        tree: mixHex(lo.tree, hi.tree, k),
        treeTop: mixHex(lo.treeTop, hi.treeTop, k),
        forestMix: lo.forestMix + (hi.forestMix - lo.forestMix) * k,
        land: mixHex(lo.land, hi.land, k),
        landMix: lo.landMix + (hi.landMix - lo.landMix) * k,
      };
    }
  }
  return RAMP[RAMP.length - 1]!;
}

/**
 * 산 색.
 *
 * 네 축을 이 순서로 겹친다.
 *
 *   단풍 진행도  초록 → 황금 → 주황 → 붉은 주황 → 잎을 떨군 산
 *   bare        늦가을과 연초 — 잎이 없는 구간을 붙든다
 *   fresh       봄에 잎이 나면 그 위를 신록이 덮는다
 *   winter      눈이 쌓이면 그 위를 다시 덮는다
 *
 * 순서가 뜻이다 — 잎이 없는 산 위에 신록이 나고, 그 위에 눈이 쌓인다.
 */
export function mountainColorAt(progress: number, winter = 0, fresh = 0, bare = 0): FoliageColor {
  const stop = rampAt(progress);
  const layer = (autumn: string, bareColor: string, spring: string, snow: string) =>
    mixHex(mixHex(mixHex(autumn, bareColor, bare), spring, fresh), snow, winter);
  return {
    face: layer(stop.face, BARE.face, FRESH.face, SNOW.face),
    faceDark: layer(stop.faceDark, BARE.faceDark, FRESH.faceDark, SNOW.faceDark),
    tree: layer(stop.tree, BARE.tree, FRESH.tree, SNOW.tree),
    treeTop: layer(stop.treeTop, BARE.treeTop, FRESH.treeTop, SNOW.treeTop),
  };
}

/**
 * 땅에 얹는 색.
 *
 * 산만 물들고 땅은 그대로면 가을이 산에서만 일어나는 일처럼 보인다.
 * 다만 아주 옅게 얹는다 — 강 · 호수 · 해안 모래는 그대로 읽혀야 한다.
 */
export function landWashAt(
  progress: number,
  winter = 0,
  fresh = 0,
  bare = 0,
): { color: string; opacity: number } {
  const stop = rampAt(progress);
  return {
    color: mixHex(
      mixHex(mixHex(stop.land, BARE.land, bare), FRESH.land, fresh),
      SNOW.land,
      winter,
    ),
    /*
     * 겨울에도 땅을 덮어 버리지 않는다. 이 칠이 짙으면 강 · 호수 · 해안 모래와
     * 지역별 단풍·개화가 그 아래로 사라진다 — 배경 tint 가 자연현상보다
     * 세지는 순간 지도는 계절을 말하는 것이 아니라 테마를 바꾼 것이 된다.
     */
    opacity: Math.max(stop.landMix, bare * 0.42, fresh * 0.3, winter * 0.78),
  };
}

/**
 * 숲 색 — 같은 색이되 훨씬 옅게.
 *
 * 산만 물들고 주변 숲이 진한 초록으로 남아 있으면 삼각형 하나하나가
 * 지도 위에 얹힌 아이콘처럼 떨어져 보인다. 같은 권역의 숲이 같은 방향으로
 * 따뜻해지면 '이 지역 전체가 물들고 있다' 로 읽힌다.
 *
 * 절정에서도 산 색의 절반이 채 되지 않게 둔다.
 * 숲까지 주황이 되면 지도에서 산이 사라지고 지역이 통째로 칠해진 것이 된다.
 */
export function forestColorAt(
  progress: number,
  winter = 0,
  fresh = 0,
  bare = 0,
): { tree: string; treeTop: string } {
  const stop = rampAt(progress);
  const layer = (
    base: string,
    autumn: string,
    mix: number,
    bareColor: string,
    spring: string,
    snow: string,
  ) =>
    mixHex(
      mixHex(mixHex(mixHex(base, autumn, mix), bareColor, bare), spring, fresh),
      snow,
      winter,
    );
  return {
    tree: layer(FOREST_BASE.tree, stop.tree, stop.forestMix, BARE.tree, FRESH.tree, SNOW.tree),
    treeTop: layer(
      FOREST_BASE.treeTop,
      stop.treeTop,
      stop.forestMix,
      BARE.treeTop,
      FRESH.treeTop,
      SNOW.treeTop,
    ),
  };
}

/* ────────────────────────────────────────────────────────────
 * 배경 식생의 위도 기울기.
 *
 * 눈과 신록은 남북으로 시차를 두고 온다. 예전에는 그 시차를 단풍 권역표에서
 * 가져왔는데, 단풍 권역 자체가 가설이었으므로 함께 걷었다.
 *
 * 지금은 지도의 세로 위치에서 바로 뽑는다. 이것은 배경 그림의 그라데이션일
 * 뿐이고 단풍 상태와 무관하다 — 어떤 산이 지금 몇 % 물들었는지는 말하지 않는다.
 * ──────────────────────────────────────────────────────────── */

/** 육지가 걸쳐 있는 세로 구간 (0~1 정규 좌표) */
const LAND_TOP = 0.12;
const LAND_BOTTOM = 0.9;

/** 북쪽 0 ~ 남쪽 34. winterAt · bareAmount · freshAmount 가 받는 값과 같은 단위다. */
export function latitudeOffset(northSouth: number): number {
  const t = (northSouth - LAND_TOP) / (LAND_BOTTOM - LAND_TOP);
  return Math.min(34, Math.max(0, t * 34));
}

/** 신록은 남쪽이 먼저다 — 겨울과 반대 방향으로 센다 */
export function springOffset(northSouth: number): number {
  return (34 - latitudeOffset(northSouth)) * 0.6;
}

/**
 * 공식 절정 예측일이 도달한 자리의 가을색 깊이.
 *
 * 색 띠(RAMP)에서 가장 선명한 구간을 가리킨다. 도달 전은 0(base map 그대로)이다.
 * 중간값을 쓰지 않는 것은 공식 자료가 '언제 절정인가' 만 말하고
 * '지금 몇 % 물들었는가' 는 말하지 않기 때문이다 — 중간 단계를 지어내지 않는다.
 */
export const PEAK_REACHED_PROGRESS = 0.72;

/** 지도 한 자리의 배경 식생 축 — 공식 단풍 예측과 무관하다 */
export interface SeasonAxes {
  winter: number;
  fresh: number;
  bare: number;
}

/**
 * 지도 세로 위치(0 북 ~ 1 남) 한 자리의 배경 식생.
 *
 * 위도를 offset 으로 바꾸는 일을 여기 한 곳에서만 한다 — 화면과 서비스가
 * 각자 환산하면 같은 날짜의 같은 자리가 두 값을 갖는다.
 */
export function seasonAxesAt(date: DateKey, northSouth: number): SeasonAxes {
  const lat = latitudeOffset(northSouth);
  return {
    winter: winterAt(date, lat),
    fresh: freshAmount(date, springOffset(northSouth)),
    bare: bareAmount(date, lat),
  };
}
