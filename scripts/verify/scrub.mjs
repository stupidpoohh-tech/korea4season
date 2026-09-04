/* ────────────────────────────────────────────────────────────
 * 슬라이더를 끄는 동안 화면이 죽지 않는가.
 *
 * 실제로 겪은 사고를 잡아 두기 위한 검사다. 날짜가 바뀔 때마다 주소를
 * 다시 쓰고 있었는데, Safari 는 replaceState 를 30초에 100번으로 제한하고
 * 넘기면 예외를 던진다 — effect 안에서 터지므로 React 가 트리를 통째로
 * 내리고 사용자는 빈 화면을 본다.
 *
 * iOS 를 여기서 직접 재현할 수 없으므로, **끄는 동안 몇 번이나 주소를
 * 쓰는가** 를 대신 센다. 그 수가 다시 늘면 같은 사고가 돌아온 것이다.
 * ──────────────────────────────────────────────────────────── */

import { check, report, MOBILE, CPU_THROTTLE } from './lib/cdp.mjs';

/** 1년을 네 번 왕복하는 동안 이 이상 주소를 쓰면 Safari 한도에 닿는다 */
const HISTORY_BUDGET = 40;
const MOVES = 240;

const result = await check('드래그 안전성 (주소 갱신 · 오류)', async (page) => {
  await page.viewport(MOBILE);
  await page.touch(true);
  await page.throttle(CPU_THROTTLE);
  await page.openMap();

  await page.eval(`(() => {
    window.__historyWrites = 0;
    const rs = history.replaceState.bind(history);
    history.replaceState = (...a) => { window.__historyWrites += 1; return rs(...a); };
    return true;
  })()`);

  const box = await page.slider();
  await page.gc();

  const t0 = Date.now();
  await page.touchStart(box.x + box.w * 0.5, box.y);
  for (let i = 0; i <= MOVES; i += 1) {
    const p = 0.5 + 0.5 * Math.sin((i / MOVES) * Math.PI * 8);
    await page.touchMove(box.x + Math.max(2, Math.min(box.w - 2, box.w * p)), box.y);
    await new Promise((r) => setTimeout(r, 8));
  }
  await page.touchEnd();
  const wall = Date.now() - t0;
  await new Promise((r) => setTimeout(r, 1500));

  const peak = await page.heapMB();
  await page.gc();
  const settled = await page.heapMB();
  const writes = await page.eval('window.__historyWrites');
  const nodes = await page.eval('document.querySelectorAll("*").length');
  await page.throttle(1);

  return {
    pass: writes <= HISTORY_BUDGET && page.errors.length === 0,
    lines: [
      `주소 갱신 ${writes}번 (한도 ${HISTORY_BUDGET}) · 이동 ${MOVES}회 · ${(wall / 1000).toFixed(1)}초`,
      `힙 최대 ${peak}MB → GC 후 ${settled}MB · DOM ${nodes}개`,
      page.errors.length ? `오류 ${page.errors.slice(0, 3).join(' | ')}` : '오류 없음',
    ],
  };
});

process.exit(report(result) ? 0 : 1);
