/* ────────────────────────────────────────────────────────────
 * 검사를 전부 돌리고 한 장으로 요약한다.
 *
 * 하나씩 따로 돌려도 되지만, 시각 작업은 한 곳을 고치면 다른 곳이
 * 무너지는 일이 잦다 — 꽃을 키우면 재생이 느려지고, 겨울을 옅게 하면
 * 국면 판정이 어긋난다. 그래서 묶어서 본다.
 * ──────────────────────────────────────────────────────────── */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BASE_URL, ensureBrowser, ensureServer } from './lib/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const CHECKS = [
  ['꽃 자리 안정성', 'flower-stability.mjs'],
  ['입력 경로 일치', 'consistency.mjs'],
  ['바다 sprite 배치', 'map-sprites.mjs'],
  ['뷰포트 넘침', 'viewports.mjs'],
  ['드래그 안전성', 'scrub.mjs'],
  ['1년 재생', 'playback.mjs'],
  ['힙', 'heap.mjs'],
];

const only = process.argv.slice(2);
const picked = only.length
  ? CHECKS.filter(([name, file]) => only.some((a) => file.includes(a) || name.includes(a)))
  : CHECKS;

await ensureServer();
await ensureBrowser();
console.log(`검사 대상 ${BASE_URL}\n`);

const results = [];
for (const [name, file] of picked) {
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, file)], { stdio: 'inherit' });
    child.on('exit', (c) => resolve(c ?? 1));
  });
  results.push({ name, pass: code === 0 });
}

console.log('\n────────────────────────────');
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
const failed = results.filter((r) => !r.pass).length;
console.log(`────────────────────────────\n${results.length - failed}/${results.length} 통과`);
process.exit(failed ? 1 : 0);
