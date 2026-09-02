import { createSeasonalDataSource, type SeasonalRawFile } from '../shared/seasonal-adapter';
import raw from './wildlife.json';

/** 자연현상 + 해양생물. entity 별로 category 가 갈린다. */
export const wildlifeDataSource = createSeasonalDataSource(raw as SeasonalRawFile, {
  id: 'wildlife',
  label: '자연',
  defaultCategory: 'nature',
});
