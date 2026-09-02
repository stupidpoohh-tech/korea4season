export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /**
   * 지금 내비게이션에 노출할지.
   *
   * Phase 1 은 지도 한 화면에 집중한다. 나머지 화면은 삭제하지 않고
   * 라우트와 코드를 그대로 살려 둔 채 탭에서만 감춘다.
   * 다시 열 때는 이 플래그만 true 로 바꾸면 된다.
   */
  visible: boolean;
}

/** 메인 네비게이션은 복잡하지 않게 유지한다. (요구사항 #15) */
export const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: '오늘', icon: '☀', visible: false },
  { href: '/map', label: '지도', icon: '🗺', visible: true },
  { href: '/week', label: '이번 주', icon: '📅', visible: false },
  { href: '/dex', label: '도감', icon: '📖', visible: false },
  { href: '/my', label: 'MY', icon: '☺', visible: false },
];

export const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.visible);

/** 갈 곳이 하나뿐이면 내비게이션 자체를 그리지 않는다 */
export const SHOW_NAVIGATION = VISIBLE_NAV_ITEMS.length > 1;

/**
 * 자연도감 화면이 열려 있는가.
 *
 * Phase 1 에서는 탭에서 감춰 두었다. 갈 수 없는 화면에 무언가를 기록했다고
 * 말하면 사용자는 있지도 않은 목록을 찾게 된다 — 도감이 닫혀 있는 동안에는
 * 기록도 하지 않고 그 안내도 띄우지 않는다.
 */
export const DEX_VISIBLE = NAV_ITEMS.some((item) => item.href === '/dex' && item.visible);
