import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion'
import { SAFE } from '../layout.mjs'

/**
 * 여는 장면 — "봄엔 벚꽃, 가을엔 단풍을 따로 검색한다".
 *
 * ★ 특정 포털의 화면을 흉내 내지 않는다. ★
 *   실재하는 회사의 UI·로고를 그리면 그 회사가 만든 것처럼 보인다.
 *   검색창은 어디에나 있는 모양이라 브랜드 없이도 "검색하는 느낌" 은 그대로 전해진다.
 *
 * 움직임: 글자가 ★한 자씩 쳐진다★ → 결과 줄이 올라온다 → 지웠다가 다시 친다.
 *   갈아 끼우기만 하면 "검색을 반복한다" 가 아니라 "글자가 바뀐다" 로 보인다.
 */
export const Search = ({ screen, theme, fromFrame, durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = Math.max(0, frame - fromFrame)
  const queries = screen.queries || []

  // 한 바퀴 = 치고(TYPE) · 결과 보고(HOLD) · 지우고(ERASE)
  const cycle = Math.max(24, screen.cycleFrames ?? Math.floor((durationInFrames - fromFrame) / queries.length))
  const idx = Math.min(queries.length - 1, Math.floor(t / cycle))
  const local = t - idx * cycle
  const q = queries[idx] ?? { text: '', tint: 'muted' }

  const TYPE = Math.round(cycle * 0.42)
  const ERASE = Math.round(cycle * 0.16)
  const HOLD_END = cycle - ERASE

  const typed = local < TYPE
    ? Math.round(interpolate(local, [0, TYPE], [0, q.text.length], { extrapolateRight: 'clamp' }))
    : local < HOLD_END
      ? q.text.length
      : Math.round(interpolate(local, [HOLD_END, cycle], [q.text.length, 0], { extrapolateRight: 'clamp' }))
  const shown = q.text.slice(0, Math.max(0, typed))
  const isLast = idx === queries.length - 1
  const text = isLast && local >= HOLD_END ? q.text : shown  // 마지막 것은 지우지 않는다

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 })
  const caret = Math.floor(frame / 7) % 2 === 0
  const boxW = SAFE.right - SAFE.left
  const top = SAFE.top + 300

  // 결과 줄은 다 친 뒤에 하나씩 올라온다
  const resultsAt = TYPE + 4

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <div style={{
        position: 'absolute', top, left: SAFE.left, width: boxW,
        opacity: enter, transform: `translateY(${(1 - enter) * 26}px)`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 22,
          background: theme.paper, border: `3px solid ${theme.line}`,
          borderRadius: 999, padding: '30px 38px', minHeight: 118,
          boxShadow: '0 1px 2px rgb(0 10 20 / .04), 0 18px 40px -18px rgb(0 10 20 / .22)',
        }}>
          <MagnifierIcon color={theme.muted} />
          <span style={{
            fontSize: 56, fontWeight: 700, color: theme[q.tint] ?? theme.ink,
            letterSpacing: '-0.02em', whiteSpace: 'nowrap',
          }}>{text}</span>
          <span style={{
            width: 4, height: 54, background: theme.accent,
            opacity: caret ? 0.9 : 0.12, marginLeft: 4,
          }} />
        </div>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 40 }}>
          {queries.map((_, i) => (
            <span key={i} style={{
              width: i === idx ? 46 : 14, height: 14, borderRadius: 999,
              background: i === idx ? theme.accent : theme.line,
            }} />
          ))}
        </div>

        {/* 매번 처음부터 다시 찾는다는 느낌 — 결과 줄이 하나씩 올라왔다 사라진다 */}
        <div style={{ marginTop: 84, display: 'grid', gap: 44 }}>
          {[0.92, 0.68, 0.86, 0.6, 0.78].map((w, i) => {
            const a = local - resultsAt - i * 4
            const up = interpolate(a, [0, 10], [26, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
            const op = interpolate(a, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const out = interpolate(local, [HOLD_END, HOLD_END + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return (
              <div key={i} style={{ transform: `translateY(${up}px)`, opacity: op * (isLast ? 1 : out) }}>
                <div style={{
                  height: 30, width: `${w * 100}%`, borderRadius: 999,
                  background: theme.line, opacity: 0.95 - i * 0.13,
                }} />
                <div style={{
                  marginTop: 16, height: 18, width: `${w * 62}%`, borderRadius: 999,
                  background: theme.line, opacity: 0.6 - i * 0.09,
                }} />
              </div>
            )
          })}
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
