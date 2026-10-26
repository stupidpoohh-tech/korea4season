'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Phase 1 은 지도 한 화면에 집중한다.
 *
 * 오늘 · 이번 주 · 도감 · MY 화면은 삭제하지 않고 라우트를 살려 두었다
 * (/home · /week · /dex · /my). 탭을 다시 열 때는
 * components/layout/nav-items.ts 의 visible 플래그만 바꾸고
 * 이 화면을 걷어내면 된다.
 *
 * 서버 redirect() 를 쓰지 않는다. 그것 하나 때문에 주소창에 도메인만 친
 * 방문자가 전부 Worker 를 깨우게 되고, 이 앱에서 서버가 할 일은 그것뿐이다.
 * 정적 HTML 한 장을 돌려주고 브라우저가 옮겨 가게 한다 —
 * JS 가 꺼져 있어도 meta refresh 가 받는다.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/map');
  }, [router]);

  return (
    <>
      <noscript>
        <meta httpEquiv="refresh" content="0; url=/map" />
      </noscript>
      <main className="flex min-h-[60dvh] items-center justify-center">
        <p className="text-[13px] text-[color:var(--color-muted)]">
          지도를 여는 중입니다…{' '}
          <a href="/map" className="underline underline-offset-2">
            바로 가기
          </a>
        </p>
      </main>
    </>
  );
}
