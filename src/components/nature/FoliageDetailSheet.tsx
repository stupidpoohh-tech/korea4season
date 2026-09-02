'use client';

import { formatKoreanDate, toDateKey, type DateKey } from '@/domain/date';
import { Sheet } from '@/components/common/Sheet';
import { FOLIAGE_STATE_LABEL, type FoliageSpot } from '@/services/foliage-service';

/* ────────────────────────────────────────────────────────────
 * 단풍 명소 상세.
 *
 * 이 단계에서 답하는 것은 넷뿐이다 —
 * 지금 어떤 상태인지, 언제 시작했는지, 절정이 언제인지, 지도 어디인지.
 * 숙박 · 맛집 · 교통은 다른 서비스가 더 잘한다.
 * ──────────────────────────────────────────────────────────── */

const TONE: Record<string, string> = {
  peak: 'text-[color:var(--color-peak)]',
  good: 'text-[color:var(--color-accent-strong)]',
  starting: 'text-[color:var(--color-sea)]',
  ending: 'text-[color:var(--color-muted)]',
  pre: 'text-[color:var(--color-faint)]',
  ended: 'text-[color:var(--color-faint)]',
};

export function FoliageDetailSheet({
  spot,
  date,
  onClose,
  onFocusMap,
}: {
  spot: FoliageSpot | null;
  date: DateKey;
  onClose: () => void;
  onFocusMap: (spot: FoliageSpot) => void;
}) {
  // 출처는 occurrence 가 들고 있다 — 명소를 대표하는 것의 출처를 쓴다
  const lead = spot?.entries[0]?.occurrence;
  const source = lead?.source;

  return (
    <Sheet
      open={Boolean(spot)}
      onClose={onClose}
      label={spot ? `${spot.location.name} 단풍` : ''}
      header={
        spot && (
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-peak-soft)] text-[20px]"
            >
              {spot.entity.icon}
            </span>
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-tight">{spot.location.name}</h2>
              <p className="mt-0.5 text-[12.5px] text-[color:var(--color-muted)]">
                {spot.location.region}
                {spot.location.subregion ? ` · ${spot.location.subregion}` : ''} · {spot.entity.name}
              </p>
            </div>
          </div>
        )
      }
    >
      {spot && (
        <>
          <div className="rounded-xl border border-[color:var(--color-line)] px-3.5 py-3">
            <p className="text-[12px] text-[color:var(--color-faint)]">지금 상태</p>
            <p className={`mt-0.5 text-[19px] font-semibold ${TONE[spot.state] ?? ''}`}>
              {FOLIAGE_STATE_LABEL[spot.state]}
            </p>
            {spot.daysToNextChange !== undefined && spot.nextChangeLabel && (
              <p className="mt-1 text-[12.5px] text-[color:var(--color-muted)]">
                {spot.nextChangeLabel} <strong className="tabular font-semibold">{spot.daysToNextChange}일</strong>
              </p>
            )}
          </div>

          <dl className="divide-y divide-[color:var(--color-line-soft)]">
            <Row label="첫 단풍">{formatKoreanDate(toDateKey(spot.window.start))}</Row>
            {spot.peakWindow && (
              <Row label="절정">
                {formatKoreanDate(toDateKey(spot.peakWindow.start))} ~{' '}
                {formatKoreanDate(toDateKey(spot.peakWindow.end))}
              </Row>
            )}
            <Row label="끝물">{formatKoreanDate(toDateKey(spot.window.end))}</Row>
            <Row label="보는 날짜">{formatKoreanDate(date)}</Row>
          </dl>

          {spot.entries.length > 1 && (
            <div>
              <h3 className="mb-1.5 text-[13px] font-semibold">이 명소에서</h3>
              <ul className="flex flex-wrap gap-1.5">
                {spot.entries.map((entry) => (
                  <li
                    key={entry.occurrence.id}
                    className="rounded-lg bg-[color:var(--color-line-soft)] px-2 py-1 text-[12px] text-[color:var(--color-ink-soft)]"
                  >
                    {entry.entity.icon} {entry.entity.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => onFocusMap(spot)}
            className="flex h-10 w-full items-center justify-center rounded-xl bg-[color:var(--color-ink)] text-[13.5px] font-semibold text-white"
          >
            지도에서 보기
          </button>

          {source && (
            <p className="text-[11.5px] leading-relaxed text-[color:var(--color-faint)]">
              {source.name}
              {source.updatedAt ? ` · ${source.updatedAt} 기준` : ''}
              {source.note ? ` — ${source.note}` : ''}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-[72px] shrink-0 text-[12.5px] text-[color:var(--color-faint)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-[13.5px] text-[color:var(--color-ink-soft)]">{children}</dd>
    </div>
  );
}
