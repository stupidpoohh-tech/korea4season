import assert from 'node:assert/strict';
import { check, report, MOBILE, DESKTOP } from './lib/cdp.mjs';

const result = await check('모바일 예측 탐색과 느린 재생', async (page) => {
  await page.viewport(MOBILE);
  await page.openMap('?date=2026-10-26');
  assert.ok(await page.click('예측 장소·날짜 보기'));
  const count = await page.eval(`document.querySelector('[role="dialog"] aside').querySelectorAll('li').length`);
  assert.equal(count, 34, '선택 수종의 먼 날짜·미연결 지점도 모두 보여야 한다');
  assert.ok(await page.click('광덕산'));
  assert.ok(await page.eval(`document.body.innerText.includes('지도 위치 미연결')`));
  assert.ok(await page.click('이 예측일로 이동'));
  assert.ok(await page.eval(`location.search.includes('2026-10-22')`));
  await page.click('예측 장소 선택 해제');
  await page.click('예측 장소·날짜 보기');
  assert.ok(await page.click('설악산'));
  assert.equal(await page.eval(`document.querySelectorAll('[aria-label="절정 예측 지점"] button[aria-pressed="true"]').length`), 1);
  await page.click('이 예측일로 이동');
  assert.ok(await page.eval(`document.querySelector('[aria-label="절정 예측 지점"] button[aria-pressed="true"]').getAttribute('aria-label').includes('선택 날짜에 절정 예측')`));
  await page.click('예측 장소 선택 해제');
  await page.click('날짜 컨트롤 펼치기');
  await page.click('천천히');
  const before = await page.eval(`+document.querySelector('input.date-range').value`);
  await page.click('1년 재생', 1200);
  await page.click('정지', 50);
  const advanced = await page.eval(`+document.querySelector('input.date-range').value`) - before;
  assert.ok(advanced >= 8 && advanced <= 24, '느린 재생은 초당 약 13일: ' + advanced);
  assert.deepEqual(page.errors, []);

  await page.viewport(DESKTOP);
  await page.openMap('?date=2026-10-26');
  assert.equal(await page.eval(`document.querySelector('[aria-label="절정 예측 장소 목록"]').querySelectorAll('li').length`), 34);
  for (const date of ['2026-07-15', '2026-11-20']) {
    await page.openMap('?date=' + date);
    const hasForecast = await page.eval(`!!document.querySelector('[aria-label="절정 예측 장소 목록"]')`);
    assert.equal(hasForecast, date.includes('11-20'), '여름에는 예측 패널을 숨기고 늦가을에는 지난 예측을 유지한다');
  }
  return { pass: true, lines: ['모바일 전체 34곳 · 미연결 날짜 이동 · 선택 지점 강조 · 당일 구분 · 느린 재생 · 데스크톱 전체 목록 · 계절별 패널 통과'] };
});
process.exit(report(result) ? 0 : 1);
