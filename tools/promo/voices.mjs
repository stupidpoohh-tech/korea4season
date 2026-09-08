#!/usr/bin/env node
// 목소리 고르기 — 목록을 보고, 짧은 견본을 만들어 들어 본다.
//
//   node voices.mjs                       숏츠·광고에 맞는 한국어 목소리만 추려 보기
//   node voices.mjs --all                 전부
//   node voices.mjs --sample <voice_id>   견본 wav 한 장 (★유료 호출★ — --spend 필요)
//   node voices.mjs --sample <id> --spend
//
// ★ 목록 보기(GET)는 값이 나가지 않는다. 견본 만들기(POST)만 유료다.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { HERE } from './lib/paths.mjs'
import { redact, voiceConfig } from './lib/env.mjs'
import { listVoices, speakWithTimestamps } from './lib/typecast.mjs'
import { durationSeconds } from './lib/wav.mjs'

/** 견본으로 읽힐 문장 — 실제 대본의 첫 줄과 CTA 를 붙였다. 톤을 가장 잘 드러낸다. */
const SAMPLE_TEXT = '성수 팝업, 어디부터 가야 할까요? 아니그래서에서 성수 동선 만들기.'

// Typecast 응답에는 언어 칸이 없다. 한국어 목소리는 이름이 로마자 한국 이름이라
// 그 조각으로 추린다 — ★어림짐작이므로 최종 판단은 견본을 들어 보고 한다.★
const KOREAN_NAME = new RegExp('(' + [
  'jun', 'joon', 'hyun', 'hyeon', 'seo', 'soo', 'min', 'jin', 'ji', 'young', 'yeong',
  'woo', 'eun', 'ha', 'na', 'ye', 'gyu', 'kyu', 'sung', 'seong', 'tae', 'dae', 'chan',
  'hwan', 'jae', 'nam', 'rin', 'sang', 'shin', 'sik', 'won', 'yoon', 'yun', 'bin',
  'dong', 'hee', 'hoon', 'kang', 'kim', 'gahee', 'hyelee', 'yura', 'dana', 'ina',
].join('|') + ')', 'i')

const PROMO_USE = ['TikTok/Reels/Shorts', 'Ads/Promotion', 'Conversational']

function score(v) {
  // 숏츠·광고·대화체를 다 가진 목소리가 이 대본에 가장 맞는다.
  return PROMO_USE.filter((u) => (v.use_cases || []).includes(u)).length
}

async function main() {
  const argv = process.argv.slice(2)
  const all = argv.includes('--all')
  const spend = argv.includes('--spend') || argv.includes('--돈나감')
  const at = argv.indexOf('--sample')
  const sampleId = at >= 0 ? argv[at + 1] : null

  if (sampleId) {
    if (!spend) {
      console.log('■ 견본 만들기는 ★유료 호출★ 입니다. --spend 를 같이 붙여 주십시오.')
      process.exit(1)
    }
    const voice = voiceConfig({ voice_id: sampleId })
    const got = await speakWithTimestamps(SAMPLE_TEXT, voice)
    const dir = join(HERE, 'out', 'voice-samples')
    mkdirSync(dir, { recursive: true })
    const path = join(dir, `${sampleId}.wav`)
    writeFileSync(path, got.wav)
    console.log(`${path}  ${durationSeconds(got.wav).toFixed(2)}초 · 낱말 ${got.words.length}개`)
    console.log(`읽은 글: ${SAMPLE_TEXT}`)
    return
  }

  const raw = await listVoices()
  const list = Array.isArray(raw) ? raw : (raw.voices || raw.data || [])
  const picked = all ? list : list.filter((v) =>
    KOREAN_NAME.test(v.voice_name) &&
    (v.models || []).some((m) => m.version === 'ssfm-v30') &&
    score(v) >= 2)
  picked.sort((a, b) => score(b) - score(a) || a.voice_name.localeCompare(b.voice_name))

  console.log(`전체 ${list.length}개 중 ${picked.length}개`)
  console.log('(언어 칸이 응답에 없어 이름으로 추렸습니다 — 최종 판단은 견본을 들어 보고 하십시오)\n')
  for (const v of picked) {
    console.log(`${'★'.repeat(score(v)).padEnd(3)} ${v.voice_id}  ${v.voice_name.padEnd(16)} ` +
      `${v.gender.padEnd(7)} ${String(v.age).padEnd(12)} ${(v.use_cases || []).join(', ')}`)
  }
  console.log('\n들어 보려면: node voices.mjs --sample <voice_id> --spend')
}

main().catch((e) => { console.error('\n멈췄습니다: ' + redact(e.message)); process.exit(1) })
