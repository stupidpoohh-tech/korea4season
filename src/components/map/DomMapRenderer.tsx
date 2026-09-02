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
  selectedOccurrenceId,
  onSelect,
  reducedMotion,
  spriteScale,
}: MapRendererProps) {
  return (
    <AnimatePresence initial={false}>
      {sprites.map((sprite) => (
        <NatureSprite
          key={sprite.key}
          sprite={sprite}
          selected={sprite.resolved.occurrence.id === selectedOccurrenceId}
          scale={viewport.scale}
          spriteScale={spriteScale}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
        />
      ))}
    </AnimatePresence>
  );
}
