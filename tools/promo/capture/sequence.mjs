#!/usr/bin/env node
// 날짜를 촘촘히 밟으며 연속 촬영 — ★지도가 실제로 흐르는 것★ 을 찍는다.
//
// 왜 필요한가: 정지 캡처 넉 장을 크로스페이드로 넘기면 "계절이 바뀐다" 가 아니라
// "사진이 갈린다" 로 보인다. 앱에는 1년 재생이 실제로 있고(초당 52일), 날짜를 한 칸씩
// 밟으면 지도가 조금씩 달라진다. 그 중간 상태를 전부 찍어 두면 영상에서 진짜로 흐른다.
//
// 페이지를 다시 열지 않고 슬라이더만 밟는다 — 날짜마다 새로 열면 한 장에 3~4초가 들어
// 1년이 10분을 넘는다. 밟는 방식은 이 저장소의 검증 도구가 쓰는 것과 같다(stepTo).
//
//   node capture/sequence.mjs                    기본 (산 · 1년 · 2일 간격)
//   node capture/sequence.mjs 바다 12            바다 · 12일 간격
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { SHOTS, REPO } from '../lib/paths.mjs'

const { attach, ensureBrowser, ensureServer, MOBILE } =
  await import(join(REPO, 'scripts/verify/lib/cdp.mjs'))

const LAYER = process.argv[2] ?? '산'
const STEP = Number(process.argv[3] ?? 2)      // 며칠마다 한 장
const NAME = { 산: 'year-mountain', 바다: 'year-sea', 하늘: 'year-sky' }[LAYER] ?? `year-${LAYER}`

async function main() {
  await ensureServer()
  await ensureBrowser()
  const page = await attach()
  const dir = join(SHOTS, NAME)
  // ★ 연속 촬영본만 통째로 새로 만든다 (한 장씩 남으면 옛 프레임이 섞인다).
  //   다른 캡처(capture.mjs 가 찍은 것)는 건드리지 않는다.
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  try {
    await page.viewport(MOBILE)
    await page.openMap('?date=2026-01-01')
    const ok = await page.chooseLayer(LAYER)
    if (!ok) throw new Error(`카테고리 '${LAYER}' 를 고르지 못했습니다`)

    const { max } = await page.slider()
    const frames = []
    for (let day = 0; day <= max; day += STEP) {
      await page.stepTo(day)
      // 스프라이트가 자리를 잡을 짧은 틈 — 길게 주면 1년에 몇 분씩 늘어난다
      await new Promise((r) => setTimeout(r, 90))
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 84 })
      const file = join(dir, `${String(frames.length).padStart(4, '0')}.jpg`)
      writeFileSync(file, Buffer.from(data, 'base64'))
      frames.push(file)
      if (frames.length % 20 === 0) process.stdout.write(`  ${frames.length}장…\n`)
    }

    writeFileSync(join(dir, 'meta.json'), JSON.stringify({
      layer: LAYER, stepDays: STEP, frames: frames.length, sliderMax: max,
      찍은때: new Date().toISOString(),
      왜: '정지 캡처를 크로스페이드하면 사진이 갈리는 것으로 보인다. 중간 상태를 전부 찍어 실제로 흐르게 한다.',
    }, null, 2))
    console.log(`\n${NAME} — ${frames.length}장 (${STEP}일 간격, 슬라이더 0~${max})`)
    console.log(`완료 — ${dir}`)
  } finally {
    page.close()
  }
}

main().catch((e) => { console.error('\n멈췄습니다: ' + e.message); process.exit(1) })
