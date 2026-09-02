import type { NatureOccurrence } from '@/domain/types';

const CONFIDENCE_LABEL: Record<NatureOccurrence['confidence'], string> = {
  official: '법령·공공데이터 원문 확인',
  predicted: '기관 예보 기반',
  estimated: '평년값 기반 추정',
  demo: '개발용 데모 데이터',
};

/**
 * 출처 · 기준일 · 적용조건을 항상 함께 보여준다. (요구사항 #5)
 * 지역·어업방식에 따라 규정이 갈릴 수 있으므로 예외를 감추지 않는다.
 */
export function SourceBlock({ occurrence }: { occurrence: NatureOccurrence }) {
  const { source, confidence, exceptions, notes } = occurrence;

  return (
    <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] p-3 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
      <dl className="space-y-1">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-[color:var(--color-faint)]">출처</dt>
          <dd className="min-w-0 flex-1 text-[color:var(--color-ink-soft)]">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-[color:var(--color-line)] underline-offset-2 hover:decoration-current"
              >
                {source.name}
              </a>
            ) : (
              source.name
            )}
          </dd>
        </div>
        {source.updatedAt && (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-[color:var(--color-faint)]">기준일</dt>
            <dd className="tabular text-[color:var(--color-ink-soft)]">{source.updatedAt}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-[color:var(--color-faint)]">신뢰도</dt>
          <dd className="text-[color:var(--color-ink-soft)]">{CONFIDENCE_LABEL[confidence]}</dd>
        </div>
      </dl>

      {(exceptions?.length || notes?.length) && (
        <ul className="mt-2 space-y-1 border-t border-[color:var(--color-line)] pt-2">
          {exceptions?.map((text) => (
            <li key={text} className="flex gap-1.5">
              <span aria-hidden>·</span>
              <span>{text}</span>
            </li>
          ))}
          {notes?.map((text) => (
            <li key={text} className="flex gap-1.5">
              <span aria-hidden>·</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}

      {source.note && (
        <p className="mt-2 border-t border-[color:var(--color-line)] pt-2 text-[color:var(--color-restricted)]">
          {source.note}
        </p>
      )}
    </div>
  );
}
