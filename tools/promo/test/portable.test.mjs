// Windows 에서도 도는지. ★리눅스에서만 돌아가는 것을 리눅스에서 확인할 수는 없으므로,
// "리눅스 전용 습관이 코드에 들어왔는가" 를 본다.★
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { HERE } from '../lib/paths.mjs'
import { findChrome } from '../lib/chrome.mjs'

const files = []
const SKIP = new Set(['node_modules', 'out', '.cache', 'shots', '.git'])
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { walk(p); continue }
    if (/\.(mjs|jsx)$/.test(name)) files.push(p)
  }
})(HERE)

test('경로를 문자열로 이어 붙이지 않는다 (node:path 를 쓴다)', () => {
  const bad = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    // '…/…' 를 경로로 이어 붙이는 흔한 모양. import 경로·URL·정규식은 뺀다.
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*(import|export)\b/.test(line)) continue
      if (/https?:\/\//.test(line)) continue
      // URL 은 언제나 '/' 로 잇는다 — 파일 경로가 아니므로 여기 대상이 아니다.
      if (/\b(BASE|url|URL|goto|fetch)\b/.test(line)) continue
      if (/\+\s*'\//.test(line) || /'\/'\s*\+/.test(line)) bad.push(`${relative(HERE, f)}: ${line.trim()}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('테스트를 bash 로 돌리지 않는다 (package.json 의 test 가 node --test)', () => {
  const pkg = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'))
  assert.match(pkg.scripts.test, /^node --test/)
  // cmd.exe 는 글롭을 펴 주지 않는다. 그래서 ★따옴표로 감싸★ node 가 직접 펴게 둔다
  // (node 22 의 --test 는 글롭을 스스로 처리한다). 따옴표가 없으면 Windows 에서 빈손이 된다.
  if (pkg.scripts.test.includes('*')) {
    assert.match(pkg.scripts.test, /"[^"]*\*[^"]*"/, '글롭은 따옴표로 감싸야 Windows 에서도 돕니다')
  }
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    assert.ok(!/\b(bash|sh|rm|cp|mv)\b/.test(cmd), `${name} 이 유닉스 명령을 씁니다: ${cmd}`)
  }
})

test('chrome 을 찾는 곳에 Windows 경로가 들어 있다', () => {
  const src = readFileSync(join(HERE, 'lib/chrome.mjs'), 'utf8')
  assert.match(src, /LOCALAPPDATA/)
  assert.match(src, /USERPROFILE/)
  assert.match(src, /chrome-win/)
  assert.match(src, /chrome\.exe/)
  assert.match(src, /PROGRAMFILES/)
})

test('CHROME_EXECUTABLE 이 가리키는 파일이 없으면 조용히 넘어가지 않고 멈춘다', () => {
  const before = process.env.CHROME_EXECUTABLE
  process.env.CHROME_EXECUTABLE = join(tmpdir(), '없는-브라우저-' + Date.now())
  try {
    assert.throws(() => findChrome(), /가리키는 파일이 없습니다/)
  } finally {
    if (before === undefined) delete process.env.CHROME_EXECUTABLE
    else process.env.CHROME_EXECUTABLE = before
  }
})

test('읽을 수 없는 폴더가 섞여 있어도 chrome 찾기가 죽지 않는다', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pw-'))
  const locked = join(tmp, 'chromium-locked')
  mkdirSync(locked)
  const before = { p: process.env.PLAYWRIGHT_BROWSERS_PATH, c: process.env.CHROME_EXECUTABLE }
  delete process.env.CHROME_EXECUTABLE
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(tmp, '아예-없는-폴더')
  try {
    assert.doesNotThrow(() => findChrome())
  } finally {
    if (before.p === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH
    else process.env.PLAYWRIGHT_BROWSERS_PATH = before.p
    if (before.c !== undefined) process.env.CHROME_EXECUTABLE = before.c
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('실행 스크립트에 셔뱅만 있고 실행 권한에 기대지 않는다 (node 로 부른다)', () => {
  const pkg = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'))
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    assert.ok(/^node\b/.test(cmd), `${name} 은 node 로 시작해야 합니다: ${cmd}`)
  }
})
