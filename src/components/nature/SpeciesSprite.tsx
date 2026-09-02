import type { NatureEntity } from '@/domain/types';

/**
 * 어종·자연 sprite 표시.
 *
 * illustration 에셋이 있으면 그것을, 없으면 이모지로 폴백한다.
 * 에셋은 public/sprites/species/<slug>.webp 로 들어온다 (규격은 그 디렉터리의 README).
 *
 * 크기는 max-width/height 로만 제한한다.
 * 그러면 요소의 박스가 그림 자체의 크기가 되므로,
 * 지도에서 배지를 그림 모서리에 정확히 붙일 수 있다.
 */
export function SpeciesSprite({
  entity,
  size = 20,
  className = '',
  transform,
  style,
}: {
  entity: NatureEntity;
  /** 그림을 담을 한 변의 최대 길이 (px). 비율은 그림을 따른다. */
  size?: number;
  className?: string;
  /**
   * 지도에서만 쓰는 변형(좌우 반전 · 기울기).
   * 목록과 상세는 그림을 있는 그대로 보여준다.
   */
  transform?: string;
  style?: React.CSSProperties;
}) {
  if (entity.illustration) {
    return (
      // 정적 에셋이고 Workers 에는 이미지 최적화 서버가 없으므로 next/image 를 쓰지 않는다
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entity.illustration}
        alt=""
        aria-hidden
        draggable={false}
        className={`block ${className}`}
        style={{
          maxWidth: size,
          maxHeight: size,
          width: 'auto',
          height: 'auto',
          transform,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`block ${className}`}
      style={{ fontSize: size * 0.78, lineHeight: 1, transform, ...style }}
    >
      {entity.icon}
    </span>
  );
}
