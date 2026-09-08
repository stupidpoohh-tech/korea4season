// .env 를 읽는다 — 의존성 없이. ★ 값은 어디에도 출력하지 않는다.
// (everyday-ai tools/video/lib/env.mjs 의 구조를 가져왔다. 강의용 voice.json 은 빼고,
//  숏츠에 필요한 값만 남겼다.)
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { HERE } from './paths.mjs'

const ENV_PATH = join(HERE, '.env')

/** 값을 감춰야 하는 이름들 — redact 가 이 값들을 문자열에서 지운다. */
const SECRET_NAMES = ['TYPECAST_API_KEY']

function parse(text) {
  const out = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    // 값 뒤 주석: KEY=값   # 설명
    const hash = val.indexOf(' #')
    if (hash >= 0) val = val.slice(0, hash).trim()
    if (val.startsWith('#')) val = ''
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (val) out[key] = val
  }
  return out
}

const fromFile = existsSync(ENV_PATH) ? parse(readFileSync(ENV_PATH, 'utf8')) : {}

/** 환경변수 하나. 프로세스 환경이 .env 를 이긴다. */
export function env(name, fallback = '') {
  return process.env[name] || fromFile[name] || fallback
}

export const envPath = ENV_PATH
export const hasEnvFile = existsSync(ENV_PATH)

/**
 * 키를 우리가 들고 있지 않고 ★프록시가 붙여 주는★ 방식일 때의 표식.
 * 이 낱말이 들어 있으면 X-API-KEY 헤더를 우리가 넣지 않는다 (넣으면 자리가 겹친다).
 */
export const PROXY_KEY = 'proxy-injected'

/** 키가 있는지 ★여부만★. 값도 길이도 돌려주지 않는다. */
export function hasKey() {
  return Boolean(env('TYPECAST_API_KEY'))
}

export function keyViaProxy() {
  return env('TYPECAST_API_KEY') === PROXY_KEY
}

/** 키가 어디서 왔는지 — ★값이 아니라 출처만★. */
export function keySource() {
  if (!hasKey()) return '없음'
  if (keyViaProxy()) return '프록시가 붙여 줌'
  return process.env.TYPECAST_API_KEY ? '환경변수' : '.env 파일'
}

/**
 * 로그·오류 문구·파일에서 비밀값을 지운다.
 * 어떤 경로로든 키가 문자열에 섞여 나가는 것을 막는 마지막 그물이다.
 */
export function redact(text) {
  let s = String(text ?? '')
  for (const name of SECRET_NAMES) {
    const secret = env(name)
    // 짧은 값은 흔한 단어와 겹칠 수 있어 그대로 둔다 — 진짜 키는 늘 길다.
    if (secret && secret.length >= 6) s = s.split(secret).join(`<${name} 가림>`)
  }
  return s
}

/**
 * 목소리 설정. 대본의 voice 가 .env 를 덮어쓴다.
 * ★ 목소리 확정값은 가져오지 않는다 — 숏츠 톤은 강의용과 다르므로 --real 전에 정한다.
 */
export function voiceConfig(fromScript = {}) {
  const num = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v))
  return {
    voiceId: fromScript.voice_id || env('TYPECAST_VOICE_ID') || '',
    model: fromScript.model || env('TYPECAST_MODEL') || 'ssfm-v30',
    language: fromScript.language || env('TYPECAST_LANGUAGE', 'kor'),
    tempo: num(fromScript.tempo, num(env('TYPECAST_TEMPO'), 1.0)),
    pitch: num(fromScript.pitch, num(env('TYPECAST_PITCH'), 0)),
    volume: num(fromScript.volume, num(env('TYPECAST_VOLUME'), 100)),
    seed: num(fromScript.seed, 42),
  }
}
