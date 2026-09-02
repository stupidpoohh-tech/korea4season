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
  tint,
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
  /**
   * 그림 모양 그대로 덮는 색조 (예: 금어기의 붉은빛).
   * 사각 박스를 덮으면 오려낸 그림의 뜻이 깨지므로 mask 로 그림 실루엣만 칠한다.
   */
  tint?: string;
}) {
  if (entity.illustration) {
    if (tint) {
      const mask = {
        WebkitMaskImage: `url(${entity.illustration})`,
        maskImage: `url(${entity.illustration})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      } as React.CSSProperties;

      return (
        <span className={`relative block ${className}`} style={{ transform, ...style }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entity.illustration}
            alt=""
            aria-hidden
            draggable={false}
            className="block"
            style={{ maxWidth: size, maxHeight: size, width: 'auto', height: 'auto' }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: tint, ...mask }}
          />
        </span>
      );
    }

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

  // 이모지 폴백은 실루엣을 알 수 없으므로 배경 원으로 대신 알린다
  return (
    <span
      aria-hidden
      className={`block ${className}`}
      style={{
        fontSize: size * 0.78,
        lineHeight: 1,
        transform,
        ...(tint ? { background: tint, borderRadius: '50%' } : null),
        ...style,
      }}
    >
      {entity.icon}
    </span>
  );
}
