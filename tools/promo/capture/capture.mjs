#!/usr/bin/env node
// 제품 화면 캡처 — ★실제 MVP 를 그대로 찍는다.★
//
// 왜 이렇게 하나: 홍보 영상에 그린 화면과 실제 앱이 다르면 그건 거짓말이 된다.
// 그래서 목업을 그리지 않고 프로덕션 빌드를 띄워 진짜 화면을 찍는다.
//
// 브라우저를 다루는 코드는 ★이 저장소가 이미 가진 검증 도구★ 를 그대로 쓴다
// (scripts/verify/lib/cdp.mjs). 영상용으로 따로 쓰면 검증과 다른 조건 —
// 기기 크기 · 대기 방식 — 에서 찍히게 되고, 검증에서 본 화면과 영상 속 화면이
// 어긋나도 아무도 모른다.
//
// 준비
//   npm run build && npx next start -p 3031        (저장소 뿌리)
//   node tools/promo/capture/capture.mjs
//
// 결과: capture/shots/*.png (390×844 CSS 를 2배로 찍어 780×1688)
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHOTS, REPO } from '../lib/paths.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

const { attach, ensureBrowser, ensureServer, MOBILE, DESKTOP } =
  await import(join(REPO, 'scripts/verify/lib/cdp.mjs'))

async function main() {
  const plan = JSON.parse(readFileSync(join(HERE, 'shots.json'), 'utf8'))
  const viewport = plan.viewport === 'desktop' ? DESKTOP : MOBILE

  await ensureServer()   // 안 떠 있으면 어디에 무엇을 띄우라고 알려 준다
  await ensureBrowser()
  const page = await attach()
  mkdirSync(SHOTS, { recursive: true })

  const taken = []
  const skipped = []
  try {
    await page.viewport(viewport)
    for (const s of plan.shots) {
      try {
        await page.openMap(s.date ? `?date=${s.date}` : '')
        const ok = await page.chooseLayer(s.layer)
        if (!ok) throw new Error(`카테고리 '${s.layer}' 를 고르지 못했습니다`)
        // 스프라이트가 pop-in 하는 동안 기다린다 — 덜 뜬 화면을 찍으면 지도가 비어 보인다
        await new Promise((r) => setTimeout(r, 1600))
        const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
        const file = join(SHOTS, `${s.name}.png`)
        writeFileSync(file, Buffer.from(data, 'base64'))
        console.log(`  ✔ ${s.name}.png  ${s.layer} ${s.date || '(오늘)'} — ${s.왜}`)
        taken.push({ ...s, file })
      } catch (e) {
        const why = String(e.message).split('\n')[0].slice(0, 140)
        console.log(`  – ${s.name}.png 건너뜀: ${why}`)
        skipped.push({ name: s.name, why })
      }
    }
  } finally {
    page.close()
  }

  writeFileSync(join(SHOTS, 'README.txt'),
`제품 화면 캡처 — 실제 MVP 를 그대로 찍은 것
찍은 때  ${new Date().toISOString()}
크기     ${viewport.width}×${viewport.height} CSS × ${viewport.deviceScaleFactor}배
방법     이 저장소의 검증 도구(scripts/verify/lib/cdp.mjs)로 프로덕션 빌드를 열어 찍음
         날짜는 ?date= · 카테고리는 상단 알약(보는 자연) — 앱이 실제로 하는 그대로

찍은 것 ${taken.length}장
${taken.map((t) => `  ${t.name}.png  ${t.layer} ${t.date || '(오늘)'} — ${t.왜}`).join('\n')}
${skipped.length ? `\n못 찍은 것 ${skipped.length}장\n${skipped.map((s) => `  ${s.name} — ${s.why}`).join('\n')}` : ''}

브라우저 콘솔 오류 ${page.errors.length ? '\n' + page.errors.slice(0, 8).map((e) => '  ' + e).join('\n') : '없음'}
`)
  console.log(`\n찍은 것 ${taken.length}장${skipped.length ? ` · 못 찍은 것 ${skipped.length}장` : ''}`)
  console.log(`완료 — ${SHOTS}`)
}

main().catch((e) => { console.error('\n멈췄습니다: ' + e.message); process.exit(1) })
