/**
 * 한국어 조사 처리.
 * 자동 생성 문장이 "물범이(가)" 처럼 보이지 않게 한다. (요구사항 #9)
 */

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** 마지막 글자에 받침이 있는가 */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return false;
  return (code - HANGUL_START) % 28 !== 0;
}

const pick = (word: string, withFinal: string, withoutFinal: string) =>
  `${word}${hasFinalConsonant(word) ? withFinal : withoutFinal}`;

/** 은/는 */
export const topic = (word: string) => pick(word, '은', '는');
/** 이/가 */
export const subject = (word: string) => pick(word, '이', '가');
/** 을/를 */
export const object = (word: string) => pick(word, '을', '를');
/** 과/와 */
export const conj = (word: string) => pick(word, '과', '와');
/** 으로/로 */
export function direction(word: string): string {
  const last = word.trim().at(-1);
  const code = last?.charCodeAt(0) ?? 0;
  const isHangul = code >= HANGUL_START && code <= HANGUL_END;
  const final = isHangul ? (code - HANGUL_START) % 28 : 0;
  // 받침이 없거나 'ㄹ' 받침이면 '로'
  return `${word}${!isHangul || final === 0 || final === 8 ? '로' : '으로'}`;
}
