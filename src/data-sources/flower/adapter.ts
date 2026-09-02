import { createSeasonalDataSource, type SeasonalRawFile } from '../shared/seasonal-adapter';
import raw from './blooms.json';

export const flowerDataSource = createSeasonalDataSource(raw as SeasonalRawFile, {
  id: 'flower',
  label: '꽃',
  defaultCategory: 'flower',
});
