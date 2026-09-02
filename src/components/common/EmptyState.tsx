import type { ReactNode } from 'react';

/**
 * 빈 화면도 탐험 경험으로 잇는다. (요구사항 #29)
 * "없습니다" 로 끝내지 않는다.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 py-8 text-center">
      <p className="text-[15px] font-medium text-[color:var(--color-ink)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[38ch] text-[13px] leading-relaxed text-[color:var(--color-muted)]">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
