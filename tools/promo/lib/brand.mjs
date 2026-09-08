// 브랜드 색을 ★src/app/globals.css 에서 직접 읽는다.★
//
// 왜 이렇게 하나: 영상 도구가 색을 따로 적어 두면 앱이 색을 바꿨을 때 조용히 어긋난다.
// 여기서 읽어 inputProps 로 넘기므로, 도구에는 hex 가 하나도 없다.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO } from './paths.mjs'

export const TOKENS_PATH = join(REPO, 'src/app/globals.css')

/** @theme 의 --color-* 변수를 전부 뽑는다. */
export function readTokens(path = TOKENS_PATH) {
  const css = readFileSync(path, 'utf8')
  const out = {}
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].replace(/\/\*[\s\S]*?\*\//g, '').trim()
  }
  return out
}

/** 영상이 쓰는 색. 없는 토큰이 있으면 ★조용히 넘기지 않고 멈춘다.★ */
export const NEEDED = {
  ink: 'color-ink',
  inkSoft: 'color-ink-soft',
  muted: 'color-muted',
  paper: 'color-paper',
  surface: 'color-surface',
  line: 'color-line',
  accent: 'color-accent',
  accentStrong: 'color-accent-strong',
  accentSoft: 'color-accent-soft',
  sky: 'color-sky',
  sea: 'color-sea',
  peak: 'color-peak',
  flower: 'color-cat-flower',
  foliage: 'color-cat-foliage',
  bird: 'color-cat-bird',
  marine: 'color-cat-marine',
  nature: 'color-cat-nature',
}

export function brandTheme(path = TOKENS_PATH) {
  const tokens = readTokens(path)
  const theme = {}
  const missing = []
  for (const [key, name] of Object.entries(NEEDED)) {
    const v = tokens[name]
    if (!v) { missing.push(name); continue }
    theme[key] = v
  }
  if (missing.length) {
    throw new Error(
      `globals.css 에 다음 색이 없습니다: ${missing.map((m) => '--' + m).join(', ')}\n` +
      `  (${path})  — 앱에서 이름이 바뀌었다면 lib/brand.mjs 의 NEEDED 도 같이 고쳐야 합니다.`)
  }
  // 영상에서 자막·큰 글자에 쓰는 배경. 앱의 종이색과 같은 계열로 둔다.
  theme.bg = tokens['color-line-soft'] ?? theme.paper
  theme.fontSans = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif"
  return theme
}
