import { BIRD_MOCK_ALLOWED } from '@/domain/bird-config';
import { filterRuntimeRecords } from '@/domain/bird-guard';
import type {
  BirdEvidenceStatus,
  BirdSeasonWindow,
  BirdSeasonalOccurrence,
} from '@/domain/bird';
import type { BirdRegionAnchor } from '@/domain/bird-anchor';
import raw from './prototype-occurrences.json';

/* ────────────────────────────────────────────────────────────
 * 철새 Prototype fixture 어댑터.
 *
 * 이 소스는 data-sources/index.ts 의 레지스트리에 등록하지 않는다.
 * 등록하면 nature-repository 를 통해 도감 · 이번 주 추천 · /event 상세 ·
 * 홈 화면까지 합성 자료가 흘러 들어간다. Prototype 은 지도의 철새 레이어
 * 하나만 필요하므로, 그 경로 하나만 따로 낸다 — 격리가 규칙이 아니라
 * 구조가 되도록.
 *
 * isMock · sourceType 은 파일의 meta 에서 **모든 레코드에 강제로 찍는다.**
 * 레코드마다 손으로 적게 두면 언젠가 하나를 빠뜨리고, 그 하나가 새어 나간다.
 * ──────────────────────────────────────────────────────────── */

interface RawRegion {
  regionId: string;
  label: string;
  x: number;
  y: number;
}

interface RawSpecies {
  speciesId: string;
  label: string;
  sprite: string;
}

interface RawOccurrence {
  speciesId: string;
  regionId: string;
  evidenceStatus: string;
  seasons: BirdSeasonWindow[];
  note?: string;
}

export interface BirdPrototypeSpecies {
  speciesId: string;
  label: string;
  /** public/sprites/bird-prototype/<sprite>.svg */
  sprite: string;
}

export interface BirdPrototypeFixture {
  fixtureId: string;
  anchorVersion: string;
  regions: BirdRegionAnchor[];
  species: BirdPrototypeSpecies[];
  occurrences: BirdSeasonalOccurrence[];
  disclaimer: string;
}

const meta = raw.meta;

const regions: BirdRegionAnchor[] = (raw.regions as RawRegion[]).map((row) => ({
  regionId: row.regionId,
  label: row.label,
  position: { x: row.x, y: row.y },
}));

const species: BirdPrototypeSpecies[] = (raw.species as RawSpecies[]).map((row) => ({
  speciesId: row.speciesId,
  label: row.label,
  sprite: row.sprite,
}));

const occurrences: BirdSeasonalOccurrence[] = (raw.occurrences as RawOccurrence[]).map((row) => ({
  speciesId: row.speciesId,
  regionId: row.regionId,
  anchorVersion: meta.anchorVersion,
  seasons: row.seasons,
  // meta 가 한 번에 찍는다 — 레코드가 스스로 mock 표시를 지울 수 없다
  isMock: meta.isMock,
  sourceType: 'MOCK',
  evidenceStatus: row.evidenceStatus as BirdEvidenceStatus,
  note: row.note,
}));

/**
 * fixture 를 런타임에 싣는다.
 *
 * production 공개가 켜지면 guard 가 mock 을 전부 걸러 내므로 occurrences 는
 * 빈 배열이 된다. 검증된 기록이 0건이므로 그때 철새 레이어는 아무것도 그리지
 * 않고 "확인된 기록이 없다" 고 말한다 — 그것이 지금의 사실이다.
 */
export function loadBirdPrototypeFixture(): BirdPrototypeFixture {
  return {
    fixtureId: meta.fixtureId,
    anchorVersion: meta.anchorVersion,
    regions,
    species,
    occurrences: filterRuntimeRecords(occurrences, { allowMock: BIRD_MOCK_ALLOWED }),
    disclaimer: meta.disclaimer,
  };
}

/**
 * 가드를 우회한 원본. 테스트와 진단 전용이며 화면 경로에서 부르지 않는다.
 * (여기서 나온 값은 production payload 로 넘길 수 없다 — assertNoMockRecords 가 막는다)
 */
export function rawBirdPrototypeOccurrences(): BirdSeasonalOccurrence[] {
  return occurrences;
}
