'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { formatKoreanDate, type DateKey } from '@/domain/date';
import { FISHING_METHOD_LABEL } from '@/domain/marine';
import { getFishingPicks } from '@/services/marine-service';
import { getWeekRange } from '@/services/nature-service';
import { Sheet } from '@/components/common/Sheet';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { SeasonStrengthMeter } from '@/components/marine/SeasonStrengthMeter';

/* ────────────────────────────────────────────────────────────
 * 추천은 navigation 이 아니라 decision support 다.
 *
 * 그래서 다른 화면으로 보내기 전에 여기서 바로 답한다 —
 * 무엇을, 어디서, 지금 얼마나 좋은지. 그리고 그 자리에서 지도로 돌려보낸다.
 * 규정으로 막힌 어종은 추천하지 않는다 (지도에서는 계속 보인다).
 * ──────────────────────────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  date: DateKey;
  /** 지도에서 이 어종을 골라 보여 준다. 지도에 없으면 false 를 돌려준다. */
  onShowOnMap: (speciesSlug: string) => boolean;
}

export function WeeklyPicksSheet({ open, onClose, date, onShowOnMap }: Props) {
  // 시트가 닫혀 있는 동안에는 계산하지 않는다
  const picks = useMemo(() => (open ? getFishingPicks(date, 6) : []), [open, date]);
  const { from, to } = useMemo(() => getWeekRange(date), [date]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="이번 주 추천"
      header={
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">이번 주, 뭐 잡으러 갈까요?</h2>
          <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
            {formatKoreanDate(from)} ~ {formatKoreanDate(to)} · 규정으로 막힌 어종은 뺐습니다
          </p>
        </div>
      }
    >
      {picks.length === 0 ? (
        <p className="rounded-xl bg-[color:var(--color-line-soft)] px-3 py-3 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          이번 주에는 추천할 만한 시즌이 없습니다. 시간을 앞당겨 다가올 시즌을 미리 살펴보세요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {picks.map((pick) => (
            <li
              key={`${pick.species.id}:${pick.zone.id}`}
              className="flex items-start gap-3 rounded-xl border border-[color:var(--color-line)] p-3"
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-sky-soft)]"
              >
                <SpeciesSprite entity={pick.species} size={18} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14.5px] font-semibold">{pick.species.name}</span>
                  <SeasonStrengthMeter state={pick.season.state} size="sm" />
                </div>
                <p className="mt-0.5 truncate text-[12.5px] text-[color:var(--color-muted)]">
                  📍 {pick.zone.name}
                </p>
                {pick.season.methods.length > 0 && (
                  <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]">
                    {pick.season.methods.map((m) => FISHING_METHOD_LABEL[m]).join(' · ')}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onShowOnMap(pick.species.slug)) onClose();
                }}
                className="shrink-0 self-center rounded-lg border border-[color:var(--color-line)] px-2.5 py-1.5 text-[12px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-strong)]"
              >
                지도에서 보기
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/week?date=${date}`}
        className="flex items-center justify-center gap-1 rounded-xl bg-[color:var(--color-ink)] px-3.5 py-2.5 text-[13.5px] font-semibold text-white"
      >
        이번 주 전체 보기
        <span aria-hidden className="opacity-70">
          ›
        </span>
      </Link>

      <p className="text-[11.5px] leading-relaxed text-[color:var(--color-faint)]">
        시즌 데이터는 개발용 DEMO 입니다. 출조 전 반드시 관할 지자체 고시와 현지 정보를 확인하세요.
      </p>
    </Sheet>
  );
}
