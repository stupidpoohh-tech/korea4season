'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { formatDaysValue, formatKoreanDate, toDateKey, type DateKey } from '@/domain/date';
import { CATEGORY_META } from '@/lib/category-meta';
import type { ResolvedOccurrence } from '@/domain/types';
import { DemoBadge } from '@/components/common/DemoBadge';
import { useDexStore } from '@/store/dex-store';
import { NatureStatusBadge } from './NatureStatusBadge';
import { SourceBlock } from './SourceBlock';
import { SubscribeButton } from './SubscribeButton';

interface Props {
  item: ResolvedOccurrence | null;
  date: DateKey;
  onClose: () => void;
  /** 카드에서 지도로 이동시키고 싶을 때 */
  onFocusMap?: (item: ResolvedOccurrence) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-[68px] shrink-0 text-[12.5px] text-[color:var(--color-faint)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
        {children}
      </dd>
    </div>
  );
}

/**
 * 자연현상 상세. 모바일에서는 bottom sheet, 데스크톱에서는 우측 floating card.
 * 지도를 밀어내지 않는다. (요구사항 #34)
 */
export function NatureDetailSheet({ item, date, onClose, onFocusMap }: Props) {
  const reducedMotion = useReducedMotion() ?? false;
  const discover = useDexStore((s) => s.discover);

  // 상세를 처음 연 자연은 도감에 기록된다. (요구사항 #11)
  useEffect(() => {
    if (item) discover(item.entity.id, date);
  }, [item, date, discover]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[color:var(--color-ink)]/18 lg:hidden"
            aria-hidden
          />

          <motion.aside
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${item.entity.name} 상세`}
            initial={reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 1 }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }
            }
            className="fixed inset-x-0 bottom-0 z-50 max-h-[76vh] overflow-y-auto rounded-t-2xl border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-sheet)] lg:inset-auto lg:right-5 lg:top-1/2 lg:max-h-[78vh] lg:w-[380px] lg:-translate-y-1/2 lg:rounded-2xl lg:border"
          >
            <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-[color:var(--color-line-soft)] bg-[color:var(--color-surface)]/95 px-4 pb-3 pt-4 backdrop-blur-sm">
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px]"
                style={{ background: `${CATEGORY_META[item.entity.category].color}14` }}
              >
                {item.entity.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="text-[17px] font-semibold tracking-tight">{item.entity.name}</h2>
                  {item.occurrence.isDemo && <DemoBadge />}
                </div>
                {item.entity.speciesName && (
                  <p className="mt-0.5 text-[11.5px] italic text-[color:var(--color-faint)]">
                    {item.entity.speciesName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-line-soft)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-4 pb-6 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <NatureStatusBadge
                  status={item.status}
                  polarity={item.occurrence.polarity}
                  size="md"
                />
                {item.daysToNextChange !== undefined && item.nextChangeLabel && (
                  <span className="text-[13px] text-[color:var(--color-muted)]">
                    {item.nextChangeLabel}{' '}
                    <span className="font-semibold tabular text-[color:var(--color-ink)]">
                      {formatDaysValue(item.daysToNextChange)}
                    </span>
                  </span>
                )}
              </div>

              <p className="text-[13.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
                {item.entity.summary}
              </p>

              <dl className="divide-y divide-[color:var(--color-line-soft)] border-y border-[color:var(--color-line-soft)]">
                <Row label={item.occurrence.polarity === 'restricted' ? '금어기' : '기간'}>
                  <span className="tabular">
                    {formatKoreanDate(toDateKey(item.window.start))} ~{' '}
                    {formatKoreanDate(toDateKey(item.window.end))}
                  </span>
                </Row>

                {item.peakWindow && (
                  <Row label="절정">
                    <span className="tabular">
                      {formatKoreanDate(toDateKey(item.peakWindow.start))} ~{' '}
                      {formatKoreanDate(toDateKey(item.peakWindow.end))}
                    </span>
                  </Row>
                )}

                {item.entity.fishingRule?.minimumSizeCm !== undefined && (
                  <Row label="금지체장">{item.entity.fishingRule.minimumSizeCm}cm 이하</Row>
                )}
                {item.entity.fishingRule?.minimumWeightG !== undefined && (
                  <Row label="금지체중">{item.entity.fishingRule.minimumWeightG}g 이하</Row>
                )}

                <Row label="적용 지역">{item.occurrence.regions.join(' · ')}</Row>

                {item.locations.length > 0 && (
                  <Row label="장소">
                    {item.locations.map((l) => l.name).join(' · ')}
                    {onFocusMap && (
                      <button
                        type="button"
                        onClick={() => onFocusMap(item)}
                        className="ml-2 text-[12.5px] font-medium text-[color:var(--color-accent-strong)] underline underline-offset-2"
                      >
                        지도에서 보기
                      </button>
                    )}
                  </Row>
                )}

                {item.entity.fishingRule?.regionRules?.length ? (
                  <Row label="지역 규정">
                    <ul className="space-y-1">
                      {item.entity.fishingRule.regionRules.map((rule) => (
                        <li key={rule.scope}>
                          <span className="font-medium text-[color:var(--color-ink)]">
                            {rule.scope}
                          </span>
                          {rule.closedSeasonStart && rule.closedSeasonEnd && (
                            <span className="tabular"> · {rule.closedSeasonStart} ~ {rule.closedSeasonEnd}</span>
                          )}
                          {rule.note && (
                            <span className="block text-[12.5px] text-[color:var(--color-muted)]">
                              {rule.note}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Row>
                ) : null}
              </dl>

              <SubscribeButton item={item} />
              <SourceBlock occurrence={item.occurrence} />

              <Link
                href={`/event/${item.occurrence.slug}`}
                className="block rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-center text-[13px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]"
              >
                자세히 보기 · 공유하기
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
