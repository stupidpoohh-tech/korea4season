/* ────────────────────────────────────────────────────────────
 * 꽃의 생김새.
 *
 * 색만으로는 종을 구분할 수 없다. 지도에서 노란 점과 분홍 점은
 * '무슨 꽃'이 아니라 '무슨 색 점'으로 읽힌다. 그래서 꽃잎의 수와
 * 끝 모양을 종마다 다르게 그린다.
 *
 *   벚꽃   연분홍 · 다섯 장 · 끝이 갈라진 꽃잎
 *   진달래  진분홍 · 다섯 장 · 뾰족한 꽃잎
 *   개나리  노랑   · 네 장   · 갸름한 꽃잎
 *
 * 지도 작화가 단순한 도형이므로 꽃도 같은 결로 둔다 —
 * 사실적인 묘사가 아니라 멀리서도 셋이 갈라지는 실루엣이 목적이다.
 * ──────────────────────────────────────────────────────────── */

const n = (v: number) => v.toFixed(1);

export type BlossomKind = 'cherry' | 'azalea' | 'forsythia';

/** 꽃 slug → 생김새. 데이터에 생김새를 박지 않고 여기서만 잇는다. */
export const BLOSSOM_KIND: Record<string, BlossomKind> = {
  'king-cherry': 'cherry',
  azalea: 'azalea',
  forsythia: 'forsythia',
};

interface Shape {
  petals: number;
  /** 꽃잎 폭 (반지름 대비) */
  width: number;
  /** 끝이 갈라진 정도 (0 이면 뾰족하다) */
  notch: number;
  /** 꽃술 크기 (반지름 대비) */
  core: number;
}

const SHAPE: Record<BlossomKind, Shape> = {
  cherry: { petals: 5, width: 0.62, notch: 0.22, core: 0.2 },
  azalea: { petals: 5, width: 0.5, notch: 0, core: 0.17 },
  forsythia: { petals: 4, width: 0.36, notch: 0, core: 0.16 },
};

/**
 * 꽃송이 하나.
 *
 * 꽃잎을 하나씩 그려 이어 붙인다. 각도(rot)는 자리에서 뽑은 고정값이라
 * 날짜가 바뀌어도 같은 꽃이 같은 방향으로 놓인다.
 */
export function blossomPath(kind: BlossomKind, cx: number, cy: number, r: number, rot = 0): string {
  const s = SHAPE[kind];
  const out: string[] = [];

  for (let i = 0; i < s.petals; i += 1) {
    const a = rot + (i * Math.PI * 2) / s.petals;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const px = -dy;
    const py = dx;
    const w = r * s.width;

    const at = (along: number, across: number) => ({
      x: cx + dx * along + px * across,
      y: cy + dy * along + py * across,
    });

    const base = at(r * 0.1, 0);
    const c1 = at(r * 0.3, w * 0.85);
    const c2 = at(r * 0.82, w);
    const c3 = at(r * 0.82, -w);
    const c4 = at(r * 0.3, -w * 0.85);

    if (s.notch > 0) {
      // 끝이 갈라진다 — 두 봉우리 사이에 얕은 골
      const lobeL = at(r, w * 0.42);
      const dip = at(r * (1 - s.notch), 0);
      const lobeR = at(r, -w * 0.42);
      out.push(
        `M ${n(base.x)} ${n(base.y)} C ${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(lobeL.x)} ${n(lobeL.y)}` +
          ` Q ${n(dip.x)} ${n(dip.y)} ${n(lobeR.x)} ${n(lobeR.y)}` +
          ` C ${n(c3.x)} ${n(c3.y)} ${n(c4.x)} ${n(c4.y)} ${n(base.x)} ${n(base.y)} Z`,
      );
    } else {
      // 뾰족하다
      const tip = at(r * 1.04, 0);
      out.push(
        `M ${n(base.x)} ${n(base.y)} C ${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(tip.x)} ${n(tip.y)}` +
          ` C ${n(c3.x)} ${n(c3.y)} ${n(c4.x)} ${n(c4.y)} ${n(base.x)} ${n(base.y)} Z`,
      );
    }
  }

  return out.join(' ');
}

/** 꽃술 — 가운데 점 하나. 작아도 '꽃'으로 읽히게 한다. */
export function blossomCore(kind: BlossomKind, cx: number, cy: number, r: number): string {
  const rr = r * SHAPE[kind].core;
  return `M ${n(cx - rr)} ${n(cy)} a ${n(rr)} ${n(rr)} 0 1 0 ${n(rr * 2)} 0 a ${n(rr)} ${n(rr)} 0 1 0 ${n(-rr * 2)} 0`;
}

/**
 * 잎.
 *
 * 꽃이 질 때 자리를 비우지 않는다 — 같은 자리에서 잎이 드러난다.
 * 지우기만 하면 '꽃이 없어졌다' 이지 '잎이 났다' 가 아니다.
 */
export function leafPath(cx: number, cy: number, r: number, rot = 0): string {
  const dx = Math.cos(rot);
  const dy = Math.sin(rot);
  const px = -dy;
  const py = dx;
  const at = (along: number, across: number) => ({
    x: cx + dx * along + px * across,
    y: cy + dy * along + py * across,
  });
  const a = at(-r * 0.55, 0);
  const b = at(r * 0.75, 0);
  const c1 = at(0, r * 0.42);
  const c2 = at(0, -r * 0.42);
  return (
    `M ${n(a.x)} ${n(a.y)} Q ${n(c1.x)} ${n(c1.y)} ${n(b.x)} ${n(b.y)}` +
    ` Q ${n(c2.x)} ${n(c2.y)} ${n(a.x)} ${n(a.y)} Z`
  );
}
