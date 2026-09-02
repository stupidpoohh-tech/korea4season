/**
 * 현장제보 (요구사항 #14).
 *
 * 공식/예측 데이터와 사용자 현장 관측을 나란히 보여주는 것이 목표다.
 * Phase 1 은 자리와 모델만 잡아 둔다 — Observation 모델은 domain/types.ts 에 있다.
 */
export function ObservationPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--color-line)] bg-white/50 px-4 py-4">
      <p className="flex items-center gap-2 text-[13px] font-medium text-[color:var(--color-ink-soft)]">
        <span aria-hidden>📍</span>
        {label}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
        공식 예측 옆에 실제로 다녀온 사람들의 관측을 함께 보여줄 예정입니다. 개화율, 단풍 상태,
        관찰한 개체를 남길 수 있게 됩니다.
      </p>
      <p className="mt-2 text-[11.5px] text-[color:var(--color-faint)]">준비 중 · Phase 4</p>
    </div>
  );
}
