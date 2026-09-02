import Link from 'next/link';
import type { DateKey } from '@/domain/date';
import { formatKoreanDate } from '@/domain/date';
import { getWeekPicks, getWeekRange, LAND_ONLY } from '@/services/nature-service';
import { NatureEventCard } from '@/components/nature/NatureEventCard';
import { EmptyState } from '@/components/common/EmptyState';

/**
 * 이번 주 어디 갈까. (요구사항 #12)
 * 질문은 '어디' 가 아니라 '이번 주 무엇을 볼 수 있을까' 다.
 */
export function WeekDiscovery({ date, limit = 6 }: { date: DateKey; limit?: number }) {
  const picks = getWeekPicks(date, limit, LAND_ONLY);
  const { from, to } = getWeekRange(date);

  if (picks.length === 0) {
    return (
      <EmptyState
        title="이번 주에는 볼거리가 잠잠합니다"
        description="계절이 바뀌면 이 목록이 채워집니다. 지도에서 시간을 앞당겨 다가올 계절을 미리 살펴보세요."
        action={
          <Link
            href="/map"
            className="rounded-lg bg-[color:var(--color-ink)] px-3.5 py-2 text-[13px] font-medium text-white"
          >
            지도 열기
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-[color:var(--color-muted)]">
        {formatKoreanDate(from)} ~ {formatKoreanDate(to)} 기준 · 지역별 추천
      </p>

      {picks.map((pick) => (
        <section key={pick.region} aria-labelledby={`week-${pick.region}`}>
          <h3
            id={`week-${pick.region}`}
            className="mb-2 text-[14px] font-semibold tracking-tight"
          >
            {pick.region}
          </h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {pick.items.map((item) => (
              <li key={item.occurrence.id}>
                <Link href={`/event/${item.occurrence.slug}`} className="block">
                  <NatureEventCard item={item} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
