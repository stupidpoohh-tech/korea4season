import Link from 'next/link';
import { formatKoreanDate, todayKey } from '@/domain/date';
import { seasonMeta } from '@/lib/season';
import { hasDemoData } from '@/services/nature-service';
import { TodayNature } from '@/components/today/TodayNature';
import { NatureNow } from '@/components/today/NatureNow';
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
          지금 대한민국의 자연에서는
          <br />
          무슨 일이 일어나고 있을까요?
        </h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="order-2 space-y-8 lg:order-1">
          <TodayNature date={date} />
          <NatureNow date={date} />

          <section aria-labelledby="week-preview">
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <h2 id="week-preview" className="text-[15px] font-semibold tracking-tight">
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
          현재 표시되는 금어기·개화·단풍·철새 정보는 개발용 예시 데이터입니다. 실제 금어기와
          금지체장은 수산자원관리법 시행령 개정과 시·도지사 고시에 따라 달라지며, 개화·단풍 시기는
          해마다 기온에 따라 크게 변합니다. 조업·낚시·방문 전에는 반드시 원문과 관할 기관 고시를
          확인해 주세요.
        </p>
      )}
    </main>
  );
}
