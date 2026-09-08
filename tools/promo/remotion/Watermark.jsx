import React from 'react'
import { AbsoluteFill } from 'remotion'

/**
 * mock(가짜 TTS) 로 만든 것에만 붙는다.
 * ★ 무음 미리보기가 진짜 결과로 오해받지 않게 하는 것이 유일한 목적이다.
 */
export const Watermark = ({ theme, label }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div style={{
      position: 'absolute', top: 46, left: '50%', transform: 'translateX(-50%)',
      background: theme.accent, color: theme.paper,
      padding: '12px 26px', borderRadius: 999,
      fontSize: 30, fontWeight: 800, letterSpacing: '.12em',
    }}>{label}</div>
  </AbsoluteFill>
)
