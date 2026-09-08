// 타임스탬프 역순·음성 범위 초과·정렬 실패를 정말로 잡아내는지.
import test from 'node:test'
import assert from 'node:assert/strict'
import { assertTimestamps, assertCaptions, checkReportedDuration, TimingError } from '../lib/validate.mjs'
import { alignWords, buildCaptions } from '../lib/captions.mjs'

const w = (text, start, end) => ({ text, start, end })

test('성한 시각은 통과한다', () => {
  assert.equal(assertTimestamps([w('가', 0, 0.5), w('나', 0.5, 1)], 1.1), true)
})

test('★역순★ — 낱말 하나의 끝이 시작보다 앞서면 멈춘다', () => {
  assert.throws(() => assertTimestamps([w('가', 0.9, 0.2)], 2),
    (e) => e instanceof TimingError && e.detail.kind === 'reversed-word' && /역순/.test(e.message))
})

test('★역순★ — 뒤 낱말이 앞 낱말보다 먼저 시작하면 멈춘다', () => {
  assert.throws(() => assertTimestamps([w('가', 0, 1), w('나', 0.2, 1.5)], 2),
    (e) => e.detail.kind === 'reversed-sequence')
})

test('★범위 초과★ — 음성보다 뒤에서 끝나면 멈추고, 얼마나 넘었는지 말한다', () => {
  assert.throws(() => assertTimestamps([w('가', 0, 3.5)], 2),
    (e) => e.detail.kind === 'after-audio' && /2\.000s 뿐입니다/.test(e.message))
})

test('★범위 초과★ — 음성 시작 전이면 멈춘다', () => {
  assert.throws(() => assertTimestamps([w('가', -0.4, 0.5)], 2), (e) => e.detail.kind === 'before-audio')
})

test('반올림 오차만큼은 봐준다 (허용치 안쪽)', () => {
  assert.equal(assertTimestamps([w('가', 0, 2.02)], 2), true)
})

test('낱말이 하나도 없으면 멈춘다 — 빈 자막으로 성공한 척하지 않는다', () => {
  assert.throws(() => assertTimestamps([], 2), /하나도 없습니다/)
})

test('숫자가 아닌 시각을 잡는다', () => {
  assert.throws(() => assertTimestamps([{ text: '가', start: '0', end: 1 }], 2),
    (e) => e.detail.kind === 'not-a-number')
})

test('★정렬 실패★ — 읽을 글에 없는 낱말이 많으면 멈추고 무엇이 안 맞았는지 말한다', () => {
  assert.throws(
    () => alignWords('성수 팝업 동선', [w('성수', 0, 1), w('전혀', 1, 2), w('다른', 2, 3), w('말', 3, 4)]),
    (e) => e.detail.kind === 'align-failed' && /"전혀"/.test(e.message))
})

test('정렬 — 조금 어긋난 정도(20% 이내)는 통과하고 위치를 붙여 준다', () => {
  const placed = alignWords('성수 팝업 동선 만들기', [
    w('성수', 0, 0.5), w('팝업', 0.5, 1), w('동선', 1, 1.5), w('만들기', 1.5, 2), w('없는말', 2, 2.1),
  ])
  assert.equal(placed.length, 4)
  assert.equal(placed[0].charStart, 0)
  assert.equal(placed[1].charStart, 3)
})

test('★자막 범위★ — 음성 끝을 넘는 자막은 만들어지지 않는다', () => {
  const tts = '성수 팝업 동선'
  const placed = alignWords(tts, [w('성수', 0, 0.6), w('팝업', 0.6, 1.2), w('동선', 1.2, 1.9)])
  const caps = buildCaptions(
    [{ display: '성수 팝업 동선', start: 0, end: tts.length }], placed, { audioSeconds: 1.95 })
  assert.equal(assertCaptions(caps, 1.95), true)
  assert.ok(caps[0].end <= 1.95 + 1e-9)
})

test('자막이 겹치면 멈춘다', () => {
  assert.throws(() => assertCaptions([
    { text: '가', start: 0, end: 1 }, { text: '나', start: 0.4, end: 1.4 },
  ], 2), (e) => e.detail.kind === 'overlap')
})

test('응답이 말한 길이와 wav 길이가 크게 다르면 알린다 (멈추지는 않는다)', () => {
  assert.equal(checkReportedDuration(3.0, 3.1), null)
  assert.match(checkReportedDuration(5.0, 3.0, { where: 's1' }), /wav 를 씁니다/)
})
