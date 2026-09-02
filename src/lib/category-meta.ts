import type { NatureCategory } from '@/domain/types';

export interface CategoryMeta {
  id: NatureCategory;
  label: string;
  icon: string;
  color: string;
  /** Phase 1 에서 데이터가 완성도 있게 채워졌는가 */
  primary: boolean;
}

export const CATEGORY_META: Record<NatureCategory, CategoryMeta> = {
  fishing: { id: 'fishing', label: '바다', icon: '🐟', color: 'var(--color-cat-fishing)', primary: true },
  flower: { id: 'flower', label: '꽃', icon: '🌸', color: 'var(--color-cat-flower)', primary: false },
  foliage: { id: 'foliage', label: '단풍', icon: '🍁', color: 'var(--color-cat-foliage)', primary: false },
  bird: { id: 'bird', label: '철새', icon: '🐦', color: 'var(--color-cat-bird)', primary: false },
  marine: { id: 'marine', label: '해양생물', icon: '🐬', color: 'var(--color-cat-marine)', primary: false },
  nature: { id: 'nature', label: '자연', icon: '🌿', color: 'var(--color-cat-nature)', primary: false },
};

export const CATEGORY_ORDER: NatureCategory[] = [
  'fishing',
  'flower',
  'foliage',
  'bird',
  'marine',
  'nature',
];
