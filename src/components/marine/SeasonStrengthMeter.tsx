import {
  SEASON_STRENGTH_LABEL,
  SEASON_STRENGTH_STARS,
  type SeasonState,
} from '@/domain/marine';

const TONE: Record<SeasonState, string> = {
  peak: 'text-[color:var(--color-peak)]',
  good: 'text-[color:var(--color-accent-strong)]',
  fair: 'text-[color:var(--color-sea)]',
  low: 'text-[color:var(--color-muted)]',
  off: 'text-[color:var(--color-faint)]',
};

/**
 * 시즌 강도. 이 앱에서 가장 먼저 읽혀야 하는 값이다.
 * 별만으로 전달하지 않고 텍스트 라벨을 함께 둔다.
 */
export function SeasonStrengthMeter({
  state,
  size = 'md',
  showLabel = true,
}: {
  state: SeasonState;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}) {
  const stars = SEASON_STRENGTH_STARS[state];
  const label = SEASON_STRENGTH_LABEL[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${TONE[state]} ${
        size === 'sm' ? 'text-[11.5px]' : 'text-[13px]'
      }`}
      aria-label={`시즌 ${label}`}
    >
      <span aria-hidden className="tracking-[.08em]">
        {'★'.repeat(stars)}
        <span className="opacity-25">{'★'.repeat(4 - stars)}</span>
      </span>
      {showLabel && <span className="font-medium">{label}</span>}
    </span>
  );
}
