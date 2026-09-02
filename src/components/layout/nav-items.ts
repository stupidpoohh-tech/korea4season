export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** 메인 네비게이션은 복잡하지 않게 유지한다. (요구사항 #15) */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '오늘', icon: '☀' },
  { href: '/map', label: '지도', icon: '🗺' },
  { href: '/week', label: '이번 주', icon: '📅' },
  { href: '/dex', label: '도감', icon: '📖' },
  { href: '/my', label: 'MY', icon: '☺' },
];
