// 실행별 결과 폴더.
//
// ★ 강의용 Pilot 은 돌릴 때마다 결과 폴더를 먼저 rmSync 로 지웠다. 그 동작은 가져오지
//   않았다 — 어제 만든 미리보기와 오늘 것을 나란히 놓고 비교할 수 없으면 카피를 못 고른다.
//   여기서는 실행마다 새 폴더를 만들고, 이미 있는 폴더에는 ★쓰지 않고 멈춘다★.
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { OUT } from './paths.mjs'

/** 2026-09-07T12:34:56.789Z → 20260907-123456 (파일 이름에 쓸 수 있는 모양) */
export function stamp(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
}

/**
 * out/<mode>/<시각>-<slug>/ 을 새로 만든다.
 * @throws 같은 이름이 이미 있으면 (덮어쓰지 않는다)
 */
export function createRunDir(mode, slug, { at = new Date() } = {}) {
  const modeDir = join(OUT, mode)
  const name = `${stamp(at)}-${slug}`
  const dir = join(modeDir, name)
  if (existsSync(dir)) {
    throw new Error(`결과 폴더가 이미 있습니다: ${dir}\n` +
      '지우지 않습니다 — 1초 뒤에 다시 부르거나 폴더 이름을 바꾸십시오.')
  }
  mkdirSync(dir, { recursive: true })
  // 최신 실행이 어느 것인지만 적어 둔다 (심볼릭 링크는 Windows 에서 권한이 필요하다).
  writeFileSync(join(modeDir, 'LATEST.txt'), name + '\n')
  return { dir, name, modeDir }
}

/** 지금까지의 실행 목록 (새것부터). */
export function listRuns(mode) {
  const modeDir = join(OUT, mode)
  if (!existsSync(modeDir)) return []
  return readdirSync(modeDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse()
}
