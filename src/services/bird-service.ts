import type { DateKey } from '@/domain/date';
import {
  BIRD_STATE_LABEL,
  BIRD_STATE_RANK,
  BIRD_UNKNOWN_LABEL,
  resolveBirdState,
  type BirdEvidenceStatus,
  type BirdPresenceState,
  type BirdSourceType,
  type BirdUnknownReason,
} from '@/domain/bird';
import { anchorKeyOf, assignBirdAnchors } from '@/domain/bird-anchor';
import {
  BIRD_DENSITY_BUDGET,
  BIRD_MAX_REGIONS_PER_SPECIES,
  selectBirdDisplay,
  type BirdViewport,
} from '@/domain/bird-display';
import { isMockRecord } from '@/domain/bird-guard';
import { isOnLand } from '@/domain/land';
import type { MapPosition } from '@/domain/projection';
import type { NatureEntity } from '@/domain/types';
import {
  loadBirdPrototypeFixture,
  type BirdPrototypeSpecies,
} from '@/data-sources/bird-prototype/adapter';
import type { MapLayout, MapSprite } from './map-service';

/* ────────────────────────────────────────────────────────────
 * 철새 레이어 조립.
 *
 *   Source / Fixture
 *     → SeasonalOccurrence      (domain/bird.ts)
 *     → resolved regional state (resolveBirdState — 기존 temporal resolver 재사용)
 *     → display selection       (domain/bird-display.ts)
 *     → Bird Renderer           (components/map/BirdSprite.tsx)
 *
 * 데이터는 뜻만 전한다. scale · opacity · 그림자 · 애니메이션 · 픽셀 크기는
 * 전부 renderer 가 정하므로 여기서도, fixture 에서도 다루지 않는다.
 * ──────────────────────────────────────────────────────────── */

export interface BirdPresence {
  speciesId: string;
  regionId: string;
  species: NatureEntity;
  regionLabel: string;
  state: BirdPresenceState;
  evidenceStatus: BirdEvidenceStatus;
  sourceType: BirdSourceType;
  isMock: boolean;
  /** 날짜와 무관하게 고정된 자리 */
  anchor: MapPosition;
  note?: string;
}

/** 판단할 수 없는 기록. OFF 와 절대 같은 통에 담지 않는다. */
export interface BirdUnknown {
  speciesId: string;
  regionId: string;
  regionLabel: string;
  speciesLabel: string;
  reason: BirdUnknownReason;
  reasonLabel: string;
}

export interface BirdNow {
  layout: MapLayout;
  /** 표시 예산으로 접힌 것. 상태는 그대로다 — OFF 가 아니다. */
  hiddenCount: number;
  /** 지금 관찰할 수 있는 종 × 지역 수 (표시 여부와 무관) */
  activeCount: number;
  /** 검증된 시즌 밖 */
  offCount: number;
  /** 상태를 판단할 수 없는 기록 */
  unknown: BirdUnknown[];
  headline: string;
  caption: string;
  /** 지금 화면이 합성 자료로 그려지고 있는가 */
  isPrototype: boolean;
  disclaimer: string;
}

const SPRITE_ROOT = '/sprites/bird-prototype';

function toEntity(species: BirdPrototypeSpecies): NatureEntity {
  return {
    id: `bird-prototype:${species.speciesId}`,
    slug: species.speciesId.toLowerCase().replace(/_/g, '-'),
    category: 'bird',
    name: species.label,
    icon: '🐦',
    illustration: `${SPRITE_ROOT}/${species.sprite}.svg`,
    // 합성 종이므로 자연 정보를 적지 않는다. 자료의 성격만 밝힌다.
    summary: '철새 Prototype 검증용 합성 종입니다. 실제 종이 아닙니다.',
    rarity: 1,
  };
}

/**
 * 자리 배정은 fixture 전체를 놓고 한 번만 한다.
 *
 * 날짜별로 '지금 활성인 것들' 만 놓고 배정하면, 이웃이 시즌을 벗어난 날
 * 남은 새의 칸 번호가 바뀌어 지도 위에서 움직인다. 그것은 이 모델이
 * 말하지 않는 '이동' 으로 읽힌다. 그래서 활성 여부와 무관하게 전부 배정한다.
 *
 * fixture 는 정적이므로 모듈이 살아 있는 동안 한 번이면 충분하다.
 */
let anchorCache: Map<string, MapPosition> | null = null;

function anchorTable(fixture: ReturnType<typeof loadBirdPrototypeFixture>) {
  if (!anchorCache) {
    anchorCache = assignBirdAnchors(
      fixture.occurrences.map((o) => ({
        speciesId: o.speciesId,
        regionId: o.regionId,
        anchorVersion: o.anchorVersion,
      })),
      fixture.regions,
      { accept: (position) => isOnLand(position) },
    );
  }
  return anchorCache;
}

