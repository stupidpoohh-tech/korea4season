import React from 'react'
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion'
import { Captions } from './Captions.jsx'
import { SafeArea } from './SafeArea.jsx'
import { Watermark } from './Watermark.jsx'
import { Search } from './scenes/Search.jsx'
import { Phone } from './scenes/Phone.jsx'
import { Logo } from './scenes/Logo.jsx'
import './fonts.mjs'

const BY_KIND = { search: Search, phone: Phone, logo: Logo }

export const Short = ({ timeline, safeArea = false }) => {
  const t = timeline || {}
  const scenes = t.scenes || []
  const theme = t.theme || {}
  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.fontSans }}>
      {scenes.map((scene) => {
        const Screen = BY_KIND[scene.screen?.kind]
        if (!Screen) throw new Error(`모르는 화면 종류입니다: ${scene.screen?.kind}`)
        return (
          <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationInFrames}>
            {/*
              ★ 음성·자막·화면이 같은 기준(audioFromFrame)에서 시작한다.
              Audio 를 Sequence 밖에 두면 장면이 시작하자마자 말이 나오는데 자막은
              앞 여백만큼 늦게 떠서 어긋난다 — 그래서 여기서도 같은 값으로 감싼다.
            */}
            {scene.audio ? (
              <Sequence from={scene.audioFromFrame} name={`${scene.id} 음성`}>
                <Audio src={staticFile(scene.audio)} />
              </Sequence>
            ) : null}
            <Screen
              screen={scene.screen}
              anchors={scene.anchors || {}}
              fromFrame={scene.audioFromFrame}
              durationInFrames={scene.durationInFrames}
              theme={theme}
              meta={t}
            />
            <Captions
              captions={scene.captions || []}
              emphasis={scene.emphasis || []}
              theme={theme}
              tone={scene.screen?.captionTone}
            />
          </Sequence>
        )
      })}
      {/* ★출하물이 아닌 것에는 언제나 표가 붙는다.★ */}
      {t.watermark ? <Watermark theme={theme} label={t.watermark} /> : null}
      {safeArea ? <SafeArea theme={theme} /> : null}
    </AbsoluteFill>
  )
}

export default Short
