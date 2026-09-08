#!/usr/bin/env node
// 「지금日지도」 홍보 영상
//
//   node run.mjs --mock                가짜 TTS(무음)로 배관·화면 확인 → PREVIEW mp4
//   node run.mjs --preview             ★이미 만들어 둔 소리·시각★ 으로 저해상도·스틸 검수
//   node run.mjs --real                진짜 Typecast + 최종 렌더  (0-A 에서는 부르지 않는다)
//   ... --safe                         검수용 safe-area 오버레이를 영상에 얹는다
//   ... --check                        TTS·렌더 없이 대본과 준비 상태만 본다
//   ... --plain                        ★자막·표·소리 없이★ 화면만 (직접 편집할 때)
//   ... --clips                        장면마다 mp4 를 따로 (--plain 을 켠다)
//
// 하는 일: 대본 → TTS 전처리 → (캐시를 거쳐) Timestamp TTS → 시각 검사
//          → 소리 길이로 장면 시간 계산 → 자막 → Remotion 렌더 → 1080×1920 mp4
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'

import { HERE } from './lib/paths.mjs'
import { redact, voiceConfig, hasKey, keySource } from './lib/env.mjs'
import { loadScript, missingShots, applyShotAvailability, resolveSequences } from './lib/script.mjs'
import { brandTheme, TOKENS_PATH } from './lib/brand.mjs'
import { buildScenes } from './lib/build.mjs'
import { buildTimeline, checkTimeline } from './lib/timeline.mjs'
import { mockSpeakWithTimestamps } from './lib/mockTts.mjs'
import { speakWithTimestamps } from './lib/typecast.mjs'
import { createRunDir, listRuns } from './lib/runDir.mjs'
import { findChrome } from './lib/chrome.mjs'
import { renderShort, releaseBundle } from './lib/render.mjs'
import { stats as cacheStats } from './lib/ttsCache.mjs'

const say = (...m) => console.log(...m)
const rel = (p) => relative(HERE, p) || p

const MODES = {
  mock: {
    engine: 'mock',
    label: '가짜 TTS (무음)',
    prefix: 'PREVIEW-무음-',
    scale: 1,
    // ★ 길이는 추정이다. 실제 음성으로 확인한 값이 아니다.
    estimated: true,
  },
  preview: {
    engine: 'cache',
    label: '이미 만들어 둔 소리·시각 (새로 부르지 않음)',
    prefix: 'PREVIEW-검수-',
    scale: 0.5, // 저해상도 — 빨리 보려는 것
    estimated: null, // 캐시가 무엇이었는지에 따라 결정된다
  },
  real: {
    engine: 'typecast',
    label: 'Typecast Timestamp TTS',
    prefix: '',
    scale: 1,
    estimated: false,
  },
}

function parseArgs(argv) {
  const has = (f) => argv.includes(f)
  const mode = has('--real') ? 'real' : has('--preview') ? 'preview' : 'mock'
  return {
    mode, safe: has('--safe'), check: has('--check'),
    plain: has('--plain') || has('--clips'),
    clips: has('--clips'),
    // ★ 유료 호출은 손이 미끄러져 나가지 않는다. --real 만으로는 부족하고
    //   --돈나감 (또는 --spend) 을 같이 적어야 Typecast 를 부른다.
    //   이 작업 환경에는 키가 이미 들어와 있어서, 이 빗장이 없으면 오타 한 번에 값이 나간다.
    spend: has('--spend') || has('--돈나감'),
  }
}

/** preview 는 캐시에 있는 것만 쓴다 — 없으면 무엇을 먼저 돌려야 하는지 말해 준다. */
function cacheOnlySpeaker() {
  return () => {
    throw new Error(
      '--preview 는 이미 만들어 둔 소리만 씁니다. 이 장면은 캐시에 없습니다.\n' +
      '  먼저 `node run.mjs --mock` (무음) 또는 `node run.mjs --real` (진짜 음성) 을 한 번 돌리십시오.')
  }
}

