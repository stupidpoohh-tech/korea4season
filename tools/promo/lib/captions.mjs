// Typecast 가 준 낱말별 시각을 자막과 화면 등장 시점(anchor)으로 옮긴다.
// ★ 자막에 뜨는 글자는 언제나 대본 그대로다 — 여기서 카피를 새로 쓰지 않는다.
import { TimingError } from './validate.mjs'

/**
 * ③ 정렬: 낱말 목록을 ttsText 위의 글자 위치에 붙인다.
 * Typecast 조각에는 앞뒤 공백·문장부호가 붙어 올 수 있어 다듬어 찾는다.
 * 못 맞춘 비율이 크면 ★조용히 넘기지 않고 멈춘다★ — 자막이 통째로 어긋나기 때문이다.
 */
export function alignWords(ttsText, words, { maxMissRatio = 0.2, where = '' } = {}) {
  const at = where ? `${where}: ` : ''
  const placed = []
  const missedWords = []
  let cursor = 0
  for (const w of words) {
    const needle = String(w.text ?? '').trim()
    if (!needle) continue
    const found = ttsText.indexOf(needle, cursor)
    if (found < 0) { missedWords.push(needle); continue }
    placed.push({ ...w, charStart: found, charEnd: found + needle.length })
    cursor = found + needle.length
  }
  const usable = words.filter((w) => String(w.text ?? '').trim()).length
  if (placed.length === 0 || missedWords.length > usable * maxMissRatio) {
    throw new TimingError(
      `${at}Typecast 가 준 낱말을 읽을 글과 맞추지 못했습니다 ` +
      `(${placed.length}/${usable} 만 맞음, 못 맞춘 것: ${missedWords.slice(0, 5).map((m) => `"${m}"`).join(', ')}` +
      `${missedWords.length > 5 ? ` 외 ${missedWords.length - 5}개` : ''}). 응답 모양을 확인해야 합니다.`,
      { kind: 'align-failed', placed: placed.length, total: usable, missed: missedWords })
  }
  return placed
}

/** 글자 구간 [start,end) 이 소리에서 언제부터 언제까지인지. */
export function timeOfRange(placed, start, end) {
  const inside = placed.filter((w) => w.charEnd > start && w.charStart < end)
  const use = inside.length ? inside : placed
  return { start: Math.min(...use.map((w) => w.start)), end: Math.max(...use.map((w) => w.end)) }
}

/** 읽을 글 안의 어떤 구절이 언제 나오는지 — 화면 요소 등장 시점(anchor)에 쓴다. */
export function timeOfPhrase(ttsText, placed, spokenPhrase) {
  const found = ttsText.indexOf(spokenPhrase)
  if (found < 0) {
    throw new TimingError(`화면 등장 기준 구절을 읽을 글에서 찾지 못했습니다: "${spokenPhrase}"`,
      { kind: 'anchor-not-found', phrase: spokenPhrase })
  }
  return timeOfRange(placed, found, found + spokenPhrase.length)
}

/** 자막 최소 노출 시간(초) — 이보다 짧으면 읽기 전에 사라진다. */
const MIN_SHOW = 0.5

/**
 * 자막 목록. display 는 대본 그대로이고, 시각만 소리에서 가져온다.
 * 겹치거나 뒤로 가는 일이 없게 다듬는다 (다듬은 결과는 assertCaptions 가 다시 본다).
 * @returns {Array<{text:string, start:number, end:number}>} 음성 시작을 0 으로 한 초
 */
export function buildCaptions(chunks, placed, { audioSeconds = Infinity } = {}) {
  const out = []
  for (const c of chunks) {
    const t = timeOfRange(placed, c.start, c.end)
    const prev = out[out.length - 1]
    const start = prev ? Math.max(t.start, prev.end) : Math.max(0, t.start)
    // 음성 끝을 넘지 않게 자르되, 길이가 0 이 되지는 않게 한다
    // (마지막 낱말이 음성 끝에 딱 붙어 있으면 MIN_SHOW 를 다 줄 수 없다).
    const end = Math.max(start + 0.04, Math.min(Math.max(start + MIN_SHOW, t.end), audioSeconds))
    out.push({ text: c.display, start, end })
  }
  return out
}
