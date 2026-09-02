import { redirect } from 'next/navigation';

/**
 * Phase 1 은 지도 한 화면에 집중한다.
 *
 * 오늘 · 이번 주 · 도감 · MY 화면은 삭제하지 않고 라우트를 살려 두었다
 * (/home · /week · /dex · /my). 탭을 다시 열 때는
 * components/layout/nav-items.ts 의 visible 플래그만 바꾸고
 * 이 리다이렉트를 걷어내면 된다.
 */
export default function RootPage() {
  redirect('/map');
}
