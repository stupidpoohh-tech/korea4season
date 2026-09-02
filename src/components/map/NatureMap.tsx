'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import { BASE_MAP_ASPECT, BASE_MAP_SRC } from '@/lib/map-asset';
import type { MapLayout, MapSprite } from '@/services/map-service';
import { clampViewport, useMapStore } from '@/store/map-store';
import { useTimeStore } from '@/store/time-store';
import { DomMapRenderer } from './DomMapRenderer';
import { MapControls } from './MapControls';

interface Props {
  layout: MapLayout;
  onSelectSprite: (sprite: MapSprite) => void;
  /** 컨트롤과 안내를 숨긴 미리보기 모드 (홈 화면용) */
  preview?: boolean;
  /** 크기는 호출자가 정한다. 지도 비율(map-bounds.json)은 내부에서 유지한다. */
  className?: string;
}

/**
 * 대한민국 게임 월드맵.
 *
 * 이 컴포넌트가 화면의 주인공이다. 정보 패널이 지도를 밀어내지 않도록
 * 주변 UI 는 전부 floating 으로 띄운다. (요구사항 #3, #34)
 */
export function NatureMap({ layout, onSelectSprite, preview = false, className }: Props) {
  const reducedMotion = useReducedMotion() ?? false;
  // 1년 재생 중에는 스프링을 기다릴 시간이 없다
  const isPlaying = useTimeStore((s) => s.isPlaying);
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const selectedId = useMapStore((s) => s.selectedOccurrenceId);
  const selectOccurrence = useMapStore((s) => s.selectOccurrence);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  const applyViewport = useCallback(
    (next: Parameters<typeof clampViewport>[0]) => setViewport(clampViewport(next)),
    [setViewport],
  );

  /* ── 확대/축소 (휠 · 트랙패드) ─────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || preview) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY / 420);
      const { scale, x, y } = useMapStore.getState().viewport;
      applyViewport({ scale: scale * factor, x, y });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyViewport, preview]);

  /* ── 끌어서 이동 · 두 손가락 확대 ──────────────────────── */
  /*
   * pointerdown 에서 곧바로 setPointerCapture 를 걸면 안 된다.
   * 캡처를 잡는 순간 이후의 pointerup 과 click 이 전부 컨테이너로 재타겟되어
   * sprite 의 onClick 이 영영 호출되지 않는다 — 물고기를 눌러도 상세가 열리지 않았다.
   * 그래서 실제로 끌기 시작한 뒤에만 캡처한다.
   */
  const captured = useRef(false);
  const movedRef = useRef(false);

  const onPointerDown = (event: React.PointerEvent) => {
    if (preview) return;
    pinchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinchRef.current.size === 2) {
      const [a, b] = [...pinchRef.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a!.x - b!.x, a!.y - b!.y),
        scale: viewport.scale,
      };
      dragRef.current = null;
      return;
    }

    movedRef.current = false;
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (preview) return;
    if (pinchRef.current.has(event.pointerId)) {
      pinchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (pinchRef.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pinchRef.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      applyViewport({
        ...viewport,
        scale: (pinchStart.current.scale * dist) / (pinchStart.current.dist || 1),
      });
      return;
    }

    const drag = dragRef.current;
    const el = containerRef.current;
    if (!drag || drag.id !== event.pointerId || !el) return;

    const rect = el.getBoundingClientRect();
    const dx = (event.clientX - drag.x) / rect.width;
    const dy = (event.clientY - drag.y) / rect.height;

    if (Math.abs(dx) + Math.abs(dy) > 0.004) {
      drag.moved = true;
      movedRef.current = true;
      // 끌기가 확정된 지금부터 캡처한다
      if (!captured.current) {
        el.setPointerCapture(event.pointerId);
        captured.current = true;
        setGrabbing(true);
      }
    }

    if (!drag.moved) return;

    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    applyViewport({ scale: viewport.scale, x: viewport.x + dx, y: viewport.y + dy });
  };

  const endPointer = (event: React.PointerEvent) => {
    pinchRef.current.delete(event.pointerId);
    if (pinchRef.current.size < 2) pinchStart.current = null;
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
    if (captured.current) {
      containerRef.current?.releasePointerCapture(event.pointerId);
      captured.current = false;
    }
    setGrabbing(false);
  };

  /*
   * 빈 곳을 눌러 선택 해제하는 것은 click 에서 처리한다.
   * pointerup 에서 지우면 sprite 의 stopPropagation 이 소용없어져
   * 눌렀다 뗄 때마다 선택이 한 번 풀렸다가 다시 걸린다.
   */
  const onContainerClick = () => {
    if (preview) return;
    if (movedRef.current) return;
    selectOccurrence(null);
  };

  const zoomable = !preview && viewport.scale > 1;

  return (
    <div
      ref={containerRef}
      className={`relative touch-none select-none no-tap-highlight ${preview ? 'overflow-visible' : 'overflow-hidden'} ${className ?? 'w-full'}`}
      style={{ aspectRatio: BASE_MAP_ASPECT }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onClick={onContainerClick}
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate(${viewport.x * 100}%, ${viewport.y * 100}%) scale(${viewport.scale})`,
          transition: grabbing ? 'none' : 'transform 420ms cubic-bezier(.22,.61,.36,1)',
          cursor: preview ? 'default' : grabbing ? 'grabbing' : zoomable ? 'grab' : 'default',
        }}
      >
        <Image
          src={BASE_MAP_SRC}
          alt="대한민국 자연 지도"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 640px"
          className="pointer-events-none object-contain"
          draggable={false}
        />

        <DomMapRenderer
          sprites={layout.sprites}
          viewport={viewport}
          selectedId={selectedId}
          onSelect={onSelectSprite}
          reducedMotion={reducedMotion}
          fast={isPlaying}
          spriteScale={preview ? 0.7 : 1}
        />
      </div>

      {!preview && <MapControls />}

      {/*
        접힌 수는 지도 위쪽에 둔다 — 아래쪽 가운데는 '이번 주 뭐 잡지?' 가,
        아래쪽 오른쪽은 확대/축소가 이미 쓰고 있다.
      */}
      {!preview && layout.hiddenCount > 0 && (
        <p className="absolute left-2.5 top-2.5 z-20 rounded-lg border border-[color:var(--color-line)] bg-white/85 px-2 py-1 text-[11px] text-[color:var(--color-muted)] backdrop-blur-sm">
          <span className="font-semibold text-[color:var(--color-ink-soft)]">
            +{layout.hiddenCount}
          </span>{' '}
          {layout.mode === 'zone' ? '권역' : '어종'} 더 있어요 · 확대하면 보입니다
        </p>
      )}
    </div>
  );
}
