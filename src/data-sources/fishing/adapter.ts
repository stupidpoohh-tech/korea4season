import type {
  Confidence,
  NatureEntity,
  NatureOccurrence,
  RegionRule,
  SourceRef,
} from '@/domain/types';
import type { NatureDataSet, NatureDataSource } from '../types';
import raw from './closed-seasons.json';

/**
 * 수산자원 금어기 원본 스키마 -> NatureEntity + NatureOccurrence
 *
 * 금어기는 '관찰 가능 구간' 이 아니라 '조업 제한 구간' 이므로
 * polarity 를 'restricted' 로 둔다. 상태 문구가 이에 따라 달라진다.
 */

interface RawRegionRule {
  scope: string;
  closedSeasonStart?: string;
  closedSeasonEnd?: string;
  minimumSizeCm?: number;
  note?: string;
}

interface RawSpecies {
  code: string;
  name: string;
  speciesName?: string;
  icon: string;
  rarity?: number;
  weight?: number;
  summary: string;
  description?: string;
  closedSeason: { start: string; end: string };
  minimumSizeCm?: number;
  minimumWeightG?: number;
  sizeNote?: string;
  regions: string[];
  locations: string[];
  regionRules?: RawRegionRule[];
  exceptions?: string[];
  notes?: string[];
}

const meta = raw.meta;

const SOURCE: SourceRef = {
  name: meta.sourceName,
  url: meta.sourceUrl,
  updatedAt: meta.updatedAt,
  note: meta.disclaimer,
};

function toRules(row: RawSpecies): string[] {
  const rules: string[] = [
    `금어기 ${formatMd(row.closedSeason.start)} ~ ${formatMd(row.closedSeason.end)}`,
  ];
  if (row.minimumSizeCm !== undefined) {
    rules.push(
      `금지체장 ${row.minimumSizeCm}cm 이하${row.sizeNote ? ` (${row.sizeNote})` : ''}`,
    );
  }
  if (row.minimumWeightG !== undefined) {
    rules.push(`금지체중 ${row.minimumWeightG}g 이하`);
  }
  return rules;
}

function formatMd(md: string): string {
  const [m, d] = md.split('-').map(Number);
  return `${m ?? 0}월 ${d ?? 0}일`;
}

function toRegionRules(rows?: RawRegionRule[]): RegionRule[] | undefined {
  if (!rows?.length) return undefined;
  return rows.map((r) => ({
    scope: r.scope,
    closedSeasonStart: r.closedSeasonStart,
    closedSeasonEnd: r.closedSeasonEnd,
    minimumSizeCm: r.minimumSizeCm,
    note: r.note,
  }));
}

function normalize(): NatureDataSet {
  const species = raw.species as RawSpecies[];

  const entities: NatureEntity[] = species.map((row) => ({
    id: `fishing:${row.code}`,
    slug: row.code,
    category: 'fishing',
    subCategory: 'closed-season',
    name: row.name,
    speciesName: row.speciesName,
    icon: row.icon,
    summary: row.summary,
    description: row.description,
    rarity: (row.rarity as NatureEntity['rarity']) ?? 2,
    tags: row.regions,
    fishingRule: {
      closedSeasonStart: row.closedSeason.start,
      closedSeasonEnd: row.closedSeason.end,
      minimumSizeCm: row.minimumSizeCm,
      minimumWeightG: row.minimumWeightG,
      regionRules: toRegionRules(row.regionRules),
      exceptions: row.exceptions,
      notes: row.notes,
      lawSource: SOURCE,
    },
  }));

  const occurrences: NatureOccurrence[] = species.map((row) => ({
    id: `occ:fishing:${row.code}`,
    slug: `${row.code}-closed-season`,
    entityId: `fishing:${row.code}`,
    locationIds: row.locations,
    regions: row.regions,
    recurrence: 'annual',
    startDate: row.closedSeason.start,
    endDate: row.closedSeason.end,
    polarity: 'restricted',
    confidence: meta.confidence as Confidence,
    source: SOURCE,
    rules: toRules(row),
    notes: row.notes,
    exceptions: row.exceptions,
    weight: row.weight ?? 0.6,
    isDemo: meta.isDemo,
  }));

  return { entities, occurrences };
}

export const fishingDataSource: NatureDataSource = {
  id: 'fishing',
  label: '금어기',
  category: 'fishing',
  load: normalize,
};

export const FISHING_DISCLAIMER = meta.disclaimer;
