'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { isValidDateKey } from '@/domain/date';
import { NATURE_CATEGORIES, type NatureCategory, type ResolvedOccurrence } from '@/domain/types';
import { buildMapLayout, locationPosition, resolveAll } from '@/services/nature-service';
import { getNatureIndex } from '@/repositories/nature-repository';
import { isOnMap } from '@/domain/occurrence';
import { useMapStore } from '@/store/map-store';
import { useTimeStore } from '@/store/time-store';
import { NatureTimeline } from '@/components/timeline/NatureTimeline';
import { NatureDetailSheet } from '@/components/nature/NatureDetailSheet';
import { EmptyState } from '@/components/common/EmptyState';
import { LayerFilter, LayerFilterColumn } from './LayerFilter';
import { MapSideList } from './MapSideList';
import { NatureMap } from './NatureMap';

const EMPTY_COUNTS = Object.fromEntries(
  NATURE_CATEGORIES.map((c) => [c, 0]),
) as Record<NatureCategory, number>;

function parseLayers(value: string | null): NatureCategory[] {
  if (!value) return [];
  return value
    .split(',')
    .filter((v): v is NatureCategory => NATURE_CATEGORIES.includes(v as NatureCategory));
}

/**
 * MAP 화면. (요구사항 #16)
 * 지도가 주인공이고 나머지 UI 는 전부 그 위에 얹힌다.
 */
export function MapScreen() {
  const searchParams = useSearchParams();

  const date = useTimeStore((s) => s.selectedDate);
  const setDate = useTimeStore((s) => s.setDate);
  const isPlaying = useTimeStore((s) => s.isPlaying);

  const categories = useMapStore((s) => s.selectedCategories);
  const setCategories = useMapStore((s) => s.setCategories);
  const selectedOccurrenceId = useMapStore((s) => s.selectedOccurrenceId);
  const selectOccurrence = useMapStore((s) => s.selectOccurrence);
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

    // 홈/상세 카드에서 넘어온 경우 해당 자연현상으로 카메라를 옮긴다 (요구사항 #9, #17)
    const focusId = searchParams.get('focus');
    if (focusId) pendingFocus.current = focusId;
  }, [searchParams, setDate, setCategories]);

  /* ── state -> URL (재생 중에는 건너뛴다) ────────────────── */
  useEffect(() => {
    if (isPlaying) return;
    const params = new URLSearchParams();
    params.set('date', date);
    if (categories.length) params.set('layer', categories.join(','));
    if (selectedOccurrenceId) params.set('focus', selectedOccurrenceId);
    window.history.replaceState(null, '', `/map?${params.toString()}`);
  }, [date, categories, isPlaying, selectedOccurrenceId]);

  /* ── 파생 데이터 ────────────────────────────────────────── */
  const layout = useMemo(
    () => buildMapLayout({ date, categories }),
    [date, categories],
  );

  const allResolved = useMemo(() => resolveAll({ date }), [date]);

  const counts = useMemo(() => {
    const next = { ...EMPTY_COUNTS };
    for (const item of allResolved) {
      if (isOnMap(item.status)) next[item.entity.category] += 1;
    }
    return next;
  }, [allResolved]);

  const selected: ResolvedOccurrence | null = useMemo(() => {
    if (!selectedOccurrenceId) return null;
    return allResolved.find((r) => r.occurrence.id === selectedOccurrenceId) ?? null;
  }, [selectedOccurrenceId, allResolved]);

  const focusMap = useCallback(
    (item: ResolvedOccurrence) => {
      const first = item.locations[0];
      if (first) focusOn(locationPosition(first));
    },
    [focusOn],
  );

  /* ── ?focus= 로 들어온 자연현상 열기 ────────────────────── */
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const target = allResolved.find((r) => r.occurrence.id === id);
    if (!target) return;
    pendingFocus.current = null;
    selectOccurrence(id);
    focusMap(target);
  }, [allResolved, selectOccurrence, focusMap]);

  /** 지도에 올라온 '자연현상' 수 — sprite 수(장소별 중복)와 구분한다 */
  const onMapItems = useMemo(() => {
    const seen = new Set<string>();
    const items: ResolvedOccurrence[] = [];
    for (const sprite of layout.sprites) {
      const id = sprite.resolved.occurrence.id;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push(sprite.resolved);
    }
    return items;
  }, [layout]);

  const visible = onMapItems.length;
  const anyLayerHasData = Object.values(counts).some((n) => n > 0);

  const selectFromList = useCallback(
    (item: ResolvedOccurrence) => {
      selectOccurrence(item.occurrence.id);
      focusMap(item);
    },
    [selectOccurrence, focusMap],
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-56px)] max-w-[1180px] flex-col gap-3 px-3 pt-3 lg:px-6 lg:pb-5">
      <div className="lg:hidden">
        <LayerFilter counts={counts} />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
        <div className="hidden min-h-0 flex-col gap-3 lg:flex">
          <LayerFilterColumn counts={counts} />
          <MapSideList
            items={onMapItems}
            selectedId={selectedOccurrenceId}
            onSelect={selectFromList}
          />
        </div>

        {/*
          지도는 1000:1300 비율을 반드시 유지해야 한다 — sprite 위치가 컨테이너
          크기 대비 비율(0~1)로 찍히기 때문이다. container query 단위로
          "높이와 너비 중 작은 쪽에 맞춰 contain" 을 CSS 만으로 처리한다.
        */}
        <div className="relative flex min-h-0 items-center justify-center [container-type:size]">
          <NatureMap
            date={date}
            layout={layout}
            onSelectSprite={(sprite) => selectOccurrence(sprite.resolved.occurrence.id)}
            className="h-[min(100cqh,130cqw)] w-auto"
          />

          {visible === 0 && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 lg:hidden">
              <div className="pointer-events-auto">
                <EmptyState
                  title="이 날짜에는 조용합니다"
                  description={
                    categories.length && anyLayerHasData
                      ? '선택한 레이어에 해당하는 자연현상이 없습니다. 다른 레이어를 켜거나 날짜를 움직여 보세요.'
                      : '오늘은 선택한 조건에 해당하는 자연현상이 없습니다. 슬라이더를 움직여 대한민국의 다른 계절을 살펴보세요.'
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <NatureTimeline date={date} visibleCount={visible} />

      <NatureDetailSheet
        item={selected}
        date={date}
        onClose={() => selectOccurrence(null)}
        onFocusMap={focusMap}
      />
    </div>
  );
}

/** 도감 총계 등에 쓰는 보조 */
export function totalEntityCount() {
  return getNatureIndex().entities.length;
}
