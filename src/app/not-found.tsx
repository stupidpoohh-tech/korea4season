import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-[520px] flex-col items-center justify-center px-6 text-center">
      <p aria-hidden className="text-[34px]">
        🧭
      </p>
      <h1 className="mt-3 text-[19px] font-semibold tracking-tight">
        여기에는 아무 자연도 없습니다
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--color-muted)]">
        찾으시는 자연현상이 아직 등록되지 않았거나 주소가 바뀌었습니다. 지도로 돌아가 시간을
        움직여 보세요.
      </p>
      <Link
        href="/map"
        className="mt-5 rounded-lg bg-[color:var(--color-ink)] px-4 py-2.5 text-[13.5px] font-medium text-white"
      >
        지도 열기
      </Link>
    </main>
  );
}
