'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatKoreanDate, isValidDateKey } from '@/domain/date';
import { NATURE_CATEGORIES, type NatureCategory, type ResolvedOccurrence } from '@/domain/types';
import { buildMapLayout, countByCategory, countMap, type MapSprite } from '@/services/map-service';
import {
  findNextLivelyDate,
  getZoneDetail,
  zonePosition,
  type MarineMapItem,
} from '@/services/marine-service';
import { locationPosition } from '@/services/nature-service';
import { BASE_MAP_HEIGHT_CQW } from '@/lib/map-asset';
import { useMapStore } from '@/store/map-store';
import { useTimeStore } from '@/store/time-store';
import { NatureTimeline } from '@/components/timeline/NatureTimeline';
import { NatureDetailSheet } from '@/components/nature/NatureDetailSheet';
import { MarineDetailSheet } from '@/components/marine/MarineDetailSheet';
import { ZoneSheet } from '@/components/marine/ZoneSheet';
import { EmptyState } from '@/components/common/EmptyState';
import { SHOW_LAYER_FILTER } from '@/data-sources';
import { LayerFilter } from './LayerFilter';
import { MarineFilterSheet } from './MarineFilterSheet';
import { MarineMapHeader } from './MarineMapHeader';
import { MapSideList } from './MapSideList';
import { NatureMap } from './NatureMap';
import { WeeklyPicksSheet } from './WeeklyPicksSheet';
import { WeeklyRecommendationCTA } from './WeeklyRecommendationCTA';

function parseLayers(value: string | null): NatureCategory[] {
  if (!value) return [];
  return value
    .split(',')
    .filter((v): v is NatureCategory => NATURE_CATEGORIES.includes(v as NatureCategory));
}

/** 이 배율을 넘으면 접어 두었던 sprite 를 펼친다 */
const DETAIL_SCALE = 1.45;

/** 시트에 가린 대상을 드러낼 때 당기는 최소 배율 */
const REVEAL_SCALE = 1.3;

/**
 * 데스크톱 상세 카드가 덮는 지도 오른쪽 끝의 비율.
 * 이보다 왼쪽에 있는 대상은 이미 보이므로 카메라를 건드리지 않는다 —
 * 안 가려진 것까지 밀면 지도를 읽던 맥락만 흔들린다.
 */
const COVERED_FROM_X = 0.78;

/**
 * MAP 화면 — 바다의 NOW.
 *
 * 사용자가 먼저 묻는 것은 "지금 뭐가 있지?" 이고
 * "잡아도 되나?" 는 상세를 열었을 때 답한다.
 * 그래서 시즌 필터와 규정 필터를 같은 줄에 두지 않는다.
 */
