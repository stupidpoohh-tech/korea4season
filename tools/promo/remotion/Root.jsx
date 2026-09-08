import React from 'react'
import { Composition } from 'remotion'
import { Short } from './Short.jsx'

// 크기·프레임수는 전부 timeline 이 정한다 (lib/timeline.mjs).
// 여기 기본값은 Remotion Studio 로 열었을 때만 쓰인다.
const FALLBACK = { fps: 30, width: 1080, height: 1920, totalFrames: 300, scenes: [] }

export const Root = () => (
  <Composition
    id="short"
    component={Short}
    durationInFrames={FALLBACK.totalFrames}
    fps={FALLBACK.fps}
    width={FALLBACK.width}
    height={FALLBACK.height}
    defaultProps={{ timeline: FALLBACK, safeArea: false }}
    calculateMetadata={({ props }) => {
      const t = props.timeline || FALLBACK
      return {
        durationInFrames: Math.max(1, t.totalFrames),
        fps: t.fps,
        width: t.width,
        height: t.height,
      }
    }}
  />
)

export default Root
