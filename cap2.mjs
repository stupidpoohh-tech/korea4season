import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const OUT = process.argv[2];
const errs = [];
for (const [name, url, w, h] of JSON.parse(process.argv[3])) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type()==='error' && !/404|Freesentation/.test(m.text())) errs.push(name+': '+m.text()); });
  await p.goto('http://localhost:3231' + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1400);
  const box = await p.locator('img[alt="대한민국 자연 지도"]').first().evaluate(el => {
    const c = el.parentElement.parentElement.getBoundingClientRect();
    return { w: Math.round(c.width), h: Math.round(c.height) };
  }).catch(() => null);
  console.log(name, '지도 크기:', JSON.stringify(box));
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await p.close();
}
await b.close();
console.log(errs.length ? errs.slice(0,5).join('\n') : 'no errors');
