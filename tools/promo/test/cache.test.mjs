// TTS 캐시 — wav 와 timestamps 가 ★한 쌍★ 으로만 캐시가 되는지, mock/real 이 안 섞이는지.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, writeFileSync, unlinkSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ★ 캐시 위치를 시험용 폴더로 돌린다 — 진짜 .cache 를 건드리지 않게.
const TMP = mkdtempSync(join(tmpdir(), 'promo-cache-'))
process.env.PROMO_CACHE_OVERRIDE = TMP

const { cacheKey, read, write, through, stats, CACHE_VERSION } = await import('../lib/ttsCache.mjs')

const VOICE = { voiceId: 'v1', model: 'm', language: 'kor', tempo: 1, pitch: 0, volume: 100, seed: 42 }
const WAV = Buffer.from('RIFF fake wav bytes')
const WORDS = [{ text: '성수', start: 0, end: 0.5 }]

test.after(() => rmSync(TMP, { recursive: true, force: true }))

test('같은 글·같은 목소리면 같은 키, 하나라도 다르면 다른 키', () => {
  const a = cacheKey('성수 팝업', VOICE, 'mock')
  assert.equal(a, cacheKey('성수 팝업', VOICE, 'mock'))
  assert.notEqual(a, cacheKey('성수 팝업!', VOICE, 'mock'))
  assert.notEqual(a, cacheKey('성수 팝업', { ...VOICE, tempo: 1.1 }, 'mock'))
  assert.notEqual(a, cacheKey('성수 팝업', VOICE, 'typecast'), 'mock 과 typecast 는 키가 달라야 한다')
})

test('wav 와 timestamps 를 함께 저장하고 함께 읽는다', () => {
  const key = cacheKey('t1', VOICE, 'mock')
  write(key, 'mock', { wav: WAV, words: WORDS, granularity: 'word', reportedDuration: 0.5, ttsText: 't1', voice: VOICE })
  const got = read(key, 'mock')
  assert.ok(got)
  assert.deepEqual(got.words, WORDS)
  assert.equal(got.wav.toString(), WAV.toString())
  assert.equal(got.meta.cacheVersion, CACHE_VERSION)
})

test('★반쪽 캐시는 캐시가 아니다★ — json 만 지워도 캐시 없음이 된다', () => {
  const key = cacheKey('t2', VOICE, 'mock')
  const { jsonPath } = write(key, 'mock', { wav: WAV, words: WORDS, ttsText: 't2', voice: VOICE })
  assert.ok(read(key, 'mock'))
  unlinkSync(jsonPath)
  assert.equal(read(key, 'mock'), null, 'wav 만 남았으면 다시 불러야 한다')
})

test('깨진 json 은 캐시 없음으로 치고 지운다', () => {
  const key = cacheKey('t3', VOICE, 'mock')
  const { jsonPath } = write(key, 'mock', { wav: WAV, words: WORDS, ttsText: 't3', voice: VOICE })
  writeFileSync(jsonPath, '{ 깨진')
  assert.equal(read(key, 'mock'), null)
  assert.equal(existsSync(jsonPath), false)
})

test('캐시에 비밀값이 들어가지 않는다', () => {
  const key = cacheKey('t4', VOICE, 'mock')
  const { jsonPath } = write(key, 'mock', {
    wav: WAV, words: WORDS, ttsText: 't4',
    voice: { ...VOICE, apiKey: '절대-저장되면-안-되는-값' },
  })
  const text = readFileSync(jsonPath, 'utf8')
  assert.ok(!text.includes('절대-저장되면-안-되는-값'))
  assert.ok(!/api[_-]?key/i.test(text))
})

test('★재사용★ — through 는 두 번째부터 make 를 부르지 않는다', async () => {
  let calls = 0
  const make = async () => { calls++; return { wav: WAV, words: WORDS, granularity: 'word', reportedDuration: 0.5 } }
  const a = await through('재사용 확인', VOICE, 'mock', make)
  assert.equal(a.cached, false)
  const b = await through('재사용 확인', VOICE, 'mock', make)
  assert.equal(b.cached, true)
  assert.equal(calls, 1, 'TTS 는 한 번만 불려야 한다')
  assert.deepEqual(b.words, WORDS)
})

test('★mock 과 real 은 폴더가 갈린다★ — 무음이 진짜 결과에 섞이지 않는다', async () => {
  const make = async () => ({ wav: WAV, words: WORDS, granularity: 'word', reportedDuration: 0.5 })
  await through('같은 글', VOICE, 'mock', make)
  const real = await through('같은 글', VOICE, 'typecast', make)
  assert.equal(real.cached, false, 'mock 캐시를 typecast 가 주워 쓰면 안 된다')
  assert.ok(stats('mock').dir !== stats('typecast').dir)
  assert.ok(readdirSync(join(TMP, 'tts', 'mock')).length > 0)
  assert.ok(readdirSync(join(TMP, 'tts', 'typecast')).length > 0)
})

test('stats 가 짝 없는 파일을 캐시로 세지 않는다', () => {
  const before = stats('mock').pairs
  writeFileSync(join(TMP, 'tts', 'mock', 'orphan.wav'), WAV)
  const after = stats('mock')
  assert.equal(after.pairs, before)
  assert.ok(after.orphans >= 1)
})
