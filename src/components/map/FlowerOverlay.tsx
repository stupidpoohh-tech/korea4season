'use client';

import { useMemo } from 'react';
import type { FlowerRegion } from '@/services/flower-service';
import { VIEW, buildTerrainShapes, circlePath } from './terrain-shapes';

/* ────────────────────────────────────────────────────────────
 * 꽃이 핀다.
 *
 * 단풍은 산 자체의 색이 바뀌지만, 꽃은 그 위에 **무리로 얹힌다.**
 * 그래서 지형을 다시 칠하지 않고, 그 권역의 숲과 산자락에 꽃송이를 흩는다.
 *
 * 큰 꽃 스티커를 명소마다 하나씩 찍지 않는다. 그렇게 하면 사용자가
 * 개화의 위치가 아니라 아이콘의 개수를 세게 된다. 대신 피는 정도만큼
 * 무리가 촘촘해지고, 그 촘촘한 자리가 남에서 북으로 올라간다.
 *
 * 종마다 색이 다르므로 3월 말에는 노랑과 분홍이 함께 보이고,
 * 4월이면 연분홍만 남는다 — 계절이 꽃을 바꿔 준다.
 * ──────────────────────────────────────────────────────────── */

/** 한 자리에 얹는 꽃송이 수의 상한. 절정에서도 이 이상은 찍지 않는다. */
const MAX_PETALS = 3;

/** 꽃송이 크기 (viewBox 단위). 나무 한 그루가 7~11 이다. */
const PETAL_R = 4.6;

export function FlowerOverlay({
  regions,
  fast = false,
}: {
  regions: FlowerRegion[];
  /** 슬라이더를 끄는 중 · 1년 재생 중 — 전환을 끈다 */
  fast?: boolean;
}) {
  const key = regions.map((r) => r.id).join('|');
  const shapes = useMemo(
    () => buildTerrainShapes(regions.map((r) => r.anchor)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  /*
   * 밀도는 단계로 끊는다. 하루마다 꽃송이 수가 한 개씩 늘고 주는 것은
   * 눈에 보이지 않으면서 매 프레임 path 를 새로 만들게 한다.
   * 끄는 동안에는 더 굵게 끊는다 — 1년을 훑는 사이 path 를 다시 만드는
   * 횟수가 그만큼 줄어든다.
   */
  const steps = fast ? 4 : 10;
  const densityKey = regions
    .map((r) => r.blooms.map((b) => `${b.slug}:${Math.round(b.density * steps)}`).join('+'))
    .join('|');

  const clusters = useMemo(() => {
    const bySpecies = new Map<
      string,
      { petal: string; center: string; d: string[]; core: string[] }
    >();

    shapes.forEach((shape) => {
      const region = regions[shape.regionIndex];
      if (!region) return;

      /*
       * 종마다 각도를 어긋나게 두어 같은 자리에 겹쳐 찍히지 않게 한다.
       * 자리와 순번에서 뽑으므로 날짜가 바뀌어도 꽃이 제자리에서 흔들리지 않는다.
       */
      region.blooms.forEach((bloom, speciesIndex) => {
        const count = Math.round(bloom.density * MAX_PETALS);
        if (count <= 0) return;

        const bucket = bySpecies.get(bloom.slug) ?? {
          petal: bloom.petal,
          center: bloom.center,
          d: [],
          core: [],
        };

        shape.anchors.forEach((anchor, anchorIndex) => {
          for (let k = 0; k < count; k += 1) {
            const seed = anchorIndex * 3 + k + speciesIndex * 7;
            const angle = seed * 2.399963; // 황금각 — 고르게 흩어진다
            const radius = anchor.r * (0.35 + ((seed % 5) / 5) * 0.6);
            const x = anchor.x + Math.cos(angle) * radius;
            const y = anchor.y + Math.sin(angle) * radius * 0.7;
            const r = PETAL_R * (0.8 + ((seed % 3) / 3) * 0.45);
            bucket.d.push(circlePath(x, y, r));
            /* 꽃술 — 나무 윗면과 같은 방식으로 살짝 어긋나게 얹는다 */
            bucket.core.push(circlePath(x - r * 0.22, y - r * 0.24, r * 0.44));
          }
        });

        bySpecies.set(bloom.slug, bucket);
      });
    });

    return [...bySpecies.entries()].map(([slug, v]) => ({
      slug,
      ...v,
      d: v.d.join(' '),
      core: v.core.join(' '),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, densityKey]);

  if (clusters.length === 0) return null;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {clusters.map((c) => (
        <g key={c.slug} style={{ transition: fast ? 'none' : 'opacity 320ms ease-out' }}>
          {/*
           * 바깥은 꽃잎, 가운데는 밝게 — 작아도 꽃송이로 읽히게 한다.
           *
           * 밝게 하는 데 mix-blend-mode 를 쓰지 않는다. 혼합 모드는 이 SVG 만
           * 한 별도의 버퍼를 잡아 두고 합성하는데, 화면 전체를 덮는 레이어라
           * 그 버퍼가 곧 화면 크기다. 대신 나무 윗면과 같은 방식으로
           * 작은 밝은 원을 어긋나게 얹는다.
           */}
          <path d={c.d} fill={c.petal} opacity={0.92} />
          <path d={c.core} fill={c.center} opacity={0.85} />
        </g>
      ))}
    </svg>
  );
}
