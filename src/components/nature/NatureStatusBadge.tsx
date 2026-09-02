import { statusMeta } from '@/lib/status-meta';
import type { NatureOccurrence, OccurrenceStatus } from '@/domain/types';

interface Props {
  status: OccurrenceStatus;
  polarity: NatureOccurrence['polarity'];
  size?: 'sm' | 'md';
}

/** 색만으로 상태를 전달하지 않는다 — 기호와 텍스트를 함께 쓴다. (요구사항 #28) */
export function NatureStatusBadge({ status, polarity, size = 'sm' }: Props) {
  const meta = statusMeta(status, polarity);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md font-medium ${meta.bg} ${meta.fg} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-[13px]'
      }`}
    >
      <span aria-hidden className="text-[0.9em] leading-none">
        {meta.symbol}
      </span>
      {meta.label}
    </span>
  );
}
