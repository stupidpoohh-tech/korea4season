import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { DiscoveryToast } from '@/components/common/DiscoveryToast';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { hasDemoData } from '@/services/nature-service';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    default: '지금日지도 — 대한민국 자연의 지금',
    template: '%s · 지금日지도',
  },
  description:
    '지금 대한민국의 자연에서는 무슨 일이 일어나고 있을까. 금어기, 개화, 단풍, 철새를 하나의 살아있는 지도 위에서 시간과 함께 봅니다.',
  keywords: ['금어기', '개화시기', '단풍 절정', '철새 도래', '제철', '지금日지도'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '지금日지도',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh">
        <Header demo={hasDemoData()} />
        <div className="pb-[env(safe-area-inset-bottom)] lg:pb-0">{children}</div>
        <SiteFooter />
        <BottomNavigation />
        <DiscoveryToast />
      </body>
    </html>
  );
}
