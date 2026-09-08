// Typecast Timestamp TTS 클라이언트 — ★이 파일만이 키를 만진다.★
// 키는 헤더에만 실린다. 로그·오류·파일 어디에도 값이 나가지 않는다.
//
// (everyday-ai tools/video/lib/typecast.mjs 에서 Timestamp 경로만 가져왔다.
//  강의용 분할 speak() 는 숏츠에 필요 없어 빼고, 응답 검사를 validate.mjs 로 넘겼다.)
//
// ★ 0-A 단계에서는 이 파일이 실제로 불리지 않는다 (--real 을 돌리지 않는다).
import { env, redact, keyViaProxy } from './env.mjs'

const BASE = env('TYPECAST_BASE_URL', 'https://api.typecast.ai')
const TTS_TIMESTAMP_PATH = '/v1/text-to-speech/with-timestamps'
const VOICES_PATH = '/v2/voices'

/** 한 번에 보낼 수 있는 글자 수. 숏츠 한 장면은 이보다 훨씬 짧다. */
const MAX_CHARS = Number(env('TYPECAST_MAX_CHARS', '300'))

export class TypecastError extends Error {
  constructor(message, status) {
    super(redact(message)) // ★ 오류 문구에서도 키를 지운다
    this.name = 'TypecastError'
    this.status = status
  }
}

