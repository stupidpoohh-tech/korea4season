'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import type { MapSprite } from '@/services/map-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { spriteVariation, variationTransform } from '@/lib/sprite-variation';

interface Props {
  sprite: MapSprite;
  selected: boolean;
  /** 확대 배율. sprite 는 확대돼도 같은 크기를 유지한다. */
  scale: number;
  /** 미리보기처럼 작은 지도에서 sprite 를 함께 줄인다 */
  spriteScale?: number;
  reducedMotion: boolean;
  onSelect: (sprite: MapSprite) => void;
}

/**
 * 지도 위의 생물 하나.
 *
 * 동그란 스티커에 담지 않고 그림만 오려서 놓는다 —
 * 배지처럼 보이면 지도가 아니라 목록처럼 읽힌다.
 *
 * 원 테두리로 하던 상태 표시는 이렇게 옮겼다.
 *   시즌 강도 → 크기와 불투명도
 *   절정      → 뒤쪽의 옅은 빛무리
 *   규정 제한 → 그림 모서리의 작은 표시 (있지만 잡으면 안 된다)
 *   선택      → 짙은 그림자와 이름표
 */
function NatureSpriteBase({
  sprite,
  selected,
  scale,
  spriteScale = 1,
  reducedMotion,
  onSelect,
}: Props) {
  const { position, prominence, restricted, accent, entity } = sprite;
  const peak = prominence >= 1;
  // 같은 키에서 뽑으므로 리렌더나 재생 중에도 흔들리지 않는다
  const variation = variationTransform(spriteVariation(sprite.key));
  const size = 30 + prominence * 18;

  return (
    <motion.button
      type="button"
      layout={false}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 0.62 + prominence * 0.38, scale: 1 }}
      exit={{ opacity: 0, scale: 0.72 }}
      transition={
        reducedMotion
          ? { duration: 0.12 }
          : { type: 'spring', stiffness: 460, damping: 26, mass: 0.7 }
      }
      onClick={(event) => {
        event.stopPropagation();
        onSelect(sprite);
      }}
      className="no-tap-highlight absolute z-10 origin-center"
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
      /*
       * motion 이 transform 을 직접 관리하므로 style.transform 은 덮어쓰인다.
       * 중심 정렬과 확대 보정은 transformTemplate 으로 앞에 붙인다.
       */
      transformTemplate={(_latest, generated) =>
        `translate(-50%, -50%) scale(${spriteScale / scale}) ${generated}`
      }
      aria-label={`${sprite.name} · ${sprite.placeLabel}${restricted ? ' · 규정 확인 필요' : ''}`}
      aria-pressed={selected}
    >
      <span className="sprite-float relative block">
        {(peak || selected) && (
          <span
            aria-hidden
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              selected ? '' : 'sprite-ripple'
            }`}
            style={{
              width: size * 1.25,
              height: size * 1.25,
              background: `radial-gradient(circle, ${accent}${selected ? '55' : '4d'} 0%, ${accent}00 70%)`,
            }}
          />
        )}

        {sprite.subject.kind === 'zone' || !entity ? (
          <span
            className="relative flex h-9 min-w-9 items-center justify-center rounded-full bg-white/95 px-1.5 text-[12px] font-semibold text-[color:var(--color-ink)]"
            style={{ boxShadow: `0 0 0 2px ${accent}, 0 3px 10px -4px rgb(0 10 20 / .3)` }}
          >
            {sprite.placeLabel}
          </span>
        ) : (
          <span className="relative block">
            <SpeciesSprite
              entity={entity}
              size={size}
              transform={variation}
              style={{
                // 오려낸 그림이 바다·육지 어디에 놓여도 떠 보이게 한다
                filter: selected
                  ? 'drop-shadow(0 0 1.5px rgba(255,255,255,.95)) drop-shadow(0 3px 5px rgba(0,10,20,.42))'
                  : 'drop-shadow(0 0 1.5px rgba(255,255,255,.9)) drop-shadow(0 2px 3px rgba(0,10,20,.28))',
              }}
            />

            {restricted && (
              // 있지만 잡으면 안 된다 — 존재와 규정을 구분해 보여주는 표시
              <span
                aria-hidden
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold leading-none text-white"
                style={{ background: 'var(--color-restricted)' }}
                title="규정 확인 필요"
              >
                !
              </span>
            )}
          </span>
        )}
      </span>

      {selected && (
        <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--color-ink)]/88 px-2 py-1 text-[11px] font-medium text-white">
          {sprite.name}
        </span>
      )}
    </motion.button>
  );
}

export const NatureSprite = memo(NatureSpriteBase);
