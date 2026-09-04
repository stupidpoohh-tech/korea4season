/* ────────────────────────────────────────────────────────────
 * 대표 날짜 화면을 찍는다.
 *
 * 시각 변경은 수치만으로 판단할 수 없다. 바꾸기 전과 뒤의 같은 날짜를
 * 나란히 두는 것이 유일하게 믿을 만한 확인이다.
 *
 *   node scripts/verify/shot.mjs out/            기본 날짜 묶음
 *   node scripts/verify/shot.mjs out/ 2026-04-08 2026-10-26
 *   LAYER=바다 node scripts/verify/shot.mjs out/
 *   VIEW=desktop node scripts/verify/shot.mjs out/
 * ──────────────────────────────────────────────────────────── */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { attach, ensureBrowser, ensureServer, MOBILE, DESKTOP } from './lib/cdp.mjs';

const [, , outDir = 'verify-shots', ...dates] = process.argv;

const DEFAULT_DATES = [
  '2026-03-25', '2026-04-01', '2026-04-08', '2026-04-12', '2026-04-18',
  '2026-10-10', '2026-10-26', '2026-11-05',
  '2026-12-20', '2027-01-15', '2027-03-05',
];

const layer = process.env.LAYER ?? '산';
const viewport = process.env.VIEW === 'desktop' ? DESKTOP : MOBILE;

await ensureServer();
await ensureBrowser();
const page = await attach();
mkdirSync(outDir, { recursive: true });

try {
  await page.viewport(viewport);
  for (const date of dates.length ? dates : DEFAULT_DATES) {
    await page.openMap(`?date=${date}`);
    if (layer !== '바다') await page.chooseLayer(layer);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
    const file = join(outDir, `${date}-${layer}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(file);
  }
} finally {
  page.close();
}
