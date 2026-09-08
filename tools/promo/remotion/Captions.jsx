import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { CAPTION_BAND, W } from './layout.mjs'

/**
 * 자막 — 모바일에서 크게, ★최대 두 줄★, 핵심 낱말 강조.
 * 두 줄을 넘기지 않는 것은 글자 수(ttsPrep MAX_CHUNK=18)로 이미 정해지고,
 * 여기서는 넘칠 때 글자를 줄여 그리기만 한다 (잘라내지 않는다 — 말은 들리는데
 * 자막만 사라지면 그게 더 나쁘다).
 */
const BASE_SIZE = 68
const MAX_LINES = 2

function sizeFor(text) {
  // 18자 기준. 길어지면 조금씩 줄여 두 줄 안에 들어오게 한다.
  const n = text.replace(/\s/g, '').length
  if (n <= 14) return BASE_SIZE
  if (n <= 18) return BASE_SIZE - 6
  if (n <= 24) return BASE_SIZE - 14
  return BASE_SIZE - 20
}

/** 강조 낱말을 잘라 <span> 으로 나눈다. 겹치는 낱말은 긴 것을 먼저 본다. */
export function splitEmphasis(text, emphasis) {
  const words = [...(emphasis || [])].filter(Boolean).sort((a, b) => b.length - a.length)
  let parts = [{ text, strong: false }]
  for (const word of words) {
    const next = []
    for (const part of parts) {
      if (part.strong || !part.text.includes(word)) { next.push(part); continue }
      const pieces = part.text.split(word)
      pieces.forEach((piece, i) => {
        if (piece) next.push({ text: piece, strong: false })
        if (i < pieces.length - 1) next.push({ text: word, strong: true })
      })
    }
    parts = next
  }
  return parts.filter((p) => p.text)
}

export const Captions = ({ captions, emphasis, theme, tone }) => {
  const frame = useCurrentFrame()
  const active = captions.find((c) => frame >= c.fromFrame && frame < c.toFrame)
  if (!active) return null

  // 뜨는 순간에만 살짝 올라온다 — 매번 튀면 눈이 피곤하다.
  const age = frame - active.fromFrame
  const rise = interpolate(age, [0, 5], [16, 0], { extrapolateRight: 'clamp' })
  const fade = interpolate(age, [0, 4], [0, 1], { extrapolateRight: 'clamp' })

  const parts = splitEmphasis(active.text, emphasis)
  const size = sizeFor(active.text)

  // 어두운 장면에서는 알약을 뒤집는다 — 잉크색 알약이 잉크색 바탕에 놓이면
  // 글자만 떠 있고 알약이 안 보인다 (로고 장면에서 실제로 그랬다).
  const onDark = tone === 'onDark'
  const pillBg = onDark ? theme.paper : theme.ink
  const pillFg = onDark ? theme.ink : theme.paper
  const strongFg = onDark ? theme.accentStrong : theme.accent

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          bottom: CAPTION_BAND.bottom,
          left: CAPTION_BAND.left,
          width: W - CAPTION_BAND.left - CAPTION_BAND.right,
          transform: `translateY(${rise}px)`,
          opacity: fade,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: pillBg,
            color: pillFg,
            borderRadius: 28,
            padding: '22px 34px',
            fontSize: size,
            lineHeight: 1.32,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            maxHeight: size * 1.32 * MAX_LINES + 44,
            wordBreak: 'keep-all',
            boxShadow: '0 18px 40px -18px rgba(0,0,0,.5)',
          }}
        >
          {parts.map((p, i) => (
            <span key={i} style={p.strong ? { color: strongFg } : undefined}>{p.text}</span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}
