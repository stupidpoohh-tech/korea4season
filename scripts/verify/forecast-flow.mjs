/* ────────────────────────────────────────────────────────────
 * 공식 절정 예측일이 지도에 실제로 닿는가.
 *
 * 세 가지를 지킨다.
 *
 * 1. 날짜가 가면 가을색 자리가 늘기만 한다.
 *    공식 예측일은 한 번 지나면 되돌아오지 않으므로, 줄어드는 날이 있으면
 *    지도가 공식 날짜가 아닌 다른 것을 보고 있다는 뜻이다.
 *
 * 2. 그 흐름이 북에서 남으로 간다.
 *    '북→남' 을 규칙으로 적어 넣지 않았으므로, 공식 날짜를 그대로 적용한
 *    결과로 그렇게 보이는지를 화면에서 확인한다.
 *
 * 3. 수종을 바꾸면 화면이 바뀐다.
 *    세 수종의 날짜가 서로 다르므로 같은 날짜에서도 그림이 달라야 한다.
 * ──────────────────────────────────────────────────────────── */

import { check, report, MOBILE } from './lib/cdp.mjs';

const DATES = ['2026-10-10', '2026-10-20', '2026-10-26', '2026-11-01', '2026-11-06', '2026-11-19'];
const GROUPS = ['단풍나무류', '은행나무', '참나무류'];

/**
 * 가을색 자리를 센다.
 *
 * 가을색은 색상 10~55도(황금 ~ 붉은 주황) 구간이다. 배경 식생(초록 ·
 * 잎 없는 갈회색 · 눈)은 색상이나 채도에서 걸러진다. 세로 위치도 함께
 * 모아 흐름이 어디까지 내려왔는지 본다.
 */
const AUTUMN = `(() => {
  const root = document.querySelector('[style*="aspect-ratio"]');
  const svg = root.querySelector('svg[aria-hidden]');
  if (!svg) return { n: 0, meanY: null };
  const box = svg.getBoundingClientRect();
  let n = 0, ySum = 0;
  for (const p of svg.querySelectorAll('path')) {
    const fill = (p.getAttribute('fill') || '').trim();
    if (!/^#[0-9a-f]{6}$/i.test(fill)) continue;
    const r = parseInt(fill.slice(1,3),16)/255, g = parseInt(fill.slice(3,5),16)/255, b = parseInt(fill.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    if (max === min) continue;
    const l = (max+min)/2;
    const s = l > 0.5 ? (max-min)/(2-max-min) : (max-min)/(max+min);
    let h;
    if (max===r) h = ((g-b)/(max-min))%6; else if (max===g) h = (b-r)/(max-min)+2; else h = (r-g)/(max-min)+4;
    h = ((h*60)+360)%360;
    if (h >= 10 && h <= 55 && s > 0.3 && l >= 0.2 && l <= 0.7) {
      const r2 = p.getBoundingClientRect();
      n += 1;
      ySum += (r2.top + r2.height / 2 - box.top) / box.height;
    }
  }
  return { n, meanY: n > 0 ? ySum / n : null };
})()`;

const FINGERPRINT = `(() => {
  const root = document.querySelector('[style*="aspect-ratio"]');
  const parts = [];
  for (const p of root.querySelectorAll('svg[aria-hidden] path')) {
    parts.push((p.getAttribute('d')||'').length + '|' + (p.getAttribute('fill')||''));
  }
  const str = parts.join('\\n');
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(16);
})()`;

function pickGroup(label) {
  return `(() => {
    const g = [...document.querySelectorAll('[role=group]')].find((e) => e.getAttribute('aria-label') === '수종');
    if (!g) return false;
    const b = [...g.querySelectorAll('button')].find((e) => (e.innerText||'').trim() === ${JSON.stringify(label)});
    if (!b) return false;
    b.click();
    return true;
  })()`;
}

const result = await check('공식 절정 예측일이 지도에 닿는가', async (page) => {
  await page.viewport(MOBILE);
  const lines = [];
  let pass = true;

  /* 1 · 2 — 날짜가 가면 늘고, 남으로 내려간다 */
  const seen = [];
  for (const date of DATES) {
    await page.openMap(`?date=${date}`);
    await page.chooseLayer('산');
    const { n, meanY } = await page.eval(AUTUMN);
    seen.push({ date, n, meanY });
    lines.push(`${date}  가을색 ${n}자리  평균 세로 ${meanY === null ? '—' : meanY.toFixed(3)}`);
  }

  for (let i = 1; i < seen.length; i += 1) {
    if (seen[i].n < seen[i - 1].n) {
      pass = false;
      lines.push(`← ${seen[i].date} 에서 가을색이 줄었습니다 (${seen[i - 1].n} → ${seen[i].n})`);
    }
  }
  if (seen[seen.length - 1].n === 0) {
    pass = false;
    lines.push('← 공식 예측 구간 안에서도 가을색이 하나도 없습니다');
  }

  const first = seen.find((s) => s.meanY !== null);
  const last = [...seen].reverse().find((s) => s.meanY !== null);
  if (first && last && first !== last) {
    const moved = last.meanY - first.meanY;
    if (moved <= 0) {
      pass = false;
      lines.push(`← 흐름이 남으로 내려가지 않았습니다 (${first.meanY.toFixed(3)} → ${last.meanY.toFixed(3)})`);
    } else {
      lines.push(`흐름 ${first.date} ${first.meanY.toFixed(3)} → ${last.date} ${last.meanY.toFixed(3)} (남으로 ${moved.toFixed(3)})`);
    }
  }

  /* 3 — 수종을 바꾸면 화면이 바뀐다 */
  await page.openMap('?date=2026-10-26');
  await page.chooseLayer('산');
  const prints = new Map();
  for (const group of GROUPS) {
    const picked = await page.eval(pickGroup(group));
    if (!picked) {
      pass = false;
      lines.push(`← 수종 '${group}' 을 고를 수 없습니다`);
      continue;
    }
    await new Promise((r) => setTimeout(r, 800));
    const print = await page.eval(FINGERPRINT);
    const n = (await page.eval(AUTUMN)).n;
    prints.set(group, print);
    lines.push(`${group}  해시 ${print}  가을색 ${n}자리`);
  }
  if (new Set(prints.values()).size !== prints.size) {
    pass = false;
    lines.push('← 수종이 달라도 같은 화면입니다');
  }

  return { pass, lines };
});

process.exit(report(result) ? 0 : 1);
