import Link from 'next/link';
import { formatKoreanDate, todayKey } from '@/domain/date';
import { seasonMeta } from '@/lib/season';
import { hasDemoData } from '@/services/nature-service';
import { TodayNature } from '@/components/today/TodayNature';
import { NatureNow } from '@/components/today/NatureNow';
import { TodaySea } from '@/components/marine/TodaySea';
import { MarineNow } from '@/components/marine/MarineNow';
import { FishingPicks } from '@/components/marine/FishingPicks';
import { MapPreviewCard } from '@/components/map/MapPreviewCard';
import { WeekDiscovery } from '@/components/discovery/WeekDiscovery';

/** 날짜가 바뀌면 새로 렌더한다 */
export const revalidate = 900;

export default function HomePage() {
  const date = todayKey();
  const season = seasonMeta(date);

  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-10 pt-5 lg:px-6 lg:pt-8">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-[12.5px] text-[color:var(--color-muted)]">
          <span className="tabular">{formatKoreanDate(date, { year: true, weekday: true })}</span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
            style={{ background: `${season.chip}22`, color: season.chip }}
          >
            {season.label}
          </span>
        </p>
        <h1 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
          지금 바다에서는
          <br />
          무엇을 만날 수 있을까요?
        </h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="order-2 space-y-8 lg:order-1">
          <TodaySea date={date} />
          <MarineNow date={date} />

          <section aria-labelledby="week-fishing">
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <h2 id="week-fishing" className="text-[15px] font-semibold tracking-tight">
                이번 주, 뭐 잡으러 갈까요?
              </h2>
              <Link
                href="/week"
                className="text-[12.5px] text-[color:var(--color-muted)] underline underline-offset-2"
              >
                전체 보기
              </Link>
            </div>
            <FishingPicks date={date} limit={4} />
          </section>

          <section aria-labelledby="today-land" className="space-y-8 border-t border-[color:var(--color-line-soft)] pt-8">
            <TodayNature date={date} />
            <NatureNow date={date} />
            <div>
              <div className="mb-2.5 flex items-baseline justify-between gap-2">
                <h2 id="today-land" className="text-[15px] font-semibold tracking-tight">
                  이번 주 볼거리
                </h2>
                <Link
                  href="/week"
                  className="text-[12.5px] text-[color:var(--color-muted)] underline underline-offset-2"
                >
                  전체 보기
                </Link>
              </div>
              <WeekDiscovery date={date} limit={2} />
            </div>
          </section>
        </div>

        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-20">
            <MapPreviewCard date={date} />
          </div>
        </div>
      </div>

      {hasDemoData() && (
        <p className="mt-10 rounded-xl border border-dashed border-[color:var(--color-line)] px-4 py-3 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          <strong className="font-semibold text-[color:var(--color-ink-soft)]">
            DEMO 데이터 안내
          </strong>
          <br />
현재 표시되는 어종 시즌·금어기·개화·단풍·철새 정보는 개발용 예시 데이터입니다. 어종
          시즌은 근거를 대조하지 않은 placeholder 이며, 금어기와 금지체장은 수산자원관리법 시행령
          개정과 시·도지사 고시에 따라 달라집니다. 출조·방문 전에는 반드시 원문과 관할 기관
          고시를 확인해 주세요.
        </p>
      )}
    </main>
  );
}
