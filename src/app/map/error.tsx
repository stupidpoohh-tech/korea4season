'use client';

import { useEffect } from 'react';

/* ────────────────────────────────────────────────────────────
 * 지도가 넘어졌을 때.
 *
 * 이것이 없으면 화면에서 예외가 하나만 새어 나가도 React 가 트리를 통째로
 * 내리고 사용자에게는 빈 화면만 남는다. 무엇이 잘못됐는지도, 무엇을 하면
 * 되는지도 남지 않는다.
 *
 * 여기서 하는 일은 둘이다 — 사람에게 다시 시도할 길을 주고,
 * 진단 패널(?debug=1)이 읽을 수 있게 기록을 남긴다.
 * ──────────────────────────────────────────────────────────── */

export default function MapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('지도 오류', error.message, error.digest ?? '');
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[15px] font-semibold text-[color:var(--color-ink)]">
        지도를 그리지 못했어요
      </p>
      <p className="text-[13px] leading-[19px] text-[color:var(--color-muted)]">
        잠시 후 다시 시도해 주세요. 계속 같은 화면이 나오면 주소 뒤에{' '}
        <span className="tabular font-medium text-[color:var(--color-ink-soft)]">?debug=1</span> 을
        붙여 진단 내용을 보내 주시면 원인을 찾을 수 있습니다.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-[color:var(--color-ink)] px-4 py-2 text-[13px] font-semibold text-white"
      >
        다시 시도
      </button>
    </div>
  );
}
