'use client';

import { useDexHydrated, useDexStore } from '@/store/dex-store';
import type { ResolvedOccurrence } from '@/domain/types';

/**
 * 알림 구독. (요구사항 #13)
 * Phase 1 은 구독 데이터만 남긴다 — 실제 발송(Web Push / Email)은 Phase 4.
 */
export function SubscribeButton({ item }: { item: ResolvedOccurrence }) {
  const hydrated = useDexHydrated();
  const subscriptions = useDexStore((s) => s.subscriptions);
  const toggle = useDexStore((s) => s.toggleSubscription);

  const subscribed = hydrated && Boolean(subscriptions[item.occurrence.id]);
  const restricted = item.occurrence.polarity === 'restricted';

  return (
    <button
      type="button"
      onClick={() => toggle(item.occurrence.id, item.entity.id)}
      aria-pressed={subscribed}
      className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-[14px] font-medium transition-colors ${
        subscribed
          ? 'border-transparent bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]'
          : 'border-[color:var(--color-line)] bg-white text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]'
      }`}
    >
      <span aria-hidden>{subscribed ? '♥' : '♡'}</span>
      {subscribed
        ? '알림받는 중'
        : restricted
          ? '금어기 시작·해제 알림받기'
          : '개화·절정 알림받기'}
    </button>
  );
}
