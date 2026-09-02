'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatKoreanDate, isValidDateKey } from '@/domain/date';
import { NATURE_CATEGORIES, type NatureCategory, type ResolvedOccurrence } from '@/domain/types';
import { buildMapLayout, countMap, type MapSprite } from '@/services/map-service';
import {
  buildFoliageRegions,
  countFoliage,
  summarizeFoliage,
  waveSummary,
  type FoliageSpot,
} from '@/services/foliage-service';
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
import { FoliageOverlay } from './FoliageOverlay';
import { FoliagePicksSheet } from './FoliagePicksSheet';
import { FoliageRegionList } from './FoliageRegionList';
import { FoliageDetailSheet } from '@/components/nature/FoliageDetailSheet';
import { MarineFilterSheet } from './MarineFilterSheet';
import { MarineMapHeader } from './MarineMapHeader';
import { MapControls } from './MapControls';
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
  const play = useTimeStore((s) => s.play);

  const categories = useMapStore((s) => s.selectedCategories);
  const setCategories = useMapStore((s) => s.setCategories);
  const seasonFilter = useMapStore((s) => s.seasonFilter);
  const startingOnly = useMapStore((s) => s.startingOnly);
  const legalOnly = useMapStore((s) => s.legalOnly);
  const focusedSpecies = useMapStore((s) => s.focusedSpecies);
  const focusSpecies = useMapStore((s) => s.focusSpecies);
  const layer = useMapStore((s) => s.layer);
  const foliageState = useMapStore((s) => s.foliageState);
  const mode = useMapStore((s) => s.mode);
  const selectedId = useMapStore((s) => s.selectedOccurrenceId);
  const select = useMapStore((s) => s.selectOccurrence);
  const focusOn = useMapStore((s) => s.focusOn);
  const resetViewport = useMapStore((s) => s.resetViewport);

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
      buildMapLayout({
        date,
        categories,
        season: seasonFilter,
        startingOnly,
        legalOnly,
        speciesSlug: focusedSpecies?.slug,
        layer,
        foliageState,
        mode,
        detail,
      }),
    [
      date,
      categories,
      seasonFilter,
      startingOnly,
      legalOnly,
      focusedSpecies,
      layer,
      foliageState,
      mode,
      detail,
    ],
  );

  const counts = useMemo(() => countMap(date, mode), [date, mode]);
  const foliage = useMemo(() => countFoliage(date), [date]);
  /*
   * 지도의 색은 sprite 가 아니라 권역이 정한다.
   * 아직 초록인 곳도 함께 와야 지도 전체가 하나의 띠로 읽힌다.
   */
  const foliageRegions = useMemo(
    () => (layer === 'foliage' ? buildFoliageRegions(date) : []),
    [layer, date],
  );

  /* 헤더 한 줄 — "강원 북부 절정 · 수도권 시작". 개수가 아니라 전선의 위치다. */
  const foliageWave = useMemo(() => waveSummary(foliageRegions), [foliageRegions]);

  const selectedSprite = useMemo(
    () => layout.sprites.find((s) => s.selectionId === selectedId) ?? null,
    [layout, selectedId],
  );

  const selectedMarine: MarineMapItem | null =
    selectedSprite?.subject.kind === 'marine' ? selectedSprite.subject.item : null;
  const selectedNature: ResolvedOccurrence | null =
    selectedSprite?.subject.kind === 'nature' ? selectedSprite.subject.resolved : null;
  /*
   * 단풍 상세는 sprite 가 아니라 명소 자체에서 찾는다.
   *
   * 지역별 보기에는 지도에 sprite 가 없다. sprite 에서만 찾으면
   * 추천 시트의 '지도에서 보기' 와 좌측 권역 목록이 아무것도 열지 못한다.
   */
  const selectedFoliage: FoliageSpot | null = useMemo(() => {
    if (layer !== 'foliage' || !selectedId) return null;
    for (const region of foliageRegions) {
      const hit = region.spots.find((spot) => `foliage:${spot.location.slug}` === selectedId);
      if (hit) return hit;
    }
    return null;
  }, [layer, selectedId, foliageRegions]);

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

  const filtered =
    layer === 'foliage'
      ? mode === 'species' && foliageState !== 'all'
      : mode === 'zone'
        ? legalOnly
        : seasonFilter !== 'all' || startingOnly || legalOnly || Boolean(focusedSpecies);

  const openFilter = useCallback(() => setFilterOpen(true), []);

  /**
   * 이 어종만 남기고 1년을 재생한다.
   * 상세 시트를 닫고 지도를 비워 주지 않으면 정작 볼 것이 시트에 가린다.
   */
  const playSpeciesYear = useCallback(
    (item: MarineMapItem) => {
      focusSpecies({ slug: item.species.slug, name: item.species.name });
      select(null);
      setOpenZone(null);
      resetViewport();
      play();
    },
    [focusSpecies, select, setOpenZone, resetViewport, play],
  );

  /** 추천에서 고른 단풍 명소를 지도에서 집어 준다 */
  const showFoliageOnMap = useCallback(
    (spot: FoliageSpot) => {
      select(`foliage:${spot.location.slug}`);
      focusOn(spot.position, { scale: 1.5, anchorX: 0.36 });
    },
    [select, focusOn],
  );

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
      layer={layer}
      foliage={foliage}
      foliageWave={foliageWave}
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
    /*
     * 헤더 56px + 아래 테두리 1px, 그리고 푸터 32px(SITE_FOOTER_HEIGHT)을 뺀다.
     * 하나라도 빠뜨리면 그만큼 문서가 넘쳐 스크롤바가 생긴다.
     */
    <div className="mx-auto flex h-[calc(100dvh-32px-env(safe-area-inset-bottom))] max-w-[1180px] flex-col gap-2 px-2 pb-2 pt-2 lg:h-[calc(100dvh-57px-32px)] lg:gap-3 lg:px-6 lg:pb-3 lg:pt-3">
      {/* 모바일 — 상태 → 보기 방식 → (필요할 때) 필터 순으로 한 묶음 */}
      <div className="lg:hidden">{header(false)}</div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[252px_minmax(0,1fr)]">
        <div className="hidden min-h-0 flex-col gap-2.5 lg:flex">
          {/*
            데스크톱에서는 같은 계층을 좌측 레일에 세로로 쌓는다.
            상단 가로 바로 올리면 그만큼 지도 높이가 깎이는데,
            데스크톱 지도는 세로에 걸려 있어 그 손해가 그대로 지도 크기가 된다.
          */}
          {/* 자연 카테고리는 제목 자체(CategorySelector)가 고르므로 별도 칩 줄을 두지 않는다 */}
          {header(true)}

          {/* 지역별 단풍에는 지도에 그림이 없다 — 목록이 지도의 색을 읽는 통로가 된다 */}
          {layer === 'foliage' && layout.mode === 'zone' ? (
            <FoliageRegionList
              regions={foliageRegions}
              selectedId={selectedId}
              onSelect={showFoliageOnMap}
            />
          ) : (
            <MapSideList
              sprites={layout.sprites}
              selectedId={selectedId}
              openZoneSlug={openZoneSlug}
              onSelect={onSelectSprite}
            />
          )}
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
            overlay={layer === 'foliage' ? <FoliageOverlay regions={foliageRegions} /> : null}
          />

          {/*
            지도 아래 한 줄. 가운데는 행동으로 넘어가는 자리(추천),
            오른쪽은 지도 자체를 다루는 확대/축소다.
            가운데 열을 auto 로 두어 CTA 는 컨트롤 폭과 무관하게 가운데 온다.
          */}
          <div className="pointer-events-none absolute inset-x-2.5 bottom-3 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <span />
            <WeeklyRecommendationCTA
              label={layer === 'foliage' ? '이번 주 단풍 어디가 좋지?' : '이번 주 뭐 잡지?'}
              onOpen={() => setPicksOpen(true)}
            />
            <div className="justify-self-end">
              <MapControls />
            </div>
          </div>

          {/*
            재생 중에는 띄우지 않는다. 1년을 돌려 보는 동안 시즌이 비는 구간마다
            안내 카드가 깜빡이면 정작 지도의 변화를 못 본다.
          */}
          {visible === 0 && !isPlaying && !(layer === 'foliage' && layout.mode === 'zone') && (
            <div className="pointer-events-none absolute inset-x-3 bottom-16 z-20 lg:hidden">
              <div className="pointer-events-auto">
                <QuietState
                  date={date}
                  filtered={filtered}
                  species={focusedSpecies?.name}
                  foliage={layer === 'foliage'}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <NatureTimeline
        date={date}
        /*
         * 단풍에서 세어야 할 것은 마커 수가 아니라 지금 어떤 상태가 몇 곳인가다.
         * 지역별 보기에는 애초에 지도에 그림이 없어서 '표시 중' 이 뜻을 갖지 않는다.
         */
        caption={
          layer === 'foliage'
            ? summarizeFoliage(foliage)
            : `지도에 ${visible}${layout.mode === 'zone' ? '곳' : '종'} 표시 중`
        }
      />

      <MarineFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        layer={layer}
        mode={layout.mode}
        counts={counts}
        foliage={foliage}
      />

      {layer === 'foliage' ? (
        <FoliagePicksSheet
          open={picksOpen}
          onClose={() => setPicksOpen(false)}
          date={date}
          onShowOnMap={showFoliageOnMap}
        />
      ) : (
        <WeeklyPicksSheet
          open={picksOpen}
          onClose={() => setPicksOpen(false)}
          date={date}
          onShowOnMap={showSpeciesOnMap}
        />
      )}

      <FoliageDetailSheet
        spot={selectedFoliage}
        date={date}
        onClose={() => select(null)}
        onFocusMap={(spot) => focusOn(spot.position, { scale: 1.6, anchorX: 0.36 })}
      />

      <MarineDetailSheet
        item={selectedMarine}
        date={date}
        onClose={() => select(null)}
        onOpenZone={openZoneAndFocus}
        onPlayYear={playSpeciesYear}
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
function QuietState({
  date,
  filtered,
  species,
  foliage = false,
}: {
  date: string;
  filtered: boolean;
  /** 어종 하나만 보고 있다면 그 이름 — 안내를 그 어종의 말로 한다 */
  species?: string;
  /** 단풍 화면인가 — 빈 화면의 뜻이 다르다 */
  foliage?: boolean;
}) {
  const setDate = useTimeStore((s) => s.setDate);
  const next = useMemo(() => (filtered ? null : findNextLivelyDate(date)), [date, filtered]);

  const title = species
    ? `지금은 ${species} 시즌이 아니에요`
    : foliage
      ? filtered
        ? '이 상태인 곳이 없어요'
        : '아직 물든 곳이 없어요'
      : filtered
        ? '조건에 맞는 어종이 없어요'
        : '이 시기에는 볼 것이 적어요';

  return (
    <EmptyState
      title={title}
      description={
        species
          ? '▶ 1년 재생을 누르면 언제 시즌인지 보입니다.'
          : foliage
            ? '아래 슬라이더를 10월로 옮기면 북쪽 산부터 물듭니다.'
            : filtered
              ? '필터를 풀거나 날짜를 옮겨 보세요.'
              : '아래 슬라이더로 날짜를 옮기면 다른 계절의 바다가 보입니다.'
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
