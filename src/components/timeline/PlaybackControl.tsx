'use client';

import { useTimeStore } from '@/store/time-store';

export function PlaybackControl({ compact = false }: { compact?: boolean }) {
  const isPlaying = useTimeStore((s) => s.isPlaying);
  const togglePlay = useTimeStore((s) => s.togglePlay);

  return (
    <button
      type="button"
      onClick={togglePlay}
      aria-pressed={isPlaying}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
        compact ? 'h-8' : 'h-9'
      } ${
        isPlaying
          ? 'border-transparent bg-[color:var(--color-ink)] text-white'
          : 'border-[color:var(--color-line)] bg-white text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-strong)]'
      }`}
    >
      <span aria-hidden className="text-[11px]">
        {isPlaying ? '❚❚' : '▶'}
      </span>
      {isPlaying ? '정지' : '1년 재생'}
    </button>
  );
}
