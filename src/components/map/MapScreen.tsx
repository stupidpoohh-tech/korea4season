'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatKoreanDate, isValidDateKey } from '@/domain/date';
import { NATURE_CATEGORIES, type NatureCategory, type ResolvedOccurrence } from '@/domain/types';
import {
  EMPTY_MAP_COUNTS,
  EMPTY_MAP_LAYOUT,
  buildMapLayout,
  countMap,
  type MapSprite,
} from '@/services/map-service';
import {
  FOLIAGE_STATE_LABEL,
  freshAmount,
  mountainColorAt,
} from '@/services/foliage-service';
import { FLOWER_STATE_LABEL, getFlowerPicks } from '@/services/flower-service';
import { getFoliagePicks } from '@/services/foliage-service';
import {
  buildMountainNow,
  buildTerrainNow,
  type MountainNow,
  type MountainPhase,
} from '@/services/mountain-service';
import { buildBirdNow } from '@/services/bird-service';
import {
  findNextLivelyDate,
  getZoneDetail,
  zonePosition,
  type MarineMapItem,
} from '@/services/marine-service';
import { locationPosition } from '@/services/nature-service';
import type { MapPosition } from '@/domain/projection';
import { BASE_MAP_HEIGHT_CQW } from '@/lib/map-asset';
import { useWideScreen } from '@/lib/use-wide-screen';
import { useMapStore } from '@/store/map-store';
import { useTimeStore } from '@/store/time-store';
import { NatureTimeline } from '@/components/timeline/NatureTimeline';
import { NatureDetailSheet } from '@/components/nature/NatureDetailSheet';
import { MarineDetailSheet } from '@/components/marine/MarineDetailSheet';
import { BirdDetailSheet } from '@/components/nature/BirdDetailSheet';
import { ZoneSheet } from '@/components/marine/ZoneSheet';
import { EmptyState } from '@/components/common/EmptyState';
import { TerrainOverlay } from './TerrainOverlay';
import { FlowerOverlay } from './FlowerOverlay';
import { MountainPicksSheet, type PickView } from './MountainPicksSheet';
import { MountainRegionList, type RegionRow } from './MountainRegionList';
import {
  MountainDetailSheet,
  type MountainSpotView,
} from '@/components/nature/MountainDetailSheet';
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
  const isScrubbing = useTimeStore((s) => s.isScrubbing);
  /* 보이지 않는 쪽(모바일의 좌측 레일 · 데스크톱의 상단 바)은 아예 그리지 않는다 */
  const wideScreen = useWideScreen();
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
  const flowerSpecies = useMapStore((s) => s.flowerSpecies);
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

  /* ── state -> URL ───────────────────────────────────────
   *
   * 주소를 다시 쓰는 일은 값싸지 않다. Safari 는 replaceState 를 30초에
   * 100번으로 제한하고, 그 한도를 넘기면 경고를 남긴 뒤 페이지를 놓아
   * 버린다 (iOS 에서 '이 페이지를 불러올 수 없음'). 슬라이더를 한 번
   * 끌면 하루마다 한 번씩 — 1년이면 365번이다.
   *
   * 그래서 잡고 있는 동안과 재생 중에는 아예 쓰지 않고, 손을 뗀 뒤
   * 잠깐 기다렸다가 한 번만 쓴다. 주소는 지금 보고 있는 것을 남에게
   * 건네기 위한 것이므로 끄는 도중의 하루하루를 담을 이유가 없다.
   */
  useEffect(() => {
    if (isPlaying || isScrubbing) return;
    const write = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('date', date);
      if (categories.length) params.set('layer', categories.join(','));
      if (selectedId) params.set('focus', selectedId);
      /*
       * 한도를 넘기면 Safari 는 예외를 던진다. effect 안에서 그대로 터지면
       * React 가 트리를 통째로 내려 버리므로, 주소 한 줄 때문에 화면을
       * 잃지 않도록 여기서 받아 둔다 (진단 패널이 기록을 남긴다).
       */
      try {
        window.history.replaceState(null, '', `/map?${params.toString()}`);
      } catch (error) {
        console.warn('주소를 갱신하지 못했습니다', error);
      }
    }, 250);
    return () => clearTimeout(write);
  }, [date, categories, isPlaying, isScrubbing, selectedId]);

  /* ── 파생 데이터 ────────────────────────────────────────── */

  /*
   * 지금 산이 무슨 계절인지는 날짜가 정한다.
   *
   * 겨울에는 어느 카테고리를 보고 있든 산과 땅이 눈으로 덮이므로,
   * 바다를 보는 중에도 지형은 계산한다 — 1월의 지도가 초여름처럼 초록이면
   * 시간을 움직이는 지도가 아니다.
   */
  const terrain = useMemo(() => buildTerrainNow(date), [date]);
  const mountain = useMemo(
    () => buildMountainNow(date, terrain, layer === 'mountain'),
    [date, terrain, layer],
  );
  const phase = mountain.phase;
  const mountainPhase = phase;
  const isFlower = layer === 'mountain' && phase === 'flower';
  const isFoliage = layer === 'mountain' && phase === 'foliage';

  /*
   * 철새는 지도 조립을 따로 돈다.
   *
   * buildMapLayout 도 layer === 'bird' 를 알지만, 화면에는 sprite 말고도
   * '판단 불가 몇 건' · '상한으로 몇 마리 접힘' 같은 것이 필요하다.
   * 그 값들을 다시 세지 않도록 여기서 한 번만 만들고 layout 을 꺼내 쓴다.
   */
  const bird = useMemo(
    () =>
      layer === 'bird'
        ? buildBirdNow({ date, viewport: wideScreen === true ? 'desktop' : 'mobile' })
        : null,
    [layer, date, wideScreen],
  );

  /* 철새 화면에서는 이 계산을 아예 돌리지 않는다 — 위에서 이미 만들었다 */
  const otherLayout = useMemo(
    () =>
      layer === 'bird'
        ? EMPTY_MAP_LAYOUT
        : buildMapLayout({
            date,
            categories,
            season: seasonFilter,
            startingOnly,
            legalOnly,
            speciesSlug: focusedSpecies?.slug,
            layer,
            foliageState,
            flowerSpecies,
            mountainPhase,
            mode,
            detail,
            fast: isPlaying || isScrubbing,
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
      flowerSpecies,
      mountainPhase,
      mode,
      detail,
      isPlaying,
      isScrubbing,
    ],
  );

  const layout = bird?.layout ?? otherLayout;

  /*
   * 어종 집계는 바다 화면에서만 센다.
   * 날짜를 끄는 동안 매 프레임 도는 계산이라, 산을 보는 중에 어종 124건을
   * 다시 훑으면 슬라이더가 그만큼 무거워진다 (모바일에서 화면이 죽었다).
   */
  const counts = useMemo(
    () => (layer === 'mountain' || layer === 'bird' ? EMPTY_MAP_COUNTS : countMap(date, mode)),
    [layer, date, mode],
  );

  const selectedSprite = useMemo(
    () => layout.sprites.find((s) => s.selectionId === selectedId) ?? null,
    [layout, selectedId],
  );

  const selectedMarine: MarineMapItem | null =
    selectedSprite?.subject.kind === 'marine' ? selectedSprite.subject.item : null;
  const selectedNature: ResolvedOccurrence | null =
    selectedSprite?.subject.kind === 'nature' ? selectedSprite.subject.resolved : null;
  const selectedBird =
    selectedSprite?.subject.kind === 'bird' ? selectedSprite.subject.presence : null;

  /*
   * 산의 상세는 sprite 가 아니라 명소 자체에서 찾는다.
   *
   * 지역별 보기에는 지도에 sprite 가 없다. sprite 에서만 찾으면
   * 추천 시트의 '지도에서 보기' 와 좌측 권역 목록이 아무것도 열지 못한다.
   */
  const selectedMountain = pickMountainSpot(layer, selectedId, mountain);

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

  /* 철새 Prototype 에는 거는 축이 아직 없다 */
  const filtered =
    layer === 'bird'
      ? false
      : layer === 'mountain'
        ? mode === 'species' && (foliageState !== 'all' || flowerSpecies !== 'all')
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

  /** 추천이나 목록에서 고른 산 명소를 지도에서 집어 준다 */
  const showMountainOnMap = useCallback(
    (selectionId: string, position: MapPosition) => {
      select(selectionId);
      focusOn(position, { scale: 1.5, anchorX: 0.36 });
    },
    [select, focusOn],
  );

  /* ── 지역별 목록 · 추천 — 계절이 무엇을 보여줄지 정한다 ── */
  const regionRows: RegionRow[] = useMemo(() => {
    if (isFlower) {
      return mountain.flowerRegions.map((region) => {
        const top = region.blooms[0];
        return {
          id: region.id,
          label: region.label,
          stateLabel: FLOWER_STATE_LABEL[region.state],
          color: top?.petal ?? 'var(--color-line)',
          strongColor: top?.petal ?? 'var(--color-muted)',
          detail: [region.lead.location.name, ...region.blooms.map((b) => b.name)]
            .slice(0, 3)
            .join(' · '),
          active: `flower:${region.lead.location.slug}` === selectedId,
          onSelect: () =>
            showMountainOnMap(`flower:${region.lead.location.slug}`, region.lead.position),
        };
      });
    }
    if (isFoliage) {
      return mountain.foliageRegions.map((region) => {
        const color = mountainColorAt(region.wave);
        return {
          id: region.id,
          label: region.label,
          stateLabel: FOLIAGE_STATE_LABEL[region.state],
          color: color.face,
          strongColor: color.faceDark,
          detail:
            region.lead.nextChangeLabel && region.lead.daysToNextChange !== undefined
              ? `${region.lead.location.name} · ${region.lead.nextChangeLabel} ${region.lead.daysToNextChange}일`
              : region.lead.location.name,
          active: `foliage:${region.lead.location.slug}` === selectedId,
          onSelect: () =>
            showMountainOnMap(`foliage:${region.lead.location.slug}`, region.lead.position),
        };
      });
    }
    return [];
  }, [isFlower, isFoliage, mountain, selectedId, showMountainOnMap]);

  const picks: PickView[] = useMemo(() => {
    if (!picksOpen) return [];
    if (isFlower) {
      return getFlowerPicks(mountain.flowerSpots).map((spot) => ({
        key: `flower:${spot.location.id}`,
        location: spot.location,
        entity: spot.entity,
        stateLabel: FLOWER_STATE_LABEL[spot.state],
        peak: spot.state === 'peak',
        peakWindow: spot.peakWindow,
      }));
    }
    if (isFoliage) {
      return getFoliagePicks(date).map((spot) => ({
        key: `foliage:${spot.location.id}`,
        location: spot.location,
        entity: spot.entity,
        stateLabel: FOLIAGE_STATE_LABEL[spot.state],
        peak: spot.state === 'peak',
        peakWindow: spot.peakWindow,
      }));
    }
    return [];
  }, [picksOpen, isFlower, isFoliage, mountain, date]);

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
      headline={bird ? bird.headline : mountain.headline}
      phase={phase}
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
      {wideScreen !== true && <div className="lg:hidden">{header(false)}</div>}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[252px_minmax(0,1fr)]">
        {wideScreen !== false && (
        <div className="hidden min-h-0 flex-col gap-2.5 lg:flex">
          {/*
            데스크톱에서는 같은 계층을 좌측 레일에 세로로 쌓는다.
            상단 가로 바로 올리면 그만큼 지도 높이가 깎이는데,
            데스크톱 지도는 세로에 걸려 있어 그 손해가 그대로 지도 크기가 된다.
          */}
          {/* 자연 카테고리는 제목 자체(CategorySelector)가 고르므로 별도 칩 줄을 두지 않는다 */}
          {header(true)}

          {/* 지역별 보기에는 지도에 그림이 없다 — 목록이 지도의 색을 읽는 통로가 된다 */}
          {layer === 'mountain' && layout.mode === 'zone' ? (
            <MountainRegionList
              title={isFlower ? '남쪽부터 북쪽으로' : '북쪽부터 남쪽으로'}
              rows={regionRows}
            />
          ) : (
            <MapSideList
              sprites={layout.sprites}
              selectedId={selectedId}
              openZoneSlug={openZoneSlug}
              onSelect={onSelectSprite}
              emptyMessage={
                bird
                  ? bird.unknown.length > 0
                    ? `이 날짜에 확인된 기록이 없습니다. 상태를 판단할 수 없는 기록이 ${bird.unknown.length}건 있습니다.`
                    : '이 날짜에 확인된 기록이 없습니다. 날짜를 옮겨 보세요.'
                  : undefined
              }
            />
          )}
        </div>
        )}

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
            overlay={
              <>
                {/* 계절이 지형을 칠한다 — 카테고리와 무관하다 (1월 바다 화면도 눈이다) */}
                <TerrainOverlay
                  regions={terrain.foliageRegions}
                  winter={terrain.winter}
                  freshAt={(offsetDays) => freshAmount(date, offsetDays)}
                  detailed={layer === 'mountain'}
                  /* 끄는 동안에는 전환을 걸지 않는다 — 모바일에서 화면이 죽는다 */
                  fast={isPlaying || isScrubbing}
                />
                {/* 꽃은 지형 위에 무리로 얹힌다 */}
                {phase === 'flower' && (
                  <FlowerOverlay
                    regions={mountain.flowerRegions}
                    fast={isPlaying || isScrubbing}
                  />
                )}
              </>
            }
          />

          {/*
            지도 아래 한 줄. 가운데는 행동으로 넘어가는 자리(추천),
            오른쪽은 지도 자체를 다루는 확대/축소다.
            가운데 열을 auto 로 두어 CTA 는 컨트롤 폭과 무관하게 가운데 온다.
          */}
          <div className="pointer-events-none absolute inset-x-2.5 bottom-3 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <span />
            {/*
              철새 Prototype 에는 추천이 없다.
              추천을 만들려면 어디로 가면 좋은지 말해야 하는데, 지금 들고 있는 것은
              합성 자료다. 빈 시트를 여는 버튼을 두는 대신 자리를 비워 둔다.
            */}
            {layer === 'bird' ? (
              <span />
            ) : (
              <WeeklyRecommendationCTA
                label={
                  isFlower
                    ? '이번 주 꽃 어디가 좋지?'
                    : isFoliage
                      ? '이번 주 단풍 어디가 좋지?'
                      : layer === 'mountain'
                        ? '이번 주 어디가 좋지?'
                        : '이번 주 뭐 잡지?'
                }
                onOpen={() => setPicksOpen(true)}
              />
            )}
            <div className="justify-self-end">
              <MapControls />
            </div>
          </div>

          {/*
            재생 중에는 띄우지 않는다. 1년을 돌려 보는 동안 시즌이 비는 구간마다
            안내 카드가 깜빡이면 정작 지도의 변화를 못 본다.
          */}
          {visible === 0 &&
            !isPlaying &&
            !(layer === 'mountain' && layout.mode === 'zone') &&
            layer !== 'bird' && (
              <div className="pointer-events-none absolute inset-x-3 bottom-16 z-20 lg:hidden">
                <div className="pointer-events-auto">
                  <QuietState
                    date={date}
                    filtered={filtered}
                    species={focusedSpecies?.name}
                    mountain={layer === 'mountain' ? phase : null}
                  />
                </div>
              </div>
            )}
        </div>
      </div>

      <NatureTimeline
        date={date}
        /*
         * 산에서 세어야 할 것은 마커 수가 아니라 지금 어떤 상태가 몇 곳인가다.
         * 지역별 보기에는 애초에 지도에 그림이 없어서 '표시 중' 이 뜻을 갖지 않는다.
         */
        caption={
          bird
            ? bird.caption
            : layer === 'mountain'
              ? mountain.caption
              : `지도에 ${visible}${layout.mode === 'zone' ? '곳' : '종'} 표시 중`
        }
      />

      <MarineFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        layer={layer}
        phase={phase}
        mode={layout.mode}
        counts={counts}
      />

      {layer === 'mountain' ? (
        <MountainPicksSheet
          open={picksOpen}
          onClose={() => setPicksOpen(false)}
          date={date}
          title={isFlower ? '이번 주, 꽃 어디가 좋지?' : '이번 주, 단풍 어디가 좋지?'}
          emptyMessage={
            isFlower
              ? '이 날짜에는 절정이거나 볼 만한 곳이 없습니다. 슬라이더를 3~4월로 옮겨 보세요.'
              : isFoliage
                ? '이 날짜에는 절정이거나 볼 만한 곳이 없습니다. 슬라이더를 10월로 옮겨 보세요.'
                : '지금 산은 조용합니다. 슬라이더를 봄이나 가을로 옮겨 보세요.'
          }
          disclaimer={
            isFlower
              ? '개화 시기는 개발용 DEMO 평년 참고값입니다. 그해 기온에 따라 크게 달라지니 방문 전 지자체·기상 정보를 확인하세요.'
              : '단풍 시기는 개발용 DEMO 평년 참고값입니다. 그해 기온에 따라 1~2주씩 달라지니 방문 전 국립공원·지자체 정보를 확인하세요.'
          }
          picks={picks}
          onShowOnMap={(pick) => {
            const spots = isFlower ? mountain.flowerSpots : mountain.foliageSpots;
            const hit = spots.find((sp) => sp.location.id === pick.location.id);
            if (hit) showMountainOnMap(`${isFlower ? 'flower' : 'foliage'}:${hit.location.slug}`, hit.position);
          }}
        />
      ) : (
        <WeeklyPicksSheet
          open={picksOpen}
          onClose={() => setPicksOpen(false)}
          date={date}
          onShowOnMap={showSpeciesOnMap}
        />
      )}

      <MountainDetailSheet
        spot={selectedMountain?.view ?? null}
        kind={isFlower ? '꽃' : '단풍'}
        date={date}
        onClose={() => select(null)}
        onFocusMap={() => {
          if (selectedMountain) focusOn(selectedMountain.position, { scale: 1.6, anchorX: 0.36 });
        }}
      />

      <MarineDetailSheet
        item={selectedMarine}
        date={date}
        onClose={() => select(null)}
        onOpenZone={openZoneAndFocus}
        onPlayYear={playSpeciesYear}
      />

      <BirdDetailSheet presence={selectedBird} onClose={() => select(null)} />

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
/**
 * 고른 산 명소를 꽃·단풍 어느 쪽에서든 찾아 준다.
 * 명소가 수십 개뿐이라 훑는 값이 싸다 — 메모까지 걸 일이 아니다.
 */
function pickMountainSpot(
  layer: string,
  selectedId: string | null,
  mountain: MountainNow,
): { view: MountainSpotView; position: MapPosition } | null {
  if (layer !== 'mountain' || !selectedId) return null;

  for (const spot of mountain.flowerSpots) {
    if (`flower:${spot.location.slug}` === selectedId) {
      return { position: spot.position, view: { ...spot, stateLabel: FLOWER_STATE_LABEL[spot.state] } };
    }
  }
  for (const spot of mountain.foliageSpots) {
    if (`foliage:${spot.location.slug}` === selectedId) {
      return { position: spot.position, view: { ...spot, stateLabel: FOLIAGE_STATE_LABEL[spot.state] } };
    }
  }
  return null;
}

function QuietState({
  date,
  filtered,
  species,
  mountain,
}: {
  date: string;
  filtered: boolean;
  /** 어종 하나만 보고 있다면 그 이름 — 안내를 그 어종의 말로 한다 */
  species?: string;
  /** 산 화면이면 지금 계절. 빈 화면의 뜻이 계절마다 다르다. */
  mountain: MountainPhase | null;
}) {
  const setDate = useTimeStore((s) => s.setDate);
  const next = useMemo(() => (filtered ? null : findNextLivelyDate(date)), [date, filtered]);

  const title = species
    ? `지금은 ${species} 시즌이 아니에요`
    : mountain
      ? filtered
        ? '조건에 맞는 곳이 없어요'
        : mountain === 'flower'
          ? '아직 핀 곳이 없어요'
          : mountain === 'foliage'
            ? '아직 물든 곳이 없어요'
            : mountain === 'winter'
              ? '겨울 산입니다'
              : '지금 산은 초록입니다'
      : filtered
        ? '조건에 맞는 어종이 없어요'
        : '이 시기에는 볼 것이 적어요';

  return (
    <EmptyState
      title={title}
      description={
        species
          ? '▶ 1년 재생을 누르면 언제 시즌인지 보입니다.'
          : mountain
            ? '아래 슬라이더를 3~4월로 옮기면 남쪽부터 꽃이 피고, 10월로 옮기면 북쪽부터 물듭니다.'
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
