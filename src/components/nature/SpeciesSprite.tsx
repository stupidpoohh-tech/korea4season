import type { NatureEntity } from '@/domain/types';

/**
 * 어종·자연 sprite 표시.
 *
 * illustration 에셋이 있으면 그것을, 없으면 이모지로 폴백한다.
 * 에셋은 public/sprites/species/<slug>.svg 로 들어온다 (규격은 그 디렉터리의 README).
 * 지도에서 방향이 섞이지 않도록 에셋은 모두 오른쪽을 향한다는 전제다.
 */
export function SpeciesSprite({
  entity,
  size = 20,
  className = '',
}: {
  entity: NatureEntity;
  /** 짧은 변 기준 px */
  size?: number;
  className?: string;
}) {
  if (entity.illustration) {
    return (
      // 에셋 크기가 종마다 달라도 컨테이너를 넘지 않게 contain 으로 맞춘다
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entity.illustration}
        alt=""
        aria-hidden
        draggable={false}
        className={`object-contain ${className}`}
        style={{ width: size * 1.6, height: size }}
      />
    );
  }

  return (
    <span aria-hidden className={className} style={{ fontSize: size * 0.95, lineHeight: 1 }}>
      {entity.icon}
    </span>
  );
}
