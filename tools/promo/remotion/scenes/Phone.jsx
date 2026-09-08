import React from 'react'
import {
  AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing,
} from 'remotion'
import { SAFE } from '../layout.mjs'

// 캡처는 390×844 CSS 픽셀을 2배(780×1688)로 찍는다 — 그 비율로 세워 둔다.
const FRAME_W = 520
const FRAME_H = Math.round(FRAME_W * (844 / 390))

/**
 * 제품 시연 — ★실제 MVP 화면★ 을 폰 틀에 넣어 보여 준다.
 *
 * 움직임은 셋 중 하나다.
 *
 *   sequence  날짜를 촘촘히 밟으며 찍은 프레임을 이어 붙여 ★지도가 실제로 흐른다★.
 *             정지 캡처를 크로스페이드하면 "사진이 갈린다" 로 보이지만, 중간 상태가
 *             전부 있으면 꽃이 피고 잎이 물드는 것이 그대로 보인다.
 *   shots     여러 장을 갈아 끼운다. 이제 겹치는 대신 ★옆으로 민다★ —
 *             바다에서 산으로 '넘어가는' 것이 겹쳐 사라지는 것보다 읽힌다.
 *   한 장      아주 천천히 밀어 들어간다(push-in). 정지 화면이 굳어 보이지 않게.
 */
export const Phone = ({ screen, theme, fromFrame, anchors, durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = Math.max(0, frame - fromFrame)

  // 들어오는 동작 — 아래에서 올라오며 살짝 커진다
  const enter = spring({ frame: frame + 6, fps, config: { damping: 20, stiffness: 80 }, durationInFrames: 26 })
  // 장면 내내 아주 천천히 밀어 들어간다. 멈춰 있는 화면이 굳어 보이지 않게 하는 것이 전부다.
  const push = interpolate(frame, [0, durationInFrames], [1, 1.045], { extrapolateRight: 'clamp' })

  const seq = screen.sequence
  const shots = (screen.shots || [screen.shot]).filter(Boolean)
  const labels = screen.labels || []

  const top = SAFE.top + 96
  const scale = (0.94 + enter * 0.06) * push

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <Backdrop theme={theme} frame={frame} />

      <div style={{
        position: 'absolute', left: (1080 - FRAME_W) / 2, top,
        width: FRAME_W, height: FRAME_H,
        transform: `translateY(${(1 - enter) * 90}px) scale(${scale})`,
        transformOrigin: '50% 40%',
        opacity: Math.min(1, enter * 1.4),
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: 54, padding: 12, background: theme.ink,
          boxShadow: '0 2px 6px rgb(0 10 20 / .06), 0 46px 90px -30px rgb(0 10 20 / .55)',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden',
            background: theme.paper, position: 'relative',
            maskImage: 'linear-gradient(#000,#000)', WebkitMaskImage: 'linear-gradient(#000,#000)',
          }}>
            {seq ? <Sequence seq={seq} t={t} durationInFrames={durationInFrames} fromFrame={fromFrame} frame={frame} />
              : shots.length ? <Slides shots={shots} anchors={anchors} frame={frame}
                fromFrame={fromFrame} durationInFrames={durationInFrames} pan={screen.pan} t={t} />
                : <Placeholder theme={theme} name={screen.shotMissing} />}
          </div>
        </div>
      </div>

      <Label {...{ screen, theme, labels, seq, shots, anchors, frame, fromFrame, durationInFrames, t }} />
    </AbsoluteFill>
  )
}

