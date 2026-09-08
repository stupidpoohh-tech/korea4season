import React from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { SAFE } from '../layout.mjs'

// 캡처는 390×844 CSS 픽셀을 2배(780×1688)로 찍는다 — 그 비율로 세워 둔다.
// 자막 띠(하단 440px)를 침범하지 않는 크기여야 한다.
const FRAME_W = 520
const FRAME_H = Math.round(FRAME_W * (844 / 390))

/**
 * 제품 시연 — ★실제 MVP 화면 캡처★ 를 폰 틀에 넣어 보여 준다.
 *
 * shots 가 여럿이면 장면 안에서 차례로 갈아 끼운다 (봄 → 여름 → 가을 → 겨울).
 * ★ 자르는 시점은 말에 맞춘다 ★ — 대본이 anchorPhrases 를 주면 그 구절이 실제로
 *   발음되는 프레임에서 바뀌고, 없으면 장면을 고르게 나눈다.
 */
export const Phone = ({ screen, theme, fromFrame, anchors, durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = Math.max(0, frame - fromFrame)
  const rise = spring({ frame: t, fps, config: { damping: 18, stiffness: 90 } })

  const shots = (screen.shots || [screen.shot]).filter(Boolean)
  const labels = screen.labels || []

  // 갈아 끼우는 프레임 — 말에 맞춘 것이 있으면 그것을, 없으면 고르게.
  const cuts = []
  for (let i = 1; i < shots.length; i++) {
    const anchored = anchors?.[`cut${i}`]
    cuts.push(typeof anchored === 'number'
      ? anchored
      : fromFrame + Math.round(((durationInFrames - fromFrame) * i) / shots.length))
  }

  let idx = 0
  for (let i = 0; i < cuts.length; i++) if (frame >= cuts[i]) idx = i + 1
  // 4프레임만 겹친다 — 길게 겹치면 두 화면이 포개져 전환이 아니라 그리다 만 것처럼 보인다
  const SWAP = 4
  const at = cuts[idx - 1]
  const fade = typeof at === 'number'
    ? interpolate(frame, [at, at + SWAP], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1

  // 화면 안을 아주 천천히 훑는다 — 한 장만 오래 두는 장면에서만
  const pan = shots.length > 1 ? 0
    : interpolate(t, [0, 150], [0, screen.pan ?? -60], { extrapolateRight: 'clamp' })

  const top = SAFE.top + 96
  const label = labels[idx]

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(120% 60% at 50% 0%, ${theme.paper} 0%, ${theme.bg} 70%)`,
      }} />

      <div style={{
        position: 'absolute', left: (1080 - FRAME_W) / 2, top,
        width: FRAME_W, height: FRAME_H,
        transform: `translateY(${(1 - rise) * 60}px)`, opacity: rise,
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: 54, padding: 12, background: theme.ink,
          boxShadow: '0 2px 6px rgb(0 10 20 / .06), 0 40px 80px -30px rgb(0 10 20 / .5)',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden',
            background: theme.paper, position: 'relative',
            maskImage: 'linear-gradient(#000,#000)', WebkitMaskImage: 'linear-gradient(#000,#000)',
          }}>
            {shots.length === 0 ? <Placeholder theme={theme} name={screen.shotMissing} /> : (
              <>
                {idx > 0 ? (
                  <Img src={staticFile(`shots/${shots[idx - 1]}`)}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'block' }} />
                ) : null}
                <Img src={staticFile(`shots/${shots[idx]}`)}
                  style={{
                    position: 'absolute', top: pan, left: 0, width: '100%', display: 'block',
                    opacity: idx > 0 ? fade : 1,
                  }} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* 지금 무엇을 보고 있는지 한 낱말 — 계절·장소가 바뀌는 것이 자막보다 먼저 보여야 한다 */}
      {label ? (
        <div key={idx} style={{
          // 미리보기 표(위쪽 46~100px)와 겹치지 않는 자리
          position: 'absolute', top: SAFE.top - 12, left: 0, width: '100%', textAlign: 'center',
        }}>
          <span style={{
            display: 'inline-block', background: theme.ink, color: theme.paper,
            borderRadius: 999, padding: '14px 34px',
            fontSize: 40, fontWeight: 800, letterSpacing: '.02em', opacity: fade,
          }}>{label}</span>
        </div>
      ) : null}
    </AbsoluteFill>
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
      capture/shots/{name || '…'} 을 넣고 다시 렌더하세요.<br />
      (node capture/capture.mjs)
    </div>
  </div>
)
