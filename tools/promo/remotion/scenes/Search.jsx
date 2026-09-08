import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { SAFE } from '../layout.mjs'

/**
 * 여는 장면 — "봄엔 벚꽃, 가을엔 단풍을 따로 검색한다".
 *
 * ★ 특정 포털의 화면을 흉내 내지 않는다. ★
 *   실재하는 회사의 UI·로고를 그리면 그 회사가 만든 것처럼 보인다.
 *   검색창은 어디에나 있는 모양이라 브랜드 없이도 "검색하는 느낌" 은 그대로 전해진다.
 */
export const Search = ({ screen, theme, fromFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = Math.max(0, frame - fromFrame)
  const queries = screen.queries || []

  // 질의가 하나씩 갈아 끼워진다 — 계절마다 다시 검색하는 것을 그대로 보여 준다
  const per = Math.max(12, Math.round((screen.holdFrames ?? 26)))
  const idx = Math.min(queries.length - 1, Math.floor(t / per))
  const local = t - idx * per
  const swap = interpolate(local, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const q = queries[idx] ?? { text: '', tint: 'muted' }
  const pop = spring({ frame: t, fps, config: { damping: 200 } })

  const boxW = SAFE.right - SAFE.left

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <div style={{
        position: 'absolute', top: SAFE.top + 300, left: SAFE.left, width: boxW,
        opacity: pop, transform: `translateY(${(1 - pop) * 24}px)`,
      }}>
        {/* 검색창 — 브랜드 없는 일반형 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 22,
          background: theme.paper, border: `3px solid ${theme.line}`,
          borderRadius: 999, padding: '30px 38px',
          boxShadow: '0 1px 2px rgb(0 10 20 / .04), 0 18px 40px -18px rgb(0 10 20 / .22)',
        }}>
          <MagnifierIcon color={theme.muted} />
          <span style={{
            fontSize: 56, fontWeight: 700, color: theme[q.tint] ?? theme.ink,
            letterSpacing: '-0.02em', opacity: swap, whiteSpace: 'nowrap',
          }}>{q.text}</span>
          <span style={{
            marginLeft: 'auto', width: 4, height: 54, background: theme.accent,
            opacity: Math.round(t / 8) % 2 ? 0.15 : 0.9,
          }} />
        </div>

        {/* 갈아 끼워지는 것을 점으로만 알린다 — 글자를 더 얹으면 자막과 겹친다 */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 44 }}>
          {queries.map((_, i) => (
            <span key={i} style={{
              width: i === idx ? 44 : 14, height: 14, borderRadius: 999,
              background: i === idx ? theme.accent : theme.line,
              transition: 'none',
            }} />
          ))}
        </div>

        {/* 매번 처음부터 다시 찾는다는 느낌 — 빈 결과 줄 */}
        <div style={{ marginTop: 90, display: 'grid', gap: 46 }}>
          {[0.92, 0.68, 0.86, 0.6, 0.78].map((w, i) => (
            <div key={i}>
              <div style={{
                height: 30, width: `${w * 100}%`, borderRadius: 999,
                background: theme.line, opacity: 0.95 - i * 0.13,
              }} />
              <div style={{
                marginTop: 16, height: 18, width: `${w * 62}%`, borderRadius: 999,
                background: theme.line, opacity: 0.6 - i * 0.09,
              }} />
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}

const MagnifierIcon = ({ color }) => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2.2" strokeLinecap="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
)
