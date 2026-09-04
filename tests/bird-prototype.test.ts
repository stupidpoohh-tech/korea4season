import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BIRD_UNKNOWN_REASONS,
  resolveBirdState,
  type BirdSeasonalOccurrence,
} from '../src/domain/bird';
import { birdDisplayAnchor } from '../src/domain/bird-anchor';
import {
  BIRD_DENSITY_BUDGET,
  BIRD_MAX_REGIONS_PER_SPECIES,
  selectBirdDisplay,
  type BirdDisplayCandidate,
} from '../src/domain/bird-display';
import {
  BIRD_PRODUCTION_DATA_STATUS,
  BIRD_VERIFIED_RECORD_COUNT,
  assertNoMockRecords,
  filterRuntimeRecords,
  isMockRecord,
} from '../src/domain/bird-guard';
import { isOnLand } from '../src/domain/land';
import {
  loadBirdPrototypeFixture,
  rawBirdPrototypeOccurrences,
} from '../src/data-sources/bird-prototype/adapter';
import { buildBirdNow } from '../src/services/bird-service';

/* ────────────────────────────────────────────────────────────
 * 철새 Prototype 계약 테스트.
 *
 * 여기서 지키려는 것은 그림이 예쁜가가 아니라 다음 다섯이다.
 *   1. 같은 입력이면 같은 답인가
 *   2. 날짜가 바뀌어도 자리가 그대로인가
 *   3. '모른다'(null)와 '지금 없다'(OFF)가 끝까지 갈라져 있는가
 *   4. 합성 자료가 production 으로 새지 않는가
 *   5. 전국 화면이 새로 뒤덮이지 않는가
 * ──────────────────────────────────────────────────────────── */

const mock = (over: Partial<BirdSeasonalOccurrence> = {}): BirdSeasonalOccurrence => ({
  speciesId: 'TEST_BIRD_X',
  regionId: 'TEST_REGION_X',
  anchorVersion: 'v1',
  seasons: [{ start: '11-15', end: '02-20', peakStart: '12-20', peakEnd: '01-25' }],
  isMock: true,
  sourceType: 'MOCK',
  evidenceStatus: 'MOCK',
  ...over,
});

/** fixture 안에서 한 anchor 로 다섯 상태를 전부 볼 수 있게 만들어 둔 조합 */
const A_NORTH = { speciesId: 'TEST_BIRD_A', regionId: 'TEST_REGION_NORTH' };

function occurrenceOf(speciesId: string, regionId: string): BirdSeasonalOccurrence {
  const hit = rawBirdPrototypeOccurrences().find(
    (o) => o.speciesId === speciesId && o.regionId === regionId,
  );
  assert.ok(hit, `fixture 에 ${speciesId} × ${regionId} 가 있어야 한다`);
  return hit;
}

describe('temporal — 같은 anchor 에서 상태만 변한다', () => {
  const occurrence = occurrenceOf(A_NORTH.speciesId, A_NORTH.regionId);

  it('날짜에 따라 STARTING → GOOD → PEAK → ENDING → OFF 로 지난다', () => {
    const at = (date: string) => resolveBirdState(occurrence, date).state;

    assert.equal(at('2025-11-20'), 'STARTING');
    assert.equal(at('2025-12-05'), 'GOOD');
    assert.equal(at('2026-01-05'), 'PEAK');
    assert.equal(at('2026-02-14'), 'ENDING');
    assert.equal(at('2026-06-01'), 'OFF');
  });

  it('같은 입력은 언제 불러도 같은 답이다', () => {
    for (const date of ['2025-11-20', '2026-01-05', '2026-06-01']) {
      const first = resolveBirdState(occurrence, date);
      const second = resolveBirdState(occurrence, date);
      assert.deepEqual(first, second);
    }
  });
});

