'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { todayKey } from '@/domain/date';
import { useMapStore } from '@/store/map-store';
import { useTimeStore } from '@/store/time-store';
import {
  diagEntries,
  installDiagnostics,
  subscribeDiag,
  type DiagEntry,
} from '@/lib/diagnostics';

/* ────────────────────────────────────────────────────────────
 * 운영 진단 패널.
 *
 * 주소 뒤에 ?debug=1 을 붙이면 열린다. 평소에는 아무것도 그리지 않는다 —
 * 사용자가 보는 화면에 개발용 상자가 떠 있을 이유가 없다.
 *
 * 여기서 답하려는 것은 하나다: **이 HTML 을 언제 누가 그렸는가.**
 * 서버가 그린 날짜와 브라우저의 오늘이 다르면 그 화면은 미리 구워진 것이고,
 * 그것이 지금까지 hydration 이 어긋나던 이유였다. 숫자를 나란히 놓으면
 * 화면을 열어 보지 않고도 그 판정을 옮길 수 있다.
 * ──────────────────────────────────────────────────────────── */

// 수집은 패널을 열기 전부터 돌아야 한다 (첫 순간의 오류를 놓치지 않게)
installDiagnostics();

const STORAGE_KEY = 'jigeum-debug';

/*
 * 켜짐 여부는 React 바깥의 상태다 — 주소와 sessionStorage 가 정한다.
 *
 * sessionStorage 에 두는 이유는 하나다. 지도 화면이 주소를 계속 다시 쓰기 때문에
 * (?date=… 로 replaceState) ?debug=1 은 첫 순간에만 있고 곧 사라진다.
 */
const flagListeners = new Set<() => void>();

function readFlag(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeFlag(on: boolean) {
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, '1');
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장이 막힌 브라우저에서도 화면은 그대로 동작해야 한다 */
  }
  for (const listener of flagListeners) listener();
}

// 모듈이 읽히는 시점(= hydration 직전)에 주소를 한 번 본다
if (typeof window !== 'undefined') {
  const flag = new URLSearchParams(window.location.search).get('debug');
  if (flag === '1') writeFlag(true);
  if (flag === '0') writeFlag(false);
}

function subscribeFlag(listener: () => void): () => void {
  flagListeners.add(listener);
  return () => flagListeners.delete(listener);
}

interface Props {
  /** 이 HTML 을 구운 시각 (ISO). 이제 모든 화면이 빌드 때 구워지므로 빌드 시각이다. */
  serverRenderedAt: string;
  /** HTML 을 구운 날의 '한국의 오늘'. 화면이 쓰는 날짜가 아니라 HTML 의 나이를 재는 기준이다. */
  serverToday: string;
  commit: string;
  buildAt: string;
}

export function DebugPanel({ serverRenderedAt, serverToday, commit, buildAt }: Props) {
  // 서버에서는 언제나 닫힘이다 — 그래야 서버와 브라우저의 첫 화면이 어긋나지 않는다
  const open = useSyncExternalStore(subscribeFlag, readFlag, () => false);
  const [, bump] = useState(0);
  const [copied, setCopied] = useState(false);

  const layer = useMapStore((s) => s.layer);
  const mode = useMapStore((s) => s.mode);
  const selectedDate = useTimeStore((s) => s.selectedDate);

  useEffect(() => subscribeDiag(() => bump((v) => v + 1)), []);

  const report = useCallback(() => {
    const now = new Date();
    const browserToday = todayKey();
    const rendered = new Date(serverRenderedAt);
    const ageMin = Math.round((now.getTime() - rendered.getTime()) / 60000);
    const doc = document.documentElement;

    const lines = [
      `[지금日지도 진단] ${now.toISOString()}`,
      `주소      ${window.location.pathname}${window.location.search}`,
      `배포      ${commit} · 빌드 ${buildAt}`,
      '',
      /*
       * 이제 모든 화면이 미리 구워진 정적 파일이고, 화면이 쓰는 '오늘' 은
       * 브라우저가 정한다. 그래서 아래 두 날짜가 다른 것은 정상이다 —
       * HTML 이 구워진 날과 지금 보고 있는 날이 다를 뿐이다.
       * 예전처럼 '불일치' 를 오류로 적으면 늘 거짓 경보가 난다.
       */
      `HTML 구움 ${serverRenderedAt}  (나이 ${ageMin}분)`,
      `구운 날   ${serverToday}`,
      `브라우저  ${browserToday}  (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
      `화면 날짜 ${selectedDate}  (브라우저가 정한다 — 구운 날과 달라도 정상)`,
      '',
      `화면      ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
      `가로 넘침 ${doc.scrollWidth - doc.clientWidth}px`,
      `지도      layer=${layer} mode=${mode} date=${selectedDate}`,
      `sprite    ${document.querySelectorAll('[style*="aspect-ratio"] button[aria-pressed]').length}개`,
      `오버레이  path ${document.querySelectorAll('svg[aria-hidden] path').length}개`,
      `DOM       ${document.querySelectorAll('*').length}개`,
      '',
      `기록 ${diagEntries().length}건`,
      ...diagEntries().map((e: DiagEntry) => `  ${e.at}ms [${e.level}] ${e.text}`),
    ];
    return lines.join('\n');
  }, [serverRenderedAt, serverToday, commit, buildAt, layer, mode, selectedDate]);

  const copy = useCallback(async () => {
    const text = report();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드가 막힌 환경(비보안 컨텍스트 등)에서는 선택해서 복사할 수 있게 남긴다
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [report]);

  if (!open) return null;

  const errors = diagEntries().filter((e) => e.level === 'error').length;

  return (
    <div
      role="dialog"
      aria-label="진단"
      className="fixed bottom-2 left-2 right-2 z-[60] max-h-[46dvh] overflow-auto rounded-xl border border-[color:var(--color-line)] bg-white/96 p-3 text-[11px] leading-[1.55] shadow-[var(--shadow-soft)] backdrop-blur-md lg:left-auto lg:w-[420px]"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold tracking-tight">진단</span>
        {errors > 0 && (
          <span className="rounded bg-[color:var(--color-restricted-soft)] px-1.5 py-px font-semibold text-[color:var(--color-restricted)]">
            오류 {errors}
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded-lg border border-[color:var(--color-line)] px-2 py-1 font-medium"
        >
          {copied ? '복사됨' : '전체 복사'}
        </button>
        <button
          type="button"
          onClick={() => writeFlag(false)}
          aria-label="진단 닫기"
          className="rounded-lg border border-[color:var(--color-line)] px-2 py-1"
        >
          ✕
        </button>
      </div>

      <pre className="whitespace-pre-wrap break-all font-mono text-[10.5px] text-[color:var(--color-ink-soft)]">
        {report()}
      </pre>
    </div>
  );
}