/** 요청에 실을 키. 프록시가 붙여 주는 방식이면 null 이고 헤더를 아예 넣지 않는다. */
function apiKey() {
  if (keyViaProxy()) return null
  const key = env('TYPECAST_API_KEY')
  if (!key) {
    throw new TypecastError(
      'TYPECAST_API_KEY 가 없습니다. tools/promo/.env 에 넣어 주세요 (.env.example 을 복사). ' +
      '키 없이 화면·자막 배관만 보려면 --mock 으로 돌리세요.')
  }
  // 헤더에는 아스키만 실린다. 복사하다 한글이나 보이지 않는 문자가 섞이면
  // fetch 가 알아듣기 어려운 말로 죽는다 — 여기서 먼저 잡는다.
  if (!/^[\x21-\x7e]+$/.test(key)) {
    throw new TypecastError(
      'TYPECAST_API_KEY 에 쓸 수 없는 글자가 섞여 있습니다 (한글·공백·따옴표 등). .env 를 다시 확인하세요.')
  }
  return key
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function request(path, { method = 'GET', body } = {}) {
  const url = BASE + path
  const key = apiKey() // ★ 재시도 밖에서 한 번만 — 키가 없으면 네트워크 오류로 둔갑하지 않게
  const attempts = 4
  let lastError
  for (let i = 0; i < attempts; i++) {
    let res
    try {
      res = await fetch(url, {
        method,
        headers: {
          ...(key ? { 'X-API-KEY': key } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(120_000),
      })
    } catch (e) {
      lastError = new TypecastError(`${url} 에 닿지 못했습니다: ${redact(e.message)}`)
      if (i < attempts - 1) { await sleep(2000 * 2 ** i); continue }
      throw lastError
    }
    if (res.ok) return res
    const retriable = res.status === 429 || res.status >= 500
    const detail = redact((await res.text().catch(() => '')).slice(0, 500))
    lastError = new TypecastError(`Typecast 응답 ${res.status}${detail ? ' — ' + detail : ''}`, res.status)
    if (retriable && i < attempts - 1) { await sleep(2000 * 2 ** i); continue }
    throw lastError
  }
  throw lastError
}

/** 여러 이름으로 올 수 있는 값을 하나 고른다. */
const pick = (obj, names) => {
  for (const n of names) {
    const v = n.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
    if (v !== undefined && v !== null) return v
  }
  return undefined
}

function ttsBody(text, voice) {
  return {
    voice_id: voice.voiceId,
    text,
    model: voice.model,
    language: voice.language,
    output: {
      volume: voice.volume,
      audio_pitch: voice.pitch,
      audio_tempo: voice.tempo,
      audio_format: 'wav', // ★ wav 여야 ffmpeg 없이 길이를 잰다
    },
    seed: voice.seed,
  }
}

/**
 * 응답을 우리 모양으로 옮긴다.
 * ★ 알아볼 수 없으면 억지로 넘기지 않고 멈춘다 — 빈 자막으로 성공한 척하는 것이 제일 나쁘다.
 */
export function normalizeTimestamps(json) {
  const b64 = pick(json, ['audio', 'audio_base64', 'audio_data', 'data.audio'])
  if (typeof b64 !== 'string' || !b64) {
    throw new TypecastError(
      'timestamp 응답에서 소리를 찾지 못했습니다. 받은 항목: ' +
      Object.keys(json || {}).join(', ') + ' — Typecast 문서가 바뀌었는지 확인해야 합니다.')
  }
  const rawWords = pick(json, ['words', 'word_timestamps', 'alignment.words', 'timestamps.words'])
  const rawChars = pick(json, ['characters', 'character_timestamps', 'alignment.characters'])
  const source = Array.isArray(rawWords) && rawWords.length ? rawWords
    : (Array.isArray(rawChars) ? rawChars : null)
  if (!source) {
    throw new TypecastError(
      'timestamp 응답에서 words 도 characters 도 찾지 못했습니다. 받은 항목: ' +
      Object.keys(json || {}).join(', '))
  }
  const START_KEYS = ['start', 'start_time', 'start_seconds', 'start_ms']
  const END_KEYS = ['end', 'end_time', 'end_seconds', 'end_ms']
  const words = source.map((w, i) => {
    const text = pick(w, ['text', 'word', 'char', 'character', 'value'])
    const start = pick(w, START_KEYS)
    const end = pick(w, END_KEYS)
    if (typeof text !== 'string' || typeof start !== 'number' || typeof end !== 'number') {
      throw new TypecastError(
        `timestamp ${i}번째 항목의 모양을 알아보지 못했습니다: ${Object.keys(w || {}).join(', ')}`)
    }
    const startKey = START_KEYS.find((k) => w[k] !== undefined)
    const endKey = END_KEYS.find((k) => w[k] !== undefined)
    const toSec = (v, key) => (key.endsWith('_ms') ? v / 1000 : v)
    return { text, start: toSec(start, startKey), end: toSec(end, endKey) }
  })
  return {
    wav: Buffer.from(b64, 'base64'),
    words,
    granularity: (Array.isArray(rawWords) && rawWords.length) ? 'word' : 'character',
    reportedDuration: pick(json, ['audio_duration', 'duration', 'duration_in_seconds']) ?? null,
    format: pick(json, ['audio_format', 'format']) ?? null,
  }
}

/** 소리 + 낱말별 시각을 한 번에 받는다 (STT 를 따로 돌리지 않는다). */
export async function speakWithTimestamps(text, voice) {
  if (!voice?.voiceId) {
    throw new TypecastError('TYPECAST_VOICE_ID 가 없습니다. 목소리를 먼저 고르세요.')
  }
  const clean = String(text).trim()
  if (!clean) throw new TypecastError('읽을 문장이 비어 있습니다')
  if (clean.length > MAX_CHARS) {
    throw new TypecastError(
      `한 장면의 글이 ${clean.length}자로 한 번에 보낼 수 있는 ${MAX_CHARS}자를 넘습니다. 장면을 나눠 주세요.`)
  }
  const res = await request(TTS_TIMESTAMP_PATH, { method: 'POST', body: ttsBody(clean, voice) })
  let json
  try {
    json = await res.json()
  } catch (e) {
    throw new TypecastError(`timestamp 응답이 JSON 이 아닙니다: ${redact(e.message)}`)
  }
  const out = normalizeTimestamps(json)
  if (out.format && String(out.format).toLowerCase() !== 'wav') {
    throw new TypecastError(`wav 로 달라고 했는데 ${out.format} 이 왔습니다 — 길이를 잴 수 없습니다.`)
  }
  return out
}

/** 목소리 목록 — 고를 때 한 번 쓰고 만다. */
export async function listVoices() {
  const res = await request(VOICES_PATH)
  return res.json()
}
