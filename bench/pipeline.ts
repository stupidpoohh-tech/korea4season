/**
 * 서버가 화면 하나를 그릴 때마다 돌던 자료 가공의 CPU 시간.
 *
 * 정적 내보내기 전에는 이 계산이 요청마다 Worker 안에서 다시 돌았다.
 * 지금은 빌드 때 한 번, 또는 브라우저에서 한 번 돈다.
 */
import { todayKey } from '@/domain/date';
import {
  buildMarineMapItems,
  evaluateSpecies,
  getSpeciesBySlug,
  getSpeciesZones,
  getZoneDetail,
  listSpeciesSlugs,
  listZoneSlugs,
} from '@/services/marine-service';
import { getTodayHeadlines, getWeekPicks, resolveAll } from '@/services/nature-service';
import { buildMapLayout } from '@/services/map-service';
import { buildMountainNow, buildTerrainNow } from '@/services/mountain-service';

const date = todayKey();

function bench(label: string, runs: number, fn: () => void) {
  fn(); // 모듈 첫 읽기(JSON 파싱 등)를 빼고 잰다
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < runs; i += 1) fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / runs;
  console.log(`${label.padEnd(42)} ${ms.toFixed(2)} ms`);
}

const speciesSlug = listSpeciesSlugs()[0]!;
const zoneSlug = listZoneSlugs()[0]!;

console.log('화면 한 장을 그리는 데 드는 자료 가공 (평균, Node)\n');
bench('지도 /map  buildMapLayout(바다)', 30, () => {
  buildMapLayout({ date, layer: 'marine', mode: 'species' });
});
bench('지도 /map  buildMapLayout(산)', 30, () => {
  const terrain = buildTerrainNow(date);
  buildMountainNow(date, terrain);
  buildMapLayout({ date, layer: 'mountain', mode: 'zone', mountainPhase: 'foliage' });
});
bench('오늘 /home  헤드라인+추천+지도미리보기', 20, () => {
  getTodayHeadlines(date, 4);
  getWeekPicks(date, 6);
  buildMarineMapItems(date);
});
bench('이번주 /week  getWeekPicks', 20, () => {
  getWeekPicks(date, 10);
});
bench('어종 /species/[slug]', 30, () => {
  const s = getSpeciesBySlug(speciesSlug)!;
  evaluateSpecies(s.id, date);
  getSpeciesZones(s.id, date);
});
bench('권역 /zone/[slug]', 30, () => {
  getZoneDetail(zoneSlug, date);
});
bench('자연현상 resolveAll(전체)', 30, () => {
  resolveAll({ date });
});
