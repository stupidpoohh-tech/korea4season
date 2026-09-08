// Pretendard 를 렌더 브라우저에 심는다.
// 앱(index.html)은 CDN 으로 받지만 렌더는 인터넷 없이도 돌아야 하므로
// npm 패키지(pretendard)의 woff2 를 publicDir 로 복사해 여기서 @font-face 로 건다.
import { continueRender, delayRender, staticFile } from 'remotion'

const WEIGHTS = [
  ['Regular', 400],
  ['SemiBold', 600],
  ['Bold', 700],
  ['ExtraBold', 800],
]

const handle = delayRender('Pretendard 글꼴을 심는 중')

const faces = WEIGHTS.map(([name, weight]) => new FontFace(
  'Pretendard',
  `url(${staticFile(`fonts/Pretendard-${name}.woff2`)}) format('woff2')`,
  { weight: String(weight), style: 'normal', display: 'block' },
))

Promise.all(faces.map((f) => f.load().then((loaded) => document.fonts.add(loaded))))
  .then(() => continueRender(handle))
  .catch((e) => {
    // 글꼴을 못 심어도 렌더는 계속한다 — 대체 글꼴로 그려지고, 화면에서 바로 보인다.
    console.warn('Pretendard 를 심지 못했습니다:', e)
    continueRender(handle)
  })
