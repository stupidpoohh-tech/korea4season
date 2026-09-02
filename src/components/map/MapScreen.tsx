'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { isValidDateKey } from '@/domain/date';
import { NATURE_CATEGORIES, type NatureCategory, type ResolvedOccurrence } from '@/domain/types';
import {
  buildMapLayout,
  countByCategory,
  countByState,
  type MapSprite,
} from '@/services/map-service';
import {
  getZoneDetail,
  zonePosition,
  type MarineMapItem,
} from '@/services/marine-service';
import { locationPosition } from '@/services/nature-service';
import { useMapStore } from '@/store/map-store';
import { useTimeStore } from '@/store/time-store';
import { NatureTimeline } from '@/components/timeline/NatureTimeline';
import { NatureDetailSheet } from '@/components/nature/NatureDetailSheet';
import { MarineDetailSheet } from '@/components/marine/MarineDetailSheet';
import { ZoneSheet } from '@/components/marine/ZoneSheet';
import { EmptyState } from '@/components/common/EmptyState';
import { LayerFilter, MapModeToggle, StateFilterRow } from './LayerFilter';
import { MapSideList } from './MapSideList';
import { NatureMap } from './NatureMap';

function parseLayers(value: string | null): NatureCategory[] {
  if (!value) return [];
  return value
    .split(',')
    .filter((v): v is NatureCategory => NATURE_CATEGORIES.includes(v as NatureCategory));
}

/**
 * MAP 화면 — 바다의 NOW.
 *
 * 사용자가 먼저 묻는 것은 "지금 뭐가 있지?" 이고
 * "잡아도 되나?" 는 상세를 열었을 때 답한다.
 */