/** 뒤에서 아주 천천히 도는 빛 — 배경이 완전히 죽어 있으면 화면 전체가 정지처럼 보인다. */
const Backdrop = ({ theme, frame }) => {
  const drift = interpolate(frame, [0, 400], [0, 40])
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(120% 60% at ${50 + drift * 0.1}% 0%, ${theme.paper} 0%, ${theme.bg} 70%)`,
      }} />
      <div style={{
        position: 'absolute', left: -160, top: 200 + drift, width: 520, height: 520,
        borderRadius: '50%', background: theme.accentSoft, filter: 'blur(60px)', opacity: 0.7,
      }} />
      <div style={{
        position: 'absolute', right: -180, bottom: 220 - drift, width: 460, height: 460,
        borderRadius: '50%', background: theme.accentSoft, filter: 'blur(70px)', opacity: 0.55,
      }} />
    </>
  )
}

/**
 * 연속 촬영본 재생. from~to 는 1년 중 어느 구간을 볼지(0~1).
 * 장면 길이에 맞춰 그 구간을 고르게 지난다 — 앱의 1년 재생과 같은 방식이다.
 */
const Sequence = ({ seq, t, durationInFrames, fromFrame }) => {
  const span = Math.max(1, durationInFrames - fromFrame)
  const p = Math.min(1, Math.max(0, t / span))
  const from = seq.from ?? 0
  const to = seq.to ?? 1
  const total = seq.frames
  const at = from + (to - from) * p
  const i = Math.min(total - 1, Math.max(0, Math.round(at * (total - 1))))
  const name = String(i).padStart(4, '0')
  return (
    <Img
      src={staticFile(`shots/${seq.folder}/${name}.jpg`)}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'block' }}
    />
  )
}

/** 여러 장 갈아 끼우기 — 겹치지 않고 옆으로 민다. */
const Slides = ({ shots, anchors, frame, fromFrame, durationInFrames, pan, t }) => {
  const cuts = []
  for (let i = 1; i < shots.length; i++) {
    const anchored = anchors?.[`cut${i}`]
    cuts.push(typeof anchored === 'number'
      ? anchored
      : fromFrame + Math.round(((durationInFrames - fromFrame) * i) / shots.length))
  }
  let idx = 0
  for (let i = 0; i < cuts.length; i++) if (frame >= cuts[i]) idx = i + 1

  const SLIDE = 10 // 0.33초 — 밀리는 것이 보이되 기다려지지는 않는 길이
  const at = cuts[idx - 1]
  const p = typeof at === 'number'
    ? interpolate(frame, [at, at + SLIDE], [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
    : 1

  // 한 장뿐이면 아주 천천히 훑는다
  const single = shots.length === 1
  const scroll = single
    ? interpolate(t, [0, 200], [0, pan ?? -60], { extrapolateRight: 'clamp' })
    : 0

  return (
    <>
      {idx > 0 ? (
        <Img src={staticFile(`shots/${shots[idx - 1]}`)}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', display: 'block',
            transform: `translateX(${-p * 22}%)`, opacity: 1 - p,
          }} />
      ) : null}
      <Img src={staticFile(`shots/${shots[idx]}`)}
        style={{
          position: 'absolute', top: scroll, left: 0, width: '100%', display: 'block',
          transform: idx > 0 ? `translateX(${(1 - p) * 100}%)` : 'none',
        }} />
    </>
  )
}

/**
 * 지금 무엇을 보고 있는지 한 낱말.
 * 연속 촬영본에서는 ★계절이 실제로 바뀌는 지점★ 에서 갈린다.
 */
const Label = ({ screen, theme, labels, seq, shots, anchors, frame, fromFrame, durationInFrames, t }) => {
  if (!labels.length) return null

  let idx = 0
  let changedAt = fromFrame
  if (seq) {
    const span = Math.max(1, durationInFrames - fromFrame)
    const p = Math.min(1, Math.max(0, t / span))
    idx = Math.min(labels.length - 1, Math.floor(p * labels.length))
    changedAt = fromFrame + Math.round((idx * span) / labels.length)
  } else {
    const cuts = []
    for (let i = 1; i < shots.length; i++) {
      const a = anchors?.[`cut${i}`]
      cuts.push(typeof a === 'number' ? a
        : fromFrame + Math.round(((durationInFrames - fromFrame) * i) / shots.length))
    }
    for (let i = 0; i < cuts.length; i++) if (frame >= cuts[i]) { idx = i + 1; changedAt = cuts[i] }
  }

  const age = frame - changedAt
  const rise = interpolate(age, [0, 9], [22, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const fade = interpolate(age, [0, 7], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <div style={{
      position: 'absolute', top: SAFE.top - 12, left: 0, width: '100%', textAlign: 'center',
    }}>
      <span style={{
        display: 'inline-block', background: theme.ink, color: theme.paper,
        borderRadius: 999, padding: '14px 36px',
        fontSize: 42, fontWeight: 800, letterSpacing: '.02em',
        transform: `translateY(${rise}px)`, opacity: fade,
      }}>{labels[idx]}</span>
    </div>
  )
}

/** 캡처가 없을 때 — 있는 척하지 않고 무엇이 없는지 적는다. */
const Placeholder = ({ theme, name }) => (
  <div style={{
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 18,
    background: theme.bg, color: theme.muted, textAlign: 'center', padding: 40,
  }}>
    <div style={{ fontSize: 44, fontWeight: 800, color: theme.accentStrong }}>제품 화면 캡처 없음</div>
    <div style={{ fontSize: 28, lineHeight: 1.5, wordBreak: 'keep-all' }}>
      capture/shots/{name || '…'} 을 넣고 다시 렌더하세요.
    </div>
  </div>
)
