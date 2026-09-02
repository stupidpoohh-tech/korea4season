'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { formatKoreanDate, getMonth, type DateKey } from '@/domain/date';
import type { DateWindow } from '@/domain/occurrence';
import { FISHING_METHOD_LABEL } from '@/domain/marine';
import { LEGAL_STATUS_LABEL, isLegallyBlocked } from '@/domain/regulation';
import type { MarineMapItem } from '@/services/marine-service';
import { Sheet } from '@/components/common/Sheet';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { DemoBadge } from '@/components/common/DemoBadge';
import { useDexHydrated, useDexStore } from '@/store/dex-store';
import { SeasonStrengthMeter } from './SeasonStrengthMeter';
import { LegalNotice } from './LegalNotice';
import { ObservationSummaryLine } from './ObservationList';

interface Props {
  item: MarineMapItem | null;
  date: DateKey;
  onClose: () => void;
  onOpenZone?: (zoneSlug: string) => void;
}

/** "6월 — 10월". 정확한 날짜보다 시기의 폭이 먼저 읽혀야 한다. */
function monthRange(window: DateWindow): string {
  const from = getMonth(window.start);
  const to = getMonth(window.end);
  return from === to ? `${from}월` : `${from}월 — ${to}월`;
}

function exactRange(window: DateWindow): string {
  return `${formatKoreanDate(window.start)} ~ ${formatKoreanDate(window.end)}`;
}

/**
 * 어종 상세 — 출조 판단 순서.
 *
 * 순서가 곧 제품 방향이다.
 *   지금 시즌 → 시기 → 어디서 → 실제 지금 → 어떻게 → 규정
 * 규정을 맨 위로 올리면 다시 금어기 앱이 된다.
 *
 * 다만 맨 위 요약에서는 시즌과 규정을 나란히 두되 서로 다른 축으로 보이게 한다 —
 * "시즌은 좋은데 지금은 규정을 확인해야 하네" 가 한눈에 읽혀야 하기 때문이다.
 */
export function MarineDetailSheet({ item, date, onClose, onOpenZone }: Props) {
  const discover = useDexStore((s) => s.discover);

  useEffect(() => {
    if (item) discover(item.species.id, date);
  }, [item, date, discover]);

  return (
    <Sheet
      open={Boolean(item)}
      onClose={onClose}
      label={item ? `${item.species.name} 상세` : ''}
      header={
        item && (
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-sky-soft)]"
            >
              <SpeciesSprite entity={item.species} size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="text-[17px] font-semibold tracking-tight">{item.species.name}</h2>
                {item.species.aliases?.length ? (
                  <span className="text-[12px] text-[color:var(--color-muted)]">
                    {item.species.aliases.join(' · ')}
                  </span>
                ) : null}
                <DemoBadge />
              </div>
              {item.species.speciesName && (
                <p className="mt-0.5 text-[11.5px] italic text-[color:var(--color-faint)]">
                  {item.species.speciesName}
                </p>
              )}
            </div>
          </div>
        )
      }
    >
      {item && (
        <>
          {/* 1. 두 축을 나란히 — 잘 잡히는가 / 잡아도 되는가 */}
          <StatusPair item={item} />

          <p className="text-[13.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
            {item.species.summary}
          </p>

          {/* 2. 시기 */}
          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold">시기</h3>
            <dl className="space-y-1.5">
              <SeasonRow label="주요 시즌" window={item.season.window} />
              {item.season.peakWindow && (
                <SeasonRow label="피크" window={item.season.peakWindow} highlight />
              )}
            </dl>
            {item.season.daysToNextChange !== undefined && item.season.nextChangeLabel && (
              <p className="mt-1.5 text-[12.5px] text-[color:var(--color-muted)]">
                {item.season.nextChangeLabel}{' '}
                <span className="font-semibold tabular text-[color:var(--color-ink)]">
                  {item.season.daysToNextChange}일
                </span>
              </p>
            )}
          </section>

          {/* 3. 어디서 */}
          <section>
            <h3 className="mb-2 text-[13px] font-semibold">
              지금 만나기 좋은 권역
              <span className="ml-1.5 font-normal text-[color:var(--color-muted)]">
                {item.seaRegion} · {item.activeZones.length}곳
              </span>
            </h3>
            <ul className="space-y-1">
              {item.activeZones.slice(0, 6).map(({ zone, season }) => (
                <li key={zone.id}>
                  <button
                    type="button"
                    onClick={() => onOpenZone?.(zone.slug)}
                    className="flex w-full items-center gap-2 rounded-lg border border-[color:var(--color-line)] px-2.5 py-2 text-left transition-colors hover:border-[color:var(--color-ink)]/25"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {zone.name}
                    </span>
                    <SeasonStrengthMeter state={season.state} size="sm" />
                    <span aria-hidden className="text-[color:var(--color-faint)]">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. 실제 지금 */}
          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold">최근 관측</h3>
            {item.observation ? (
              <>
                <ObservationSummaryLine summary={item.observation} />
                <p className="mt-1 text-[11.5px] text-[color:var(--color-faint)]">최근 관측 기반</p>
              </>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
                최근 관측 데이터 준비 중입니다. 관측은 실제 오늘 기준이라 다른 날짜를 보고 있을
                때는 적용되지 않습니다.
              </p>
            )}
          </section>

          {/* 5. 어떻게 */}
          <MethodList item={item} />

          {/* 6. 규정 — 행동 직전의 safety layer */}
          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold">잡아도 되나요</h3>
            <LegalNotice legal={item.legal} />
          </section>

          {/* 7. 행동 */}
          <SpeciesActions item={item} onOpenZone={onOpenZone} />

          <p className="text-[11px] leading-relaxed text-[color:var(--color-faint)]">
            시즌 데이터는 개발용 DEMO 이며 근거를 대조하지 않았습니다. 실제 어황은 해마다 수온과
            조류에 따라 크게 달라집니다.
          </p>
        </>
      )}
    </Sheet>
  );
}