export function MapScreen() {
  const searchParams = useSearchParams();

  const date = useTimeStore((s) => s.selectedDate);
  const setDate = useTimeStore((s) => s.setDate);
  const isPlaying = useTimeStore((s) => s.isPlaying);

  const categories = useMapStore((s) => s.selectedCategories);
  const setCategories = useMapStore((s) => s.setCategories);
  const seasonFilter = useMapStore((s) => s.seasonFilter);
  const startingOnly = useMapStore((s) => s.startingOnly);
  const legalOnly = useMapStore((s) => s.legalOnly);
  const mode = useMapStore((s) => s.mode);
  const selectedId = useMapStore((s) => s.selectedOccurrenceId);
  const select = useMapStore((s) => s.selectOccurrence);
  const focusOn = useMapStore((s) => s.focusOn);

  // 핀치 중 매 프레임 재배치가 일어나지 않게 배율을 두 단계로 눌러 쓴다
  const detail = useMapStore((s) => (s.viewport.scale >= DETAIL_SCALE ? 1 : 0)) as 0 | 1;

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
    () =>
      buildMapLayout({ date, categories, season: seasonFilter, startingOnly, legalOnly, mode, detail }),
    [date, categories, seasonFilter, startingOnly, legalOnly, mode, detail],
  );

  const categoryCounts = useMemo(() => countByCategory(date), [date]);
  const counts = useMemo(() => countMap(date, mode), [date, mode]);

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

  /**
   * 고른 대상이 상세 카드에 가려질 때만 카메라를 옆으로 민다.
   *
   * 데스크톱에서만 한다. 모바일 시트는 화면의 78% 를 덮어서
   * 아무리 밀어도 대상이 드러나지 않고 확대만 남는다 — 맥락만 끊긴다.
   * 대신 선택된 sprite 에 이름표가 붙으므로 무엇을 골랐는지는 알 수 있다.
   */
  const revealIfCovered = useCallback(
    (sprite: MapSprite) => {
      const wide = typeof window !== 'undefined' && window.innerWidth >= 1024;
      if (!wide || sprite.position.x <= COVERED_FROM_X) return;

      /*
       * 1배에서는 지도를 밀 여지가 없다 (clampViewport 가 이동을 0 으로 묶는다).
       * 최소한만 당기되 이미 더 당겨져 있으면 그 배율을 유지한다.
       */
      const { scale } = useMapStore.getState().viewport;
      focusOn(sprite.position, {
        scale: Math.max(scale, REVEAL_SCALE),
        anchorX: 0.36,
        anchorY: sprite.position.y,
      });
    },
    [focusOn],
  );

  const onSelectSprite = useCallback(
    (sprite: MapSprite) => {
      if (sprite.subject.kind === 'zone') {
        setOpenZone(sprite.subject.marker.zone.slug);
        revealIfCovered(sprite);
        return;
      }
      select(sprite.selectionId);
      revealIfCovered(sprite);
    },
    [select, setOpenZone, revealIfCovered],
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

  /* ── 상단 계층 ──────────────────────────────────────────── */
  const [filterOpen, setFilterOpen] = useState(false);
  const [picksOpen, setPicksOpen] = useState(false);

  const filtered = mode === 'zone' ? legalOnly : seasonFilter !== 'all' || startingOnly || legalOnly;

  const openFilter = useCallback(() => setFilterOpen(true), []);

  /** 추천에서 고른 어종을 지도에서 집어 준다. 지금 지도에 없으면 아무것도 하지 않는다. */
  const showSpeciesOnMap = useCallback(
    (slug: string) => {
      const sprite = layout.sprites.find(
        (s) => s.subject.kind === 'marine' && s.subject.item.species.slug === slug,
      );
      if (!sprite) return false;
      select(sprite.selectionId);
      focusSprite(sprite);
      return true;
    },
    [layout, select, focusSprite],
  );

  const header = (stacked: boolean) => (
    <MarineMapHeader
      mode={layout.mode}
      counts={counts}
      /* 조건에 맞는 대상 수. 과밀로 접힌 것을 뺀 '지금 그려진 수' 는 타임라인이 말한다. */
      count={layout.totalCount}
      filtered={filtered}
      onOpenFilter={openFilter}
      stacked={stacked}
    />
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-env(safe-area-inset-bottom))] max-w-[1180px] flex-col gap-2 px-2 pb-2 pt-2 lg:h-[calc(100dvh-56px)] lg:gap-3 lg:px-6 lg:pb-5 lg:pt-3">
      {/* 모바일 — 상태 → 보기 방식 → (필요할 때) 필터 순으로 한 묶음 */}
      <div className="lg:hidden">{header(false)}</div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[252px_minmax(0,1fr)]">
        <div className="hidden min-h-0 flex-col gap-2.5 lg:flex">
          {/*
            데스크톱에서는 같은 계층을 좌측 레일에 세로로 쌓는다.
            상단 가로 바로 올리면 그만큼 지도 높이가 깎이는데,
            데스크톱 지도는 세로에 걸려 있어 그 손해가 그대로 지도 크기가 된다.
          */}
          {header(true)}
          {SHOW_LAYER_FILTER && <LayerFilter counts={categoryCounts} />}

          <MapSideList
            sprites={layout.sprites}
            selectedId={selectedId}
            openZoneSlug={openZoneSlug}
            onSelect={onSelectSprite}
          />
        </div>

        {/*
          지도는 map-bounds.json 의 viewWidth : viewHeight 비율을 반드시
          유지해야 한다 — sprite 위치가 컨테이너 크기 대비 비율로 찍히기 때문이다.
          높이 상한도 같은 출처에서 계산한다. 여기에 숫자를 직접 적으면
          base map 을 다시 자를 때 이 한 줄만 뒤처진다.

          모바일에서는 좌우 여백(-mx-2)까지 지도에 돌려준다. 이 화면에서
          지도는 카드가 아니라 주인공이고, 폭이 곧 지도 크기다 —
          모바일 지도 높이는 세로가 아니라 가로에 걸려 있다.
        */}
        <div
          className="relative -mx-2 flex min-h-0 items-center justify-center [container-type:size] lg:mx-0"
          style={{ '--map-max-h': `${BASE_MAP_HEIGHT_CQW.toFixed(2)}cqw` } as CSSProperties}
        >
          <NatureMap
            layout={layout}
            onSelectSprite={onSelectSprite}
            className="h-[min(100cqh,var(--map-max-h))] w-auto"
          />

          {/* 상태를 훑어보다 행동으로 넘어가는 자리 — 필터 줄에 섞지 않는다 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
            <WeeklyRecommendationCTA onOpen={() => setPicksOpen(true)} />
          </div>

          {visible === 0 && (
            <div className="pointer-events-none absolute inset-x-3 bottom-16 z-20 lg:hidden">
              <div className="pointer-events-auto">
                <QuietState date={date} filtered={filtered} />
              </div>
            </div>
          )}
        </div>
      </div>

      <NatureTimeline date={date} visibleCount={visible} mode={layout.mode} />

      <MarineFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        mode={layout.mode}
        counts={counts}
      />

      <WeeklyPicksSheet
        open={picksOpen}
        onClose={() => setPicksOpen(false)}
        date={date}
        onShowOnMap={showSpeciesOnMap}
      />

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

/**
 * 비어 보이는 날짜에도 탐험을 잇는다.
 * "없습니다" 로 끝내지 않고 언제 가면 되는지까지 말해 준다.
 */
function QuietState({ date, filtered }: { date: string; filtered: boolean }) {
  const setDate = useTimeStore((s) => s.setDate);
  const next = useMemo(() => (filtered ? null : findNextLivelyDate(date)), [date, filtered]);

  return (
    <EmptyState
      title="이 시기에는 표시할 주요 어종이 적어요"
      description={
        filtered
          ? '선택한 조건에 해당하는 것이 없습니다. 필터를 풀거나 날짜를 움직여 보세요.'
          : '날짜를 움직여 다른 바다의 계절을 살펴보세요.'
      }
      action={
        next ? (
          <button
            type="button"
            onClick={() => setDate(next)}
            className="rounded-lg bg-[color:var(--color-ink)] px-3.5 py-2 text-[13px] font-medium text-white"
          >
            다음 시즌 보기 · {formatKoreanDate(next)}
          </button>
        ) : undefined
      }
    />
  );
}
