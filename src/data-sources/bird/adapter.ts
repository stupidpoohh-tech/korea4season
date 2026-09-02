import { createSeasonalDataSource, type SeasonalRawFile } from '../shared/seasonal-adapter';
import raw from './migration.json';

export const birdDataSource = createSeasonalDataSource(raw as SeasonalRawFile, {
  id: 'bird',
  label: '철새',
  defaultCategory: 'bird',
});
