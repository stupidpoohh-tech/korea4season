'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import type { DateKey } from '@/domain/date';
import { BASE_MAP_ASPECT, BASE_MAP_SRC } from '@/lib/map-asset';
import type { MapLayout, MapSprite } from '@/services/map-service';
import { clampViewport, useMapStore } from '@/store/map-store';
import { DomMapRenderer } from './DomMapRenderer';
import { MapControls } from './MapControls';
import { SeasonWash } from './SeasonWash';

interface Props {
  date: DateKey;
  layout: MapLayout;
  onSelectSprite: (sprite: MapSprite) => void;
  /** 컨트롤과 안내를 숨긴 미리보기 모드 (홈 화면용) */
  preview?: boolean;
  /** 크기는 호출자가 정한다. 지도 비율(1000:1300)은 내부에서 유지한다. */
  className?: string;
}

/**
 * 대한민국 게임 월드맵.
 *
 * 이 컴포넌트가 화면의 주인공이다. 정보 패널이 지도를 밀어내지 않도록
 * 주변 UI 는 전부 floating 으로 띄운다. (요구사항 #3, #34)
 */
export function NatureMap({ date, layout, onSelectSprite, preview = false, className }: Props) {
  const reducedMotion = useReducedMotion() ?? false;
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

    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    setGrabbing(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
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
    if (Math.abs(dx) + Math.abs(dy) > 0.004) drag.moved = true;

    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    applyViewport({ scale: viewport.scale, x: viewport.x + dx, y: viewport.y + dy });
  };

  const endPointer = (event: React.PointerEvent) => {
    pinchRef.current.delete(event.pointerId);
    if (pinchRef.current.size < 2) pinchStart.current = null;
    if (dragRef.current?.id === event.pointerId) {
      // 끌지 않고 눌렀다 뗀 것이면 선택 해제로 취급한다
      if (!dragRef.current.moved) selectOccurrence(null);
      dragRef.current = null;
    }
    setGrabbing(false);
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

        <SeasonWash date={date} />

        <DomMapRenderer
          sprites={layout.sprites}
          viewport={viewport}
          selectedId={selectedId}
          onSelect={onSelectSprite}
          reducedMotion={reducedMotion}
          spriteScale={preview ? 0.7 : 1}
        />
      </div>

      {!preview && <MapControls />}

      {!preview && layout.hiddenCount > 0 && (
        <p className="absolute bottom-3 left-3 z-20 rounded-lg border border-[color:var(--color-line)] bg-white/85 px-2.5 py-1.5 text-[11px] text-[color:var(--color-muted)] backdrop-blur-sm">
          겹침을 줄이려 {layout.hiddenCount}개를 숨겼습니다 · 레이어를 좁혀 보세요
        </p>
      )}
    </div>
  );
}
