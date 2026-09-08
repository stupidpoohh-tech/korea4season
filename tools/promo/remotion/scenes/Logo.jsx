import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion'
import { SAFE } from '../layout.mjs'

/**
 * 닫는 장면 — 앱의 워드마크 그대로.
 * (src/components/layout/Header.tsx 의 "🌏 지금日지도 · Nature Now Korea",
 *  조준선은 src/app/icon.svg)
 *
 * 움직임: 조준선이 ★그려지고★ (stroke-dasharray), 글자가 한 자씩 올라온다.
 *   통째로 페이드인하면 로고가 '나타난다' 가 아니라 '켜진다' 로 보인다.
 */
const R = 19
const CIRC = 2 * Math.PI * R

export const Logo = ({ theme, fromFrame, meta }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = Math.max(0, frame - fromFrame)

  const draw = interpolate(t, [0, 34], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const cross = interpolate(t, [18, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const dot = spring({ frame: t - 30, fps, config: { damping: 12, stiffness: 140 } })
  const sky = spring({ frame: t - 40, fps, config: { damping: 11, stiffness: 130 } })
  const breathe = 1 + Math.sin(t / 26) * 0.012

  const word = '지금日지도'
  const cta = meta.cta || {}

  return (
    <AbsoluteFill style={{ background: theme.ink }}>
      <svg viewBox="0 0 64 64" style={{
        position: 'absolute', top: SAFE.top + 60, left: '50%',
        width: 460, height: 460, transform: `translateX(-50%) scale(${breathe})`,
      }} aria-hidden>
        <circle cx="32" cy="32" r={R} fill="none" stroke={theme.accent} strokeWidth="1.4"
          strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - draw)}
          transform="rotate(-90 32 32)" strokeLinecap="round" />
        <path d="M32 13v38M13 32h38" stroke={theme.accent} strokeWidth="0.9"
          opacity={0.35 * cross} />
        <circle cx="32" cy="32" r={3.4 * dot} fill={theme.accent} />
        <circle cx="45" cy="21" r={2 * sky} fill={theme.sky} />
      </svg>

      <div style={{
        position: 'absolute', top: SAFE.top + 620, left: SAFE.left,
        width: SAFE.right - SAFE.left, textAlign: 'center',
      }}>
        <div style={{ fontSize: 116, fontWeight: 800, letterSpacing: '-0.03em' }}>
          {word.split('').map((ch, i) => {
            const a = t - 30 - i * 4
            const up = interpolate(a, [0, 12], [34, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
            const op = interpolate(a, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return (
              <span key={i} style={{
                display: 'inline-block', transform: `translateY(${up}px)`, opacity: op,
                color: ch === '日' ? theme.accent : theme.paper,
              }}>{ch}</span>
            )
          })}
        </div>
        <div style={{
          marginTop: 22, color: theme.accent, fontSize: 34, fontWeight: 700, letterSpacing: '.24em',
          opacity: interpolate(t, [56, 72], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>NATURE NOW KOREA</div>
        {cta.url ? (
          <div style={{
            marginTop: 44, color: theme.muted, fontSize: 34, fontWeight: 600,
            opacity: interpolate(t, [66, 82], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>{cta.url}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}
