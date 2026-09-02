'use client';

import { AnimatePresence } from 'motion/react';
import { NatureSprite } from './NatureSprite';
import type { MapRendererProps } from './renderer-types';

/**
 * 기본 렌더러: DOM + CSS transform.
 * sprite 가 수십 개 수준일 때 가장 유지보수하기 쉽고 접근성도 그대로 얻는다.
 */
export function DomMapRenderer({
  sprites,
  viewport,
  selectedId,
  onSelect,
  reducedMotion,
  spriteScale,
  fast,
}: MapRendererProps) {
  // 하나를 고르면 나머지는 시선을 양보한다 — 지우지는 않는다
  const hasSelection = sprites.some((s) => s.selectionId === selectedId);

  return (
    <AnimatePresence initial={false}>
      {sprites.map((sprite) => {
        const selected = sprite.selectionId === selectedId;
        return (
          <NatureSprite
            key={sprite.key}
            sprite={sprite}
            selected={selected}
            dimmed={hasSelection && !selected}
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
