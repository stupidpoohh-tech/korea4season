import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { DiscoveryToast } from '@/components/common/DiscoveryToast';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { DebugPanel } from '@/components/common/DebugPanel';
import { todayKey } from '@/domain/date';
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
  /*
   * 이 값들은 '이 HTML 을 서버가 언제 그렸는가' 를 말한다.
   *
   * 요청마다 그리는 화면(/map)에서는 지금 시각이 되고,
   * 미리 구워 두는 화면에서는 빌드한 시각이 그대로 남는다 —
   * 브라우저의 오늘과 나란히 놓으면 어느 쪽인지 바로 읽힌다.
   * 이 호출 자체는 렌더 방식을 바꾸지 않는다(헤더·쿠키를 읽지 않는다).
   */
  const serverRenderedAt = new Date().toISOString();
  const serverToday = todayKey();

  return (
    <html lang="ko">
      <body className="min-h-dvh">
        <Header demo={hasDemoData()} />
        <div className="pb-[env(safe-area-inset-bottom)] lg:pb-0">{children}</div>
        <SiteFooter />
        <BottomNavigation />
        <DiscoveryToast />
        {/* 평소에는 아무것도 그리지 않는다. 주소에 ?debug=1 을 붙일 때만 열린다. */}
        <DebugPanel
          serverRenderedAt={serverRenderedAt}
          serverToday={serverToday}
          commit={process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'local'}
          buildAt={process.env.NEXT_PUBLIC_BUILD_AT ?? 'unknown'}
        />
      </body>
    </html>
  );
}
