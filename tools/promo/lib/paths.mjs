// tools/promo 안에서 쓰는 경로들. ★ 앱 코드(src/)는 건드리지 않는다.
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO = resolve(HERE, '../..')       // korea4season 저장소 뿌리
// 실행별 결과 (지우지 않는다). 시험에서는 PROMO_OUT_OVERRIDE 로 임시 폴더를 쓴다.
export const OUT = process.env.PROMO_OUT_OVERRIDE || join(HERE, 'out')
// TTS 캐시 (wav + timestamps 한 쌍).
// 시험에서는 PROMO_CACHE_OVERRIDE 로 임시 폴더를 가리켜 진짜 캐시를 건드리지 않는다.
export const CACHE = process.env.PROMO_CACHE_OVERRIDE || join(HERE, '.cache')
export const SHOTS = join(HERE, 'capture/shots')  // 제품 화면 캡처 png
export const SCRIPT_DIR = join(HERE, 'script')
