import { OG_BASE } from '@/domain/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatKoreanDate, toDateKey, todayKey } from '@/domain/date';
import {
  getOccurrenceBySlug,
  listOccurrenceSlugs,
  resolveBySlug,
} from '@/services/nature-service';
import { EventClient } from '@/components/nature/EventClient';

/*
 * 이 페이지는 정적 파일이다.
 *
 * 설명문의 기간(4월 3일 ~ 4월 14일)은 연도를 적지 않으므로 해가 바뀌어도
 * 그대로 읽힌다. 날짜를 타는 본문 — 지금 어느 단계인지, 며칠 남았는지 —
 * 은 EventClient 가 브라우저에서 그린다.
 */

export function generateStaticParams() {
  return listOccurrenceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = resolveBySlug(slug, todayKey());
  if (!item) return { title: '찾을 수 없는 자연현상' };

  const period = `${formatKoreanDate(toDateKey(item.window.start))} ~ ${formatKoreanDate(toDateKey(item.window.end))}`;
  const kind = item.occurrence.polarity === 'restricted' ? '금어기' : '시기';
  const places = item.locations.map((l) => l.name).join(', ') || item.occurrence.regions.join(', ');
  const title = `${item.entity.name} ${kind}`;

  return {
    title,
    description: `${places} ${item.entity.name} ${kind} ${period}. ${item.entity.summary}`,
    alternates: { canonical: `/event/${slug}` },
    /* OG_BASE 를 함께 펴지 않으면 이 화면에서만 미리보기 그림이 사라진다 */
    openGraph: {
      ...OG_BASE,
      title: `${title} · 지금日지도`,
      description: `${period} · ${places}`,
      type: 'article',
    },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getOccurrenceBySlug(slug)) notFound();
  return <EventClient slug={slug} />;
}