describe('anchor — 날짜가 바뀌어도 자리는 그대로다', () => {
  it('birdDisplayAnchor 는 날짜를 인자로 받지 않는다', () => {
    // 인자가 (key, region, options) 셋뿐이라는 것이 곧 계약이다
    assert.equal(birdDisplayAnchor.length, 2);
  });

  it('같은 species × region × anchorVersion 은 항상 같은 좌표다', () => {
    const region = { regionId: 'R', label: 'R', position: { x: 0.5, y: 0.4 } };
    const key = { speciesId: 'TEST_BIRD_A', regionId: 'R', anchorVersion: 'v1' };
    const first = birdDisplayAnchor(key, region);
    for (let i = 0; i < 50; i += 1) {
      assert.deepEqual(birdDisplayAnchor(key, region), first);
    }
  });

  it('anchorVersion 이 다르면 자리가 달라진다 — 자리는 판을 바꿔서만 옮긴다', () => {
    const region = { regionId: 'R', label: 'R', position: { x: 0.5, y: 0.4 } };
    const v1 = birdDisplayAnchor({ speciesId: 'S', regionId: 'R', anchorVersion: 'v1' }, region);
    const v2 = birdDisplayAnchor({ speciesId: 'S', regionId: 'R', anchorVersion: 'v2' }, region);
    assert.notDeepEqual(v1, v2);
  });

  it('여러 날짜에 걸쳐 지도 위 좌표가 움직이지 않는다', () => {
    const dates = [
      '2025-11-20',
      '2025-12-05',
      '2025-12-31',
      '2026-01-05',
      '2026-01-10',
      '2026-02-14',
    ];

    const seen = new Map<string, { x: number; y: number }>();
    for (const date of dates) {
      for (const sprite of buildBirdNow({ date, viewport: 'desktop' }).layout.sprites) {
        const before = seen.get(sprite.key);
        if (before) assert.deepEqual(sprite.position, before, `${sprite.key} 가 ${date} 에 움직였다`);
        else seen.set(sprite.key, sprite.position);
      }
    }
    assert.ok(seen.size > 0);
  });

  it('모든 anchor 가 육지 위에 있다', () => {
    for (const sprite of buildBirdNow({ date: '2026-01-10', viewport: 'desktop' }).layout.sprites) {
      assert.ok(isOnLand(sprite.position), `${sprite.key} 가 육지 밖이다`);
    }
  });
});

describe('null 과 OFF 는 다르다', () => {
  it('검증되지 않은 기록은 state = null 이다', () => {
    for (const reason of BIRD_UNKNOWN_REASONS) {
      const resolved = resolveBirdState(mock({ evidenceStatus: reason }), '2026-01-05');
      assert.equal(resolved.kind, 'unknown');
      assert.equal(resolved.state, null);
      assert.equal(resolved.reason, reason);
    }
  });

  it('구간이 비어 있으면 OFF 가 아니라 MISSING 이다', () => {
    const resolved = resolveBirdState(mock({ seasons: [] }), '2026-01-05');
    assert.equal(resolved.state, null);
    assert.equal(resolved.reason, 'MISSING');
  });

  it('OFF 는 검증된 구간 밖일 때만 나온다', () => {
    const resolved = resolveBirdState(mock(), '2026-06-01');
    assert.equal(resolved.kind, 'known');
    assert.equal(resolved.state, 'OFF');
    assert.equal(resolved.reason, null);
  });

  it('화면은 판단 불가와 시즌 밖을 따로 센다', () => {
    const now = buildBirdNow({ date: '2026-01-10', viewport: 'desktop' });
    assert.ok(now.unknown.length > 0, 'fixture 에 판단 불가 기록이 있어야 한다');
    assert.ok(now.offCount > 0, 'fixture 에 시즌 밖 기록이 있어야 한다');
    // 판단 불가는 OFF 통에 섞이지 않는다
    for (const row of now.unknown) {
      assert.ok(BIRD_UNKNOWN_REASONS.includes(row.reason));
    }
  });
});

