/* ────────────────────────────────────────────────────────────
 * 1년 재생이 버티는가.
 *
 * 시간 슬라이더는 이 제품의 핵심 경험이고 1년 재생은 그 대표 데모다.
 * 개발 기계로 재면 아무 뜻이 없으므로 CPU 를 감속해 휴대폰에 가깝게 둔다.
 *
 * 층마다 따로 잰다 — 바다는 sprite, 산은 지형과 꽃이라 무거운 곳이 다르다.
 * ──────────────────────────────────────────────────────────── */

import { check, report, MOBILE, CPU_THROTTLE } from './lib/cdp.mjs';

/** 이 값을 넘으면 재생이 눈에 띄게 끊긴다 (감속 배수를 감안한 값) */
const BUDGET_MEDIAN_MS = 40;

const FRAMES = `new Promise((res) => {
  const t = []; let last = performance.now();
  function f(now) {
    t.push(now - last); last = now;
    if (t.length < 180) requestAnimationFrame(f);
    else { t.sort((a, b) => a - b);
      res({ frames: t.length,
            median: +t[Math.floor(t.length / 2)].toFixed(1),
            p95: +t[Math.floor(t.length * 0.95)].toFixed(1),
            max: +t[t.length - 1].toFixed(1) }); }
  }
  requestAnimationFrame(f);
})`;

async function measure(page, layer) {
  await page.openMap('?date=2026-10-01');
  if (layer === '산' && !(await page.chooseLayer('산'))) {
    return { lines: [`${layer}: 카테고리를 바꾸지 못했습니다`], pass: false };
  }

  const paths = await page.eval(`document.querySelectorAll('svg[aria-hidden] path').length`);
  const nodes = await page.eval(`document.querySelectorAll('*').length`);

  if (!(await page.click('1년 재생'))) {
    return { lines: [`${layer}: 재생 버튼을 찾지 못했습니다`], pass: false };
  }
  const s = await page.eval(FRAMES);
  await page.click('정지');

  return {
    lines: [
      `${layer}  중앙값 ${s.median}ms · p95 ${s.p95}ms · 최대 ${s.max}ms` +
        `  (path ${paths}개 · DOM ${nodes}개, CPU ${CPU_THROTTLE}배 감속)`,
    ],
    pass: s.median <= BUDGET_MEDIAN_MS,
  };
}

const result = await check('1년 재생 프레임', async (page) => {
  await page.viewport(MOBILE);
  await page.throttle(CPU_THROTTLE);
  const sea = await measure(page, '바다');
  const mountain = await measure(page, '산');
  await page.throttle(1);
  return { pass: sea.pass && mountain.pass, lines: [...sea.lines, ...mountain.lines] };
});

process.exit(report(result) ? 0 : 1);
