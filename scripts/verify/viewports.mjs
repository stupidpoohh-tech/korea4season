/* ────────────────────────────────────────────────────────────
 * 한 화면에 담기는가.
 *
 * 이 서비스의 지도는 스크롤하지 않는다 — 1px 이라도 넘치면 스크롤바가
 * 생기고 그만큼 지도가 깎인다. 콘솔 오류도 여기서 함께 본다.
 * ──────────────────────────────────────────────────────────── */

import { check, report } from './lib/cdp.mjs';

const SIZES = [
  [390, 844],
  [390, 740],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
];

const result = await check('뷰포트 넘침 · 콘솔 오류', async (page) => {
  const lines = [];
  let pass = true;

  for (const [width, height] of SIZES) {
    await page.viewport({ width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await page.openMap();
    const v = await page.eval(
      `({ x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          y: document.documentElement.scrollHeight - document.documentElement.clientHeight })`,
    );
    const bad = v.x > 0 || v.y > 0 || page.errors.length > 0;
    if (bad) pass = false;
    lines.push(
      `${width}x${height}  가로넘침 ${v.x}px  세로넘침 ${v.y}px  콘솔오류 ${page.errors.length}` +
        (page.errors.length ? ` → ${page.errors.slice(0, 2).join(' | ')}` : ''),
    );
  }

  return { pass, lines };
});

process.exit(report(result) ? 0 : 1);
