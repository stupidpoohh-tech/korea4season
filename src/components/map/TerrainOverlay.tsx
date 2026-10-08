'use client';

import { useMemo } from 'react';
import type { MapPosition } from '@/domain/projection';
import {
  PEAK_REACHED_PROGRESS,
  forestColorAt,
  landWashAt,
  mountainColorAt,
} from '@/services/terrain-season';
import { CLIP, SHADOW_D, SNOW_D, VIEW, buildTerrainShapes } from './terrain-shapes';

/* ────────────────────────────────────────────────────────────
 * 공식 절정 예측일이 지도에 도착한다.
 *
 * 이 레이어가 그리는 것은 "이 산이 지금 몇 % 물들었다" 가 아니다.
 * **공식 절정 예측일이 선택한 날짜까지 왔는가** 하나뿐이다.
 *
 *   selectedDate <  peakForecastDate   base map 이 그린 색 그대로
 *   selectedDate >= peakForecastDate   가을색
 *
 * 그래서 슬라이더를 끌면 공식 날짜의 순서대로 자리가 하나씩 바뀐다.
 * 중간 단계를 만들지 않는 것은 공식 자료가 그것을 말하지 않기 때문이고,
 * 색이 툭 바뀌지 않는 것은 CSS 전환이 받아 주기 때문이다 — 새 날짜를
 * 지어내지 않고도 부드럽게 넘어간다.
 *
 * 겨울 · 신록 · 잎 없는 때는 이것과 다른 축이다. 날짜가 바로 정하는
 * 배경 식생이고 공식 단풍 예측과 무관하다.
 * ──────────────────────────────────────────────────────────── */

const COLOR_TRANSITION = 'fill 420ms ease-out';

export interface TerrainPaintAnchor {
  id: string;
  anchor: MapPosition;
  /** 공식 절정 예측일이 선택 날짜까지 왔는가 */
  reached: boolean;
}

export interface SeasonAxes {
  winter: number;
  fresh: number;
  bare: number;
}

export function TerrainOverlay({
  anchors,
  seasonAt,
  fast = false,
}: {
  /** 지도에 이어진 공식 절정 예측 지점 */
  anchors: TerrainPaintAnchor[];
  /** 지도 세로 위치(0 북 ~ 1 남)를 받아 배경 식생 축을 돌려준다 */
  seasonAt: (northSouth: number) => SeasonAxes;
  /** 슬라이더를 끄는 중 · 재생 중 — 전환만 끈다. 그림은 달라지지 않는다. */
  fast?: boolean;
}) {
  const key = anchors.map((a) => a.id).join('|');
  const shapes = useMemo(
    () => buildTerrainShapes(anchors.map((a) => a.anchor)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const transition = fast ? 'none' : COLOR_TRANSITION;

  /*
   * 값은 28 단계로 끊어 쓴다. 눈으로 구분되지 않는 차이로 요소 100여 개를
   * 다시 칠하지 않기 위해서다. 끊는 폭은 재생 여부와 무관하게 고정이다 —
   * 여기가 달라지면 같은 날짜가 경로에 따라 다른 색이 된다.
   */
  const step = (v: number) => Math.round(v * 28) / 28;

  const reachedKey = anchors.map((a) => (a.reached ? 1 : 0)).join('');
  const season = shapes.map((s) => {
    const axes = seasonAt(s.northSouth);
    return { winter: step(axes.winter), fresh: step(axes.fresh), bare: step(axes.bare) };
  });
  const paintKey = `${reachedKey}|${season.map((s) => `${s.winter},${s.fresh},${s.bare}`).join('|')}`;

  const paint = useMemo(
    () =>
      shapes.map((s, i) => {
        /*
         * 가까운 공식 지점이 없는 지형(anchorIndex -1)은 가을색을 입지 않는다.
         * 옆 지점의 날짜를 빌려 오면 공식 예측이 없는 자리에 공식처럼 보이는
         * 색이 생긴다.
         */
        const reached = s.anchorIndex >= 0 && (anchors[s.anchorIndex]?.reached ?? false);
        const progress = reached ? PEAK_REACHED_PROGRESS : 0;
        const { winter, fresh, bare } = season[i]!;
        return {
          progress,
          mountain: mountainColorAt(progress, winter, fresh, bare),
          forest: forestColorAt(progress, winter, fresh, bare),
          land: landWashAt(progress, winter, fresh, bare),
          y: s.northSouth,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shapes, paintKey],
  );

  /*
   * 땅은 묶음마다 잘라 칠하지 않는다 — 경계가 선으로 드러나면 지도가 조각난다.
   * 대신 묶음의 세로 위치에 색을 꽂은 그라디언트 하나로 덮는다.
   */
  const landStops = useMemo(() => {
    const stops = paint
      .map((p) => ({ offset: Math.min(1, Math.max(0, p.y)), ...p.land }))
      .sort((a, b) => a.offset - b.offset);
    if (stops.length === 0) return [];
    return [
      { ...stops[0]!, offset: 0 },
      ...stops,
      { ...stops[stops.length - 1]!, offset: 1 },
    ];
  }, [paint]);

  /* 여름에는 base map 이 이미 그 색이다 — 덧그려도 달라지는 것이 없다 */
  const nothingToPaint = paint.every(
    (p) => p.progress === 0 && p.land.opacity === 0,
  );

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
            <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
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
