/* 육지 판정. sprite 가 바다를 벗어났는지 보려면 이것이 있어야 한다. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const mask = JSON.parse(readFileSync(join(root, 'src/domain/land-mask.json'), 'utf8'));
export const bounds = JSON.parse(readFileSync(join(root, 'src/domain/map-bounds.json'), 'utf8'));

/** 지도 세로/가로 비. 두 sprite 사이 거리를 재려면 화면 비를 넣어야 한다. */
export const ASPECT = bounds.viewHeight / bounds.viewWidth;

const RINGS = [mask.mainland, mask.jeju, mask.ulleung];

function inRing({ x, y }, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const onLand = (p) => RINGS.some((ring) => inRing(p, ring));
