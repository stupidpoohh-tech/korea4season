'use client';

import { BIRD_STATE_LABEL } from '@/domain/bird';
import type { BirdPresence } from '@/services/bird-service';
import { Sheet, SheetRow } from '@/components/common/Sheet';
import { SpeciesSprite } from './SpeciesSprite';

/* ────────────────────────────────────────────────────────────
 * 철새 상세.
 *
 * 새 interaction system 을 만들지 않고 기존 Sheet 를 그대로 쓴다.
 *
 * 여기에 자연 정보를 쓰지 않는다. 지금 이 화면이 들고 있는 것은 합성
 * fixture 이고, 실제 종 · 지역 · 시기를 모르는 상태에서 설명을 지어내면
 * 그것은 데이터가 없다는 사실을 감추는 일이 된다.
 * 그래서 말하는 것은 셋뿐이다 — 무엇을, 어디서, 지금 어떤 상태로.
 * 그리고 이 자료가 어떤 성격인지.
 * ──────────────────────────────────────────────────────────── */

export function BirdDetailSheet({
  presence,
  onClose,
}: {
  presence: BirdPresence | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={Boolean(presence)}
      onClose={onClose}
      label={presence ? `${presence.species.name} 상세` : '철새 상세'}
      header={
        presence ? (
          <div className="flex items-center gap-2.5">
            <SpeciesSprite entity={presence.species} size={34} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-tight">
                {presence.species.name}
              </p>
              <p className="truncate text-[12px] text-[color:var(--color-muted)]">
                {presence.regionLabel} · {BIRD_STATE_LABEL[presence.state]}
              </p>
            </div>
          </div>
        ) : null
      }
    >
      {presence && (
        <>
          <dl className="divide-y divide-[color:var(--color-line-soft)]">
            <SheetRow label="지역">{presence.regionLabel}</SheetRow>
            <SheetRow label="지금 상태">{BIRD_STATE_LABEL[presence.state]}</SheetRow>
            <SheetRow label="자료 성격">
              {presence.sourceType} · {presence.evidenceStatus}
            </SheetRow>
            {presence.note && <SheetRow label="비고">{presence.note}</SheetRow>}
          </dl>

          <p className="rounded-lg border border-dashed border-[color:var(--color-line)] px-3 py-2.5 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
            이 대상은 <span className="font-semibold">Prototype 검증용 합성 자료</span>입니다.
            실제 종 · 지역 · 도래 시기가 아니며, 탐조 판단에 쓸 수 없습니다.
          </p>

          <p className="text-[11.5px] leading-relaxed text-[color:var(--color-faint)]">
            지도 위의 자리는 종과 지역이 정합니다. 날짜를 옮기면 자리는 그대로 있고
            존재감만 바뀝니다 — 이 지도는 이동 경로를 그리지 않습니다.
          </p>
        </>
      )}
    </Sheet>
  );
}
