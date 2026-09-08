// ★★ 가짜 TTS 다. Typecast 가 아니다. ★★
//
// 왜 있나: 지금 단계(0-A)는 유료 호출을 하지 않기로 했고, 이 작업 환경은 밖으로
// 나가는 길도 막혀 있다. 그래도 "장면이 그려지는가 · 소리 길이대로 시간이 잡히는가 ·
// 자막이 붙는가" 는 확인해야 하므로, 무음과 가짜 시각으로 그 배관만 확인한다.
//
// ★ 이 길로 나온 것은 전부 파일 이름과 화면에 PREVIEW 가 붙는다. 진짜 결과와 섞이지 않는다.
// ★ 여기서 나오는 길이는 ★추정★ 이다. 실제 Typecast 음성 길이와 다르다.
import { silentWav } from './wav.mjs'

/** 한국어를 읽는 대략의 속도 — 추정일 뿐이고, 실제 길이는 --real 에서만 알 수 있다. */
export const CHARS_PER_SECOND = 5.2

export function mockSpeakWithTimestamps(ttsText, voice) {
  const tempo = voice?.tempo || 1
  const letters = ttsText.replace(/\s/g, '').length
  const seconds = Math.max(1.2, letters / (CHARS_PER_SECOND * tempo))

  // 공백으로 나눈 낱말에 길이 비례로 시각을 나눠 준다.
  const pieces = ttsText.split(' ').filter(Boolean)
  const totalLetters = pieces.reduce((n, p) => n + p.length, 0) || 1
  let at = 0
  const words = pieces.map((text) => {
    const span = (text.length / totalLetters) * seconds
    const w = { text, start: Number(at.toFixed(3)), end: Number((at + span * 0.92).toFixed(3)) }
    at += span
    return w
  })

  return {
    wav: silentWav(seconds),
    words,
    granularity: 'word',
    reportedDuration: seconds,
    format: 'wav',
    estimated: true, // ★ 길이가 추정임을 산출물에 그대로 적는다
  }
}
