import { createSeasonalDataSource, type SeasonalRawFile } from '../shared/seasonal-adapter';
import raw from './foliage.json';

export const foliageDataSource = createSeasonalDataSource(raw as SeasonalRawFile, {
  id: 'foliage',
  label: '단풍',
  defaultCategory: 'foliage',
});