describe('연말 넘김과 윤년', () => {
  it('12월에서 1월로 넘어가는 구간이 이어진다', () => {
    const wrap = mock({ seasons: [{ start: '12-20', end: '01-15' }] });
    assert.equal(resolveBirdState(wrap, '2025-12-25').state, 'GOOD');
    assert.equal(resolveBirdState(wrap, '2026-01-05').state, 'GOOD');
    assert.equal(resolveBirdState(wrap, '2026-02-01').state, 'OFF');
  });

  it('02-28 · 02-29 · 03-01 이 모두 같은 구간 안에 든다 (윤년)', () => {
    const occurrence = occurrenceOf('TEST_BIRD_C', 'TEST_REGION_SOUTH');
    for (const date of ['2024-02-28', '2024-02-29', '2024-03-01']) {
      assert.notEqual(resolveBirdState(occurrence, date).state, 'OFF', date);
    }
  });

  it('02-29 로 시작하는 구간이 평년에도 무너지지 않는다', () => {
    const occurrence = occurrenceOf('TEST_BIRD_C', 'TEST_REGION_EAST');
    // 평년(2026)에는 02-28 로 정규화된다
    assert.notEqual(resolveBirdState(occurrence, '2026-03-10').state, 'OFF');
    assert.notEqual(resolveBirdState(occurrence, '2024-03-10').state, 'OFF');
  });
});

describe('한 해에 여러 활성 구간', () => {
  const occurrence = occurrenceOf('TEST_BIRD_B', 'TEST_REGION_WEST');

  it('두 구간이 각각 살아 있다', () => {
    assert.equal(occurrence.seasons.length, 2);
    assert.notEqual(resolveBirdState(occurrence, '2026-04-01').state, 'OFF');
    assert.notEqual(resolveBirdState(occurrence, '2026-09-20').state, 'OFF');
  });

  it('두 구간 사이는 OFF 다', () => {
    assert.equal(resolveBirdState(occurrence, '2026-06-25').state, 'OFF');
    assert.equal(resolveBirdState(occurrence, '2026-01-10').state, 'OFF');
  });
});

describe('표시 예산 — 접힌 것은 OFF 가 아니다', () => {
  const dates = ['2025-12-20', '2026-01-05', '2026-01-10', '2026-02-01'];

  it('전국 화면 상한을 넘기지 않는다', () => {
    for (const date of dates) {
      const mobile = buildBirdNow({ date, viewport: 'mobile' });
      const desktop = buildBirdNow({ date, viewport: 'desktop' });
      assert.ok(
        mobile.layout.sprites.length <= BIRD_DENSITY_BUDGET.mobile,
        `${date} 모바일 ${mobile.layout.sprites.length}`,
      );
      assert.ok(
        desktop.layout.sprites.length <= BIRD_DENSITY_BUDGET.desktop,
        `${date} 데스크톱 ${desktop.layout.sprites.length}`,
      );
    }
  });

  it('같은 종은 기본 화면에서 두 지역까지만 나온다', () => {
    for (const date of dates) {
      for (const viewport of ['mobile', 'desktop'] as const) {
        const perSpecies = new Map<string, number>();
        for (const sprite of buildBirdNow({ date, viewport }).layout.sprites) {
          if (sprite.subject.kind !== 'bird') continue;
          const id = sprite.subject.presence.speciesId;
          perSpecies.set(id, (perSpecies.get(id) ?? 0) + 1);
        }
        for (const [id, count] of perSpecies) {
          assert.ok(count <= BIRD_MAX_REGIONS_PER_SPECIES, `${date} ${viewport} ${id} ${count}`);
        }
      }
    }
  });

  it('예산으로 접힌 것의 상태는 그대로 살아 있다', () => {
    const candidates: BirdDisplayCandidate[] = Array.from({ length: 30 }, (_, i) => ({
      key: `k${String(i).padStart(2, '0')}`,
      speciesId: `S${i}`,
      regionId: `R${i % 4}`,
      state: 'GOOD',
      position: { x: 0.4 + (i % 4) * 0.05, y: 0.3 + Math.floor(i / 4) * 0.02 },
    }));

    const { visible, hidden } = selectBirdDisplay(candidates, { viewport: 'desktop' });
    assert.equal(visible.length, BIRD_DENSITY_BUDGET.desktop);
    assert.equal(visible.length + hidden.length, candidates.length);
    // 접힌 것을 OFF 로 바꾸지 않는다
    for (const row of hidden) assert.equal(row.state, 'GOOD');
  });

  it('같은 입력이면 같은 화면이 나온다', () => {
    const first = buildBirdNow({ date: '2026-01-10', viewport: 'desktop' }).layout.sprites.map(
      (s) => s.key,
    );
    const second = buildBirdNow({ date: '2026-01-10', viewport: 'desktop' }).layout.sprites.map(
      (s) => s.key,
    );
    assert.deepEqual(first, second);
  });

  it('전국 화면이 활성 기록을 전부 그리지는 않는다 (빈 공간은 정상이다)', () => {
    const now = buildBirdNow({ date: '2026-01-10', viewport: 'mobile' });
    assert.ok(now.activeCount > now.layout.sprites.length);
    assert.ok(now.hiddenCount > 0);
  });
});