/** 상태 색. 존재감은 renderer 가 크기·불투명도로 말하고, 이 색은 목록과 선택 링에서만 쓴다. */
const BIRD_ACCENT: Record<BirdPresenceState, string> = {
  PEAK: 'var(--color-peak)',
  GOOD: 'var(--color-accent)',
  STARTING: 'var(--color-accent)',
  ENDING: 'var(--color-faint)',
  OFF: 'var(--color-faint)',
};

interface Candidate {
  key: string;
  speciesId: string;
  regionId: string;
  state: BirdPresenceState;
  position: MapPosition;
  presence: BirdPresence;
}

export interface BirdQuery {
  date: DateKey;
  /** 전국 화면의 표시 예산을 정한다 */
  viewport: BirdViewport;
}

export function buildBirdNow(query: BirdQuery): BirdNow {
  const fixture = loadBirdPrototypeFixture();
  const anchors = anchorTable(fixture);

  const regionById = new Map(fixture.regions.map((r) => [r.regionId, r]));
  const entityById = new Map(fixture.species.map((s) => [s.speciesId, toEntity(s)]));
  const labelById = new Map(fixture.species.map((s) => [s.speciesId, s.label]));

  const candidates: Candidate[] = [];
  const unknown: BirdUnknown[] = [];
  let offCount = 0;

  for (const occurrence of fixture.occurrences) {
    const region = regionById.get(occurrence.regionId);
    const species = entityById.get(occurrence.speciesId);
    if (!region || !species) continue;

    const resolution = resolveBirdState(occurrence, query.date);

    if (resolution.kind === 'unknown') {
      unknown.push({
        speciesId: occurrence.speciesId,
        regionId: occurrence.regionId,
        regionLabel: region.label,
        speciesLabel: labelById.get(occurrence.speciesId) ?? occurrence.speciesId,
        reason: resolution.reason,
        reasonLabel: BIRD_UNKNOWN_LABEL[resolution.reason],
      });
      continue;
    }

    if (resolution.state === 'OFF') {
      offCount += 1;
      continue;
    }

    const anchor = anchors.get(anchorKeyOf(occurrence)) ?? region.position;
    candidates.push({
      key: `bird:${occurrence.speciesId}:${occurrence.regionId}`,
      speciesId: occurrence.speciesId,
      regionId: occurrence.regionId,
      state: resolution.state,
      position: anchor,
      presence: {
        speciesId: occurrence.speciesId,
        regionId: occurrence.regionId,
        species,
        regionLabel: region.label,
        state: resolution.state,
        evidenceStatus: occurrence.evidenceStatus,
        sourceType: occurrence.sourceType,
        isMock: occurrence.isMock,
        anchor,
        note: occurrence.note,
      },
    });
  }

  const { visible, hidden } = selectBirdDisplay(candidates, {
    viewport: query.viewport,
    maxRegionsPerSpecies: BIRD_MAX_REGIONS_PER_SPECIES,
  });

  const sprites: MapSprite[] = visible
    .map((candidate) => {
      const { presence } = candidate;
      return {
        key: candidate.key,
        selectionId: candidate.key,
        entity: presence.species,
        name: presence.species.name,
        placeLabel: presence.regionLabel,
        // anchor 는 고정이다. 겹침 완화로 옮기지 않는다.
        position: presence.anchor,
        basePosition: presence.anchor,
        // 철새의 존재감은 BirdSprite 가 state 에서 직접 만든다
        prominence: 1 - BIRD_STATE_RANK[presence.state] * 0.02,
        seasonState: null,
        starting: presence.state === 'STARTING',
        restricted: false,
        legalStatus: 'open' as const,
        accent: BIRD_ACCENT[presence.state],
        subject: { kind: 'bird' as const, presence },
      } satisfies MapSprite;
    })
    // 위에 있는 것부터 그려 아래쪽 sprite 가 앞에 오게 한다 (다른 레이어와 같은 규칙)
    .sort((a, b) => a.position.y - b.position.y);

  const isPrototype = fixture.occurrences.some(isMockRecord);
  const budget = BIRD_DENSITY_BUDGET[query.viewport];

  return {
    layout: {
      sprites,
      hiddenCount: hidden.length,
      totalCount: candidates.length,
      mode: 'species',
    },
    hiddenCount: hidden.length,
    activeCount: candidates.length,
    offCount,
    unknown,
    headline: birdHeadline(candidates.length, unknown.length),
    caption:
      `지도에 ${sprites.length}마리 표시 중` +
      (hidden.length > 0 ? ` · 화면 상한(${budget})으로 ${hidden.length} 접힘` : '') +
      (unknown.length > 0 ? ` · 판단 불가 ${unknown.length}건` : ''),
    isPrototype,
    disclaimer: fixture.disclaimer,
  };
}

function birdHeadline(active: number, unknownCount: number): string {
  if (active === 0 && unknownCount === 0) return '확인된 기록이 없습니다';
  if (active === 0) return `상태를 판단할 수 없는 기록 ${unknownCount}건`;
  return `${active}곳에서 관찰`;
}

export { BIRD_STATE_LABEL };
