'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import type { LegalStatusCode } from '@/domain/regulation';
import type { MapSprite } from '@/services/map-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { spriteVariation, variationTransform } from '@/lib/sprite-variation';

interface Props {
  sprite: MapSprite;
  selected: boolean;
  /** 다른 sprite 가 선택됨 — 존재는 남기고 시선만 양보한다 */
  dimmed: boolean;
  /** 확대 배율. sprite 는 확대돼도 같은 크기를 유지한다. */
  scale: number;
  /** 미리보기처럼 작은 지도에서 sprite 를 함께 줄인다 */
  spriteScale?: number;
  reducedMotion: boolean;
  /** 재생·슬라이더 조작 중 — 전환을 짧게 끊어 지연이 느껴지지 않게 한다 */
  fast?: boolean;
  onSelect: (sprite: MapSprite) => void;
}

/**
 * 규정 배지.
 *
 * 생물 자체의 시각적 존재감은 자연에서의 occurrence 를 뜻한다.
 * 규정은 그 위에 얹히는 다른 축이므로 그림 색을 바꾸지 않고
 * 모서리의 작은 표시로만 말한다.
 *
 * 지도에 올리는 것은 '지금 잡을 수 없다' 뿐이다.
 * 체장 같은 조건부 규정은 대부분의 어종에 붙어 있어서 지도에 그리면
 * 배지가 배경이 되고, 정작 금어기가 눈에 띄지 않는다. 그것은 상세에서 말한다.
 */
const LEGAL_BADGE: Partial<
  Record<LegalStatusCode, { mark: string; color: string; title: string }>
> = {
  'closed-season': { mark: '!', color: 'var(--color-restricted)', title: '금어기' },
  prohibited: { mark: '!', color: 'var(--color-restricted)', title: '연중 금지' },
};

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
 *   선택      → 확대 · 얇은 링 · 이름표, 그리고 나머지는 흐리게
 */
function NatureSpriteBase({
  sprite,
  selected,
  dimmed,
  scale,
  spriteScale = 1,
  reducedMotion,
  fast = false,
  onSelect,
}: Props) {
  const { position, prominence, accent, entity, badgeCount } = sprite;
  const peak = prominence >= 1;
  // 같은 키에서 뽑으므로 리렌더나 재생 중에도 흔들리지 않는다
  const variation = variationTransform(spriteVariation(sprite.key));
  const size = 30 + prominence * 18;
  const badge = LEGAL_BADGE[sprite.legalStatus];

  const baseOpacity = 0.62 + prominence * 0.38;
  const opacity = dimmed ? baseOpacity * 0.45 : baseOpacity;

  return (
    <motion.button
      type="button"
      layout={false}
      initial={{ opacity: 0, scale: 0.78 }}
      animate={{ opacity, scale: selected ? 1.14 : 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={
        // 슬라이더를 빠르게 움직일 때 스프링이 밀리면 지도가 굼떠 보인다
        reducedMotion || fast
          ? { duration: 0.1 }
          : { type: 'spring', stiffness: 460, damping: 26, mass: 0.7 }
      }
      onClick={(event) => {
        event.stopPropagation();
        onSelect(sprite);
      }}
      className="no-tap-highlight absolute origin-center"
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        zIndex: selected ? 30 : 10,
      }}
      /*
       * motion 이 transform 을 직접 관리하므로 style.transform 은 덮어쓰인다.
       * 중심 정렬과 확대 보정은 transformTemplate 으로 앞에 붙인다.
       */
      transformTemplate={(_latest, generated) =>
        `translate(-50%, -50%) scale(${spriteScale / scale}) ${generated}`
      }
      aria-label={`${sprite.name} · ${sprite.placeLabel}${badge ? ` · ${badge.title}` : ''}`}
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

        {selected && (
          // 무엇을 고른 것인지 분명히 — 다만 지도를 덮지 않을 만큼만
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: size * 1.42,
              height: size * 1.42,
              boxShadow: `0 0 0 1.5px ${accent}`,
            }}
          />
        )}

        {entity ? (
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

            {badgeCount !== undefined && (
              // 권역 모드: 대표 어종 그림 + 이 권역에서 시즌인 어종 수
              <span
                className="absolute -bottom-1 -right-1.5 rounded-full border border-white bg-[color:var(--color-ink)]/88 px-1.5 py-px text-[10px] font-semibold leading-[1.35] text-white"
                style={{ boxShadow: '0 1px 3px rgb(0 10 20 / .3)' }}
              >
                {badgeCount}
              </span>
            )}

            {badge && (
              // 있지만 잡으면 안 된다 — 존재와 규정을 구분해 보여주는 표시
              <span
                aria-hidden
                title={badge.title}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold leading-none text-white"
                style={{ background: badge.color }}
              >
                {badge.mark}
              </span>
            )}
          </span>
        ) : (
          <span
            className="relative flex h-9 min-w-9 items-center justify-center rounded-full bg-white/95 px-1.5 text-[12px] font-semibold text-[color:var(--color-ink)]"
            style={{ boxShadow: `0 0 0 2px ${accent}, 0 3px 10px -4px rgb(0 10 20 / .3)` }}
          >
            {sprite.placeLabel}
          </span>
        )}
      </span>

      {selected && (
        <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--color-ink)]/88 px-2 py-1 text-[11px] font-medium text-white">
          {sprite.name}
          {badgeCount !== undefined && (
            <span className="ml-1 opacity-70">{sprite.placeLabel}</span>
          )}
        </span>
      )}
    </motion.button>
  );
}

export const NatureSprite = memo(NatureSpriteBase);
