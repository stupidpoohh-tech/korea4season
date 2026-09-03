import type { NatureCategory } from './types';

/* ────────────────────────────────────────────────────────────
 * 자연 카테고리 레지스트리.
 *
 * 상위 구분은 둘이다.
 *
 *   지금 바다 — 무엇이 잡히는가 (어종 · 권역 · 규정)
 *   지금 산   — 무엇이 피고 물드는가 (꽃 · 단풍)
 *
 * 꽃과 단풍을 나란한 카테고리로 두지 않는다. 둘은 같은 산에서 계절만 달리해
 * 일어나는 일이라, 사용자가 "지금 뭘 보러 갈까" 를 물을 때 고를 것이 아니다.
 * 날짜가 정하면 된다 — 봄에는 꽃, 가을에는 단풍, 여름은 녹음, 겨울은 눈.
 *
 * 철새는 여기 이름만 있다. 준비되면 enabled 를 올리고 레이어만 붙인다.
 * ──────────────────────────────────────────────────────────── */

export const MAP_LAYERS = ['marine', 'mountain', 'bird'] as const;
export type MapLayerId = (typeof MAP_LAYERS)[number];

export interface NatureCategoryConfig {
  id: MapLayerId;
  label: string;
  icon: string;
  /** 지도에 실제로 그릴 수 있는가 */
  enabled: boolean;
  /** 이 레이어가 쓰는 데이터 카테고리. 아직 없는 것은 undefined. */
  dataCategories?: NatureCategory[];
  /** 카테고리를 바꿨을 때 상단에 쓰는 말 */
  headline: string;
  /** 준비 중인 카테고리를 눌렀을 때 */
  comingSoonMessage?: string;
}

export const NATURE_CATEGORIES: NatureCategoryConfig[] = [
  {
    id: 'marine',
    label: '바다',
    icon: '🌊',
    enabled: true,
    dataCategories: ['fishing'],
    headline: '지금, 바다',
  },
  {
    id: 'mountain',
    label: '산',
    icon: '⛰️',
    enabled: true,
    dataCategories: ['flower', 'foliage'],
    headline: '지금, 산',
  },
  {
    id: 'bird',
    label: '철새',
    icon: '🐦',
    enabled: false,
    headline: '지금, 철새',
    comingSoonMessage: '철새 지도는 준비 중이에요.',
  },
];

export const ENABLED_LAYERS = NATURE_CATEGORIES.filter((c) => c.enabled);

export function layerConfig(id: MapLayerId): NatureCategoryConfig {
  return NATURE_CATEGORIES.find((c) => c.id === id) ?? NATURE_CATEGORIES[0]!;
}
