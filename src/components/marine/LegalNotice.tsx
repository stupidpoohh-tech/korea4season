import { formatMonthDay, toDateKey, formatKoreanDate } from '@/domain/date';
import {
  LEGAL_STATUS_LABEL,
  LEGAL_STATUS_SYMBOL,
  MEASUREMENT_LABEL,
  type LegalEvaluation,
} from '@/domain/regulation';

const TONE: Record<string, { bg: string; fg: string }> = {
  open: { bg: 'bg-[color:var(--color-accent-soft)]', fg: 'text-[color:var(--color-accent-strong)]' },
  conditional: { bg: 'bg-[color:var(--color-sky-soft)]', fg: 'text-[color:var(--color-sky)]' },
  'closed-season': { bg: 'bg-[color:var(--color-restricted-soft)]', fg: 'text-[color:var(--color-restricted)]' },
  prohibited: { bg: 'bg-[color:var(--color-restricted-soft)]', fg: 'text-[color:var(--color-restricted)]' },
  unknown: { bg: 'bg-[color:var(--color-line-soft)]', fg: 'text-[color:var(--color-muted)]' },
};

export function LegalStatusBadge({ legal, size = 'sm' }: { legal: LegalEvaluation; size?: 'sm' | 'md' }) {
  const tone = TONE[legal.overallStatus] ?? TONE.unknown!;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md font-medium ${tone.bg} ${tone.fg} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-[12.5px]'
      }`}
    >
      <span aria-hidden>{LEGAL_STATUS_SYMBOL[legal.overallStatus]}</span>
      {LEGAL_STATUS_LABEL[legal.overallStatus]}
    </span>
  );
}

/**
 * 규정 블록.
 *
 * 이 화면에서 규정은 콘텐츠가 아니라 행동 직전의 safety layer 다.
 * 그래서 시즌 정보 아래에 놓이고, 없으면 없다고 분명히 말한다.
 */
export function LegalNotice({ legal }: { legal: LegalEvaluation }) {
  if (legal.noData) {
    return (
      <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] p-3 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
        <p className="font-medium text-[color:var(--color-ink-soft)]">확인된 규정 정보가 없습니다</p>
        <p className="mt-1">
          규정이 없다는 뜻이 아닙니다. 조업·낚시 전 관할 지자체 고시를 직접 확인해 주세요.
        </p>
      </div>
    );
  }

  const blocked = legal.overallStatus === 'closed-season' || legal.overallStatus === 'prohibited';

  return (
    <div
      className={`rounded-xl border p-3 text-[12.5px] leading-relaxed ${
        blocked
          ? 'border-[color:var(--color-restricted)]/25 bg-[color:var(--color-restricted-soft)]'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-paper)]'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <LegalStatusBadge legal={legal} size="md" />
        {legal.nextTransition && (
          <span className="text-[color:var(--color-muted)]">
            {legal.nextTransition.label}{' '}
            <span className="font-semibold tabular text-[color:var(--color-ink)]">
              {legal.nextTransition.days}일
            </span>
          </span>
        )}
      </div>

      {legal.activeClosedSeason && (
        <p className="mt-2 tabular text-[color:var(--color-ink-soft)]">
          금어기 {formatKoreanDate(toDateKey(new Date(`${legal.activeClosedSeason.start}T00:00:00Z`)))} ~{' '}
          {formatKoreanDate(toDateKey(new Date(`${legal.activeClosedSeason.end}T00:00:00Z`)))}
        </p>
      )}

      {legal.measurements.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[color:var(--color-ink-soft)]">
          {legal.measurements.map((m) => (
            <li key={`${m.kind}-${m.minimumValue}`} className="flex gap-1.5">
              <span aria-hidden>📏</span>
              <span>
                {MEASUREMENT_LABEL[m.kind]} {m.minimumValue}
                {m.unit} 이하는 방생
              </span>
            </li>
          ))}
        </ul>
      )}

      {legal.cautions.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[color:var(--color-ink-soft)]">
          {legal.cautions.map((c) => (
            <li key={c} className="flex gap-1.5">
              <span aria-hidden>⚠️</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {legal.exceptions.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-[color:var(--color-line)] pt-2 text-[color:var(--color-muted)]">
          {legal.exceptions.map((e) => (
            <li key={e} className="flex gap-1.5">
              <span aria-hidden>·</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      )}

      {legal.matchedRules.some((r) => r.rule.windows.length > 0) && !legal.activeClosedSeason && (
        <p className="mt-2 text-[color:var(--color-muted)]">
          금어기 구간{' '}
          {legal.matchedRules
            .flatMap((r) => r.rule.windows)
            .map((w) => `${formatMonthDay(w.start)} ~ ${formatMonthDay(w.end)}`)
            .join(', ')}
        </p>
      )}

      <div className="mt-2 space-y-0.5 border-t border-[color:var(--color-line)] pt-2 text-[11.5px] text-[color:var(--color-faint)]">
        {legal.sources.map((s) => (
          <p key={s.id}>
            출처{' '}
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">
                {s.name}
              </a>
            ) : (
              s.name
            )}
          </p>
        ))}
        <p className="text-[color:var(--color-restricted)]">
          개발용 DEMO 규정입니다. 원문 대조 전이며 시·도지사 고시로 달라질 수 있습니다.
        </p>
      </div>
    </div>
  );
}
