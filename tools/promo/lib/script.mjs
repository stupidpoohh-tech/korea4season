// 대본(script/promo.json)을 읽고 성한지 본다.
// ★ 모르는 장면 종류·없는 화면은 TTS 를 부르기 ★전에★ 여기서 멈춘다 —
//   값이 나간 뒤에 멈추면 그만큼 손해다.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { SCRIPT_DIR, SHOTS } from './paths.mjs'

/** 그릴 줄 아는 화면 종류. 여기 없는 것이 오면 멈춘다. */
export const SCREEN_KINDS = ['search', 'phone', 'logo']
export const SCENE_TYPES = ['OPENING', 'PRODUCT', 'CLOSING']

export function loadScript(name = 'promo.json') {
  const path = join(SCRIPT_DIR, name)
  if (!existsSync(path)) throw new Error(`대본이 없습니다: ${path}`)
  const script = JSON.parse(readFileSync(path, 'utf8'))
  assertScript(script)
  return script
}

/**
 * @returns {string[]} 없는 제품 화면 캡처 목록 (있으면 부르는 쪽이 알아서 처리한다)
 */
export function assertScript(script) {
  if (!script?.id) throw new Error('대본에 id 가 없습니다.')
  if (!Array.isArray(script.scenes) || script.scenes.length === 0) {
    throw new Error('대본에 장면이 없습니다.')
  }
  const seen = new Set()
  for (const s of script.scenes) {
    if (!s.id) throw new Error('장면에 id 가 없습니다.')
    if (seen.has(s.id)) throw new Error(`장면 id 가 겹칩니다: ${s.id}`)
    seen.add(s.id)
    if (!SCENE_TYPES.includes(s.type)) {
      throw new Error(`${s.id}: 모르는 장면 종류입니다: ${s.type} (아는 것: ${SCENE_TYPES.join(', ')})`)
    }
    if (!String(s.narration || '').trim()) throw new Error(`${s.id}: 나레이션이 비어 있습니다.`)
    const kind = s.screen?.kind
    if (!SCREEN_KINDS.includes(kind)) {
      throw new Error(`${s.id}: 모르는 화면 종류입니다: ${kind} (아는 것: ${SCREEN_KINDS.join(', ')})`)
    }
    if (kind === 'phone' && !s.screen.shot && !(s.screen.shots || []).length
        && !s.screen.sequence?.folder) {
      throw new Error(`${s.id}: phone 화면인데 shot(캡처 파일 이름)이 없습니다.`)
    }
    // 정지 캡처를 갈아 끼우는 장면은 label 과 shot 이 짝이어야 한다.
    // 연속 촬영본은 label 개수만큼 구간을 고르게 나누므로 짝을 따지지 않는다.
    if (Array.isArray(s.screen.labels) && !s.screen.sequence
        && s.screen.labels.length !== (s.screen.shots || []).length) {
      throw new Error(`${s.id}: labels 가 ${s.screen.labels.length}개인데 shots 는 ` +
        `${(s.screen.shots || []).length}개입니다 — 짝이 맞아야 합니다.`)
    }
    for (const word of s.emphasis || []) {
      if (!s.narration.includes(word)) {
        throw new Error(`${s.id}: 강조할 낱말 "${word}" 이 나레이션에 없습니다.`)
      }
    }
  }
}

/** 제품 화면 캡처가 준비돼 있는지. 없으면 그 장면은 자리표로 그린다. */
export function missingShots(script, shotsDir = SHOTS) {
  const need = []
  for (const s of script.scenes) {
    for (const shot of [s.screen?.shot, ...(s.screen?.shots || [])]) {
      if (!shot) continue
      if (!existsSync(join(shotsDir, shot))) need.push({ scene: s.id, shot })
    }
  }
  return need
}

/**
 * 연속 촬영본의 프레임 수를 채운다.
 * ★ 대본에 손으로 적지 않는다 ★ — 다시 찍으면 장수가 바뀌는데 대본이 옛 숫자를
 *   들고 있으면 마지막 장에서 멈추거나 없는 장을 부른다. meta.json 이 진실이다.
 * @returns 새 script. 촬영본이 없는 장면은 sequence 를 지우고 무엇이 없는지 남긴다.
 */
export function resolveSequences(script, shotsDir = SHOTS) {
  return {
    ...script,
    scenes: script.scenes.map((s) => {
      const seq = s.screen?.sequence
      if (!seq?.folder) return s
      const metaPath = join(shotsDir, seq.folder, 'meta.json')
      if (!existsSync(metaPath)) {
        return { ...s, screen: { ...s.screen, sequence: null, sequenceMissing: seq.folder } }
      }
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
      if (!(meta.frames > 1)) {
        throw new Error(`${s.id}: ${seq.folder}/meta.json 의 frames 가 ${meta.frames} 입니다.`)
      }
      return { ...s, screen: { ...s.screen, sequence: { ...seq, frames: meta.frames } } }
    }),
  }
}

/**
 * 캡처가 없는 phone 장면은 shot 을 비워 자리표로 그리게 한다.
 * ★ 없는 파일을 그대로 넘기면 렌더가 이미지를 못 찾아 통째로 멈춘다 —
 *   엔진 작업이 캡처 준비에 발목 잡히지 않도록 여기서 갈라 준다.
 * @returns 새 script (원본은 건드리지 않는다)
 */
export function applyShotAvailability(script, shotsDir = SHOTS) {
  const missing = new Set(missingShots(script, shotsDir).map((m) => m.shot))
  return {
    ...script,
    scenes: script.scenes.map((s) => {
      const screen = { ...s.screen }
      let touched = false
      if (screen.shot && missing.has(screen.shot)) {
        screen.shotMissing = screen.shot; screen.shot = null; touched = true
      }
      // 여러 장을 갈아 끼우는 장면은 ★없는 것만 빼고★ 나머지로 돈다.
      // 하나가 없다고 장면을 통째로 자리표로 만들면 나머지 셋도 못 보게 된다.
      if (screen.shots) {
        const kept = screen.shots.filter((x) => !missing.has(x))
        if (kept.length !== screen.shots.length) {
          screen.shotMissing = screen.shots.find((x) => missing.has(x))
          if (screen.labels) {
            screen.labels = screen.labels.filter((_, i) => !missing.has(screen.shots[i]))
          }
          screen.shots = kept
          touched = true
        }
      }
      return touched ? { ...s, screen } : s
    }),
  }
}
