// 렌더에 쓸 크로미움을 찾는다. Playwright 가 이미 받아 둔 것을 그대로 쓴다
// (앱 스모크 테스트가 쓰는 그 브라우저다 — 따로 내려받지 않는다).
//
// ★ Windows 도 찾는다: Playwright 는 %USERPROFILE%\AppData\Local\ms-playwright 에 받고,
//   설치된 Chrome 은 Program Files 아래에 있다. 못 찾으면 null 을 돌려주고
//   Remotion 이 스스로 내려받게 둔다.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { env } from './env.mjs'

const isWindows = process.platform === 'win32'

function playwrightRoots() {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const local = process.env.LOCALAPPDATA || (home ? join(home, 'AppData', 'Local') : '')
  return [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/opt/pw-browsers',
    home && join(home, '.cache', 'ms-playwright'),
    home && join(home, 'Library', 'Caches', 'ms-playwright'),
    local && join(local, 'ms-playwright'),
  ].filter(Boolean)
}

// headless_shell 을 먼저 — 화면 없는 기계에서 가장 잘 돈다.
const SUFFIXES = [
  join('chrome-win', 'headless_shell.exe'),
  join('chrome-win', 'chrome.exe'),
  join('chrome-linux', 'headless_shell'),
  join('chrome-linux', 'chrome'),
  join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
]

/** Playwright 가 없을 때 기대 볼 만한, 사람이 설치한 브라우저들. */
function installedBrowsers() {
  const pf = process.env.PROGRAMFILES || 'C:\\Program Files'
  const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)'
  const local = process.env.LOCALAPPDATA || ''
  if (isWindows) {
    return [
      join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      local && join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ].filter(Boolean)
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]
  }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
}

/**
 * @returns {string|null} 실행 파일 경로. 못 찾으면 null.
 * @throws CHROME_EXECUTABLE 을 지정했는데 그 파일이 없을 때 (조용히 넘어가면 안 된다)
 */
export function findChrome() {
  const fromEnv = env('CHROME_EXECUTABLE')
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      throw new Error(`CHROME_EXECUTABLE 이 가리키는 파일이 없습니다: ${fromEnv}`)
    }
    return fromEnv
  }
  for (const root of playwrightRoots()) {
    let dirs
    try { dirs = readdirSync(root) } catch { continue }
    const ordered = dirs
      .filter((d) => d.startsWith('chromium'))
      .sort((a, b) => (b.includes('headless') ? 1 : 0) - (a.includes('headless') ? 1 : 0))
    for (const dir of ordered) {
      for (const suffix of SUFFIXES) {
        const p = join(root, dir, suffix)
        if (existsSync(p)) return p
      }
    }
  }
  for (const p of installedBrowsers()) if (existsSync(p)) return p
  return null
}
