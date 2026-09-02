import { getMonth, type DateKey } from '@/domain/date';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonMeta {
  id: Season;
  label: string;
  /** 계절을 알리는 자리는 타임라인의 이 색 칩 하나다 */
  chip: string;
}

export const SEASONS: Record<Season, SeasonMeta> = {
  spring: {
    id: 'spring',
    label: '봄',
    chip: '#e79ab7',
  },
  summer: {
    id: 'summer',
    label: '여름',
    chip: '#3fb0c9',
  },
  autumn: {
    id: 'autumn',
    label: '가을',
    chip: '#d18b41',
  },
  winter: {
    id: 'winter',
    label: '겨울',
    chip: '#8aa6cc',
  },
};

export function seasonOf(date: DateKey): Season {
  const m = getMonth(date);
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export function seasonMeta(date: DateKey): SeasonMeta {
  return SEASONS[seasonOf(date)];
}
