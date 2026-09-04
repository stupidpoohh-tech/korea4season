/* ────────────────────────────────────────────────────────────
 * 12개월 전수 — 바다 sprite 가 제자리에 있는가.
 *
 * 세 가지를 본다.
 *   육지 위 sprite   그림이 물 밖으로 나갔는가 (0개여야 한다)
 *   최악 간격        가장 가까운 두 sprite 가 얼마나 붙었는가
 *   최대 동시 수     한 화면에 몇 개까지 올라오는가
 *
 * 어느 하나가 나빠지면 지도는 '무엇이 어디에 있는가' 를 말하지 못한다.
 * ──────────────────────────────────────────────────────────── */

import { check, report, MOBILE, DESKTOP } from './lib/cdp.mjs';
import { ASPECT, onLand } from './lib/land.mjs';

const READ = `(() => {
  const map = document.querySelector('[style*="aspect-ratio"]');
  if (!map) return null;
  const pts = [...map.querySelectorAll('button[aria-label]')]
    .filter((b) => b.getAttribute('aria-label').includes(' \\u00b7 '))
    .map((n) => ({
      x: parseFloat(n.style.left) / 100,
      y: parseFloat(n.style.top) / 100,
      label: n.getAttribute('aria-label').split(' \\u00b7 ')[0],
    }));
  const mb = map.getBoundingClientRect();
  return { map: { w: Math.round(mb.width), h: Math.round(mb.height) }, pts };
})()`;

async function sweep(page, label, viewport) {
  await page.viewport(viewport);
  let worst = Infinity;
  let worstAt = null;
  let maxAtOnce = 0;
  const land = [];
  let box = null;

  for (let m = 1; m <= 12; m += 1) {
    const date = `2026-${String(m).padStart(2, '0')}-15`;
    await page.openMap(`?date=${date}`);
    const v = await page.eval(READ);
    if (!v) continue;
    box = v.map;
    maxAtOnce = Math.max(maxAtOnce, v.pts.length);

    for (const p of v.pts) if (onLand(p)) land.push(`${date} ${p.label}`);

    for (let i = 0; i < v.pts.length; i += 1) {
      for (let j = i + 1; j < v.pts.length; j += 1) {
        const d = Math.hypot(v.pts[i].x - v.pts[j].x, (v.pts[i].y - v.pts[j].y) * ASPECT);
        if (d < worst) {
          worst = d;
          worstAt = `${date} ${v.pts[i].label}/${v.pts[j].label}`;
        }
      }
    }
  }

  return {
    lines: [
      `${label} ${viewport.width}x${viewport.height} — 지도 ${box?.w}x${box?.h}`,
      `  육지 위 sprite ${land.length}개${land.length ? ` — ${land.slice(0, 4).join(', ')}` : ''}`,
      `  최악 간격 ${worst.toFixed(3)} (${worstAt})`,
      `  최대 동시 ${maxAtOnce}개`,
    ],
    pass: land.length === 0 && worst >= 0.06 && maxAtOnce <= 30,
  };
}

const result = await check('12개월 전수 · 바다 sprite 배치', async (page) => {
  const a = await sweep(page, '데스크톱', DESKTOP);
  const b = await sweep(page, '모바일', MOBILE);
  return { pass: a.pass && b.pass, lines: [...a.lines, ...b.lines] };
});

process.exit(report(result) ? 0 : 1);
