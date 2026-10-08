import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DateKey } from '../src/domain/date';
import {
  FOLIAGE_TREE_GROUPS,
  OFFICIAL_FOLIAGE_FORECAST_2026,
  PEAK_CRITERION,
  OFFICIAL_FORECAST_SOURCE,
} from '../src/domain/official-foliage-forecast';
import {
  buildForecastRows,
  buildOfficialForecastNow,
  paintAnchors,
} from '../src/services/official-foliage-service';

/* ────────────────────────────────────────────────────────────
 * 공식 단풍절정 예측 계약 테스트.
 *
 * 지키려는 것은 다섯이다.
 *   1. 공식 자료에 없는 사실을 만들지 않는가 (시작 · 종료 · 진행률 · 상태)
 *   2. 날짜 판정이 공식 날짜 하나에서만 나오는가
 *   3. 북→남 흐름이 하드코딩이 아니라 공식 날짜에서 나오는가
 *   4. 좌표를 지어내지 않는가 (이을 자리가 없으면 지도에 올리지 않는다)
 *   5. 수종을 바꾸면 쓰는 자료가 실제로 바뀌는가
 * ──────────────────────────────────────────────────────────── */

describe('공식 자료에 없는 것을 만들지 않는다', () => {
  it('모든 레코드는 절정 예측일 하나만 들고 있다', () => {
    for (const f of OFFICIAL_FOLIAGE_FORECAST_2026) {
      const keys = Object.keys(f).sort();
      assert.deepEqual(keys, [
        'criterion',
        'isMock',
        'locationId',
        'locationName',
        'peakForecastDate',
        'sourceType',
        'treeGroup',
        'year',
      ]);
      assert.equal(f.criterion, PEAK_CRITERION);
      assert.equal(f.sourceType, 'OFFICIAL_FORECAST');
      assert.equal(f.isMock, false);
      assert.match(f.peakForecastDate, /^2026-\d{2}-\d{2}$/);
    }
  });

  it('확인하지 못한 출처 항목은 비워 둔다 — 지어내지 않는다', () => {
    assert.equal(OFFICIAL_FORECAST_SOURCE.publisher, null);
    assert.equal(OFFICIAL_FORECAST_SOURCE.sourceUrl, null);
    assert.equal(OFFICIAL_FORECAST_SOURCE.publishedAt, null);
  });

  it('화면이 만드는 값은 전부 날짜에서 바로 세는 것뿐이다', () => {
    const now = buildOfficialForecastNow('2026-10-26' as DateKey, 'MAPLE');
    const keys = Object.keys(now).sort();
    assert.deepEqual(keys, [
      'ahead',
      'caption',
      'group',
      'groupLabel',
      'headline',
      'paint',
      'passed',
      'rows',
      'season',
      'timeline',
      'today',
      'unmapped',
      'upcoming',
    ]);
    /* 진행률 · 상태 이름 같은 축은 아예 없다 */
    assert.equal('progress' in now, false);
    assert.equal('state' in now, false);
  });
});

describe('날짜 판정은 공식 날짜 하나에서 나온다', () => {
  it('예측일 당일에 도달이고, 하루 전에는 아니다', () => {
    const rows = buildForecastRows('2026-10-20' as DateKey, 'MAPLE');
    const seorak = rows.find((r) => r.forecast.locationId === 'seoraksan');
    assert.ok(seorak);
    assert.equal(seorak.forecast.peakForecastDate, '2026-10-20');
    assert.equal(seorak.reached, true);
    assert.equal(seorak.daysUntil, 0);

    const before = buildForecastRows('2026-10-19' as DateKey, 'MAPLE').find(
      (r) => r.forecast.locationId === 'seoraksan',
    );
    assert.equal(before?.reached, false);
    assert.equal(before?.daysUntil, 1);
  });

  it('2026년이 아니면 공식 자료를 쓰지 않는다', () => {
    const now = buildOfficialForecastNow('2025-10-26' as DateKey, 'MAPLE');
    assert.equal(now.rows.length, 0);
    assert.equal(now.paint.length, 0);
  });

  it('도달한 곳은 날짜가 갈수록 늘기만 한다', () => {
    const dates = ['2026-10-10', '2026-10-20', '2026-10-27', '2026-11-05', '2026-11-20'];
    let prev = -1;
    for (const d of dates) {
      const n = buildOfficialForecastNow(d as DateKey, 'MAPLE').rows.filter((r) => r.reached).length;
      assert.ok(n >= prev, `${d} 에서 도달 수가 줄었습니다 (${prev} → ${n})`);
      prev = n;
    }
  });
});

