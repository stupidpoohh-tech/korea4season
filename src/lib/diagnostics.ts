'use client';

/* ────────────────────────────────────────────────────────────
 * 운영 화면에서 무슨 일이 일어났는지 모아 둔다.
 *
 * 개발 중에는 콘솔을 열어 보면 되지만, 배포된 주소는 이 저장소 안에서
 * 열 수 없다(egress proxy 가 workers.dev 를 막는다). 그래서 브라우저가
 * 스스로 기록을 쌓아 두고, 사람이 그것을 통째로 복사해 옮길 수 있어야 한다.
 *
 * 수집은 항상 켜 둔다. 패널을 열었을 때만 걸면 그전에 난 오류 —
 * 특히 hydration 오류처럼 첫 순간에만 나는 것 — 를 놓친다.
 * 하는 일은 원래 함수를 그대로 부르고 줄 하나를 링 버퍼에 더하는 것뿐이다.
 * ──────────────────────────────────────────────────────────── */

export type DiagLevel = 'error' | 'warn' | 'info';

export interface DiagEntry {
  /** 페이지가 열린 뒤 지난 시간 (ms) */
  at: number;
  level: DiagLevel;
  text: string;
}

/** 오래된 것부터 버린다. 화면 하나를 진단하는 데 이 정도면 충분하다. */
const LIMIT = 60;
const entries: DiagEntry[] = [];
const listeners = new Set<() => void>();

let installed = false;
let started = 0;

function push(level: DiagLevel, text: string) {
  entries.push({ at: Math.round(performance.now() - started), level, text: trim(text) });
  if (entries.length > LIMIT) entries.shift();
  for (const listener of listeners) listener();
}

function trim(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 400 ? `${flat.slice(0, 400)}…` : flat;
}

function describe(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** 여러 번 불러도 한 번만 건다 */
export function installDiagnostics() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  started = performance.now();

  for (const level of ['error', 'warn'] as const) {
    const original = console[level];
    console[level] = (...args: unknown[]) => {
      push(level, args.map(describe).join(' '));
      original.apply(console, args);
    };
  }

  window.addEventListener('error', (event) => {
    push('error', `[window] ${event.message} @ ${event.filename ?? '?'}:${event.lineno ?? 0}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    push('error', `[promise] ${describe(event.reason)}`);
  });
}

export function diagEntries(): DiagEntry[] {
  return entries;
}

export function subscribeDiag(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function logDiag(text: string) {
  if (installed) push('info', text);
}
