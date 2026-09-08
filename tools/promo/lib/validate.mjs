// TTS 응답과 자막을 믿기 전에 검사한다.
//
// 왜: Typecast 응답이 조용히 이상해지는 경우가 셋 있고, 셋 다 "빈 자막으로 성공한 척"
// 으로 끝난다. 그게 제일 나쁘다. 그래서 여기서 멈춘다.
//   ① 시각이 뒤로 간다(역순)        — 자막이 겹치거나 사라진다
//   ② 시각이 음성 길이를 넘는다     — 자막이 영상 끝을 넘어가 안 보인다
//   ③ 낱말을 읽을 글과 못 맞춘다    — 자막 위치가 통째로 어긋난다
//
// 검사는 전부 "무엇이 · 몇 번째가 · 얼마나" 를 문구에 담는다. 숫자가 없으면 못 고친다.

export class TimingError extends Error {
  constructor(message, detail = {}) {
    super(message)
    this.name = 'TimingError'
    this.detail = detail
  }
}

/** 반올림 오차와 wav 헤더 오차를 감안한 기본 허용치(초). */
export const TOLERANCE = 0.05

/**
 * ①②: 낱말 시각이 성한지 본다.
 * @param words [{text,start,end}]
 * @param audioSeconds  wav 에서 ★직접 잰★ 길이 (응답이 말하는 길이가 아니다)
 */
export function assertTimestamps(words, audioSeconds, { tolerance = TOLERANCE, where = '' } = {}) {
  const at = where ? `${where}: ` : ''
  if (!Array.isArray(words) || words.length === 0) {
    throw new TimingError(`${at}낱말 시각이 하나도 없습니다 — 자막을 만들 수 없습니다.`)
  }
  if (!(audioSeconds > 0)) {
    throw new TimingError(`${at}음성 길이가 ${audioSeconds} 입니다 — wav 를 읽지 못했습니다.`)
  }

  let prevEnd = -Infinity
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const label = `${i}번째 낱말 "${String(w?.text ?? '').slice(0, 12)}"`
    if (typeof w?.start !== 'number' || typeof w?.end !== 'number' ||
        !Number.isFinite(w.start) || !Number.isFinite(w.end)) {
      throw new TimingError(`${at}${label} 의 시각이 숫자가 아닙니다 (start=${w?.start}, end=${w?.end}).`,
        { index: i, kind: 'not-a-number' })
    }
    // ① 한 낱말 안에서 뒤집힘
    if (w.end < w.start - tolerance) {
      throw new TimingError(
        `${at}${label} 의 끝(${w.end.toFixed(3)}s)이 시작(${w.start.toFixed(3)}s)보다 앞섭니다 — 역순입니다.`,
        { index: i, kind: 'reversed-word' })
    }
    // ① 낱말 사이 뒤집힘
    if (w.start < prevEnd - tolerance) {
      throw new TimingError(
        `${at}${label} 이 앞 낱말이 끝난 ${prevEnd.toFixed(3)}s 보다 앞인 ${w.start.toFixed(3)}s 에서 시작합니다 — 역순입니다.`,
        { index: i, kind: 'reversed-sequence' })
    }
    // ② 음성 범위 밖
    if (w.start < -tolerance) {
      throw new TimingError(
        `${at}${label} 이 음성 시작 전(${w.start.toFixed(3)}s)에 있습니다 — 범위를 벗어났습니다.`,
        { index: i, kind: 'before-audio' })
    }
    if (w.end > audioSeconds + tolerance) {
      throw new TimingError(
        `${at}${label} 이 ${w.end.toFixed(3)}s 에 끝나는데 음성은 ${audioSeconds.toFixed(3)}s 뿐입니다 — 범위를 넘었습니다.`,
        { index: i, kind: 'after-audio', audioSeconds })
    }
    prevEnd = Math.max(prevEnd, w.end)
  }
  return true
}

/**
 * 응답이 말하는 길이와 wav 에서 잰 길이가 크게 다르면 알린다.
 * ★ 멈추지는 않는다 — 우리는 언제나 wav 를 믿고, 이건 "이상하다" 는 신호일 뿐이다.
 * @returns {string|null} 경고 문구
 */
export function checkReportedDuration(reported, audioSeconds, { slack = 0.5, where = '' } = {}) {
  if (typeof reported !== 'number' || !Number.isFinite(reported)) return null
  const gap = Math.abs(reported - audioSeconds)
  if (gap <= slack) return null
  return `${where ? where + ': ' : ''}응답이 말한 길이 ${reported.toFixed(2)}s 와 wav 에서 잰 ` +
    `${audioSeconds.toFixed(2)}s 가 ${gap.toFixed(2)}s 다릅니다 (wav 를 씁니다).`
}

/**
 * 자막이 성한지 본다 — 장면 시간 계산에 넣기 ★전에★.
 * @param captions [{text,start,end}] 음성 시작을 0 으로 한 초
 */
export function assertCaptions(captions, audioSeconds, { tolerance = TOLERANCE, where = '' } = {}) {
  const at = where ? `${where}: ` : ''
  if (!Array.isArray(captions) || captions.length === 0) {
    throw new TimingError(`${at}자막이 한 줄도 만들어지지 않았습니다.`)
  }
  let prevEnd = -Infinity
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i]
    const label = `${i}번째 자막 "${String(c?.text ?? '').slice(0, 14)}"`
    if (!c?.text?.trim()) throw new TimingError(`${at}${label} 이 빈 글입니다.`, { index: i })
    if (!(c.end > c.start)) {
      throw new TimingError(`${at}${label} 의 길이가 0 이하입니다 (${c.start}~${c.end}).`,
        { index: i, kind: 'empty-range' })
    }
    if (c.start < prevEnd - tolerance) {
      throw new TimingError(`${at}${label} 이 앞 자막과 겹칩니다 (${c.start.toFixed(3)}s < ${prevEnd.toFixed(3)}s).`,
        { index: i, kind: 'overlap' })
    }
    if (c.end > audioSeconds + tolerance) {
      throw new TimingError(
        `${at}${label} 이 ${c.end.toFixed(3)}s 에 끝나는데 음성은 ${audioSeconds.toFixed(3)}s 뿐입니다.`,
        { index: i, kind: 'after-audio' })
    }
    prevEnd = c.end
  }
  return true
}