describe('북→남 흐름은 공식 날짜에서 나온다', () => {
  /**
   * 규칙으로 '북에서 남으로' 를 적어 넣은 것이 아니라,
   * 공식 날짜를 그대로 적용한 결과 지도에서 그 흐름이 드러나는지를 본다.
   *
   * 지도에 올라간 지점들의 y(0 북 ~ 1 남) 평균이 날짜가 갈수록 커져야 한다.
   */
  it('도달한 지점의 평균 위치가 날짜가 갈수록 남으로 내려간다', () => {
    const dates = ['2026-10-20', '2026-10-27', '2026-11-03', '2026-11-10'];
    const means: number[] = [];
    for (const d of dates) {
      const reached = paintAnchors(buildForecastRows(d as DateKey, 'MAPLE')).filter(
        (a) => a.reached,
      );
      if (reached.length === 0) continue;
      means.push(reached.reduce((s, a) => s + a.anchor.y, 0) / reached.length);
    }
    assert.ok(means.length >= 3, '비교할 날짜가 모자랍니다');
    for (let i = 1; i < means.length; i += 1) {
      assert.ok(
        means[i]! >= means[i - 1]! - 1e-9,
        `평균 위치가 북으로 되돌아갔습니다 (${means[i - 1]} → ${means[i]})`,
      );
    }
    assert.ok(means[means.length - 1]! > means[0]!, '흐름이 한 자리에 머물렀습니다');
  });

  it('가장 이른 예측일이 가장 늦은 예측일보다 북쪽이다', () => {
    const anchors = paintAnchors(buildForecastRows('2026-12-31' as DateKey, 'MAPLE'));
    const sorted = [...anchors].sort((a, b) =>
      a.peakForecastDate.localeCompare(b.peakForecastDate),
    );
    assert.ok(sorted.length >= 2);
    assert.ok(sorted[0]!.anchor.y < sorted[sorted.length - 1]!.anchor.y);
  });
});

describe('좌표는 지어내지 않는다', () => {
  it('이을 자리가 없는 공식 지점은 지도에 올리지 않고 목록에만 남는다', () => {
    const now = buildOfficialForecastNow('2026-10-26' as DateKey, 'MAPLE');
    assert.equal(now.paint.length + now.unmapped.length, now.rows.length);
    assert.ok(now.unmapped.length > 0, '이 자료에는 지도 밖 지점이 있어야 합니다');
    for (const row of now.unmapped) assert.equal(row.position, null);
    for (const a of now.paint) {
      assert.ok(a.anchor.x > 0 && a.anchor.x < 1);
      assert.ok(a.anchor.y > 0 && a.anchor.y < 1);
    }
  });
});

describe('수종을 바꾸면 쓰는 자료가 바뀐다', () => {
  it('세 수종이 서로 다른 날짜 묶음을 쓴다', () => {
    const seen = new Set<string>();
    for (const group of FOLIAGE_TREE_GROUPS) {
      const now = buildOfficialForecastNow('2026-10-26' as DateKey, group);
      assert.ok(now.rows.length > 0, `${group} 에 레코드가 없습니다`);
      for (const row of now.rows) assert.equal(row.forecast.treeGroup, group);
      seen.add(now.rows.map((r) => r.forecast.peakForecastDate).join(','));
    }
    assert.equal(seen.size, FOLIAGE_TREE_GROUPS.length, '수종이 같은 자료를 보고 있습니다');
  });

  it('타임라인 점은 공식 예측일에만 찍힌다', () => {
    const now = buildOfficialForecastNow('2026-10-26' as DateKey, 'OAK');
    const official = new Set(now.rows.map((r) => r.forecast.peakForecastDate));
    for (const t of now.timeline) assert.ok(official.has(t.date));
    const sum = now.timeline.reduce((s, t) => s + t.count, 0);
    assert.equal(sum, now.rows.length);
  });
});