/**
 * 시즌과 규정을 한 화면에 두되 확실히 갈라 놓는다.
 * 같은 카드에 섞으면 "금어기라서 시즌이 나쁜 것" 으로 읽힌다.
 */
function StatusPair({ item }: { item: MarineMapItem }) {
  const blocked = isLegallyBlocked(item.legal.overallStatus);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] px-3 py-2.5">
        <p className="text-[11.5px] text-[color:var(--color-faint)]">지금 시즌</p>
        <div className="mt-1">
          <SeasonStrengthMeter state={item.state} />
        </div>
      </div>

      <div
        className={`rounded-xl border px-3 py-2.5 ${
          blocked
            ? 'border-[color:var(--color-restricted)]/25 bg-[color:var(--color-restricted-soft)]'
            : 'border-[color:var(--color-line)] bg-[color:var(--color-paper)]'
        }`}
      >
        <p className="text-[11.5px] text-[color:var(--color-faint)]">잡아도 되나요</p>
        <p
          className={`mt-1 text-[13px] font-semibold ${
            blocked
              ? 'text-[color:var(--color-restricted)]'
              : item.legal.noData
                ? 'text-[color:var(--color-muted)]'
                : 'text-[color:var(--color-accent-strong)]'
          }`}
        >
          {item.legal.noData ? '규정 미확인' : LEGAL_STATUS_LABEL[item.legal.overallStatus]}
        </p>
      </div>
    </div>
  );
}

function SeasonRow({
  label,
  window,
  highlight = false,
}: {
  label: string;
  window: DateWindow;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-[64px] shrink-0 text-[12.5px] text-[color:var(--color-faint)]">{label}</dt>
      <dd className="min-w-0 flex-1">
        <span
          className={`text-[14px] font-semibold tabular ${
            highlight ? 'text-[color:var(--color-peak)]' : 'text-[color:var(--color-ink)]'
          }`}
        >
          {monthRange(window)}
        </span>
        <span className="ml-2 text-[11.5px] tabular text-[color:var(--color-faint)]">
          {exactRange(window)}
        </span>
      </dd>
    </div>
  );
}

function MethodList({ item }: { item: MarineMapItem }) {
  const methods = [...new Set(item.activeZones.flatMap((z) => z.season.methods ?? []))];
  if (methods.length === 0) return null;
  return (
    <section>
      <h3 className="mb-1.5 text-[13px] font-semibold">추천 낚시 방식</h3>
      <ul className="flex flex-wrap gap-1.5">
        {methods.map((m) => (
          <li
            key={m}
            className="rounded-lg border border-[color:var(--color-line)] px-2 py-1 text-[12px] text-[color:var(--color-ink-soft)]"
          >
            {FISHING_METHOD_LABEL[m]}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 행동 버튼.
 * 알림과 도감은 Phase 1 에서 로컬 기록만 남긴다 — 발송은 Phase 4 다.
 */
function SpeciesActions({
  item,
  onOpenZone,
}: {
  item: MarineMapItem;
  onOpenZone?: (zoneSlug: string) => void;
}) {
  const hydrated = useDexHydrated();
  const subscriptions = useDexStore((s) => s.subscriptions);
  const toggleSubscription = useDexStore((s) => s.toggleSubscription);
  const records = useDexStore((s) => s.records);

  const subKey = `marine:${item.species.id}`;
  const subscribed = hydrated && Boolean(subscriptions[subKey]);
  const saved = hydrated && Boolean(records[item.species.id]);
  const topZone = item.activeZones[0]?.zone;

  const btn =
    'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-medium transition-colors';
  const idle =
    'border-[color:var(--color-line)] bg-white text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]';

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {topZone && (
          <button type="button" onClick={() => onOpenZone?.(topZone.slug)} className={`${btn} ${idle}`}>
            권역 보기
          </button>
        )}
        <button
          type="button"
          onClick={() => toggleSubscription(subKey, item.species.id, ['start', 'peak', 'end'])}
          aria-pressed={subscribed}
          className={`${btn} ${
            subscribed
              ? 'border-transparent bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]'
              : idle
          }`}
        >
          <span aria-hidden>{subscribed ? '♥' : '♡'}</span>
          {subscribed ? '알림받는 중' : '알림받기'}
        </button>
      </div>

      <div className="flex gap-1.5">
        <span
          className={`${btn} ${
            saved
              ? 'border-transparent bg-[color:var(--color-line-soft)] text-[color:var(--color-muted)]'
              : 'border-dashed border-[color:var(--color-line)] text-[color:var(--color-faint)]'
          }`}
        >
          {saved ? '도감에 저장됨' : '도감에 저장 중'}
        </span>
        <Link href={`/species/${item.species.slug}`} className={`${btn} ${idle}`}>
          어종 자세히 보기
        </Link>
      </div>
    </div>
  );
}
