'use client';

import { useState } from 'react';
import { diffDays, todayKey } from '@/domain/date';
import {
  QUANTITY_LABEL,
  FISHING_METHOD_LABEL,
  LOCATION_VISIBILITY_LABEL,
  TREND_SYMBOL,
  type FishingObservation,
  type ObservationSummary,
} from '@/domain/marine';
import { getNatureIndex } from '@/repositories/nature-repository';

/**
 * 현장 관측.
 *
 * 팔로워·좋아요·인플루언서 UI 를 만들지 않는다.
 * 목적은 지금 실제 자연 상태를 더 정확히 아는 것이므로
 * 상호작용은 '나도 확인했어요' 하나뿐이다.
 */

function relativeDay(observedAt: string): string {
  const days = diffDays(observedAt.slice(0, 10), todayKey());
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  return `${days}일 전`;
}

export function ObservationSummaryLine({ summary }: { summary: ObservationSummary }) {
  if (summary.recentCount === 0) {
    return (
      <p className="text-[12.5px] text-[color:var(--color-muted)]">
        최근 {summary.windowDays}일 제보 없음
      </p>
    );
  }
  return (
    <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">
      최근 {summary.windowDays}일{' '}
      <span className="font-semibold tabular">{summary.recentCount}건</span>{' '}
      <span aria-hidden className="text-[color:var(--color-muted)]">
        {TREND_SYMBOL[summary.trend]}
      </span>
    </p>
  );
}

export function ObservationList({
  observations,
  emptyNote,
}: {
  observations: FishingObservation[];
  emptyNote?: string;
}) {
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const speciesById = getNatureIndex().entityById;

  if (observations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[color:var(--color-line)] px-3.5 py-4 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
        {emptyNote ?? '아직 이곳의 최근 제보가 없습니다. 다녀오셨다면 첫 기록을 남겨 주세요.'}
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {observations.map((obs) => {
        const species = speciesById.get(obs.speciesId);
        const mine = verified[obs.id] ?? false;
        return (
          <li
            key={obs.id}
            className="flex items-center gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5"
          >
            <span aria-hidden className="text-[16px]">
              {species?.icon ?? '🐟'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                <span className="font-medium">{species?.name ?? '알 수 없음'}</span>
                {obs.quantityLevel && (
                  <span className="text-[color:var(--color-muted)]">
                    {QUANTITY_LABEL[obs.quantityLevel]}
                  </span>
                )}
                {obs.catchSizeCm && (
                  <span className="tabular text-[color:var(--color-muted)]">{obs.catchSizeCm}cm</span>
                )}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-[color:var(--color-faint)]">
                {relativeDay(obs.observedAt)}
                {obs.fishingMethod ? ` · ${FISHING_METHOD_LABEL[obs.fishingMethod]}` : ''} ·{' '}
                {LOCATION_VISIBILITY_LABEL[obs.locationVisibility]}
              </span>
            </span>
            <button
              type="button"
              aria-pressed={mine}
              onClick={() => setVerified((v) => ({ ...v, [obs.id]: !v[obs.id] }))}
              className={`shrink-0 rounded-lg border px-2 py-1 text-[11.5px] transition-colors ${
                mine
                  ? 'border-transparent bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]'
                  : 'border-[color:var(--color-line)] text-[color:var(--color-muted)] hover:border-[color:var(--color-ink)]/25'
              }`}
            >
              확인 {obs.verificationCount + (mine ? 1 : 0)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** 제보 입력 자리. 모델은 domain/marine.ts 의 FishingObservation 이다. */
export function ObservationFormShell({ zoneName }: { zoneName?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--color-line)] bg-white/50 px-4 py-4">
      <p className="text-[13px] font-medium text-[color:var(--color-ink-soft)]">
        여기서 뭘 만나셨나요?
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
        어종 · 날짜 · {zoneName ? `${zoneName} 권역` : '권역'}만 있으면 기록됩니다. 크기, 방식,
        사진은 선택입니다. 위치는 <strong className="font-medium">정확한 위치 / 약 3km 권역 / 지역만</strong>{' '}
        중에서 고를 수 있습니다.
      </p>
      <p className="mt-2 text-[11.5px] text-[color:var(--color-faint)]">준비 중 · 로그인 연동 후 열립니다</p>
    </div>
  );
}
