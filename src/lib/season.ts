import { getMonth, type DateKey } from '@/domain/date';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonMeta {
  id: Season;
  label: string;
  /**
   * 지도 위에 덮는 계절 톤 (요구사항 #4, #40).
   *
   * 화이트 지도에서는 아주 얕게만 얹는다. 지도 자체가 흰색이라
   * 예전 농도로는 바탕 전체가 그 계절 색으로 물든다.
   * soft-light 로 섞이길 기대할 수 없다는 점도 감안한 값이다 —
   * 지도 레이어가 will-change:transform 으로 stacking context 를 만들어
   * 블렌드가 격리되고, 사실상 그냥 얹히는 오버레이가 된다.
   */
  wash: string;
  /** 계절을 실제로 알리는 자리는 타임라인의 이 색 칩이다 */
  chip: string;
}

export const SEASONS: Record<Season, SeasonMeta> = {
  spring: {
    id: 'spring',
    label: '봄',
    wash: 'linear-gradient(180deg, rgba(255,186,212,.05), rgba(255,238,186,.025))',
    chip: '#e79ab7',
  },
  summer: {
    id: 'summer',
    label: '여름',
    wash: 'linear-gradient(180deg, rgba(120,210,255,.045), rgba(90,205,150,.03))',
    chip: '#3fb0c9',
  },
  autumn: {
    id: 'autumn',
    label: '가을',
    wash: 'linear-gradient(180deg, rgba(255,178,92,.045), rgba(214,120,58,.025))',
    chip: '#d18b41',
  },
  winter: {
    id: 'winter',
    label: '겨울',
    wash: 'linear-gradient(180deg, rgba(186,212,255,.06), rgba(236,246,255,.03))',
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
