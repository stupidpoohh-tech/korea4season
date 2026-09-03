'use client';

import { useMemo } from 'react';
import {
  forestColorAt,
  landWashAt,
  mountainColorAt,
  type FoliageRegion,
} from '@/services/foliage-service';
import {
  CLIP,
  SHADOW_D,
  SNOW_D,
  VIEW,
  buildTerrainShapes,
} from './terrain-shapes';

/* ────────────────────────────────────────────────────────────
 * 계절이 지형을 칠한다.
 *
 * 지도를 계절마다 다시 굽지 않는다. base map 이 그린 **바로 그 산과 그 나무**
 * 위에 같은 좌표로 계절색을 덧그린다.
 *
 *   봄   신록    남 → 북으로 올라오는 연둣빛
 *   여름 녹음    base map 그대로
 *   가을 단풍    북 → 남으로 내려오는 물듦
 *   겨울 눈      산 · 숲 · 땅이 하얗다
 *
 * 색을 정하는 단위는 명소가 아니라 권역이다. 지도의 산과 숲은 저마다
 * 가장 가까운 권역에 붙고 그 권역의 색을 입는다 — 날짜를 넘기면
 * 마커가 늘어나는 것이 아니라 색의 띠가 움직인다.
 * ──────────────────────────────────────────────────────────── */

/**
 * 색이 바뀌는 데 걸리는 시간.
 *
 * 슬라이더를 끄는 동안에는 걸지 않는다. 매 프레임 색이 바뀌는데 전환까지
 * 걸면 요소 하나하나가 자기 애니메이션을 붙들고 있게 되고, 모바일에서는
 * 그것만으로 화면이 죽는다(iOS 에서 '페이지를 불러올 수 없음').
 */
const COLOR_TRANSITION = 'fill 320ms ease-out';

/** 한 권역 안에서 산·숲을 흩는 폭 (일). 권역 간격보다 훨씬 작게 둔다. */
const MICRO_DAYS = [-1.5, 0, 1.5];

/**
 * 단풍 권역 offset(0 = 북부 강원, 34 = 제주)을 봄의 순서로 뒤집는다.
 * 단풍은 북쪽이 먼저고 신록은 남쪽이 먼저다.
 */
const springOffset = (foliageOffsetDays: number) => (34 - foliageOffsetDays) * 0.6;

