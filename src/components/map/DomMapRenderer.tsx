'use client';

import { AnimatePresence } from 'motion/react';
import { BirdSprite } from './BirdSprite';
import { NatureSprite } from './NatureSprite';
import type { MapRendererProps } from './renderer-types';

/**
 * 기본 렌더러: DOM + CSS transform.
 * sprite 가 수십 개 수준일 때 가장 유지보수하기 쉽고 접근성도 그대로 얻는다.
 *
 * 철새만 다른 sprite 를 쓴다. 같은 컴포넌트에 상태를 더 얹지 않는 것은
 * 물고기(떠 있는 출현)와 철새(머무는 존재)가 서로 다른 문법이기 때문이다 —
 * 하나로 합치면 둘 중 하나는 반드시 어긋난다.
 */
export function DomMapRenderer({
  sprites,
  viewport,
  selectedId,
  onSelect,
  reducedMotion,
  spriteScale,
  wide = false,
  fast,
}: MapRendererProps) {
  // 하나를 고르면 나머지는 시선을 양보한다 — 지우지는 않는다
  const hasSelection = sprites.some((s) => s.selectionId === selectedId);

  return (
    <AnimatePresence initial={false}>
      {sprites.map((sprite) => {
        const selected = sprite.selectionId === selectedId;
        const dimmed = hasSelection && !selected;

        if (sprite.subject.kind === 'bird') {
          const { state } = sprite.subject.presence;
          // OFF 는 지도에 오지 않는다 (bird-service 가 후보에서 뺀다)
          if (state === 'OFF') return null;
          return (
            <BirdSprite
              key={sprite.key}
              sprite={sprite}
              state={state}
              selected={selected}
              dimmed={dimmed}
              scale={viewport.scale}
              spriteScale={spriteScale}
              wide={wide}
              reducedMotion={reducedMotion}
              fast={fast}
              onSelect={onSelect}
            />
          );
        }

        return (
          <NatureSprite
            key={sprite.key}
            sprite={sprite}
            selected={selected}
            dimmed={dimmed}
            scale={viewport.scale}
            spriteScale={spriteScale}
            reducedMotion={reducedMotion}
            fast={fast}
            onSelect={onSelect}
          />
        );
      })}
    </AnimatePresence>
  );
}
