import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { SAFE } from '../layout.mjs'

/**
 * 닫는 장면 — 앱의 워드마크 그대로.
 * (src/components/layout/Header.tsx 의 "🌏 지금日지도 · Nature Now Korea")
 */
export const Logo = ({ theme, fromFrame, meta }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = Math.max(0, frame - fromFrame)
  const pop = spring({ frame: t, fps, config: { damping: 200 } })
  const ring = interpolate(t, [0, 40], [0.86, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: theme.ink }}>
      {/* 아이콘(src/app/icon.svg)의 조준선을 크게 — 브랜드 색 그대로 */}
      <svg viewBox="0 0 64 64" style={{
        position: 'absolute', top: SAFE.top + 60, left: '50%',
        width: 460, height: 460, transform: `translateX(-50%) scale(${ring})`, opacity: 0.9 * pop,
      }} aria-hidden>
        <circle cx="32" cy="32" r="19" fill="none" stroke={theme.accent} strokeWidth="1.4" />
        <path d="M32 13v38M13 32h38" stroke={theme.accent} strokeWidth="0.9" opacity=".35" />
        <circle cx="32" cy="32" r="3.4" fill={theme.accent} />
        <circle cx="45" cy="21" r="2" fill={theme.sky} />
      </svg>

      <div style={{
        position: 'absolute', top: SAFE.top + 620, left: SAFE.left,
        width: SAFE.right - SAFE.left, textAlign: 'center',
        opacity: pop, transform: `translateY(${(1 - pop) * 20}px)`,
      }}>
        <div style={{
          color: theme.paper, fontSize: 116, fontWeight: 800, letterSpacing: '-0.03em',
        }}>지금<span style={{ color: theme.accent }}>日</span>지도</div>
        <div style={{
          marginTop: 22, color: theme.accent, fontSize: 34, fontWeight: 700, letterSpacing: '.24em',
        }}>NATURE NOW KOREA</div>
        {meta.cta?.url ? (
          <div style={{ marginTop: 44, color: theme.muted, fontSize: 34, fontWeight: 600 }}>
            {meta.cta.url}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}
