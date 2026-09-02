import type { Location, LocationType } from '@/domain/types';
import raw from './locations.json';

interface RawLocation {
  slug: string;
  name: string;
  region: string;
  subregion?: string;
  type: string;
  lat: number;
  lng: number;
  mapX?: number;
  mapY?: number;
  description?: string;
}

const LOCATION_TYPES: readonly LocationType[] = [
  'sea',
  'coast',
  'mountain',
  'park',
  'wetland',
  'river',
  'island',
  'city',
];

function toLocationType(value: string): LocationType {
  return LOCATION_TYPES.includes(value as LocationType) ? (value as LocationType) : 'city';
}

export function loadLocations(): Location[] {
  return (raw.locations as RawLocation[]).map((row) => ({
    id: row.slug,
    slug: row.slug,
    name: row.name,
    region: row.region,
    subregion: row.subregion,
    type: toLocationType(row.type),
    geo: { lat: row.lat, lng: row.lng },
    mapPosition:
      row.mapX !== undefined && row.mapY !== undefined
        ? { x: row.mapX, y: row.mapY }
        : undefined,
    description: row.description,
  }));
}
