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
 * 이것은 법적 status marker 가 아니라 살아 있는 생물이다.
 * 그래서 금어기라고 sprite 를 지우지 않고 작은 제한 표시만 덧붙인다.
 * 시즌이 좋을수록 크고 또렷하게 그려 "지금 뭐가 좋은지" 가 한눈에 보이게 한다.
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
  const size = 30 + prominence * 10; // 36 ~ 40px

  return (
    <motion.button
      type="button"
      layout={false}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 0.55 + prominence * 0.45, scale: 1 }}
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
      <span className="sprite-float block">
        {peak && (
          <span
            aria-hidden
            className="sprite-ripple pointer-events-none absolute inset-0 rounded-full"
            style={{ border: `2px solid ${accent}` }}
          />
        )}
        <span
          className="relative flex items-center justify-center rounded-full bg-white/95 transition-[box-shadow] duration-200"
          style={{
            width: size,
            height: size,
            boxShadow: selected
              ? `0 0 0 3px ${accent}, 0 6px 18px -6px rgb(0 10 20 / .35)`
              : `0 0 0 2px ${accent}, 0 3px 10px -4px rgb(0 10 20 / .28)`,
          }}
        >
          {entity ? (
            <SpeciesSprite entity={entity} size={size * 0.78} transform={variation} />
          ) : (
            <span aria-hidden className="text-[13px] font-semibold text-[color:var(--color-ink)]">
              {sprite.placeLabel}
            </span>
          )}

          {sprite.subject.kind === 'zone' && (
            // 권역 마커는 '이 바다에 몇 종이 있는가' 가 핵심 정보다
            <span
              aria-hidden
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-white bg-[color:var(--color-ink)] px-1.5 text-[9px] font-semibold leading-[14px] text-white"
            >
              {sprite.placeLabel}
            </span>
          )}

          {restricted && (
            // 있지만 잡으면 안 된다 — 존재와 규정을 구분해 보여주는 표시
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white text-[8px] leading-none text-white"
              style={{ background: 'var(--color-restricted)' }}
              title="규정 확인 필요"
            >
              !
            </span>
          )}
        </span>
      </span>

      {selected && (
        <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--color-ink)]/88 px-2 py-1 text-[11px] font-medium text-white">
          {sprite.name}
        </span>
      )}
    </motion.button>
  );
}

export const NatureSprite = memo(NatureSpriteBase);
