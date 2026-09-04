import type { ComponentType } from 'react';
import type { MapSprite } from '@/services/map-service';
import type { Viewport } from '@/store/map-store';

/**
 * MapRenderer 추상화. (요구사항 #18)
 *
 * 지금은 DOM + CSS transform 으로 충분하다 (동시 sprite 30개 이하).
 * sprite 가 수백 개로 늘거나 철새 이동·파티클이 필요해지면
 * 이 인터페이스를 만족하는 Canvas/PixiJS 렌더러로 교체한다.
 */
export interface MapRendererProps {
  sprites: MapSprite[];
  viewport: Viewport;
  selectedId: string | null;
  onSelect: (sprite: MapSprite) => void;
  reducedMotion: boolean;
  spriteScale?: number;
  /** 넓은 화면인가. 철새 sprite 의 기본 크기가 여기에 걸린다. */
  wide?: boolean;
  /** 재생·슬라이더 조작 중 — 전환을 짧게 끊는다 */
  fast?: boolean;
}

export type MapRendererComponent = ComponentType<MapRendererProps>;
