import Link from 'next/link';

/* ────────────────────────────────────────────────────────────
 * 만든 사람.
 *
 * 지도 한 화면이 세로를 꽉 쓰므로 이 줄은 최소 높이(32px)로 고정한다.
 * MapScreen 이 100dvh 에서 이 높이를 빼고 있으니 값을 바꾸면 그쪽도 함께 바꿔야 한다.
 * ──────────────────────────────────────────────────────────── */

/** 푸터 높이 (px). 지도 화면이 이 값을 빼고 자기 높이를 잡는다. */
export const SITE_FOOTER_HEIGHT = 32;

export function SiteFooter() {
  return (
    <footer className="flex h-8 items-center justify-center gap-2 text-[12.5px] text-[color:var(--color-faint)]">
      만든사람 DADA
      <Link
        href="https://dada-town.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="만든 사람 DADA 홈으로 가기"
        className="flex h-6 w-6 items-center justify-center rounded-lg border border-[color:var(--color-line)] text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-ink)]/30 hover:text-[color:var(--color-ink-soft)]"
      >
        <svg aria-hidden width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path
            d="M1.9 6.2 7 1.9l5.1 4.3M3.4 7.4v4.7h7.2V7.4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </footer>
  );
}
