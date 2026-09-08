import React from 'react'
import { AbsoluteFill } from 'remotion'
import { PLATFORM, SAFE, CAPTION_BAND, W, H } from './layout.mjs'

/**
 * 검수용 오버레이 — ★출하물에는 넣지 않는다.★
 * 숏츠 플랫폼이 아래(설명·계정)와 오른쪽(버튼 줄)에 자기 UI 를 얹으므로,
 * 우리 글자가 거기 걸치는지 눈으로 보려고 그린다.
 */
export const SafeArea = ({ theme }) => {
  const veil = 'rgba(0, 180, 108, .20)'   // --color-accent 계열 (실제 색은 theme 에서 온다)
  const label = { position: 'absolute', color: theme.paper, fontSize: 26, fontWeight: 700, letterSpacing: '.04em' }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, border: `4px dashed ${theme.accent}`, opacity: 0.5 }} />
      {/* 플랫폼 UI 가 덮는 곳 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: PLATFORM.top, background: veil }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: W, height: PLATFORM.bottom, background: veil }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: PLATFORM.right, height: H, background: veil }} />
      {/* 안전 영역 테두리 */}
      <div style={{
        position: 'absolute', top: SAFE.top, left: SAFE.left,
        width: SAFE.right - SAFE.left, height: SAFE.bottom - SAFE.top,
        border: `3px solid ${theme.accent}`, borderRadius: 12,
      }} />
      {/* 자막 띠 */}
      <div style={{
        position: 'absolute', bottom: CAPTION_BAND.bottom, left: CAPTION_BAND.left,
        width: W - CAPTION_BAND.left - CAPTION_BAND.right, height: 4, background: theme.accent, opacity: 0.8,
      }} />
      <div style={{ ...label, top: PLATFORM.top - 40, left: 28 }}>▲ 상단 {PLATFORM.top}px — 플랫폼 UI</div>
      <div style={{ ...label, bottom: PLATFORM.bottom + 8, left: 28 }}>▼ 하단 {PLATFORM.bottom}px — 설명·계정</div>
      <div style={{ ...label, top: H / 2, right: PLATFORM.right + 12, textAlign: 'right' }}>
        우측 {PLATFORM.right}px — 버튼 줄 ▶
      </div>
      <div style={{ ...label, top: SAFE.top + 10, left: SAFE.left + 12, color: theme.accent }}>
        SAFE AREA — 검수용, 출하물 아님
      </div>
    </AbsoluteFill>
  )
}
