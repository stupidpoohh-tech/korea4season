import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getZoneBySlug, listZoneSlugs } from '@/services/marine-service';
import { ZoneClient } from '@/components/marine/ZoneClient';

/*
 * 이 페이지는 정적 파일이다.
 *
 * 제목·설명에서 '지금 잡히는 어종' 을 빼고 권역 자체를 설명한다. 미리 구운
 * HTML 의 설명문에 '지금' 을 적으면 그 '지금' 은 빌드한 날에 멈춘다 —
 * 날짜를 타는 것은 전부 ZoneClient 가 브라우저에서 그린다.
 */

export function generateStaticParams() {
  return listZoneSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const zone = getZoneBySlug(slug);
  if (!zone) return { title: '찾을 수 없는 권역' };

  return {
    title: `${zone.name} 지금 뭐가 잡히나`,
    description: `${zone.name}(${zone.seaRegion})에서 만날 수 있는 어종과 시즌 강도, 금어기·금지체장을 함께 확인하세요.`,
    alternates: { canonical: `/zone/${slug}` },
  };
}

export default async function ZonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getZoneBySlug(slug)) notFound();
  return <ZoneClient slug={slug} />;
}
