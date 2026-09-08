// Remotion 묶기·렌더. 실행별 폴더 안에 임시 publicDir 을 만들어 쓴다.
import { mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { bundle } from '@remotion/bundler'
import { selectComposition, renderMedia, renderStill } from '@remotion/renderer'
import { HERE, SHOTS } from './paths.mjs'

const FONT_WEIGHTS = ['Regular', 'SemiBold', 'Bold', 'ExtraBold']

/** 글꼴을 publicDir 로 옮긴다. 없으면 멈추지 않고 알린 뒤 대체 글꼴로 간다. */
export function copyFonts(publicDir, log = () => {}) {
  const from = join(HERE, 'node_modules/pretendard/dist/web/static/woff2')
  const to = join(publicDir, 'fonts')
  mkdirSync(to, { recursive: true })
  let copied = 0
  for (const w of FONT_WEIGHTS) {
    const src = join(from, `Pretendard-${w}.woff2`)
    if (!existsSync(src)) continue
    copyFileSync(src, join(to, `Pretendard-${w}.woff2`))
    copied++
  }
  if (copied === 0) {
    log('      ※ Pretendard 를 찾지 못했습니다 (npm install). 대체 글꼴로 그립니다 — 글자 폭이 달라집니다.')
  }
  return copied
}

/** 제품 화면 캡처를 publicDir 로 옮긴다. */
export function copyShots(publicDir, names, shotsDir = SHOTS) {
  const to = join(publicDir, 'shots')
  mkdirSync(to, { recursive: true })
  const copied = []
  for (const name of names) {
    const src = join(shotsDir, name)
    if (!existsSync(src)) continue
    copyFileSync(src, join(to, name))
    copied.push(name)
  }
  return copied
}

/**
 * 한 편을 렌더한다.
 * @param opts.stills 스틸을 뽑을 프레임 목록 [{name, frame}]
 */
export async function renderShort({
  runDir, timeline, outputName, browserExecutable, safeArea = false,
  scale = 1, stills = [], log = () => {},
}) {
  const publicDir = join(runDir, '.public')
  mkdirSync(join(publicDir, 'audio'), { recursive: true })
  copyFonts(publicDir, log)
  copyShots(publicDir, timeline.scenes.flatMap((s) => [s.screen?.shot, ...(s.screen?.shots ?? [])]).filter(Boolean))
  // 장면별 wav 를 publicDir 로 (staticFile 은 묶을 때의 publicDir 에서 찾는다)
  for (const s of timeline.scenes) {
    if (!s.audio) continue
    copyFileSync(join(runDir, s.audio), join(publicDir, s.audio))
  }

  const serveUrl = await bundle({ entryPoint: join(HERE, 'remotion/index.jsx'), publicDir })
  const inputProps = { timeline, safeArea }
  const composition = await selectComposition({ serveUrl, id: 'short', inputProps, browserExecutable })

  const output = join(runDir, outputName)
  let shown = -1
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: output,
    inputProps, browserExecutable, overwrite: false, scale,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100)
      if (pct >= shown + 20) { shown = pct; log(`      ${pct}%`) }
    },
  })

  const stillPaths = []
  if (stills.length) {
    const dir = join(runDir, 'stills')
    mkdirSync(dir, { recursive: true })
    for (const s of stills) {
      const p = join(dir, `${s.name}.png`)
      const want = s.safeArea ?? safeArea
      // ★ selectComposition 이 이미 props 를 굳혀 놓는다 — inputProps 만 바꿔 넘기면
      //   safeArea 가 반영되지 않아 오버레이 없는 그림이 나온다 (실제로 그렇게 나왔다).
      //   composition.props 를 같이 갈아 끼워야 한다.
      await renderStill({
        composition: { ...composition, props: { ...composition.props, timeline, safeArea: want } },
        serveUrl, output: p, frame: s.frame,
        inputProps: { timeline, safeArea: want },
        browserExecutable, overwrite: true, scale,
      })
      stillPaths.push(p)
    }
  }

  rmSync(publicDir, { recursive: true, force: true })
  return { output, stills: stillPaths }
}
