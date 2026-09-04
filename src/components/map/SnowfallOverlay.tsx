'use client';

/* ────────────────────────────────────────────────────────────
 * 눈이 내린다.
 *
 * 산 화면의 겨울에만 쓴다. 지도 위에서 유일하게 **시간이 흐르는** 표현이라
 * 아껴 쓴다 — 다른 계절에도 무언가가 계속 움직이면 사용자는 날짜를 옮겨서
 * 생기는 변화와 그냥 도는 애니메이션을 구분하지 못한다.
 *
 * ## 요소 하나가 아니라 무늬 세 겹
 *
 * 눈송이를 요소로 만들면 예순 개가 각자 자기 애니메이션을 붙들고,
 * 그만큼 합성 레이어가 유지된다. 슬라이더를 끄는 동안 화면이 죽던 원인이
 * 정확히 그런 것들이었다(iOS 의 '이 페이지를 불러올 수 없음').
 *
 * 그래서 점을 찍은 무늬를 세 겹만 깔고 각 겹을 통째로 내린다.
 * 움직이는 것은 transform 하나뿐이라 합성기만 일하고 다시 그리지 않는다.
 *
 * ## 이음매 없이 도는 법
 *
 * 무늬는 TILE 픽셀마다 반복된다. 겹의 높이를 위로 TILE×N 만큼 늘려 두고
 * 정확히 그만큼 내리면 처음과 끝이 같은 그림이라 이어진 것으로 보인다.
 * ──────────────────────────────────────────────────────────── */

/** 무늬가 반복되는 간격 (px). 이 값의 정수배만큼 내려야 이음매가 없다. */
const TILE = 60;

/** 한 바퀴에 내려가는 거리 = TILE × LOOPS */
const LOOPS = 4;

interface Layer {
  /** 점 반지름 */
  r: number;
  /** 한 바퀴 도는 데 걸리는 시간 (초). 느린 겹이 멀리 있는 눈이다. */
  seconds: number;
  opacity: number;
  /** 무늬 한 칸에 찍는 점의 자리 (0~1) */
  dots: [number, number][];
}

/*
 * 자리를 값으로 적어 둔다. 난수로 만들면 리렌더마다 무늬가 바뀌어
 * 눈이 내리는 것이 아니라 화면이 지직거리는 것으로 보인다.
 */
const LAYERS: Layer[] = [
  {
    r: 1.1,
    seconds: 26,
    opacity: 0.5,
    dots: [
      [0.08, 0.12], [0.31, 0.05], [0.55, 0.19], [0.78, 0.09],
      [0.17, 0.38], [0.44, 0.47], [0.69, 0.34], [0.92, 0.44],
      [0.05, 0.63], [0.27, 0.72], [0.51, 0.66], [0.83, 0.78],
      [0.38, 0.88], [0.62, 0.95], [0.95, 0.86],
    ],
  },
  {
    r: 1.7,
    seconds: 17,
    opacity: 0.72,
    dots: [
      [0.21, 0.08], [0.64, 0.16], [0.88, 0.28],
      [0.11, 0.45], [0.47, 0.55], [0.75, 0.62],
      [0.33, 0.77], [0.58, 0.86], [0.02, 0.93],
    ],
  },
  {
    r: 2.4,
    seconds: 11,
    opacity: 0.9,
    dots: [
      [0.42, 0.1], [0.86, 0.36], [0.14, 0.58], [0.66, 0.74], [0.29, 0.94],
    ],
  },
];

function pattern(layer: Layer): string {
  const dots = layer.dots
    .map(([x, y]) => `<circle cx="${(x * TILE).toFixed(1)}" cy="${(y * TILE).toFixed(1)}" r="${layer.r}"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" fill="#ffffff">${dots}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function SnowfallOverlay({ amount }: { amount: number }) {
  /*
   * 겨울이 깊어질수록 눈이 잦아진다. 12월 초에 한겨울처럼 쏟아지면
   * 지도가 말하는 '지금 어디까지 겨울인가' 를 덮어 버린다.
   */
  const depth = Math.min(1, Math.max(0, amount));
  if (depth <= 0.02) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {LAYERS.map((layer, i) => (
        <div
          key={i}
          className="snowfall absolute left-0 right-0"
          style={{
            top: `${-TILE * LOOPS}px`,
            bottom: 0,
            backgroundImage: pattern(layer),
            backgroundRepeat: 'repeat',
            opacity: layer.opacity * depth,
            animationDuration: `${layer.seconds}s`,
            // 겹마다 시작을 어긋나게 — 세 겹이 같은 박자로 떨어지면 줄무늬로 보인다
            animationDelay: `${-layer.seconds * (i / LAYERS.length)}s`,
            ['--snow-fall' as string]: `${TILE * LOOPS}px`,
          }}
        />
      ))}
    </div>
  );
}