export function TerrainOverlay({
  regions,
  winter,
  freshAt,
  detailed = true,
  fast = false,
}: {
  regions: FoliageRegion[];
  /** 겨울이 얼마나 깊은가 (0~1) */
  winter: number;
  /** 권역 offset 을 받아 신록의 정도를 돌려준다 */
  freshAt: (offsetDays: number) => number;
  /**
   * 산마다 며칠씩 어긋나게 둘 것인가.
   *
   * 바다 화면에서 지형은 배경이다. 거기서까지 산을 세 갈래로 나누면
   * 얻는 것 없이 매 프레임 다시 칠할 요소만 세 배가 된다.
   */
  detailed?: boolean;
  /** 슬라이더를 끄는 중 · 1년 재생 중 — 전환을 끈다 */
  fast?: boolean;
}) {
  const key = `${regions.map((r) => r.id).join('|')}|${detailed}`;
  const shapes = useMemo(
    () => buildTerrainShapes(regions.map((r) => r.anchor), detailed ? MICRO_DAYS : [0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const transition = fast ? 'none' : COLOR_TRANSITION;

  /*
   * 색은 50 단계로 끊어 쓴다.
   *
   * 하루가 지날 때마다 요소 100여 개의 fill 을 새 값으로 바꾸면 1년 재생이나
   * 슬라이더 드래그에서 지도 전체를 매 프레임 다시 칠하게 된다. 눈으로는
   * 구분되지 않는 차이이므로 단계로 끊어 다시 칠하는 횟수를 줄인다.
   */
  const step = (v: number) => Math.round(v * 50) / 50;
  const snow = step(winter);
  const fresh = regions.map((r) => step(freshAt(springOffset(r.offsetDays))));
  const paintKey = `${regions.map((r) => step(r.wave)).join(',')}|${fresh.join(',')}|${snow}`;

  const paint = useMemo(
    () =>
      shapes.map((s) => {
        const region = regions[s.regionIndex]!;
        const wave = step(
          Math.min(1, Math.max(0, region.wave + region.wavePerDay * s.shiftDays)),
        );
        const spring = fresh[s.regionIndex] ?? 0;
        return {
          mountain: mountainColorAt(wave, snow, spring),
          forest: forestColorAt(wave, snow, spring),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shapes, paintKey],
  );

  /*
   * 땅은 권역마다 잘라 칠하지 않는다 — 경계가 선으로 드러나면 지도가 조각난다.
   * 대신 권역의 자리(위도)에 색을 꽂은 세로 그라디언트 하나로 덮는다.
   * 그래서 땅 위에서도 색이 이어져 흐른다.
   */
  const landStops = useMemo(() => {
    const stops = regions
      .map((region, i) => ({
        offset: Math.min(1, Math.max(0, region.anchor.y)),
        ...landWashAt(step(region.wave), snow, fresh[i] ?? 0),
      }))
      .sort((a, b) => a.offset - b.offset);

    if (stops.length === 0) return [];
    return [
      { ...stops[0]!, offset: 0 },
      ...stops,
      { ...stops[stops.length - 1]!, offset: 1 },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, paintKey]);

  /*
   * 여름에는 base map 이 이미 그 색이다.
   * 덧그려도 달라지는 것이 없는데 요소 100여 개를 얹으면 그만큼만 무거워진다.
   */
  const nothingToPaint =
    snow === 0 && fresh.every((f) => f === 0) && regions.every((r) => step(r.wave) === 0);

  if (shapes.length === 0 || nothingToPaint) return null;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <clipPath id="terrain-land">
          <path d={CLIP.mainland} />
          <path d={CLIP.jeju} />
          <path d={CLIP.islands} />
        </clipPath>
        <linearGradient
          id="terrain-land-wash"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2={VIEW.height}
        >
          {landStops.map((stop, i) => (
            <stop
              key={i}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
              style={{
                transition: fast
                  ? 'none'
                  : 'stop-color 320ms ease-out, stop-opacity 320ms ease-out',
              }}
            />
          ))}
        </linearGradient>
      </defs>

      {/* 땅 — 산·숲보다 훨씬 옅게. 강과 해안 모래가 그대로 읽혀야 한다. */}
      <g>
        <path d={CLIP.mainland} fill="url(#terrain-land-wash)" />
        <path d={CLIP.jeju} fill="url(#terrain-land-wash)" />
        <path d={CLIP.islands} fill="url(#terrain-land-wash)" />
      </g>

      <g clipPath="url(#terrain-land)" opacity={0.22}>
        {shapes.map((s, i) => (
          <path key={s.id} d={s.mass} fill={paint[i]!.forest.tree} style={{ transition }} />
        ))}
      </g>

      <path d={SHADOW_D} fill="#4a5a3c" opacity={0.16} />

      {shapes.map((s, i) => (
        <g key={s.id}>
          <path d={s.tree} fill={paint[i]!.forest.tree} style={{ transition }} />
          <path d={s.treeTop} fill={paint[i]!.forest.treeTop} style={{ transition }} />
        </g>
      ))}

      {shapes.map((s, i) => (
        <g key={s.id}>
          <path d={s.face} fill={paint[i]!.mountain.face} style={{ transition }} />
          <path d={s.faceDark} fill={paint[i]!.mountain.faceDark} style={{ transition }} />
        </g>
      ))}

      <path d={SNOW_D} fill="#f4fbff" />
    </svg>
  );
}