async function main() {
  const { mode, safe, check, spend, plain, clips } = parseArgs(process.argv.slice(2))
  const conf = MODES[mode]

  say('')
  say('━━ 지금日지도 홍보 영상 ━━')
  say(`  모드   ${mode} — ${conf.label}`)
  if (plain) {
    say('  화면만 ★자막·표·소리를 빼고 화면만★ 냅니다 (직접 편집용).')
    say(`         장면 길이는 음성이 정한 그대로라 ${clips ? '클립을 ' : ''}편집기에서 그 자리에 놓으면 맞습니다.`)
  }
  say(`  키     ${keySource()}`)

  // ── ① 대본 확인 (값이 나가기 ★전에★) ─────────────────────
  const scriptRaw = loadScript()
  const script = resolveSequences(applyShotAvailability(scriptRaw)) // 없는 캡처는 자리표로
  const theme = brandTheme()
  say(`  대본   ${script.id} · 장면 ${script.scenes.length}개`)
  say(`  색     ${rel(TOKENS_PATH)} 에서 읽음 (도구에 hex 를 따로 적지 않는다)`)
  for (const s of script.scenes) {
    say(`    ✔ ${s.id} ${s.type} · 화면 ${s.screen.kind} · "${s.narration}"`)
  }

  const need = missingShots(script)
  if (need.length) {
    say('')
    say('  ※ 제품 화면 캡처가 아직 없습니다 — 그 장면은 자리표로 그립니다.')
    for (const n of need) say(`     ${n.scene} → capture/shots/${n.shot}`)
    say('     만드는 법: 저장소 뿌리에서 npm run build && npx next start -p 3031 뒤')
    say('               node tools/promo/capture/capture.mjs')
  }

  const voice = voiceConfig(script.voice)
  for (const engine of ['mock', 'typecast']) {
    const c = cacheStats(engine)
    say(`  캐시   ${engine}: ${c.pairs}쌍${c.orphans ? ` (짝이 없는 파일 ${c.orphans}개 — 캐시로 치지 않습니다)` : ''}`)
  }

  if (check) {
    say('')
    say('--check 이므로 여기서 멈춥니다. TTS 도 렌더도 하지 않았습니다.')
    return
  }

  if (mode === 'real' && !spend) {
    say('')
    say('■ --real 은 ★유료 호출★ 입니다. 확인 표시를 같이 붙여 주십시오.')
    say('    node run.mjs --real --spend')
    say('')
    say('  값을 내지 않고 화면·자막을 보려면: node run.mjs --mock')
    process.exit(1)
  }

  if (mode === 'real' && !hasKey()) {
    say('')
    say('■ 설정이 필요합니다 — Typecast API 키가 없습니다.')
    say('  1. tools/promo/.env.example 을 tools/promo/.env 로 복사합니다.')
    say('  2. TYPECAST_API_KEY 와 TYPECAST_VOICE_ID 를 채웁니다.')
    say('')
    say('  키 없이 화면·자막 배관만 보려면: node run.mjs --mock')
    process.exit(1)
  }

  // ── ② 소리 + 자막 ──────────────────────────────────────
  say('')
  say(`[1/4] ${conf.label}`)
  let engine = conf.engine
  let speak
  if (mode === 'mock') {
    speak = async (text, v) => mockSpeakWithTimestamps(text, v)
  } else if (mode === 'real') {
    speak = (text, v) => speakWithTimestamps(text, v)
    say(`      목소리 ${voice.voiceId} · ${voice.model} · ${voice.language} · 속도 ${voice.tempo}`)
  } else {
    // preview — 진짜 캐시가 있으면 그것을, 없으면 mock 캐시를 쓴다
    const real = cacheStats('typecast')
    engine = real.pairs > 0 ? 'typecast' : 'mock'
    conf.estimated = engine === 'mock'
    say(`      캐시 ${engine} 를 씁니다 (새로 부르지 않습니다)`)
    speak = cacheOnlySpeaker()
  }

  const { built, prepared, warnings } = await buildScenes({ script, voice, engine, speak, log: say })
  for (const w of warnings) say(`      ※ ${w}`)

  // ── ③ 시간 계산 ────────────────────────────────────────
  say('[2/4] 소리 길이로 장면 시간 계산 (사람이 초를 적지 않는다)')
  const timeline = buildTimeline({
    id: script.id,
    message: script.message,
    cta: script.cta,
    mode,
    engine,
    tts: engine,
    estimatedDuration: conf.estimated === true,
    // real 이 아니면 화면에 표를 붙인다 (Short.jsx 가 이 값을 그대로 그린다)
    watermark: mode === 'real' ? null
      : (engine === 'mock' ? 'PREVIEW · 무음' : 'PREVIEW · 검수용'),
    theme,
    builtAt: new Date().toISOString(),
  }, built)

  if (plain) {
    // ★ 길이는 건드리지 않는다 ★ — 음성이 정한 장면 길이 그대로여야
    //   사용자가 자기 음성 위에 그대로 얹을 수 있다.
    timeline.watermark = null
    timeline.plain = true
    for (const s of timeline.scenes) { s.captions = []; s.audio = null }
  }

  const problems = checkTimeline(timeline)
  if (problems.length) {
    throw new Error('만들어 낸 timeline 이 성하지 않습니다:\n  ' + problems.join('\n  '))
  }
  for (const s of timeline.scenes) {
    say(`      ${s.id} ${String(s.startFrame).padStart(4)}f → ` +
      `${String(s.startFrame + s.durationInFrames).padStart(4)}f  ` +
      `(음성 ${s.audioSeconds}s · 앞 ${s.leadInSeconds}s · 뒤 ${s.tailSeconds}s · 음성 시작 ${s.audioFromFrame}f)`)
  }
  const seconds = timeline.totalFrames / timeline.fps
  say(`      전체 ${seconds.toFixed(2)}초` + (conf.estimated ? '  ★추정★ (실제 음성 길이가 아닙니다)' : ''))
  // 목표 길이는 대본이 정한다 (script/promo.json 의 target).
  const target = script.target || { minSeconds: 20, maxSeconds: 25 }
  if (seconds < target.minSeconds || seconds > target.maxSeconds) {
    say(`      ※ 목표는 ${target.minSeconds}~${target.maxSeconds}초입니다. ` +
      `지금 ${seconds.toFixed(1)}초 — 카피 길이를 조절하십시오.`)
  }

  // ── ④ 산출물 + 렌더 ────────────────────────────────────
  // ★ 기존 결과를 지우지 않는다. 실행마다 새 폴더다.
  const { dir: runDir, name: runName } = createRunDir(mode, script.id)
  mkdirSync(join(runDir, 'audio'), { recursive: true })
  for (const b of built) writeFileSync(join(runDir, b.audio), b.wav)

  writeFileSync(join(runDir, '01-script.json'), JSON.stringify(script, null, 2))
  writeFileSync(join(runDir, '02-tts-text.json'), JSON.stringify(
    prepared.map((p) => ({ scene: p.scene.id, narration: p.narration, ttsText: p.ttsText, rules: p.rules, chunks: p.chunks })),
    null, 2))
  writeFileSync(join(runDir, '03-timestamps.json'), JSON.stringify(
    built.map((b) => ({
      scene: b.id, engine, cached: b.cached, cacheKey: b.cacheKey,
      granularity: b.granularity, audioSeconds: b.audioSeconds,
      reportedDuration: b.reportedDuration, words: b.words,
    })), null, 2))
  writeFileSync(join(runDir, '04-captions.json'), JSON.stringify(
    built.map((b) => ({ scene: b.id, captions: b.captions, anchors: b.anchors, emphasis: b.emphasis })), null, 2))
  writeFileSync(join(runDir, '05-timeline.json'), JSON.stringify(timeline, null, 2))

  const browserExecutable = findChrome()
  say(`[3/4] 렌더 — ${timeline.totalFrames}프레임 · ${timeline.width}×${timeline.height}` +
    (conf.scale !== 1 ? ` · ${conf.scale}배 (저해상도 검수)` : ''))
  say(`      브라우저: ${browserExecutable || 'Remotion 이 직접 내려받습니다'}`)

  // 장면마다 한 장씩. ★뜨는 중간(페이드)이 아니라 다 뜬 순간을 고른다★ —
  // 장면 한가운데를 그냥 찍으면 자막이 반투명한 채로 남아 검수에 쓸 수 없다.
  const stillFrame = (s) => {
    const longest = (s.captions || []).reduce(
      (best, c) => (!best || c.toFrame - c.fromFrame > best.toFrame - best.fromFrame ? c : best), null)
    let at = longest
      ? Math.round((longest.fromFrame + longest.toFrame) / 2)
      : Math.floor(s.durationInFrames / 2)
    // ★ 화면이 바뀌는 순간(anchors.reveal)은 피한다 — 겹치는 중에 찍으면 두 화면이
    //   포개져 그리다 만 것처럼 보인다. 바뀐 ★뒤★ 를 찍는 편이 보여 줄 것도 많다.
    const reveal = s.anchors?.reveal
    if (typeof reveal === 'number') at = Math.max(at, reveal + 12)
    return s.startFrame + Math.min(Math.max(at, 2), s.durationInFrames - 2)
  }
  const stills = []
  for (const s of timeline.scenes) {
    stills.push({ name: s.id, frame: stillFrame(s), safeArea: false })
  }
  // 검수용 safe-area 는 장면마다 따로 한 장 더
  for (const s of timeline.scenes) {
    stills.push({ name: `${s.id}-safe`, frame: stillFrame(s), safeArea: true })
  }

  const outputName = `${conf.prefix}${script.id}${plain ? '-화면만' : ''}${safe ? '-safe' : ''}.mp4`
  const reuse = clips ? {} : null   // 클립을 여럿 낼 때만 묶음을 붙들고 있는다
  const { output, stills: stillPaths } = await renderShort({
    runDir, timeline, outputName, browserExecutable, safeArea: safe,
    scale: conf.scale, stills, log: say, reuse,
  })

  // ★ 장면마다 따로 — 편집기에서 순서를 바꾸거나 길이를 다시 잡기 쉽게.
  const clipPaths = []
  if (clips) {
    say('      장면별 클립')
    const dir = join(runDir, 'clips')
    mkdirSync(dir, { recursive: true })
    for (let i = 0; i < timeline.scenes.length; i++) {
      const s = timeline.scenes[i]
      // 장면 하나만 든 timeline 을 새로 만든다 (startFrame 을 0 으로 옮긴다)
      const one = {
        ...timeline,
        totalFrames: s.durationInFrames,
        scenes: [{ ...s, startFrame: 0 }],
      }
      const name = `${String(i + 1).padStart(2, '0')}-${s.id}.mp4`
      await renderShort({
        runDir, timeline: one, outputName: join('clips', name),
        browserExecutable, safeArea: false, scale: conf.scale, stills: [], reuse,
      })
      const secs = (s.durationInFrames / timeline.fps).toFixed(2)
      say(`        ${name}  ${secs}초`)
      clipPaths.push(join(dir, name))
    }
  }

  releaseBundle(reuse)
  say('[4/4] 안내문 쓰는 중')
  writeFileSync(join(runDir, 'README.txt'), readme({ timeline, mode, engine, conf, outputName, stillPaths, need }))

  say('')
  say(`완성 — ${rel(output)}`)
  say(`      스틸 ${stillPaths.length}장 (${rel(join(runDir, 'stills'))})`)
  if (clipPaths.length) say(`      클립 ${clipPaths.length}개 (${rel(join(runDir, 'clips'))})`)
  say(`      실행 폴더 ${rel(runDir)}  ★기존 결과는 지우지 않았습니다★`)
  const runs = listRuns(mode)
  say(`      ${mode} 실행 기록 ${runs.length}개 — 가장 최근 것이 ${runName}`)

  if (mode !== 'real') {
    say('')
    say('※ ★출하물이 아닙니다.★ ' + (engine === 'mock'
      ? '무음이고 길이는 추정입니다. Typecast 를 부르지 않았습니다.'
      : '검수용 저해상도입니다.'))
  }
}

