'use client';

import { useMemo } from 'react';
import type { FlowerRegion } from '@/services/flower-service';
import { flowerRegionAnchors } from '@/services/flower-service';
import { blossomSpots, clustersByRegion, leafSpots, type FlowerCluster } from './flower-clusters';
import {
  BLOSSOM_KIND,
  blossomCore,
  blossomPath,
  leafPath,
  type BlossomKind,
} from './flower-shapes';
import { VIEW } from './terrain-shapes';

/* ────────────────────────────────────────────────────────────
 * 꽃이 핀다.
 *
 * 단풍은 산 자체의 색이 바뀌지만, 꽃은 그 위에 **무리로 얹힌다.**
 *
 * 세 가지가 이 레이어의 규칙이다.
 *
 * 1. 자리는 고정이다.
 *    군집은 terrain.json 에서 한 번 뽑고, 군집 안에서 종이 앉는 자리도
 *    (군집 id + 종 slug)에서 뽑는다 — flower-clusters.ts 가 그 일을 한다.
 *    날짜 · 재생 · 다른 종의 유무가 자리를 바꾸지 않는다.
 *
 * 2. 종은 생김새로 갈린다.
 *    색만 다르면 지도에서는 '무슨 색 점' 으로 읽힌다. 벚꽃은 끝이 갈라진
 *    다섯 장, 진달래는 뾰족한 다섯 장, 개나리는 갸름한 네 장이다.
 *
 * 3. 날짜가 바꾸는 것은 셋이다.
 *    퍼짐(coverage)  그 권역의 몇 군집까지 갔는가
 *    풍성함(density) 한 자리에 몇 송이가 얼마나 크게
 *    꽃과 잎의 비율   끝물에는 같은 자리에서 잎이 드러난다
 * ──────────────────────────────────────────────────────────── */

/** 한 자리에 놓는 꽃송이 수의 상한. 더 늘리면 서로 겹쳐 종류를 알아볼 수 없다. */
export const MAX_BLOSSOMS = 2;

/** 절정의 꽃 반지름 (viewBox px). 나무 한 그루가 7~11 이다. */
export const BLOSSOM_R = 13;

/** 시작 무렵의 꽃은 이만큼으로 작다 */
export const MIN_SCALE = 0.3;

/*
 * 잎은 지도의 초록보다 한 톤 짙게 두고 흰 테두리를 준다.
 * 배경과 같은 초록이면 '잎이 났다' 가 아니라 '꽃이 지워졌다' 로만 보인다.
 */
const LEAF_COLOR = '#3f8f3c';

interface Layer {
  slug: string;
  kind: BlossomKind;
  petal: string;
  center: string;
  flowers: string[];
  cores: string[];
  leaves: string[];
}

let assignment: Map<string, FlowerCluster[]> | null = null;
function clustersOf(regionId: string): FlowerCluster[] {
  assignment ??= clustersByRegion(flowerRegionAnchors());
  return assignment.get(regionId) ?? [];
}

export function FlowerOverlay({
  regions,
  fast = false,
}: {
  regions: FlowerRegion[];
  /** 슬라이더를 끄는 중 · 1년 재생 중 — 전환만 끈다. 그림은 달라지지 않는다. */
  fast?: boolean;
}) {
  /*
   * 값을 단계로 끊는다. 하루마다 꽃 하나가 늘고 주는 것은 눈에 보이지 않으면서
   * 매 프레임 path 를 새로 만들게 한다.
   *
   * 이 단계는 재생 여부와 무관하다. 끊는 폭이 달라지면 같은 날짜가
   * 슬라이더를 끌 때와 손을 뗐을 때 서로 다른 그림이 된다.
   */
  const q = (v: number) => Math.round(v * 12) / 12;

  const key = regions
    .map(
      (r) => `${r.id}:${r.blooms.map((b) => `${b.slug}${q(b.density)}/${q(b.coverage)}`).join('+')}`,
    )
    .join('|');

  const layers = useMemo(() => {
    const bySpecies = new Map<string, Layer>();

    for (const region of regions) {
      const clusters = clustersOf(region.id);
      if (clusters.length === 0) continue;

      for (const bloom of region.blooms) {
        const kind = BLOSSOM_KIND[bloom.slug];
        if (!kind) continue;

        const density = q(bloom.density);
        const coverage = q(bloom.coverage);
        if (coverage <= 0) continue;

        /*
         * 몇 군집까지 갈 것인가. 앞에서부터 채우므로 퍼짐이 늘면 뒤가 켜지고
         * 줄면 뒤부터 꺼진다 — 이미 켜진 자리는 움직이지 않는다.
         */
        const reach = Math.max(1, Math.round(coverage * clusters.length));

        const layer = bySpecies.get(bloom.slug) ?? {
          slug: bloom.slug,
          kind,
          petal: bloom.petal,
          center: bloom.center,
          flowers: [],
          cores: [],
          leaves: [],
        };

        for (let i = 0; i < reach; i += 1) {
          const cluster = clusters[i]!;

          for (const p of blossomSpots(
            cluster,
            bloom.slug,
            density,
            BLOSSOM_R,
            MAX_BLOSSOMS,
            MIN_SCALE,
          )) {
            layer.flowers.push(blossomPath(kind, p.x, p.y, p.r, p.rot));
            // 꽃술은 꽃이 작아지면 화면에서 한 픽셀도 되지 않는다 — 그리지 않는다
            if (p.r >= 7) layer.cores.push(blossomCore(kind, p.x, p.y, p.r));
          }

          /*
           * 꽃이 줄어든 만큼 잎이 난다. 지우기만 하면 '없어졌다' 이지
           * '잎이 났다' 가 아니다 — 끝물의 산은 비어 있지 않다.
           */
          for (const p of leafSpots(cluster, bloom.slug, density, BLOSSOM_R)) {
            layer.leaves.push(leafPath(p.x, p.y, p.r, p.rot));
          }
        }

        bySpecies.set(bloom.slug, layer);
      }
    }

    return [...bySpecies.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (layers.length === 0) return null;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {/* 잎이 먼저다 — 꽃 뒤에 깔려야 꽃이 잎 위에 핀 것으로 보인다 */}
      {layers.map((l) => (
        <path
          key={`${l.slug}-leaf`}
          d={l.leaves.join(' ')}
          fill={LEAF_COLOR}
          stroke="#ffffff"
          strokeWidth={0.8}
          strokeLinejoin="round"
          opacity={0.9}
        />
      ))}

      {layers.map((l) => (
        <g key={l.slug} style={{ transition: fast ? 'none' : 'opacity 320ms ease-out' }}>
          <path
            d={l.flowers.join(' ')}
            fill={l.petal}
            stroke="#ffffff"
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <path d={l.cores.join(' ')} fill={l.center} />
        </g>
      ))}
    </svg>
  );
}
