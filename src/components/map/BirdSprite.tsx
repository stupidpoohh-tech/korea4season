'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import type { BirdPresenceState } from '@/domain/bird';
import type { MapSprite } from '@/services/map-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';

/* ────────────────────────────────────────────────────────────
 * 지도 위의 철새 하나.
 *
 * 물고기와 다르게 그린다.
 *   물고기  떠 있는 출현 — 조금 장난스럽게, 살짝 흔들리며
 *   철새    머무는 존재 — 조용하게, 땅에 붙어서
 *
 * 그래서 여기에는 없다.
 *   지속적인 float · 날갯짓 loop · bounce · 비행 애니메이션
 *   빛무리 · 별 · 왕관 · 금색 테두리 · pulse · 무리 · 이동 경로
 *
 * 상태가 바뀌어도 다른 캐릭터로 갈아 끼우지 않는다.
 * **같은 sprite 의 존재감만** 변한다 — 크기와 불투명도, 그리고 채도 약간.
 * ──────────────────────────────────────────────────────────── */

interface Presence {
  scale: number;
  opacity: number;
  /** 저물 때만 채도를 조금 떨어뜨린다 */
  saturation: number;
}

const PRESENCE: Record<Exclude<BirdPresenceState, 'OFF'>, Presence> = {
  STARTING: { scale: 0.92, opacity: 0.7, saturation: 1 },
  GOOD: { scale: 1.0, opacity: 0.9, saturation: 1 },
  PEAK: { scale: 1.05, opacity: 1, saturation: 1 },
  ENDING: { scale: 0.96, opacity: 0.6, saturation: 0.82 },
};

/**
 * 전국 화면의 기본 크기.
 * 이 크기에서도 종의 실루엣(부리 · 목 · 다리 · 몸통 비율)이 읽혀야 하고,
 * 동시에 지도가 새보다 먼저 보여야 한다.
 */
const BASE_SIZE = { mobile: 35, desktop: 38 } as const;

/** 고른 새는 종을 확인할 수 있을 만큼만 키운다 (승인 범위 64~80) */
const SELECTED_SIZE = { mobile: 68, desktop: 76 } as const;

/** 손가락이 닿아야 하는 최소 크기 */
const TOUCH_TARGET = 44;

interface Props {
  sprite: MapSprite;
  state: Exclude<BirdPresenceState, 'OFF'>;
  selected: boolean;
  /** 다른 새가 선택됨 — 존재는 남기고 시선만 양보한다 */
  dimmed: boolean;
  scale: number;
  spriteScale?: number;
  wide: boolean;
  reducedMotion: boolean;
  /** 재생 · 슬라이더 조작 중 */
  fast?: boolean;
  onSelect: (sprite: MapSprite) => void;
}

function BirdSpriteBase({
  sprite,
  state,
  selected,
  dimmed,
  scale,
  spriteScale = 1,
  wide,
  reducedMotion,
  fast = false,
  onSelect,
}: Props) {
  const presence = PRESENCE[state];
  const { position, entity } = sprite;

  const base = wide ? BASE_SIZE.desktop : BASE_SIZE.mobile;
  /*
   * 물고기와 달리 크기를 2px 단위로 끊지 않는다.
   * 시즌 강도가 이어진 값인 바다에서는 하루마다 새로운 크기가 나와 브라우저가
   * 그림을 매번 다시 구웠지만, 여기 크기는 상태 넷에서만 나오므로 종마다
   * 네 벌이 전부다. 끊으면 오히려 GOOD 과 PEAK 이 같은 값으로 뭉쳐
   * 존재감 차이가 사라진다.
   */
  const size = selected
    ? wide
      ? SELECTED_SIZE.desktop
      : SELECTED_SIZE.mobile
    : base * presence.scale;

  const opacity = dimmed ? presence.opacity * 0.45 : presence.opacity;

  return (
    <motion.button
      type="button"
      layout={false}
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      /*
       * 스프링을 쓰지 않는다. 튀는 움직임은 이 레이어의 문법이 아니다.
       * 상태가 바뀌는 것은 조용히 진해지고 옅어지는 일이어야 한다.
       */
      transition={fast || reducedMotion ? { duration: 0 } : { duration: 0.24, ease: 'easeOut' }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(sprite);
      }}
      className="no-tap-highlight absolute flex origin-center items-end justify-center"
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        // 그림이 작아도 손가락이 닿는 넓이는 지킨다
        minWidth: TOUCH_TARGET,
        minHeight: TOUCH_TARGET,
        zIndex: selected ? 30 : 10,
      }}
      transformTemplate={(_latest, generated) =>
        `translate(-50%, -50%) scale(${spriteScale / scale}) ${generated}`
      }
      aria-label={`${sprite.name} · ${sprite.placeLabel}`}
      aria-pressed={selected}
    >
      <span className="relative flex flex-col items-center">
        {entity && (
          <SpeciesSprite
            entity={entity}
            size={size}
            style={{
              filter: `saturate(${presence.saturation})${
                fast ? '' : ' drop-shadow(0 0 1.5px rgba(255,255,255,.9))'
              }`,
              transition: fast ? 'none' : 'width 240ms ease-out, height 240ms ease-out',
            }}
          />
        )}

        {/*
          아주 약한 접지 그림자. 새가 지도 위에 '떠 있는' 것이 아니라
          그 지역에 '내려앉아 있는' 것으로 읽히게 하는 데 필요한 만큼만 둔다.
        */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%]"
          style={{
            bottom: -2,
            width: size * 0.5,
            height: Math.max(2, size * 0.08),
            background: 'rgba(0, 10, 20, 0.16)',
            filter: 'blur(1.5px)',
            opacity: opacity * 0.9,
          }}
        />

        {selected && (
          <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--color-ink)]/88 px-2 py-1 text-[11px] font-medium text-white">
            {sprite.name}
            <span className="ml-1 opacity-70">{sprite.placeLabel}</span>
          </span>
        )}
      </span>
    </motion.button>
  );
}

export const BirdSprite = memo(BirdSpriteBase);
