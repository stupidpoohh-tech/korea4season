'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import { CATEGORY_META } from '@/lib/category-meta';
import { statusMeta } from '@/lib/status-meta';
import type { MapSprite } from '@/services/nature-service';

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
 * 지도 위의 자연현상 하나.
 * 등장할 때 scale .7 / opacity 0 에서 짧게 pop-in 하고,
 * 아주 약하게 떠 있어 살아있는 느낌만 준다. (요구사항 #5)
 */
function NatureSpriteBase({ sprite, selected, scale, spriteScale = 1, reducedMotion, onSelect }: Props) {
  const { resolved, location, position } = sprite;
  const { entity, status, occurrence } = resolved;
  const meta = statusMeta(status, occurrence.polarity);
  const category = CATEGORY_META[entity.category];
  // 링은 '절정' 에만 — 모든 sprite 에 두르면 지도가 과녁처럼 보인다
  const live = status === 'peak';

  return (
    <motion.button
      type="button"
      layout={false}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
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
       * motion 이 transform 속성을 직접 관리하므로 style.transform 을 쓰면 덮어쓰인다.
       * 중심 정렬(-50%)과 확대 보정은 transformTemplate 으로 앞에 붙인다.
       * 확대해도 sprite 크기는 유지한다 — 정보 가독성을 우선한다.
       */
      transformTemplate={(_latest, generated) =>
        `translate(-50%, -50%) scale(${spriteScale / scale}) ${generated}`
      }
      aria-label={`${entity.name} · ${location.name} · ${meta.label}`}
      aria-pressed={selected}
    >
      {/*
        움직임 억제는 CSS media query 로 처리한다.
        useReducedMotion() 값으로 마크업을 갈라 놓으면 서버/클라이언트 렌더가
        어긋나 hydration 이 깨진다.
      */}
      <span className="sprite-float block">
        {live && (
          <span
            aria-hidden
            className="sprite-ripple pointer-events-none absolute inset-0 rounded-full"
            style={{ border: `2px solid ${meta.ring}` }}
          />
        )}
        <span
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[17px] leading-none transition-[box-shadow,transform] duration-200"
          style={{
            boxShadow: selected
              ? `0 0 0 3px ${meta.ring}, 0 6px 18px -6px rgb(0 10 20 / .35)`
              : `0 0 0 2px ${meta.ring}, 0 3px 10px -4px rgb(0 10 20 / .28)`,
          }}
        >
          <span aria-hidden>{entity.icon}</span>
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
            style={{ background: category.color }}
          />
        </span>
      </span>

      {selected && (
        <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--color-ink)]/88 px-2 py-1 text-[11px] font-medium text-white">
          {entity.name}
        </span>
      )}
    </motion.button>
  );
}

export const NatureSprite = memo(NatureSpriteBase);
