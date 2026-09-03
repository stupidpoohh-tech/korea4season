import type { DateKey } from '@/domain/date';
import {
  bloomSummary,
  buildFlowerSpots,
  countFlowers,
  groupFlowerRegions,
  isBlooming,
  summarizeFlowers,
  type FlowerCounts,
  type FlowerRegion,
  type FlowerSpot,
} from './flower-service';
import {
  buildFoliageSpots,
  countFoliage,
  freshAmount,
  groupFoliageRegions,
  isColoring,
  summarizeFoliage,
  waveSummary,
  winterAmount,
  type FoliageCounts,
  type FoliageRegion,
  type FoliageSpot,
} from './foliage-service';

/* ────────────────────────────────────────────────────────────
 * 지금 산.
 *
 * 바다가 "무엇이 잡히는가" 라면 산은 "무엇이 피고 물드는가" 다.
 * 그 안에 꽃과 단풍이 함께 있지만, 사용자가 둘 중 하나를 고르지는 않는다 —
 * 같은 산에서 계절만 달리해 일어나는 일이므로 **날짜가 고른다.**
 *
 *   봄   꽃      남 → 북으로 올라오는 개화
 *   여름 녹음    산이 짙어진다
 *   가을 단풍    북 → 남으로 내려오는 물듦
 *   겨울 눈      산과 땅이 하얗다
 *
 * 이 파일은 그 판정을 한곳에서 하고, 화면은 결과만 읽는다.
 * ──────────────────────────────────────────────────────────── */

export type MountainPhase = 'flower' | 'green' | 'foliage' | 'winter';

export interface MountainNow {
  phase: MountainPhase;
  /** 눈이 얼마나 덮였는가 (0~1) */
  winter: number;
  /** 신록이 얼마나 올라왔는가 (0~1). 권역별 offset 은 지형 레이어가 따로 쓴다. */
  fresh: number;
  flowerSpots: FlowerSpot[];
  flowerRegions: FlowerRegion[];
  flowerCounts: FlowerCounts;
  foliageSpots: FoliageSpot[];
  foliageRegions: FoliageRegion[];
  foliageCounts: FoliageCounts;
  /** 헤더 첫 줄 — 지금 전선이 어디까지 왔는가 */
  headline: string;
  /** 타임라인 한 줄 — 상태 내역 */
  caption: string;
}

const PHASE_HEADLINE: Record<'green' | 'winter', string> = {
  green: '여름 · 산이 짙어졌습니다',
  winter: '겨울 · 산에 눈이 쌓입니다',
};

const PHASE_CAPTION: Record<'green' | 'winter', string> = {
  green: '짙은 녹음',
  winter: '눈 덮인 산',
};

/**
 * 지형을 칠하는 데 필요한 것만.
 *
 * 겨울 눈과 신록은 어느 카테고리를 보고 있든 지도에 나타나야 하므로
 * 바다 화면에서도 계산한다. 다만 꽃까지 세지는 않는다 —
 * 날짜를 끄는 동안 매 프레임 도는 계산이라 쓰지 않을 것을 세면 그만큼 무겁다.
 */
export interface TerrainNow {
  winter: number;
  fresh: number;
  foliageSpots: FoliageSpot[];
  foliageRegions: FoliageRegion[];
  foliageCounts: FoliageCounts;
}

export function buildTerrainNow(date: DateKey): TerrainNow {
  const foliageSpots = buildFoliageSpots(date);
  return {
    winter: winterAmount(date),
    fresh: freshAmount(date),
    foliageSpots,
    foliageRegions: groupFoliageRegions(foliageSpots),
    foliageCounts: countFoliage(foliageSpots),
  };
}

/**
 * withFlowers 는 산 화면에서만 켠다.
 *
 * 바다를 보는 중에도 지형(눈 · 신록 · 단풍색)은 그려야 하지만 꽃은 쓰이지
 * 않는다. 날짜를 끄는 동안 매 프레임 도는 계산이라, 쓰지 않을 것을 세면
 * 그만큼 슬라이더가 무거워진다.
 */
export function buildMountainNow(
  date: DateKey,
  terrain: TerrainNow,
  withFlowers = true,
): MountainNow {
  const { winter, fresh, foliageSpots, foliageRegions, foliageCounts } = terrain;

  const flowerSpots = withFlowers ? buildFlowerSpots(date) : [];
  const flowerRegions = withFlowers ? groupFlowerRegions(flowerSpots) : [];
  const flowerCounts = countFlowers(flowerSpots);

  /*
   * 꽃이 먼저다. 봄에는 단풍 데이터가 전부 '아직' 이라 겹칠 일이 없고,
   * 가을에는 파동 3종이 전부 끝나 있어 꽃이 활성이 되지 않는다.
   * 둘 다 조용한 때만 계절(녹음 · 눈)이 화면을 말한다.
   */
  const blooming = flowerRegions.some((r) => isBlooming(r.state));
  const coloring = foliageRegions.some((r) => isColoring(r.state));

  const phase: MountainPhase = blooming
    ? 'flower'
    : coloring
      ? 'foliage'
      : winter >= 0.5
        ? 'winter'
        : 'green';

  const headline =
    phase === 'flower'
      ? bloomSummary(flowerRegions)
      : phase === 'foliage'
        ? waveSummary(foliageRegions, winter)
        : PHASE_HEADLINE[phase];

  const caption =
    phase === 'flower'
      ? summarizeFlowers(flowerCounts)
      : phase === 'foliage'
        ? summarizeFoliage(foliageCounts, winter)
        : PHASE_CAPTION[phase];

  return {
    phase,
    winter,
    fresh,
    flowerSpots,
    flowerRegions,
    flowerCounts,
    foliageSpots,
    foliageRegions,
    foliageCounts,
    headline,
    caption,
  };
}

/** 지금 산에서 지도가 그릴 것이 있는가 (지역별 보기에서 빈 화면 안내를 띄울지) */
export function mountainHasSubject(now: MountainNow): boolean {
  return now.phase === 'flower' || now.phase === 'foliage';
}
