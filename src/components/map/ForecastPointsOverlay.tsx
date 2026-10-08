'use client';

import type { PaintAnchor } from '@/services/official-foliage-service';
import { shortDate } from '@/services/official-foliage-service';
import { VIEW } from './terrain-shapes';

/* ────────────────────────────────────────────────────────────
 * 공식 예측 지점 보기.
 *
 * 기본은 꺼짐이다. 지점 이름이 늘 떠 있으면 지도가 아니라 공공기관 포스터가
 * 된다 — 사용자가 읽는 것은 색의 흐름이지 지명 목록이 아니다.
 *
 * 켜면 지도에 이어진 공식 지점만 작은 점과 날짜로 보인다.
 * 예측일이 지난 곳은 채워지고, 아직인 곳은 테두리만 남는다.
 * ──────────────────────────────────────────────────────────── */

export function ForecastPointsOverlay({ anchors }: { anchors: PaintAnchor[] }) {
  if (anchors.length === 0) return null;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {anchors.map((a) => {
        const x = a.anchor.x * VIEW.width;
        const y = a.anchor.y * VIEW.height;
        return (
          <g key={a.id}>
            <circle
              cx={x}
              cy={y}
              r={6}
              fill={a.reached ? '#b8532a' : '#ffffff'}
              stroke={a.reached ? '#ffffff' : '#6c7883'}
              strokeWidth={2}
            />
            <text
              x={x + 11}
              y={y + 5}
              fontSize={16}
              fontWeight={600}
              fill="#000a14"
              stroke="#ffffff"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {a.name} {shortDate(a.peakForecastDate)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
