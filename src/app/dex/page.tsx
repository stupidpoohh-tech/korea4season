import type { Metadata } from 'next';
import { getDexEntries } from '@/services/nature-service';
import { NatureDex } from '@/components/collection/NatureDex';

export const metadata: Metadata = {
  title: '자연도감',
  description: '지도에서 발견한 대한민국의 자연을 모아 봅니다.',
};

export default function DexPage() {
  const entries = getDexEntries();

  return (
    <main className="mx-auto max-w-[900px] px-4 pb-10 pt-5 lg:px-6 lg:pt-8">
      <header className="mb-5">
        <h1 className="text-[24px] font-semibold tracking-tight">자연도감</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--color-muted)]">
          지도에서 처음 열어본 자연이 여기에 기록됩니다.
        </p>
      </header>

      <NatureDex entries={entries} />
    </main>
  );
}
