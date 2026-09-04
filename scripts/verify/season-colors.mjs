/* ────────────────────────────────────────────────────────────
 * 계절이 앞뒤가 맞는가.
 *
 * 두 가지를 지킨다.
 *
 * 1. 잎이 없는 계절에 지도에 새잎 초록이 없다.
 *
 *    단풍이 끝난 자리를 올리브로 두었더니 11월 중순 북쪽 산이 다시 초록으로
 *    보였다. 게다가 단풍 파동은 해가 바뀌면 0 으로 돌아간다 — occurrence
 *    엔진에게 1월의 '올해 단풍' 은 아직 오지 않은 일이기 때문이다.
 *    그래서 12월 31일에 잎을 떨군 산이 1월 1일에 초록이 됐다.
 *    (측정 당시 2026-12-31 wave 1.00 → 2027-01-01 wave 0.00, 전 권역)
 *
 * 2. 눈은 산 화면의 겨울에만 내린다.
 *
 *    바다 화면에서 육지는 배경이다. 거기까지 눈이 오면 어종 그림이 묻힌다.
 * ──────────────────────────────────────────────────────────── */

import { check, report, MOBILE } from './lib/cdp.mjs';

/*
 * 전국이 잎 없는 구간.
 *
 * 11-25 부터인 것은 그 전에는 제주가 아직 물드는 중이라 그 숲이 초록빛을
 * 띠는 것이 맞기 때문이고, 03-05 까지인 것은 그 뒤로는 남쪽에 꽃이 피어
 * 꽃 레이어가 잎을 함께 그리기 때문이다. 둘 다 정상이다.
 *
 * 12-31 → 01-01 을 반드시 넣는다. 파동이 0 으로 돌아가는 자리다.
 */
const DORMANT = [
  '2026-11-25', '2026-12-05', '2026-12-15', '2026-12-25',
  '2026-12-31', '2027-01-01', '2027-01-15', '2027-02-15', '2027-03-05',
];

/** 눈이 있어야/없어야 하는 날짜 */
const SNOW_CASES = [
  { date: '2027-01-15', layer: '산', want: true },
  { date: '2026-12-20', layer: '산', want: true },
  { date: '2026-07-15', layer: '산', want: false },
  { date: '2026-10-26', layer: '산', want: false },
  { date: '2027-01-15', layer: '바다', want: false },
];

/**
 * '새잎 초록' 인 칠을 센다.
 *
 * base map 의 여름 초록(#5cb968)과 신록(#63ab3f)이 이 범위다.
 * 잎을 떨군 산(#a3937f)·겨울(#f2f7fa)·숲 그림자는 채도나 밝기에서 걸러진다.
 */
const LEAF_GREEN = `(() => {
  const root = document.querySelector('[style*="aspect-ratio"]');
  const hits = new Map();
  for (const p of root.querySelectorAll('svg[aria-hidden] path')) {
    const fill = (p.getAttribute('fill') || '').trim();
    if (!/^#[0-9a-f]{6}$/i.test(fill)) continue;
    const r = parseInt(fill.slice(1, 3), 16) / 255;
    const g = parseInt(fill.slice(3, 5), 16) / 255;
    const b = parseInt(fill.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) continue;
    const s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    let h;
    if (max === r) h = ((g - b) / (max - min)) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    h = ((h * 60) + 360) % 360;
    if (h >= 80 && h <= 150 && s > 0.35 && l >= 0.28 && l <= 0.62) {
      hits.set(fill, (hits.get(fill) ?? 0) + 1);
    }
  }
  return [...hits.entries()].map(([fill, n]) => fill + '×' + n);
})()`;

const HAS_SNOW = `document.querySelectorAll('[style*="aspect-ratio"] .snowfall').length`;

const result = await check('계절 앞뒤 — 잎 없는 계절의 초록 · 눈의 자리', async (page) => {
  await page.viewport(MOBILE);
  const lines = [];
  let pass = true;

  await page.openMap(`?date=${DORMANT[0]}`);
  if (!(await page.chooseLayer('산'))) return { pass: false, lines: ['산 화면으로 가지 못했습니다'] };

  const green = [];
  for (const date of DORMANT) {
    await page.openMap(`?date=${date}`);
    await page.chooseLayer('산');
    const hits = await page.eval(LEAF_GREEN);
    if (hits.length) {
      pass = false;
      green.push(`${date} → ${hits.join(' ')}`);
    }
  }
  lines.push(
    green.length
      ? `잎 없는 계절에 새잎 초록 ${green.length}일 — ${green.slice(0, 3).join(' | ')}`
      : `잎 없는 계절 ${DORMANT.length}개 날짜에 새잎 초록 없음`,
  );

  for (const { date, layer, want } of SNOW_CASES) {
    await page.openMap(`?date=${date}`);
    if (layer === '산') await page.chooseLayer('산');
    const n = await page.eval(HAS_SNOW);
    const ok = want ? n > 0 : n === 0;
    if (!ok) pass = false;
    lines.push(`${date} ${layer}  눈 레이어 ${n}겹 (기대 ${want ? '있음' : '없음'}) ${ok ? '' : '← 어긋남'}`);
  }

  return { pass, lines };
});

process.exit(report(result) ? 0 : 1);
