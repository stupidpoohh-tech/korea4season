/* ────────────────────────────────────────────────────────────
 * 철새 Prototype 플래그.
 *
 * 두 값을 절대 하나로 합치지 않는다.
 *
 *   BIRD_PROTOTYPE_ENABLED     지도에 철새 레이어를 그릴 것인가   (승인됨)
 *   BIRD_PRODUCTION_PUBLICATION 실제 자연 정보로 공개할 것인가     (승인되지 않음)
 *
 * 공개를 켜면 mock 이 전부 차단되고, 검증된 기록이 0건이므로 레이어는
 * 아무것도 그리지 않은 채 "확인된 기록이 없다" 고 말한다. 그것이 맞는 동작이다 —
 * 빈자리를 진짜처럼 보이는 자료로 메우지 않는다.
 * ──────────────────────────────────────────────────────────── */

/** Prototype 실행 승인됨 */
export const BIRD_PROTOTYPE_ENABLED = true;

/**
 * production 공개.
 * 기본은 꺼짐이며, 켜는 순간 prototype fixture 는 한 건도 통과하지 못한다.
 */
export const BIRD_PRODUCTION_PUBLICATION =
  process.env.NEXT_PUBLIC_BIRD_PRODUCTION === '1';

/** prototype fixture 를 런타임에 실어도 되는가 */
export const BIRD_MOCK_ALLOWED = BIRD_PROTOTYPE_ENABLED && !BIRD_PRODUCTION_PUBLICATION;
