import type { NatureOccurrence, OccurrenceStatus } from '@/domain/types';

/**
 * 상태는 색만으로 전달하지 않는다. 기호 + 텍스트를 함께 쓴다. (요구사항 #28)
 * 금어기(restricted)와 관찰 대상(observable)은 같은 상태라도 뜻이 반대라
 * 라벨과 색을 분리한다.
 */
export interface StatusMeta {
  symbol: string;
  label: string;
  /** 배지 배경 */
  bg: string;
  /** 배지 글자색 */
  fg: string;
  /** 지도 sprite 링 색 */
  ring: string;
}

const NEUTRAL = {
  bg: 'bg-[color:var(--color-line-soft)]',
  fg: 'text-[color:var(--color-muted)]',
  ring: 'var(--color-faint)',
};

const LIVE = {
  bg: 'bg-[color:var(--color-accent-soft)]',
  fg: 'text-[color:var(--color-accent-strong)]',
  ring: 'var(--color-accent)',
};

const PEAK = {
  bg: 'bg-[color:var(--color-peak-soft)]',
  fg: 'text-[color:var(--color-peak)]',
  ring: 'var(--color-peak)',
};

const STOP = {
  bg: 'bg-[color:var(--color-restricted-soft)]',
  fg: 'text-[color:var(--color-restricted)]',
  ring: 'var(--color-restricted)',
};

const SYMBOL: Record<OccurrenceStatus, string> = {
  upcoming: '●',
  starting: '◔',
  active: '◐',
  peak: '★',
  ending: '◕',
  ended: '○',
};

const OBSERVABLE_LABEL: Record<OccurrenceStatus, string> = {
  upcoming: '시작 전',
  starting: '시작됨',
  active: '진행 중',
  peak: '절정',
  ending: '저무는 중',
  ended: '종료',
};

const RESTRICTED_LABEL: Record<OccurrenceStatus, string> = {
  upcoming: '조업 가능',
  starting: '금어기 시작',
  active: '금어기',
  peak: '금어기',
  ending: '해제 임박',
  ended: '금어기 해제',
};

export function statusMeta(
  status: OccurrenceStatus,
  polarity: NatureOccurrence['polarity'],
): StatusMeta {
  const restricted = polarity === 'restricted';
  const label = restricted ? RESTRICTED_LABEL[status] : OBSERVABLE_LABEL[status];

  let tone = NEUTRAL;
  if (restricted) {
    if (status === 'starting' || status === 'active' || status === 'peak' || status === 'ending') {
      tone = STOP;
    } else if (status === 'ended' || status === 'upcoming') {
      tone = LIVE;
    }
  } else if (status === 'peak') {
    tone = PEAK;
  } else if (status === 'starting' || status === 'active' || status === 'ending') {
    tone = LIVE;
  }

  return { symbol: SYMBOL[status], label, ...tone };
}
