// 대본 → 장면별 {소리, 자막, 화면 등장 시점}. 파일을 쓰지 않는다 (run.mjs 가 쓴다).
//
// 순서가 중요하다:
//   ① 대본을 전부 확인한다 (모르는 장면 종류는 여기서 멈춘다 — 값이 나가기 전에)
//   ② 캐시를 거쳐 소리를 얻는다
//   ③ wav 에서 길이를 ★직접 잰다★ (응답이 말하는 길이를 믿지 않는다)
//   ④ 시각이 성한지 검사한다 (역순·범위 초과)
//   ⑤ 낱말을 읽을 글에 맞춘다 (정렬 실패면 멈춘다)
//   ⑥ 자막을 만들고 다시 검사한다
import { prepare } from './ttsPrep.mjs'
import { alignWords, buildCaptions, timeOfPhrase } from './captions.mjs'
import { assertTimestamps, assertCaptions, checkReportedDuration } from './validate.mjs'
import { durationSeconds } from './wav.mjs'
import { through } from './ttsCache.mjs'

/**
 * @param speak  (ttsText, voice) => Promise<{wav, words, granularity, reportedDuration}>
 * @param engine 'mock' | 'typecast'  — 캐시 폴더가 갈린다
 * @returns {Promise<{built:Array, prepared:Array, warnings:string[]}>}
 */
export async function buildScenes({ script, voice, engine, speak, log = () => {} }) {
  // ① 전부 먼저 확인
  const prepared = script.scenes.map((scene) => {
    const p = prepare(scene.narration)
    if (!p.ttsText) throw new Error(`${scene.id}: 읽을 글이 비었습니다.`)
    return { scene, ...p }
  })

  const built = []
  const warnings = []
  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i]
    const id = p.scene.id

    // ② 캐시를 거쳐 부른다
    const got = await through(p.ttsText, voice, engine, () => speak(p.ttsText, voice))

    // ③ 길이는 wav 에서 직접
    const audioSeconds = durationSeconds(got.wav)

    // ④ 시각 검사
    assertTimestamps(got.words, audioSeconds, { where: id })
    const durationWarning = checkReportedDuration(got.reportedDuration, audioSeconds, { where: id })
    if (durationWarning) warnings.push(durationWarning)

    // ⑤ 정렬
    const placed = alignWords(p.ttsText, got.words, { where: id })

    // ⑥ 자막
    const captions = buildCaptions(p.chunks, placed, { audioSeconds })
    assertCaptions(captions, audioSeconds, { where: id })

    // 화면 등장·전환 시점 — 대본이 구절을 지정했을 때만. 초를 손으로 적지 않는다.
    const anchors = {}
    const phrase = p.scene.screen?.anchorPhrase
    if (phrase) {
      anchors.reveal = timeOfPhrase(p.ttsText, placed, prepare(phrase).ttsText).start
    }
    // 여러 장을 갈아 끼우는 장면: 각 구절이 발음되는 순간에 한 장씩 바뀐다
    const phrases = p.scene.screen?.anchorPhrases || []
    phrases.forEach((ph, i) => {
      anchors[`cut${i + 1}`] = timeOfPhrase(p.ttsText, placed, prepare(ph).ttsText).start
    })

    log(`      ${id} — ${audioSeconds.toFixed(2)}초 · 낱말 ${got.words.length}개(${got.granularity})` +
      ` · 자막 ${captions.length}줄` + (got.cached ? ' · ★캐시 그대로★' : ' · 새로 만듦'))

    built.push({
      id,
      type: p.scene.type,
      audio: `audio/${id}.wav`,
      wav: got.wav,
      audioSeconds,
      screen: p.scene.screen,
      emphasis: p.scene.emphasis || [],
      captions,
      anchors,
      words: got.words,
      granularity: got.granularity,
      reportedDuration: got.reportedDuration,
      cached: got.cached,
      cacheKey: got.key,
    })
  }
  return { built, prepared, warnings }
}
