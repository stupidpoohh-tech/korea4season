'use client';

import { useMemo } from 'react';
import mountainData from '@/domain/mountains.json';
import { MAP_ASPECT } from '@/domain/land';
import {
  FOLIAGE_STATE_INTENSITY,
  type FoliageSpot,
} from '@/services/foliage-service';

/* ────────────────────────────────────────────────────────────
 * 산이 물든다.
 *
 * 지도를 계절마다 다른 이미지로 갈아 끼우지 않는다. base map 이 그린 산과
 * **같은 자리에 같은 크기로** 가을색 산을 덧그려 그 산만 색이 바뀌게 한다.
 * (좌표는 scripts/generate-base-map.mjs 가 mountains.json 으로 함께 내보낸다)
 *
 * 산 하나하나에 데이터가 있는 것은 아니다. 명소 12곳의 상태를 거리로 섞어
 * 각 산의 물든 정도를 정한다 — 그래서 설악산이 절정일 때 그 둘레의 산부터
 * 붉어지고, 시간이 흐르면 그 띠가 남쪽으로 내려간다.
 * 지도 위에 핀을 찍는 것이 아니라 산맥이 물드는 것으로 보여야 하기 때문이다.
 * ──────────────────────────────────────────────────────────── */

interface Mountain {
  x: number;
  y: number;
  w: number;
  h: number;
  snow: boolean;
}

const MOUNTAINS = mountainData.mountains as Mountain[];

/** 물든 정도(0~1) → 산 앞면 · 옆면 색 */
function autumnFace(t: number): { light: string; dark: string } {
  // 초록(연두) → 노랑 → 주황 → 붉은빛. 아래 절반은 그늘이라 한 단계 더 짙다.
  const stops: [number, string, string][] = [
    [0, '#8fce5a', '#5da345'],
    [0.35, '#d9c94e', '#b09a34'],
    [0.7, '#e39b3d', '#bb6f28'],
    [1, '#d4552f', '#a13620'],
  ];
  for (let i = 1; i < stops.length; i += 1) {
    const [p1, l1, d1] = stops[i - 1]!;
    const [p2, l2, d2] = stops[i]!;
    if (t <= p2) {
      const k = (t - p1) / (p2 - p1 || 1);
      return { light: mix(l1, l2, k), dark: mix(d1, d2, k) };
    }
  }
  const last = stops[stops.length - 1]!;
  return { light: last[1], dark: last[2] };
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const out = pa.map((v, i) => Math.round(v + (pb[i]! - v) * Math.min(1, Math.max(0, k))));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 명소 상태를 거리로 섞어 이 산이 얼마나 물들었는지 정한다.
 * 가까운 명소가 세게 끌어당기되, 멀면 영향이 0 으로 떨어진다.
 */
function intensityAt(x: number, y: number, spots: FoliageSpot[]): number {
  const REACH = 0.34; // 지도 가로폭 대비. 이보다 먼 명소는 이 산을 물들이지 못한다
  let weightSum = 0;
  let valueSum = 0;

  for (const spot of spots) {
    const dx = spot.position.x - x;
    const dy = (spot.position.y - y) * MAP_ASPECT;
    const d = Math.hypot(dx, dy);
    if (d > REACH) continue;
    const w = (1 - d / REACH) ** 2;
    weightSum += w;
    valueSum += w * FOLIAGE_STATE_INTENSITY[spot.state];
  }

  return weightSum > 0 ? valueSum / weightSum : 0;
}

export function FoliageOverlay({ spots }: { spots: FoliageSpot[] }) {
  const painted = useMemo(
    () =>
      MOUNTAINS.map((m, i) => ({ ...m, key: i, t: intensityAt(m.x, m.y, spots) })).filter(
        // 아직 초록인 산은 그리지 않는다 — base map 이 이미 초록으로 그려 두었다
        (m) => m.t > 0.04,
      ),
    [spots],
  );

  if (painted.length === 0) return null;

  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {painted.map((m) => {
        const { light, dark } = autumnFace(m.t);
        const x = m.x * 1000;
        const y = m.y * 1000;
        const half = (m.w * 1000) / 2;
        const h = m.h * 1000;
        return (
          <g key={m.key} style={{ transition: 'opacity 420ms ease-out' }}>
            <path d={`M ${x - half} ${y} L ${x} ${y - h} L ${x + half} ${y} Z`} fill={light} />
            <path d={`M ${x} ${y - h} L ${x + half} ${y} L ${x} ${y} Z`} fill={dark} />
            {m.snow && (
              <path
                d={`M ${x} ${y - h} L ${x + half * 0.3} ${y - h * 0.7} L ${x} ${y - h * 0.62} L ${x - half * 0.3} ${y - h * 0.7} Z`}
                fill="#fbfdff"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
