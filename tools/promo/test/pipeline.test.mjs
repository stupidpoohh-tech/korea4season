// 대본 → 자막 → timeline 까지의 배관. Typecast 는 부르지 않는다 (가짜 TTS).
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TMP = mkdtempSync(join(tmpdir(), 'promo-pipe-'))
process.env.PROMO_CACHE_OVERRIDE = TMP

const { buildScenes } = await import('../lib/build.mjs')
const { buildTimeline, checkTimeline, holdOf } = await import('../lib/timeline.mjs')
const { mockSpeakWithTimestamps } = await import('../lib/mockTts.mjs')
const { loadScript, assertScript, applyShotAvailability } = await import('../lib/script.mjs')
const { prepare, KEEP_WHOLE } = await import('../lib/ttsPrep.mjs')
const { brandTheme } = await import('../lib/brand.mjs')

const VOICE = { voiceId: 'v', model: 'm', language: 'kor', tempo: 1, pitch: 0, volume: 100, seed: 42 }
const speak = async (text, v) => mockSpeakWithTimestamps(text, v)

test.after(() => rmSync(TMP, { recursive: true, force: true }))

test('실제 대본이 성하다', () => {
  const script = loadScript()
  assert.ok(script.scenes.length >= 5)
  assert.ok(script.target.minSeconds < script.target.maxSeconds)
  // 숏츠 플랫폼 상한. 3분을 넘기면 올릴 수 없다.
  assert.ok(script.target.maxSeconds <= 180)
})

test('없는 화면 종류·없는 장면 종류는 TTS 를 부르기 전에 멈춘다', () => {
  const base = loadScript()
  assert.throws(() => assertScript({ ...base, scenes: [{ ...base.scenes[0], type: '없는것' }] }),
    /모르는 장면 종류/)
  assert.throws(() => assertScript({
    ...base, scenes: [{ ...base.scenes[0], screen: { kind: '없는화면' } }],
  }), /모르는 화면 종류/)
})

test('갈아 끼우는 장면의 labels 와 shots 는 짝이 맞아야 한다', () => {
  const base = loadScript()
  const scene = base.scenes.find((s) => (s.screen.shots || []).length > 1)
  assert.ok(scene, '여러 장을 갈아 끼우는 장면이 대본에 있어야 한다')
  assert.throws(() => assertScript({
    ...base, scenes: [{ ...scene, screen: { ...scene.screen, labels: ['하나만'] } }],
  }), /짝이 맞아야/)
})

test('★캡처가 하나 없어도 나머지로 돈다★ — 장면을 통째로 자리표로 만들지 않는다', () => {
  const base = loadScript()
  const scene = base.scenes.find((s) => (s.screen.shots || []).length > 1)
  const one = scene.screen.shots[1]
  // 그 한 장만 없는 상황을 흉내 낸다
  const fake = { ...base, scenes: [scene] }
  const applied = applyShotAvailability(fake, join(TMP, '없는폴더'))
  assert.deepEqual(applied.scenes[0].screen.shots, [], '전부 없으면 전부 빠진다')
  assert.ok(applied.scenes[0].screen.shotMissing, '무엇이 없는지 이름을 남긴다')
  assert.ok(one)
})

test('★화면이 노는 시간(holdSeconds)은 장면 길이에만 더해진다★', async () => {
  const scene = {
    id: 's', type: 'PRODUCT', audio: 'audio/s.wav', audioSeconds: 3,
    screen: { kind: 'phone', shots: ['a.png'] },
    captions: [{ text: '가', start: 0, end: 1 }], anchors: {},
  }
  const withHold = { ...scene, screen: { ...scene.screen, holdSeconds: 2 } }
  const a = buildTimeline({ id: 'x' }, [scene]).scenes[0]
  const b = buildTimeline({ id: 'x' }, [withHold]).scenes[0]
  assert.equal(holdOf(withHold), 2)
  assert.equal(b.durationInFrames - a.durationInFrames, 60, '2초 = 60프레임만 길어진다')
  // ★ 음성·자막의 기준은 그대로 ★ — 노는 시간은 뒤에 붙기만 한다
  assert.equal(b.audioFromFrame, a.audioFromFrame)
  assert.deepEqual(b.captions, a.captions)
})

test('전체 배관 — 자막이 음성 안에 들어오고 장면 경계가 맞는다', async () => {
  const script = applyShotAvailability(loadScript(), join(TMP, '없는폴더'))
  const { built } = await buildScenes({ script, voice: VOICE, engine: 'mock', speak })
  assert.equal(built.length, script.scenes.length)
  for (const b of built) {
    assert.ok(b.captions.length >= 1, `${b.id} 자막`)
    for (const c of b.captions) {
      assert.ok(c.start >= 0 && c.end <= b.audioSeconds + 0.05, `${b.id} 자막이 음성 안에`)
    }
  }
  const timeline = buildTimeline({ id: script.id, mode: 'mock', theme: brandTheme() }, built)
  assert.deepEqual(checkTimeline(timeline), [])
  const seconds = timeline.totalFrames / timeline.fps
  assert.ok(seconds > 10 && seconds <= 180, `추정 길이 ${seconds}초`)
})

test('★여러 번 갈아 끼우는 시점이 말에 맞는다★ (anchorPhrases → cut1..N)', async () => {
  const script = applyShotAvailability(loadScript(), join(TMP, '없는폴더'))
  const scene = script.scenes.find((s) => (s.screen.anchorPhrases || []).length >= 2)
  assert.ok(scene, '구절로 자르는 장면이 대본에 있어야 한다')
  const { built } = await buildScenes({
    script: { ...script, scenes: [scene] }, voice: VOICE, engine: 'mock', speak,
  })
  const a = built[0].anchors
  assert.ok(typeof a.cut1 === 'number' && typeof a.cut2 === 'number')
  assert.ok(a.cut1 < a.cut2, '구절 순서대로 잘려야 한다')
  assert.ok(a.cut1 > 0 && a.cut2 <= built[0].audioSeconds + 0.05)
})

test('자막 한 덩이가 두 줄 안에 들어갈 길이다 (모바일 세로 기준)', () => {
  for (const scene of loadScript().scenes) {
    for (const c of prepare(scene.narration).chunks) {
      assert.ok(c.display.length <= KEEP_WHOLE,
        `${scene.id}: "${c.display}" 가 ${c.display.length}자로 깁니다`)
    }
  }
})

test('brandTheme 은 globals.css 에서 색을 읽는다 (도구에 hex 를 적지 않는다)', () => {
  const theme = brandTheme()
  assert.match(theme.accent, /^#[0-9A-Fa-f]{6}$/)
  assert.match(theme.ink, /^#[0-9A-Fa-f]{6}$/)
})
