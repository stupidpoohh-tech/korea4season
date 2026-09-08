// 대본의 나레이션 → ①읽을 글(ttsText) ②자막 덩이(chunks).
//
// ★ 강의용(everyday-ai)의 "원문 보존 강제" 는 가져오지 않았다. 강의는 원고가 곧 교재라
//   글자 하나까지 지켜야 했지만, 숏츠 카피는 여기 대본이 원본이고 다듬는 것이 정상이다.
//   대신 자막에 뜨는 글은 언제나 대본 그대로이고, 바꾼 규칙은 산출물에 적어 남긴다.
//
// 허용된 변형은 둘뿐이다: ①호흡용 분리  ②TTS 발음용 표기·문장부호

/** ② 발음용 표기 — 브랜드 이름과 영문은 읽는 대로 적어야 매번 같게 읽힌다. */
export const PRONUNCIATION = [
  ['AI', '에이아이'],
]

/** ② 소리에 기여하지 않는 곡선 따옴표는 뺀다. 자막에는 그대로 남는다. */
export const PUNCTUATION = [
  ['“', ''],
  ['”', ''],
]

/**
 * 자막 한 덩이의 최대 글자 수.
 * ★ 1080 세로 화면 기준이다. 강의용(1920 가로, 40자)보다 훨씬 짧다 —
 *   모바일에서 크게 두 줄이 한계라 18자를 넘기면 세 줄이 된다.
 */
export const MAX_CHUNK = 18
/**
 * 쉼표 없이 이만큼까지는 통째로 둔다.
 * ★ 쉼표가 없는 문장을 공백에서 자르면 "포토티켓 한 / 장으로" 처럼 낱말이 쪼개진다.
 *   자막 그리는 쪽(Captions.jsx)이 긴 글의 글자 크기를 줄여 두 줄에 넣으므로,
 *   억지로 자르는 것보다 한 덩이로 두는 편이 언제나 낫다.
 */
export const KEEP_WHOLE = 30

/** ①을 뺀 나머지 규칙을 적용한다. */
export function toSpoken(text) {
  let out = String(text)
  for (const [from, to] of PRONUNCIATION) out = out.split(from).join(to)
  for (const [from, to] of PUNCTUATION) out = out.split(from).join(to)
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * ① 호흡 단위로 나눈다.
 *   문장 끝 → 쉼표 → (그래도 너무 길면) 공백. 순서가 곧 우선순위다.
 *   ★ 쉼표에서만 나누는 것이 원칙이다 — 사람이 실제로 숨 쉬는 자리이기 때문이다.
 *     공백에서 자르는 것은 KEEP_WHOLE 을 넘긴 문장에 대한 마지막 수단이다.
 */
export function breathUnits(narration) {
  const blocks = String(narration).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  const units = []
  for (const block of blocks) {
    const sentences = block.match(/[^.!?…]+[.!?…]*["'”’]?\s*/g) || [block]
    for (const raw of sentences) {
      const sentence = raw.trim()
      if (!sentence) continue
      for (const piece of splitSentence(sentence)) units.push(piece)
    }
  }
  return units
}

/** 한 문장을 자막 덩이들로. 짧으면 그대로 둔다. */
function splitSentence(sentence) {
  if (sentence.length <= KEEP_WHOLE) return [sentence]

  // ② 쉼표가 있으면 거기서 나눈다 (쉼표는 문장에 남긴다 — 읽을 때 숨 쉬는 자리다)
  if (sentence.includes(',')) {
    const parts = []
    let rest = sentence
    while (rest.includes(',')) {
      const at = rest.indexOf(',')
      parts.push(rest.slice(0, at + 1).trim())
      rest = rest.slice(at + 1).trim()
    }
    if (rest) parts.push(rest)
    // 쉼표로 나눴는데도 긴 조각이 있으면 그 조각만 공백에서 한 번 더 자른다
    return parts.flatMap((p) => (p.length <= KEEP_WHOLE ? [p] : splitOnSpace(p)))
  }

  // ③ 쉼표가 없으면 어쩔 수 없이 공백에서 — 낱말 가운데를 자르지는 않는다
  return splitOnSpace(sentence)
}

function splitOnSpace(text) {
  const out = []
  let rest = text
  while (rest.length > KEEP_WHOLE) {
    let cut = rest.lastIndexOf(' ', KEEP_WHOLE)
    if (cut < MAX_CHUNK * 0.4) cut = KEEP_WHOLE - 1 // 공백이 없는 긴 덩어리 (거의 없다)
    out.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1).trim()
  }
  if (rest) out.push(rest)
  return out
}

/**
 * 한 장면의 나레이션을 준비한다.
 * @returns {{
 *   narration: string,
 *   ttsText: string,
 *   chunks: Array<{display:string, spoken:string, start:number, end:number}>,
 *   rules: Array<{kind:string, from:string, to:string, count:number}>
 * }}  start/end 는 ttsText 안의 ★글자 위치★ (초가 아니다)
 */
export function prepare(narration) {
  const units = breathUnits(narration)
  const chunks = []
  const spokenUnits = []
  let cursor = 0
  for (const unit of units) {
    const spoken = toSpoken(unit)
    if (!spoken) continue
    if (spokenUnits.length) cursor += 1 // 사이에 넣는 공백 하나
    chunks.push({ display: unit, spoken, start: cursor, end: cursor + spoken.length })
    cursor += spoken.length
    spokenUnits.push(spoken)
  }
  const ttsText = spokenUnits.join(' ')

  const rules = []
  const count = (hay, needle) => (needle ? hay.split(needle).length - 1 : 0)
  for (const [from, to] of PRONUNCIATION) {
    const n = count(narration, from)
    if (n) rules.push({ kind: '발음용 표기', from, to, count: n })
  }
  for (const [from, to] of PUNCTUATION) {
    const n = count(narration, from)
    if (n) rules.push({ kind: '문장부호', from, to, count: n })
  }
  const breaths = units.length - 1
  if (breaths > 0) rules.push({ kind: '호흡용 분리', from: '문장 경계', to: '공백', count: breaths })

  return { narration, ttsText, chunks, rules }
}
