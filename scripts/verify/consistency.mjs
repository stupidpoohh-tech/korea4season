/* ────────────────────────────────────────────────────────────
 * 같은 날짜면 같은 화면인가.
 *
 * 날짜를 고르는 길은 셋이다 — 주소로 직접, 슬라이더로 끌어서, 재생을
 * 돌린 뒤에. 셋이 다른 그림을 주면 사용자는 자기가 본 것을 믿을 수 없다.
 *
 * 실제로 어긋난 적이 있다. 지형색을 끊는 폭을 '끄는 중' 인지에 따라
 * 16/50 단계로 바꾸고 있어서, 끌던 4월 8일과 손을 뗀 4월 8일의 색이
 * 달랐다. 그래서 그림이 아니라 **지도가 그린 것 전부의 해시** 를 비교한다.
 * ──────────────────────────────────────────────────────────── */

import { check, report, MOBILE } from './lib/cdp.mjs';

/** 비교할 날짜 (일련일). 봄은 꽃, 가을은 지형색이 주인공이다. */
const CASES = [
  { day: 98, label: '2026-04-08 (꽃)' },
  { day: 299, label: '2026-10-26 (단풍)' },
];

const FINGERPRINT = `(() => {
  const root = document.querySelector('[style*="aspect-ratio"]');
  const parts = [];
  for (const p of root.querySelectorAll('path')) {
    parts.push((p.getAttribute('d') || '') + '|' + (p.getAttribute('fill') || ''));
  }
  for (const s of root.querySelectorAll('stop')) {
    parts.push(s.getAttribute('offset') + '|' + s.getAttribute('stop-color') + '|' + s.getAttribute('stop-opacity'));
  }
  const str = parts.join('\\n');
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return { hash: h.toString(16), paths: parts.length, day: +document.querySelector('input.date-range').value };
})()`;

async function direct(page, day) {
  await page.openMap(`?date=2026-01-01`);
  await page.chooseLayer('산');
  await page.stepTo(day);
  await new Promise((r) => setTimeout(r, 900));
  return page.eval(FINGERPRINT);
}

async function viaSlider(page, day) {
  await page.openMap('?date=2026-01-05');
  await page.chooseLayer('산');
  const box = await page.slider();
  const xFor = (d) => box.x + ((d - 1) / (box.max - 1)) * box.w;

  await page.touchStart(xFor(20), box.y);
  for (const d of [40, 90, 160, 220, 140, day]) {
    await page.touchMove(xFor(d), box.y);
    await new Promise((r) => setTimeout(r, 90));
  }
  await page.touchEnd();
  await new Promise((r) => setTimeout(r, 1200));
  await page.stepTo(day);
  await new Promise((r) => setTimeout(r, 900));
  return page.eval(FINGERPRINT);
}

async function afterPlayback(page, day) {
  await page.openMap('?date=2026-06-20');
  await page.chooseLayer('산');
  await page.click('1년 재생', 4000);
  await page.click('정지');
  await page.stepTo(day);
  await new Promise((r) => setTimeout(r, 900));
  return page.eval(FINGERPRINT);
}

const result = await check('입력 경로 3종 — 같은 날짜 같은 화면', async (page) => {
  await page.viewport(MOBILE);
  await page.touch(true);
  const lines = [];
  let pass = true;

  for (const { day, label } of CASES) {
    const a = await direct(page, day);
    const b = await viaSlider(page, day);
    const c = await afterPlayback(page, day);
    const same = a.hash === b.hash && b.hash === c.hash;
    if (!same) pass = false;
    lines.push(
      `${label}  직접 ${a.hash} · 슬라이더 ${b.hash} · 재생 뒤 ${c.hash}  → ${same ? '일치' : '불일치'} (path ${a.paths}개)`,
    );
  }

  return { pass, lines };
});

process.exit(report(result) ? 0 : 1);
