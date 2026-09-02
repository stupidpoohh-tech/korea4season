import { getMonth, type DateKey } from '@/domain/date';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonMeta {
  id: Season;
  label: string;
  /** 지도 위에 아주 옅게 덮는 계절 톤 (요구사항 #4, #40) */
  wash: string;
  chip: string;
}

export const SEASONS: Record<Season, SeasonMeta> = {
  spring: {
    id: 'spring',
    label: '봄',
    wash: 'linear-gradient(180deg, rgba(255,186,212,.13), rgba(255,238,186,.07))',
    chip: '#e79ab7',
  },
  summer: {
    id: 'summer',
    label: '여름',
    wash: 'linear-gradient(180deg, rgba(120,210,255,.11), rgba(90,205,150,.08))',
    chip: '#3fb0c9',
  },
  autumn: {
    id: 'autumn',
    label: '가을',
    wash: 'linear-gradient(180deg, rgba(255,178,92,.12), rgba(214,120,58,.07))',
    chip: '#d18b41',
  },
  winter: {
    id: 'winter',
    label: '겨울',
    wash: 'linear-gradient(180deg, rgba(186,212,255,.16), rgba(236,246,255,.10))',
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
