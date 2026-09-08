// 소리 길이가 장면 길이를 정한다. ★ 사람이 초를 적지 않는다.
//
// ★★ 이 파일의 존재 이유: 기준을 하나로 묶는 것. ★★
// 강의용 Pilot 은 자막·anchor 에만 앞 여백(0.3s)을 더하고 Audio 는 장면이 시작하자마자
// 틀었다. 그래서 말은 이미 나오는데 자막은 0.3초 뒤에 떴다.
// 여기서는 LEAD_IN 이 ①음성 ②자막 ③화면 등장 시점 셋 모두의 기준이다.
// timeline 에 audioFromFrame 을 ★값으로 적어 내보내고★, 렌더는 그 값대로만 튼다.

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

/** 장면이 바뀌고 말이 시작되기까지. 음성·자막·화면이 ★같이★ 이만큼 기다린다. */
export const LEAD_IN = 0.25
/** 말이 끝나고 다음 장면까지. */
export const TAIL = 0.45

/**
 * ★ 화면이 놀 시간(holdSeconds) ★
 *
 * 말의 길이는 음성이 정하지만, ★화면이 바뀌는 것을 보여 주는 데 드는 시간★ 은
 * 말과 무관하다. 계절 넷이 갈아 끼워지는 장면은 나레이션이 끝나도 몇 초 더
 * 있어야 사람이 그 변화를 본다. 그 시간만 대본이 정한다 (screen.holdSeconds).
 * 음성·자막의 기준(LEAD_IN)에는 손대지 않는다 — 뒤에 붙기만 한다.
 */
export const holdOf = (scene) => Math.max(0, Number(scene.screen?.holdSeconds ?? 0))

export const toFrame = (sec) => Math.round(sec * FPS)

/**
 * @param meta   {id, message, mode, ...} timeline 머리말
 * @param scenes [{id, type, audio, audioSeconds, screen, captions, anchors}]
 *               captions/anchors 의 초는 ★음성 시작을 0★ 으로 한 값이다
 * @returns 렌더가 그대로 읽는 timeline 객체
 */
export function buildTimeline(meta, scenes) {
  const leadInFrames = toFrame(LEAD_IN)
  let at = 0
  const out = scenes.map((s) => {
    const hold = holdOf(s)
    const durationSeconds = LEAD_IN + s.audioSeconds + TAIL + hold
    const durationInFrames = Math.max(FPS, toFrame(durationSeconds))
    const scene = {
      id: s.id,
      type: s.type,
      startFrame: at,
      durationInFrames,
      audioSeconds: Number(s.audioSeconds.toFixed(3)),
      leadInSeconds: LEAD_IN,
      tailSeconds: TAIL,
      holdSeconds: hold,
      audio: s.audio,
      // ★ 음성·자막·화면이 공유하는 단 하나의 기준점 (장면 시작 기준 프레임).
      audioFromFrame: leadInFrames,
      screen: s.screen,
      emphasis: s.emphasis || [],
      captions: (s.captions || []).map((c) => ({
        text: c.text,
        fromFrame: leadInFrames + toFrame(c.start),
        toFrame: leadInFrames + toFrame(c.end),
      })),
      anchors: Object.fromEntries(
        Object.entries(s.anchors || {}).map(([k, v]) => [k, leadInFrames + toFrame(v)])),
    }
    at += durationInFrames
    return scene
  })
  return { ...meta, fps: FPS, width: WIDTH, height: HEIGHT, leadInFrames, totalFrames: at, scenes: out }
}

/**
 * ★ 만들어 낸 timeline 을 다시 검사한다 — 렌더에 넘기기 전에.
 * 기준이 어긋나는 회귀(자막만 밀리거나, 장면이 겹치거나)를 여기서 잡는다.
 * @returns {string[]} 문제 목록. 비어 있으면 성하다.
 */
export function checkTimeline(timeline) {
  const problems = []
  let expected = 0
  for (const s of timeline.scenes) {
    if (s.startFrame !== expected) {
      problems.push(`${s.id}: 장면이 ${expected}f 에서 시작해야 하는데 ${s.startFrame}f 입니다 (경계가 어긋남).`)
    }
    if (s.durationInFrames <= 0) problems.push(`${s.id}: 길이가 ${s.durationInFrames}f 입니다.`)
    if (s.audio && s.audioFromFrame !== timeline.leadInFrames) {
      problems.push(`${s.id}: 음성 시작 ${s.audioFromFrame}f 가 공통 기준 ${timeline.leadInFrames}f 와 다릅니다.`)
    }
    let prev = -1
    for (const c of s.captions) {
      if (c.fromFrame < s.audioFromFrame) {
        problems.push(`${s.id}: 자막 "${c.text.slice(0, 10)}" 이 음성보다 ${s.audioFromFrame - c.fromFrame}f 먼저 뜹니다.`)
      }
      if (c.toFrame > s.durationInFrames) {
        problems.push(`${s.id}: 자막 "${c.text.slice(0, 10)}" 이 장면(${s.durationInFrames}f)을 ${c.toFrame - s.durationInFrames}f 넘깁니다.`)
      }
      if (c.toFrame <= c.fromFrame) {
        problems.push(`${s.id}: 자막 "${c.text.slice(0, 10)}" 의 길이가 0 프레임입니다.`)
      }
      if (c.fromFrame < prev) {
        problems.push(`${s.id}: 자막 "${c.text.slice(0, 10)}" 이 앞 자막과 겹칩니다.`)
      }
      prev = c.toFrame
    }
    for (const [k, f] of Object.entries(s.anchors || {})) {
      if (f < s.audioFromFrame || f > s.durationInFrames) {
        problems.push(`${s.id}: 화면 등장 시점 "${k}" 이 ${f}f 로 장면 밖입니다.`)
      }
    }
    expected += s.durationInFrames
  }
  if (expected !== timeline.totalFrames) {
    problems.push(`전체 길이가 ${timeline.totalFrames}f 로 적혀 있는데 장면을 더하면 ${expected}f 입니다.`)
  }
  return problems
}
