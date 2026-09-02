import type { ComponentType } from 'react';
import type { MapSprite } from '@/services/nature-service';
import type { Viewport } from '@/store/map-store';

/**
 * MapRenderer 추상화. (요구사항 #18)
 *
 * 지금은 DOM + CSS transform 으로 충분하다 (동시 sprite 30개 이하).
 * sprite 가 수백 개로 늘거나 파티클·철새 이동 애니메이션이 필요해지면
 * 이 인터페이스를 만족하는 Canvas/PixiJS 렌더러로 교체한다.
 */
export interface MapRendererProps {
  sprites: MapSprite[];
  viewport: Viewport;
  selectedOccurrenceId: string | null;
  onSelect: (sprite: MapSprite) => void;
  reducedMotion: boolean;
  /** 작은 지도에서 sprite 를 함께 줄이는 비율 */
  spriteScale?: number;
}

export type MapRendererComponent = ComponentType<MapRendererProps>;
