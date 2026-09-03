'use client';

import { useSyncExternalStore } from 'react';

/** Tailwind 의 lg. 이 폭부터 좌측 레일을 쓴다. */
const QUERY = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const read = () => window.matchMedia(QUERY).matches;

/**
 * 지금 화면이 데스크톱 폭인가.
 *
 * 서버와 hydration 시점에는 null 이다 — 그때는 어느 쪽인지 알 수 없으므로
 * 화면은 양쪽을 다 그리고(지금까지처럼 CSS 가 하나를 감춘다), 붙은 뒤에
 * 쓰지 않는 쪽을 내린다.
 *
 * CSS 로만 감추면 보이지 않는 쪽도 트리에 그대로 남는다. 날짜를 끄는 동안
 * 초당 수십 번 다시 그리는 화면에서는 보이지도 않는 목록 22줄을 매번 다시
 * 맞춰 보는 일이 된다.
 */
export function useWideScreen(): boolean | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
