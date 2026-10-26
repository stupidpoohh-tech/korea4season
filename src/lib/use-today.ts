'use client';

import { useSyncExternalStore } from 'react';
import { todayKey, type DateKey } from '@/domain/date';

/* ────────────────────────────────────────────────────────────
 * '오늘' 은 브라우저가 정한다.
 *
 * 예전에는 서버가 todayKey() 를 불러 HTML 에 날짜를 박았다. 그래서 모든
 * 페이지에 revalidate = 900 이 붙어 있었다 — 15분마다 다시 구워야 날짜가
 * 안 틀리기 때문이다. 그 한 가지 때문에 모든 화면 요청이 Worker 를 깨웠다.
 *
 * 브라우저가 날짜를 정하면 그럴 이유가 없어진다. HTML 에는 날짜가 들어가지
 * 않으므로 한 번 구워 두면 되고, 화면에 보이는 '오늘' 은 15분 전이 아니라
 * **지금** 이다 — 정확도는 오히려 올라간다.
 *
 * 서버 스냅샷이 null 인 것이 핵심이다. 서버가 그린 HTML 과 브라우저의 첫
 * 렌더가 같아야 hydration 이 어긋나지 않는다. 날짜는 붙은 다음에 들어온다.
 * (같은 방식을 쓰는 곳: lib/use-wide-screen.ts)
 * ──────────────────────────────────────────────────────────── */

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * 자정을 넘기는 순간을 놓치지 않는다.
 *
 * 탭을 열어 둔 채 날이 바뀌면 화면의 '오늘' 이 어제로 남는다. 1분마다
 * 날짜만 다시 읽어 바뀐 날에만 알린다 — getSnapshot 이 같은 문자열을
 * 돌려주면 React 가 그냥 넘긴다. 예전 15분 재검증보다 촘촘하다.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  timer ??= setInterval(() => {
    for (const l of listeners) l();
  }, 60_000);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = (): DateKey => todayKey();
const getServerSnapshot = (): null => null;

/** 붙기 전에는 null. 날짜가 필요한 화면은 그동안 자리만 잡아 둔다. */
export function useToday(): DateKey | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
