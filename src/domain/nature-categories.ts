import type { NatureCategory } from './types';

/* ────────────────────────────────────────────────────────────
 * 자연 카테고리 레지스트리.
 *
 * 이 서비스는 결국 바다 · 꽃 · 단풍 · 철새를 같은 껍데기 위에 올린다.
 *   지금 상태 → 보기 방식 → 필터 → 지도 → 추천 → 시간
 *
 * 다만 **인터페이스는 넷을 위해 만들고, 기능은 하나씩 완성한다.**
 * 지금 실제로 동작하는 것은 바다와 단풍뿐이고,
 * 꽃 · 철새는 여기 이름만 있다 — 데이터도, 레이어도, 상세도 없다.
 * 준비되면 enabled 를 true 로 올리고 그 카테고리의 레이어만 붙이면 된다.
 * ──────────────────────────────────────────────────────────── */

export const MAP_LAYERS = ['marine', 'foliage', 'flower', 'bird'] as const;
export type MapLayerId = (typeof MAP_LAYERS)[number];

export interface NatureCategoryConfig {
  id: MapLayerId;
  label: string;
  icon: string;
  /** 지도에 실제로 그릴 수 있는가 */
  enabled: boolean;
  /** 이 레이어가 쓰는 데이터 카테고리. 아직 없는 것은 undefined. */
  dataCategory?: NatureCategory;
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
    dataCategory: 'fishing',
    headline: '지금, 바다',
  },
  {
    id: 'foliage',
    label: '단풍',
    icon: '🍁',
    enabled: true,
    dataCategory: 'foliage',
    headline: '지금, 단풍',
  },
  {
    id: 'flower',
    label: '꽃',
    icon: '🌸',
    enabled: false,
    headline: '지금, 꽃',
    comingSoonMessage: '꽃 지도는 준비 중이에요.',
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
