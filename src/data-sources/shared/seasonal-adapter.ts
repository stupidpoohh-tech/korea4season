import type {
  Confidence,
  NatureCategory,
  NatureEntity,
  NatureOccurrence,
  SourceRef,
} from '@/domain/types';
import type { NatureDataSet, NatureDataSource } from '../types';

/**
 * 꽃 · 단풍 · 철새 · 자연현상은 원본 스키마가 같은 모양이다.
 * (entity 목록 + entity × location × 기간 목록)
 * 하나의 adapter 로 normalize 한다.
 */

export interface SeasonalRawMeta {
  sourceName: string;
  sourceUrl?: string;
  updatedAt?: string;
  confidence: string;
  isDemo: boolean;
  category?: string;
  polarity?: string;
  disclaimer?: string;
}

export interface SeasonalRawEntity {
  code: string;
  name: string;
  speciesName?: string;
  icon: string;
  rarity?: number;
  summary: string;
  description?: string;
  category?: string;
}

export interface SeasonalRawOccurrence {
  code: string;
  entity: string;
  regions: string[];
  locations: string[];
  start: string;
  end: string;
  peakStart?: string;
  peakEnd?: string;
  weight?: number;
  notes?: string[];
}

export interface SeasonalRawFile {
  meta: SeasonalRawMeta;
  entities: SeasonalRawEntity[];
  occurrences: SeasonalRawOccurrence[];
}

export interface SeasonalSourceOptions {
  id: string;
  label: string;
  /** 파일 전체의 기본 category. entity 가 자체 category 를 가지면 그것을 쓴다. */
  defaultCategory: NatureCategory;
}

export function createSeasonalDataSource(
  raw: SeasonalRawFile,
  options: SeasonalSourceOptions,
): NatureDataSource {
  const source: SourceRef = {
    name: raw.meta.sourceName,
    url: raw.meta.sourceUrl,
    updatedAt: raw.meta.updatedAt,
    note: raw.meta.disclaimer,
  };

  const entityCategory = (row: SeasonalRawEntity): NatureCategory =>
    (row.category as NatureCategory) ?? options.defaultCategory;

  const load = (): NatureDataSet => {
    const entities: NatureEntity[] = raw.entities.map((row) => ({
      id: `${options.id}:${row.code}`,
      slug: row.code,
      category: entityCategory(row),
      name: row.name,
      speciesName: row.speciesName,
      icon: row.icon,
      summary: row.summary,
      description: row.description,
      rarity: (row.rarity as NatureEntity['rarity']) ?? 2,
    }));

    const occurrences: NatureOccurrence[] = raw.occurrences.map((row) => ({
      id: `occ:${options.id}:${row.code}`,
      slug: row.code,
      entityId: `${options.id}:${row.entity}`,
      locationIds: row.locations,
      regions: row.regions,
      recurrence: 'annual',
      startDate: row.start,
      endDate: row.end,
      peakStartDate: row.peakStart,
      peakEndDate: row.peakEnd,
      polarity: 'observable',
      confidence: raw.meta.confidence as Confidence,
      source,
      notes: row.notes,
      weight: row.weight ?? 0.5,
      isDemo: raw.meta.isDemo,
    }));

    return { entities, occurrences };
  };

  return {
    id: options.id,
    label: options.label,
    category: options.defaultCategory,
    load,
  };
}
