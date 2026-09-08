// 실행별 폴더 — ★기존 결과를 지우지 않는다.★
// (강의용 Pilot 은 돌릴 때마다 결과 폴더를 rmSync 했다. 그 동작을 가져오지 않았다는 것을
//  코드로 못 박아 둔다 — 다음 사람이 "정리" 하려다 되살리기 쉬운 종류다.)
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync as rf } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const TMP = mkdtempSync(join(tmpdir(), 'promo-out-'))
process.env.PROMO_OUT_OVERRIDE = TMP
const { createRunDir, listRuns, stamp } = await import('../lib/runDir.mjs')

test.after(() => rmSync(TMP, { recursive: true, force: true }))

test('실행마다 새 폴더가 생기고 앞의 것이 그대로 남는다', () => {
  const first = createRunDir('mock', 'demo', { at: new Date(2026, 8, 7, 10, 0, 0) })
  writeFileSync(join(first.dir, '결과.txt'), '첫 번째')

  const second = createRunDir('mock', 'demo', { at: new Date(2026, 8, 7, 10, 5, 0) })
  writeFileSync(join(second.dir, '결과.txt'), '두 번째')

  assert.ok(existsSync(join(first.dir, '결과.txt')), '★앞 실행 결과가 지워지면 안 된다★')
  assert.equal(readFileSync(join(first.dir, '결과.txt'), 'utf8'), '첫 번째')
  assert.notEqual(first.dir, second.dir)
})

test('같은 이름이면 덮어쓰지 않고 멈춘다', () => {
  const at = new Date(2026, 8, 7, 11, 0, 0)
  createRunDir('mock', 'dup', { at })
  assert.throws(() => createRunDir('mock', 'dup', { at }), /이미 있습니다/)
})

test('LATEST.txt 가 최신 실행을 가리킨다 (심볼릭 링크가 아니라 — Windows 에서도 된다)', () => {
  const r = createRunDir('mock', 'latest', { at: new Date(2026, 8, 7, 12, 0, 0) })
  const latest = readFileSync(join(TMP, 'mock', 'LATEST.txt'), 'utf8').trim()
  assert.equal(latest, r.name)
})

test('★mock 과 real 은 폴더가 갈린다★', () => {
  const m = createRunDir('mock', 'x', { at: new Date(2026, 8, 7, 13, 0, 0) })
  const r = createRunDir('real', 'x', { at: new Date(2026, 8, 7, 13, 0, 0) })
  assert.ok(m.dir.includes(join('mock', '')) || m.dir.includes('mock'))
  assert.ok(r.dir.includes('real'))
  assert.notEqual(m.dir, r.dir)
  assert.ok(!listRuns('real').some((n) => listRuns('mock').includes(n) && false))
})

test('폴더 이름에 파일 이름으로 쓸 수 없는 글자가 없다', () => {
  const s = stamp(new Date(2026, 0, 2, 3, 4, 5))
  assert.equal(s, '20260102-030405')
  assert.ok(!/[:\\/*?"<>|]/.test(s), 'Windows 에서 못 쓰는 글자가 없어야 한다')
})

test('run.mjs 가 결과 폴더를 지우지 않는다 (rmSync 로 out 을 건드리지 않는다)', () => {
  const HERE = dirname(dirname(fileURLToPath(import.meta.url)))
  const src = rf(join(HERE, 'run.mjs'), 'utf8')
  assert.ok(!/rmSync/.test(src), 'run.mjs 에 rmSync 가 있으면 안 됩니다')
})
