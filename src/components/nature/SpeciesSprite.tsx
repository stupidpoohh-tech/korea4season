import type { NatureEntity } from '@/domain/types';

/**
 * 어종·자연 sprite 표시.
 *
 * illustration 에셋이 있으면 그것을, 없으면 이모지로 폴백한다.
 * 에셋은 public/sprites/species/<slug>.webp 로 들어온다 (규격은 그 디렉터리의 README).
 *
 * 가로로 긴 물고기와 세로로 긴 오징어·문어가 섞여 있으므로
 * 정사각 박스에 object-contain 으로 담아 어느 쪽이든 잘리지 않게 한다.
 */
export function SpeciesSprite({
  entity,
  size = 20,
  className = '',
  transform,
}: {
  entity: NatureEntity;
  /** 담을 정사각 박스의 한 변 (px) */
  size?: number;
  className?: string;
  /**
   * 지도에서만 쓰는 변형(좌우 반전 · 기울기).
   * 목록과 상세는 그림을 있는 그대로 보여준다.
   */
  transform?: string;
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
        className={`object-contain ${className}`}
        style={{ width: size, height: size, transform }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={className}
      style={{ fontSize: size * 0.8, lineHeight: 1, transform, display: 'inline-block' }}
    >
      {entity.icon}
    </span>
  );
}
