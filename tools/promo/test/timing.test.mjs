// ★ 음성·자막·화면의 시작 기준이 하나인지. ★
// 강의용 Pilot 은 자막·anchor 에만 앞 여백을 더하고 음성은 장면 시작에 틀어서
// 0.3초씩 어긋났다. 그 회귀를 여기서 막는다.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTimeline, checkTimeline, LEAD_IN, TAIL, FPS, toFrame } from '../lib/timeline.mjs'

const scene = (over = {}) => ({
  id: 's1', type: 'STATEMENT', audio: 'audio/s1.wav', audioSeconds: 3,
  screen: { kind: 'hook' }, captions: [{ text: '가', start: 0.2, end: 1.2 }],
  anchors: { reveal: 0.6 }, ...over,
})

test('음성 시작 프레임이 앞 여백과 정확히 같다', () => {
  const t = buildTimeline({ id: 'x' }, [scene()])
  assert.equal(t.leadInFrames, toFrame(LEAD_IN))
  assert.equal(t.scenes[0].audioFromFrame, toFrame(LEAD_IN))
})

test('자막·anchor 가 음성과 ★같은★ 기준에서 센다', () => {
  const t = buildTimeline({ id: 'x' }, [scene()])
  const s = t.scenes[0]
  // 자막 0.2초 = 음성 시작 + 0.2초. 반올림도 같은 함수로 하므로 딱 떨어져야 한다.
  assert.equal(s.captions[0].fromFrame - s.audioFromFrame, toFrame(0.2))
  assert.equal(s.anchors.reveal - s.audioFromFrame, toFrame(0.6))
})

test('말이 시작하는 순간(0초)에 첫 자막이 같이 뜬다 — 한 프레임도 어긋나지 않는다', () => {
  const t = buildTimeline({ id: 'x' }, [scene({ captions: [{ text: '가', start: 0, end: 1 }] })])
  const s = t.scenes[0]
  assert.equal(s.captions[0].fromFrame, s.audioFromFrame)
})

test('장면 길이 = 앞 여백 + 음성 + 뒤 여백', () => {
  const t = buildTimeline({ id: 'x' }, [scene({ audioSeconds: 4 })])
  assert.equal(t.scenes[0].durationInFrames, toFrame(LEAD_IN + 4 + TAIL))
})

test('장면 경계에 틈도 겹침도 없다', () => {
  const t = buildTimeline({ id: 'x' }, [
    scene({ id: 'a', audioSeconds: 2 }),
    scene({ id: 'b', audioSeconds: 3.7 }),
    scene({ id: 'c', audioSeconds: 1.1 }),
  ])
  let at = 0
  for (const s of t.scenes) {
    assert.equal(s.startFrame, at, `${s.id} 시작`)
    at += s.durationInFrames
  }
  assert.equal(t.totalFrames, at)
  assert.deepEqual(checkTimeline(t), [])
})

test('checkTimeline 이 어긋난 음성 기준을 잡아낸다', () => {
  const t = buildTimeline({ id: 'x' }, [scene()])
  t.scenes[0].audioFromFrame = 0 // 옛 방식(장면 시작에 바로 재생)을 흉내
  const problems = checkTimeline(t)
  assert.ok(problems.some((p) => p.includes('공통 기준')), problems.join('\n'))
})

test('checkTimeline 이 장면 밖으로 나간 자막을 잡아낸다', () => {
  const t = buildTimeline({ id: 'x' }, [scene()])
  t.scenes[0].captions[0].toFrame = t.scenes[0].durationInFrames + 5
  assert.ok(checkTimeline(t).some((p) => p.includes('넘깁니다')))
})

test('1초보다 짧은 장면은 없다 (프레임 0 짜리 장면 방지)', () => {
  const t = buildTimeline({ id: 'x' }, [scene({ audioSeconds: 0.05, captions: [{ text: '앗', start: 0, end: 0.05 }] })])
  assert.ok(t.scenes[0].durationInFrames >= FPS)
})
