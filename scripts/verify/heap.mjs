/* ────────────────────────────────────────────────────────────
 * 1년을 여러 번 훑어도 메모리가 쌓이지 않는가.
 *
 * 슬라이더를 끄는 동안 화면이 죽는 사고(iOS 의 '이 페이지를 불러올 수
 * 없음')가 여기서 시작된다. 프레임이 빠른 것보다 **쌓이지 않는 것**이
 * 먼저다 — GC 뒤에도 늘어 있으면 몇 분 쓰다 죽는다.
 * ──────────────────────────────────────────────────────────── */

import { check, report, MOBILE, CPU_THROTTLE } from './lib/cdp.mjs';

const PASSES = 8;
/** GC 뒤 이만큼 넘게 늘어 있으면 붙들고 있는 것이 있다는 뜻 */
const LEAK_MB = 12;

async function sweep(page, layer) {
  await page.openMap('?date=2026-10-01');
  if (layer === '산') await page.chooseLayer('산');

  const box = await page.slider();
  await page.gc();
  const before = await page.heapMB();

  for (let pass = 0; pass < PASSES; pass += 1) {
    const lo = box.x + box.w * 0.18;
    const hi = box.x + box.w * 0.95;
    await page.touchStart(lo, box.y);
    for (let k = 0; k <= 60; k += 1) {
      const t = k <= 30 ? k / 30 : (60 - k) / 30;
      await page.touchMove(lo + (hi - lo) * t, box.y);
    }
    await page.touchEnd();
    await new Promise((r) => setTimeout(r, 120));
  }

  await new Promise((r) => setTimeout(r, 1200));
  const peak = await page.heapMB();
  await page.gc();
  const settled = await page.heapMB();

  return {
    lines: [`${layer}  시작 ${before}MB → 최대 ${peak}MB → GC 후 ${settled}MB (1년 ${PASSES}회 왕복)`],
    pass: settled - before <= LEAK_MB && page.errors.length === 0,
  };
}

const result = await check('힙 — 1년 반복 후 남는 것', async (page) => {
  await page.viewport(MOBILE);
  await page.touch(true);
  await page.throttle(CPU_THROTTLE);
  const sea = await sweep(page, '바다');
  const mountain = await sweep(page, '산');
  await page.throttle(1);
  const lines = [...sea.lines, ...mountain.lines];
  if (page.errors.length) lines.push(`오류 ${page.errors.slice(0, 3).join(' | ')}`);
  return { pass: sea.pass && mountain.pass, lines };
});

process.exit(report(result) ? 0 : 1);
