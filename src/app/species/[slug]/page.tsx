import { OG_BASE } from '@/domain/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getSpeciesAllZones,
  getSpeciesBySlug,
  listSpeciesSlugs,
} from '@/services/marine-service';
import { SpeciesClient } from '@/components/marine/SpeciesClient';

/*
 * 이 페이지는 정적 파일이다.
 *
 * 제목 · 설명 · 미리보기 그림은 날짜와 무관하므로 빌드 때 굳혀 둔다.
 * 날짜를 타는 본문('지금 시즌', '지금 좋은 권역', 최근 관측)은
 * SpeciesClient 가 브라우저에서 그린다.
 */

export function generateStaticParams() {
  return listSpeciesSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const species = getSpeciesBySlug(slug);
  if (!species) return { title: '찾을 수 없는 어종' };

  const zones = getSpeciesAllZones(species.id);
  const where = zones.slice(0, 3).map((z) => z.zone.name).join(', ');

  return {
    title: `${species.name} 시즌`,
    description: `${species.name}${species.aliases?.length ? `(${species.aliases[0]})` : ''} 시즌과 만나기 좋은 권역${where ? `: ${where}` : ''}. 금어기와 금지체장도 함께 확인하세요.`,
    alternates: { canonical: `/species/${slug}` },
    /* OG_BASE 를 함께 펴지 않으면 이 화면에서만 미리보기 그림이 사라진다 */
    openGraph: { ...OG_BASE, title: `${species.name} 시즌 · 지금日지도`, type: 'article' },
  };
}

export default async function SpeciesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getSpeciesBySlug(slug)) notFound();
  return <SpeciesClient slug={slug} />;
}
