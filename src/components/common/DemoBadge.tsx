/**
 * 개발용 fixture 임을 코드와 UI 양쪽에서 분명히 한다. (요구사항 #5)
 * 실제 데이터 소스로 교체되면 occurrence.isDemo 가 false 가 되어 자동으로 사라진다.
 */
export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border border-dashed border-[color:var(--color-faint)]/60 px-1 py-px text-[10px] font-medium tracking-wide text-[color:var(--color-faint)] ${className}`}
      title="개발용 데모 데이터입니다. 실제 법령·예보와 다를 수 있습니다."
    >
      DEMO
    </span>
  );
}