export function MapScreen() {
  const searchParams = useSearchParams();

  const date = useTimeStore((s) => s.selectedDate);
  const setDate = useTimeStore((s) => s.setDate);
  const isPlaying = useTimeStore((s) => s.isPlaying);

  const categories = useMapStore((s) => s.selectedCategories);
  const setCategories = useMapStore((s) => s.setCategories);
  const stateFilter = useMapStore((s) => s.stateFilter);
  const mode = useMapStore((s) => s.mode);
  const selectedId = useMapStore((s) => s.selectedOccurrenceId);
  const select = useMapStore((s) => s.selectOccurrence);
  const focusOn = useMapStore((s) => s.focusOn);

  /* ── URL -> state (최초 1회) ────────────────────────────── */
  const initialised = useRef(false);
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const urlDate = searchParams.get('date');
    if (urlDate && isValidDateKey(urlDate)) setDate(urlDate);

    const urlLayers = parseLayers(searchParams.get('layer'));
    if (urlLayers.length) setCategories(urlLayers);

    const focusId = searchParams.get('focus');
    if (focusId) pendingFocus.current = focusId;
  }, [searchParams, setDate, setCategories]);

  /* ── state -> URL (재생 중에는 건너뛴다) ────────────────── */
  useEffect(() => {
    if (isPlaying) return;
    const params = new URLSearchParams();
    params.set('date', date);
    if (categories.length) params.set('layer', categories.join(','));
    if (selectedId) params.set('focus', selectedId);
    window.history.replaceState(null, '', `/map?${params.toString()}`);
  }, [date, categories, isPlaying, selectedId]);

  /* ── 파생 데이터 ────────────────────────────────────────── */
  const layout = useMemo(
    () => buildMapLayout({ date, categories, state: stateFilter, mode }),
    [date, categories, stateFilter, mode],
  );

  const categoryCounts = useMemo(() => countByCategory(date), [date]);
  const stateCounts = useMemo(() => countByState(date), [date]);

  const selectedSprite = useMemo(
    () => layout.sprites.find((s) => s.selectionId === selectedId) ?? null,
    [layout, selectedId],
  );

  const selectedMarine: MarineMapItem | null =
    selectedSprite?.subject.kind === 'marine' ? selectedSprite.subject.item : null;
  const selectedNature: ResolvedOccurrence | null =
    selectedSprite?.subject.kind === 'nature' ? selectedSprite.subject.resolved : null;

  /* ── 권역 시트 ──────────────────────────────────────────── */
  const openZoneSlug = useMapStore((s) => s.openZoneSlug);
  const setOpenZone = useMapStore((s) => s.setOpenZone);

  const zoneDetail = useMemo(
    () => (openZoneSlug ? getZoneDetail(openZoneSlug, date) : null),
    [openZoneSlug, date],
  );

  /* ── 카메라 ─────────────────────────────────────────────── */
  const focusSprite = useCallback(
    (sprite: MapSprite) => {
      const wide = typeof window !== 'undefined' && window.innerWidth >= 1024;
      focusOn(sprite.basePosition, { scale: 1.5, anchorX: wide ? 0.36 : 0.5 });
    },
    [focusOn],
  );

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const target = layout.sprites.find((s) => s.selectionId === id);
    if (!target) return;
    pendingFocus.current = null;
    select(id);
    focusSprite(target);
  }, [layout, select, focusSprite]);

  const onSelectSprite = useCallback(
    (sprite: MapSprite) => {
      if (sprite.subject.kind === 'zone') {
        setOpenZone(sprite.subject.marker.zone.slug);
        return;
      }
      select(sprite.selectionId);
    },
    [select, setOpenZone],
  );

  const openZoneAndFocus = useCallback(
    (zoneSlug: string) => {
      setOpenZone(zoneSlug);
      select(null);
      const zone = zoneDetail?.zone.slug === zoneSlug ? zoneDetail.zone : null;
      if (zone) focusOn(zonePosition(zone), { scale: 1.6, anchorX: 0.36 });
    },
    [setOpenZone, select, focusOn, zoneDetail],
  );

  // 칩 개수와 어긋나지 않게 sprite 가 아니라 '대상' 수를 센다
  const visible = useMemo(
    () => new Set(layout.sprites.map((s) => s.selectionId)).size,
    [layout],
  );
  const marineActive = categoryCounts.fishing > 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-env(safe-area-inset-bottom))] max-w-[1180px] flex-col gap-2 px-2 pb-2 pt-2 lg:h-[calc(100dvh-56px)] lg:gap-3 lg:px-6 lg:pb-5 lg:pt-3">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="min-w-0 flex-1">
          <StateFilterRow counts={stateCounts} />
        </div>
        <MapModeToggle />
      </div>
      <div className="lg:hidden">
        <LayerFilter counts={categoryCounts} />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[252px_minmax(0,1fr)]">
        <div className="hidden min-h-0 flex-col gap-2.5 lg:flex">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium tracking-wide text-[color:var(--color-faint)]">
              보기
            </span>
            <MapModeToggle />
          </div>

          {/* 좁은 레일에서는 칩이 넘치지 않게 줄바꿈한다 */}
          <div className="space-y-1.5 [&_[role=group]]:flex-wrap [&_[role=group]]:overflow-visible">
            <StateFilterRow counts={stateCounts} />
            <LayerFilter counts={categoryCounts} />
          </div>

          <MapSideList
            sprites={layout.sprites}
            selectedId={selectedId}
            openZoneSlug={openZoneSlug}
            onSelect={onSelectSprite}
          />
        </div>

        {/*
          지도는 1000:1300 비율을 반드시 유지해야 한다 — sprite 위치가
          컨테이너 크기 대비 비율로 찍히기 때문이다.
        */}
        <div className="relative flex min-h-0 items-center justify-center [container-type:size]">
          <NatureMap
            date={date}
            layout={layout}
            onSelectSprite={onSelectSprite}
            className="h-[min(100cqh,130cqw)] w-auto"
          />

          {visible === 0 && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 lg:hidden">
              <div className="pointer-events-auto">
                <EmptyState
                  title="이 날짜에는 조용합니다"
                  description={
                    stateFilter !== 'all'
                      ? '선택한 조건에 해당하는 것이 없습니다. 필터를 풀거나 날짜를 움직여 보세요.'
                      : marineActive
                        ? '선택한 레이어에 해당하는 것이 없습니다. 다른 레이어를 켜 보세요.'
                        : '지금은 바다가 잠잠합니다. 슬라이더를 움직여 다른 계절의 대한민국을 살펴보세요.'
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <NatureTimeline date={date} visibleCount={visible} />

      <MarineDetailSheet
        item={selectedMarine}
        date={date}
        onClose={() => select(null)}
        onOpenZone={openZoneAndFocus}
      />

      <NatureDetailSheet
        item={selectedNature}
        date={date}
        onClose={() => select(null)}
        onFocusMap={(occurrence) => {
          const first = occurrence.locations[0];
          if (first) focusOn(locationPosition(first), { scale: 1.5, anchorX: 0.36 });
        }}
      />

      <ZoneSheet
        detail={zoneDetail}
        date={date}
        onClose={() => setOpenZone(null)}
        onSelectSpecies={(slug) => {
          const sprite = layout.sprites.find(
            (s) => s.subject.kind === 'marine' && s.subject.item.species.slug === slug,
          );
          if (sprite) {
            setOpenZone(null);
            select(sprite.selectionId);
          }
        }}
      />
    </div>
  );
}