function readme({ timeline, mode, engine, conf, outputName, stillPaths, need }) {
  const seconds = (timeline.totalFrames / timeline.fps).toFixed(2)
  return `지금日지도 홍보 영상 — 실행 결과
만든 때   ${timeline.builtAt}
모드      ${mode} (${conf.label})
소리      ${engine === 'mock' ? '★가짜(무음)★ — Typecast 를 부르지 않았습니다' : engine}
길이      ${seconds}초  ${conf.estimated ? '★추정★ — 실제 음성으로 확인한 값이 아닙니다' : ''}
크기      ${timeline.width}×${timeline.height} · ${timeline.fps}fps

${mode === 'real' ? '' : `── 이것은 미리보기입니다 — 올리지 마십시오 ────────────────
${engine === 'mock'
  ? '무음이라 그대로 쓸 수 없습니다. 화면·시간 계산·자막 배관을 보는 용도입니다.\n길이도 글자 수로 어림한 값이라 실제 음성 길이와 다릅니다.'
  : '검수용 저해상도입니다.'}
`}
── 시간 기준 ─────────────────────────────────────────────
음성·자막·화면이 ★같은 기준★ 에서 시작합니다.
  앞 여백(lead-in)  ${timeline.scenes[0].leadInSeconds}초 = ${timeline.leadInFrames}프레임
  장면마다 audioFromFrame 이 그 값이고, 자막·화면 등장 시점도 거기서부터 셉니다.

${timeline.scenes.map((s) => `  ${s.id.padEnd(12)} ${String(s.startFrame).padStart(4)}f → ${String(s.startFrame + s.durationInFrames).padStart(4)}f  음성 ${s.audioSeconds}s  자막 ${s.captions.length}줄`).join('\n')}

── 산출물 ────────────────────────────────────────────────
01-script.json      대본 그대로
02-tts-text.json    나레이션과 읽을 글(ttsText) 을 나란히 + 바꾼 규칙 + 자막 덩이
03-timestamps.json  낱말별 시각 (캐시에서 왔는지도 적혀 있습니다)
04-captions.json    자막·강조 낱말·화면 등장 시점 (초)
05-timeline.json    장면 시작·길이·자막을 프레임으로 (렌더가 읽는 것)
audio/              장면별 wav
stills/             장면별 스틸 ${stillPaths.length}장 (…-safe.png 는 safe-area 오버레이본)
${outputName}

── 제품 화면 캡처 ────────────────────────────────────────
${need.length === 0
  ? '전부 준비돼 있었습니다.'
  : `아직 없는 것 ${need.length}개 — 그 장면은 자리표로 그렸습니다.\n${need.map((n) => `  ${n.scene} → capture/shots/${n.shot}`).join('\n')}`}

── 다음 단계 (--real 로 갈 때 필요한 것) ─────────────────
1. tools/promo/.env 에 TYPECAST_API_KEY · TYPECAST_VOICE_ID
2. 숏츠에 맞는 목소리를 고르는 일 (강의용 목소리는 톤이 다릅니다)
3. node run.mjs --real
   → 캐시에 없는 장면만 부릅니다. 카피를 안 고친 장면은 값이 나가지 않습니다.
`
}

main().catch((e) => {
  console.error('\n멈췄습니다: ' + redact(e.message))
  process.exitCode = 1
})