describe('mock 격리와 production 차단', () => {
  it('fixture 의 모든 레코드가 mock 으로 표시되어 있다', () => {
    const records = rawBirdPrototypeOccurrences();
    assert.ok(records.length > 0);
    for (const record of records) {
      assert.equal(isMockRecord(record), true, `${record.speciesId} × ${record.regionId}`);
    }
  });

  it('fixture 식별자가 합성값임이 이름에서 드러난다', () => {
    for (const record of rawBirdPrototypeOccurrences()) {
      assert.match(record.speciesId, /^TEST_BIRD_/);
      assert.match(record.regionId, /^TEST_REGION_/);
    }
  });

  it('production 런타임에는 mock 이 한 건도 통과하지 못한다', () => {
    const passed = filterRuntimeRecords(rawBirdPrototypeOccurrences(), { allowMock: false });
    assert.equal(passed.length, 0);
  });

  it('production payload 로 넘기려 하면 던진다 — 조용히 걸러 내지 않는다', () => {
    assert.throws(
      () => assertNoMockRecords(rawBirdPrototypeOccurrences(), 'production-bird-payload'),
      /BirdMockLeakError|mock/,
    );
    // 검증된 자료만 있으면 통과한다
    assert.doesNotThrow(() =>
      assertNoMockRecords([{ isMock: false, sourceType: 'OFFICIAL', evidenceStatus: 'VERIFIED' }], 'ok'),
    );
  });

  it('prototype 이 production 상태를 올리지 않는다', () => {
    assert.equal(BIRD_PRODUCTION_DATA_STATUS, 'NOT_READY');
    assert.equal(BIRD_VERIFIED_RECORD_COUNT, 0);
  });

  it('nature-repository 로 흘러 들어가지 않는다', async () => {
    // 지도 레이어 하나에만 실린다. 도감 · 추천 · 상세는 이 자료를 보지 못한다.
    const registry = await import('../src/data-sources/index');
    const ids = registry.dataSources.map((s) => s.id);
    assert.ok(!ids.includes('bird-prototype'), 'prototype fixture 는 레지스트리에 없어야 한다');
  });

  it('화면이 지금 합성 자료로 그려지고 있음을 스스로 안다', () => {
    const now = buildBirdNow({ date: '2026-01-10', viewport: 'desktop' });
    assert.equal(now.isPrototype, true);
    for (const sprite of now.layout.sprites) {
      if (sprite.subject.kind !== 'bird') continue;
      assert.equal(sprite.subject.presence.isMock, true);
    }
  });
});

describe('데이터와 표현의 분리', () => {
  it('fixture 가 시각 표현 값을 담지 않는다', () => {
    const forbidden = ['scale', 'opacity', 'sprite', 'css', 'class', 'shadow', 'animation', 'px'];
    for (const record of rawBirdPrototypeOccurrences()) {
      for (const key of Object.keys(record)) {
        assert.ok(
          !forbidden.includes(key.toLowerCase()),
          `occurrence 에 시각 표현 값(${key})이 들어왔다`,
        );
      }
    }
  });

  it('fixture 는 종·지역·구간·자료성격만 들고 있다', () => {
    const allowed = new Set([
      'speciesId',
      'regionId',
      'anchorVersion',
      'seasons',
      'isMock',
      'sourceType',
      'evidenceStatus',
      'note',
    ]);
    for (const record of rawBirdPrototypeOccurrences()) {
      for (const key of Object.keys(record)) assert.ok(allowed.has(key), key);
    }
  });

  it('가드가 켜져 있으면 fixture 가 실린다 (prototype 실행 승인)', () => {
    assert.ok(loadBirdPrototypeFixture().occurrences.length > 0);
  });
});
