// TTS 캐시 — ★wav 와 timestamps 를 한 쌍으로★ 보관한다.
//
// 왜 이 파일이 따로 있나: 강의용(everyday-ai)에는 일반 TTS 캐시(lib/narrate.mjs)가
// 있었지만 Timestamp Pilot(pilot/run.mjs)은 캐시를 거치지 않고 매번 Typecast 를 불렀다.
// 숏츠는 카피를 여러 번 다듬으며 돌리게 되므로, 안 바뀐 장면은 값을 다시 내지 않는다.
//
// 규칙 셋:
//   ① wav 와 timestamps(json)는 ★같은 키★로 같이 저장하고, 둘 다 있어야 캐시로 친다.
//      (하나만 있으면 자막 없는 소리나 소리 없는 자막이 되는데, 그게 제일 나쁘다)
//   ② 임시 파일에 쓰고 rename 한다 — 중간에 끊겨도 반쪽짜리가 남지 않는다.
//   ③ mock 과 real 은 ★폴더가 다르다★ — 무음이 진짜 결과에 섞이면 안 된다.
import { createHash } from 'node:crypto'
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { CACHE } from './paths.mjs'

/** 캐시 모양이 바뀌면 이 번호를 올린다 — 옛 캐시를 조용히 다시 쓰지 않게. */
export const CACHE_VERSION = 1

/** 같은 글·같은 목소리·같은 엔진이면 같은 키. 하나라도 다르면 다시 부른다. */
export function cacheKey(ttsText, voice, engine) {
  return createHash('sha256')
    .update(JSON.stringify([
      CACHE_VERSION, engine, ttsText,
      voice.voiceId, voice.model, voice.language,
      voice.tempo, voice.pitch, voice.volume, voice.seed,
    ]))
    .digest('hex')
    .slice(0, 20)
}

function dirFor(engine) {
  const dir = join(CACHE, 'tts', engine)
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * @param engine 'mock' | 'typecast'
 * @returns {{wav:Buffer, words:Array, meta:object}|null}  둘 다 있을 때만 돌려준다
 */
export function read(key, engine) {
  const dir = dirFor(engine)
  const wavPath = join(dir, `${key}.wav`)
  const jsonPath = join(dir, `${key}.json`)
  if (!existsSync(wavPath) || !existsSync(jsonPath)) return null
  let meta
  try {
    meta = JSON.parse(readFileSync(jsonPath, 'utf8'))
  } catch {
    // 깨진 json 은 캐시 없음으로 친다 — 반쪽으로 남기느니 지운다
    rmSync(jsonPath, { force: true })
    return null
  }
  if (meta.cacheVersion !== CACHE_VERSION || meta.engine !== engine || !Array.isArray(meta.words)) {
    return null
  }
  return { wav: readFileSync(wavPath), words: meta.words, meta }
}

/**
 * wav 와 timestamps 를 함께 저장한다.
 * ★ json 을 나중에 쓴다 — read 가 둘 다 있어야 캐시로 치므로, 중간에 끊기면 캐시 없음이 된다.
 */
export function write(key, engine, { wav, words, granularity = null, reportedDuration = null, ttsText = '', voice = {} }) {
  const dir = dirFor(engine)
  const wavPath = join(dir, `${key}.wav`)
  const jsonPath = join(dir, `${key}.json`)
  const tmp = (p) => `${p}.tmp-${process.pid}`

  writeFileSync(tmp(wavPath), wav)
  renameSync(tmp(wavPath), wavPath)

  const meta = {
    cacheVersion: CACHE_VERSION,
    engine,
    savedAt: new Date().toISOString(),
    // ★ 비밀값은 담지 않는다 — 목소리 설정은 "정한 것"이고 키는 여기 없다.
    voice: {
      voiceId: voice.voiceId ?? null, model: voice.model ?? null, language: voice.language ?? null,
      tempo: voice.tempo ?? null, pitch: voice.pitch ?? null, volume: voice.volume ?? null, seed: voice.seed ?? null,
    },
    textLength: ttsText.length,
    granularity,
    reportedDuration,
    words,
  }
  writeFileSync(tmp(jsonPath), JSON.stringify(meta, null, 2))
  renameSync(tmp(jsonPath), jsonPath)
  return { wavPath, jsonPath }
}

/**
 * 캐시를 거쳐 부른다. 있으면 그대로, 없으면 make() 로 만들고 저장한다.
 * @param make  () => Promise<{wav, words, granularity, reportedDuration}>
 * @returns {Promise<{wav, words, granularity, reportedDuration, cached:boolean, key:string}>}
 */
export async function through(ttsText, voice, engine, make) {
  const key = cacheKey(ttsText, voice, engine)
  const hit = read(key, engine)
  if (hit) {
    return {
      wav: hit.wav, words: hit.words,
      granularity: hit.meta.granularity, reportedDuration: hit.meta.reportedDuration,
      cached: true, key,
    }
  }
  const got = await make()
  write(key, engine, { ...got, ttsText, voice })
  return { ...got, cached: false, key }
}

/** 지금 캐시에 무엇이 들어 있는지 — 화면에 한 줄 적기 위한 것. */
export function stats(engine) {
  const dir = dirFor(engine)
  const files = readdirSync(dir)
  const wavs = new Set(files.filter((f) => f.endsWith('.wav')).map((f) => f.slice(0, -4)))
  const jsons = new Set(files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)))
  const pairs = [...wavs].filter((k) => jsons.has(k))
  return { dir, pairs: pairs.length, orphans: wavs.size + jsons.size - pairs.length * 2 }
}
