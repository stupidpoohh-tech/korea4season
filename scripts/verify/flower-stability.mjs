/* ────────────────────────────────────────────────────────────
 * 날짜를 넘겨도 꽃이 제자리에 있는가.
 *
 * 한때 종이 앉는 자리를 '밀도 내림차순 배열의 순번' 에서 뽑았다.
 * 그 순번은 다른 종이 피고 지면 바뀌므로, 하루를 넘길 때마다 같은 벚꽃이
 * 다른 자리로 튀었다. 사용자에게는 꽃이 옮겨 다니는 것으로 보인다.
 *
 * 지금은 (군집 id + 종 slug) 에서만 자리가 나온다. 이 검사는 그 약속이
 * 지켜지는지 화면에서 직접 확인한다.
 *
 * 꽃송이의 중심을 어떻게 구하는가 —
 * 꽃잎은 모두 중심에서 반지름의 10% 떨어진 곳에서 시작해 고르게 퍼진다.
 * 그래서 한 송이가 만든 M 점들의 평균이 곧 그 송이의 중심이고,
 * 꽃이 커지거나 작아져도 이 값은 변하지 않는다.
 * ──────────────────────────────────────────────────────────── */

import { check, report, MOBILE } from './lib/cdp.mjs';

/** 종을 색으로 가려낸다 — flower-service.ts 의 FLOWER_COLOR 와 같아야 한다 */
const SPECIES = [
  { name: '개나리', fill: '#f2c018', petals: 4 },
  { name: '진달래', fill: '#dd5f9e', petals: 5 },
  { name: '벚꽃', fill: '#f4b9cf', petals: 5 },
];

/** 봄을 훑는 날짜 (일련일) */
const DAYS = [79, 84, 87, 91, 95, 98, 102, 105, 108, 112];

const CENTRES = (species) => `(() => {
  const out = {};
  for (const s of ${JSON.stringify(species)}) {
    const path = [...document.querySelectorAll('[style*="aspect-ratio"] path')]
      .find((p) => (p.getAttribute('fill') || '').toLowerCase() === s.fill);
    if (!path) { out[s.name] = []; continue; }
    const starts = [...(path.getAttribute('d') || '').matchAll(/M\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)/g)]
      .map((m) => [parseFloat(m[1]), parseFloat(m[2])]);
    const centres = [];
    for (let i = 0; i + s.petals <= starts.length; i += s.petals) {
      let x = 0, y = 0;
      for (let k = 0; k < s.petals; k += 1) { x += starts[i + k][0]; y += starts[i + k][1]; }
      centres.push(((x / s.petals).toFixed(1)) + ',' + ((y / s.petals).toFixed(1)));
    }
    out[s.name] = centres;
  }
  return out;
})()`;

const result = await check('꽃 자리 안정성 — 날짜를 넘겨도 안 움직이는가', async (page) => {
  await page.viewport(MOBILE);
  await page.openMap('?date=2026-03-20');
  if (!(await page.chooseLayer('산'))) return { pass: false, lines: ['산 화면으로 가지 못했습니다'] };

  /* 한 종이 한 번이라도 쓴 자리를 모아 둔다. 다음 날짜에 같은 자리가
     나오면 그대로여야 하고, 사라지는 것은 괜찮다 (꽃이 진 것이다). */
  const seen = new Map(SPECIES.map((s) => [s.name, new Set()]));
  const drawn = new Map(SPECIES.map((s) => [s.name, 0]));
  const spread = new Map(SPECIES.map((s) => [s.name, []]));
  let moved = 0;
  const examples = [];

  for (const day of DAYS) {
    await page.stepTo(day);
    await new Promise((r) => setTimeout(r, 500));
    const centres = await page.eval(CENTRES(SPECIES));

    for (const s of SPECIES) {
      const list = centres[s.name] ?? [];
      spread.get(s.name).push(list.length);
      drawn.set(s.name, drawn.get(s.name) + list.length);
      for (const c of list) seen.get(s.name).add(c);
    }
  }

  /*
   * 자리가 움직였다면 '한 번만 쓰인 자리' 가 잔뜩 생긴다.
   * 그래서 두 번째 훑기에서 앞서 본 자리와 다시 맞춰 본다.
   */
  for (const day of DAYS) {
    await page.stepTo(day);
    await new Promise((r) => setTimeout(r, 400));
    const centres = await page.eval(CENTRES(SPECIES));
    for (const s of SPECIES) {
      for (const c of centres[s.name] ?? []) {
        if (!seen.get(s.name).has(c)) {
          moved += 1;
          if (examples.length < 3) examples.push(`${s.name} ${c} (day ${day})`);
        }
      }
    }
  }

  const total = [...drawn.values()].reduce((a, b) => a + b, 0);
  const lines = [
    `그린 꽃 ${total}송이 · 처음 보는 자리 ${moved}곳${moved ? ` — ${examples.join(', ')}` : ''}`,
  ];
  for (const s of SPECIES) {
    lines.push(`${s.name}  날짜별 송이 수 ${spread.get(s.name).join(' → ')}`);
  }

  /* 밀도·퍼짐이 아예 변하지 않으면 그것도 잘못이다 — 날짜가 무의미해진다 */
  const varies = SPECIES.some((s) => new Set(spread.get(s.name)).size > 1);
  if (!varies) lines.push('날짜가 바뀌어도 꽃 수가 그대로입니다 — 개화 진행이 보이지 않습니다');

  return { pass: moved === 0 && varies && total > 0, lines };
});

process.exit(report(result) ? 0 : 1);
