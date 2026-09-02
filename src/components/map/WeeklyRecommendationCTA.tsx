'use client';

/* ────────────────────────────────────────────────────────────
 * 이번 주 추천은 필터가 아니라 discovery CTA 다.
 *
 * 예전에는 필터 줄에 섞여 있어서 "이번 주 추천" 이 지도를 거르는 조건처럼
 * 읽혔다. 지금은 필터 줄에서 빼내 지도 위에 띄운다 —
 * 상태를 훑어보다가 행동으로 넘어가는 자리이므로 지도 옆이 맞다.
 * ──────────────────────────────────────────────────────────── */

export function WeeklyRecommendationCTA({
  onOpen,
  label,
}: {
  onOpen: () => void;
  /** 카테고리마다 다음 행동의 이름이 다르다 */
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/94 px-3.5 py-2 text-[12.5px] font-semibold text-[color:var(--color-ink)] shadow-[var(--shadow-soft)] backdrop-blur-sm transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-strong)]"
    >
      <span aria-hidden>✨</span>
      {label}
    </button>
  );
}
