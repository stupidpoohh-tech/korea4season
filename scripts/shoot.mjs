#!/usr/bin/env node
/**
 * 개발용 화면 촬영 도구.
 *
 *   node scripts/shoot.mjs <baseUrl> <outDir>
 *
 * Chrome DevTools Protocol 을 직접 쓴다 — 이 저장소에 브라우저 자동화
 * 의존성을 새로 들이지 않기 위해서다. Node 22 의 내장 WebSocket 만 쓴다.
 *
 * 지도의 자연 카테고리는 주소에 실리지 않으므로(카테고리 선택은 화면의 상태다)
 * 페이지를 연 뒤 실제로 버튼을 눌러 철새로 바꾼다.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] ?? 'http://localhost:3111';
const OUT = process.argv[3] ?? 'docs/prototype-evidence';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 9222;

/** TEST_BIRD_A × TEST 북부 자리를 감싸는 창 (1280×900 기준) */
const ANCHOR_CLIP = {
  width: 1280,
  height: 900,
  dpr: 2,
  clip: { x: 713, y: 95, width: 130, height: 130, scale: 2 },
};

const SHOTS = [
  { name: '1-mobile-national', date: '2026-01-10', width: 390, height: 844, dpr: 2 },
  { name: '2-desktop-national', date: '2026-01-10', width: 1280, height: 900, dpr: 1 },
  { name: '3-starting', date: '2025-11-20', width: 1280, height: 900, dpr: 1 },
  { name: '4-peak', date: '2026-01-05', width: 1280, height: 900, dpr: 1 },
  { name: '5-ending', date: '2026-02-14', width: 1280, height: 900, dpr: 1 },
  { name: '6-off', date: '2026-06-25', width: 1280, height: 900, dpr: 1 },
  { name: '7-mobile-density', date: '2026-01-05', width: 390, height: 844, dpr: 2 },
  /*
   * 같은 anchor 를 다섯 날짜에 걸쳐 같은 자리로 잘라 낸다.
   * 같은 잘린 틀 안에서 새가 제자리에 있고 존재감만 변하는 것이 이 화면의 계약이다.
   */
  { name: 'anchor-1-starting', date: '2025-11-20', ...ANCHOR_CLIP },
  { name: 'anchor-2-good', date: '2025-12-05', ...ANCHOR_CLIP },
  { name: 'anchor-3-peak', date: '2026-01-05', ...ANCHOR_CLIP },
  { name: 'anchor-4-ending', date: '2026-02-14', ...ANCHOR_CLIP },
  { name: 'anchor-5-off', date: '2026-06-25', ...ANCHOR_CLIP },
  {
    name: '10-selected',
    date: '2026-01-05',
    width: 390,
    height: 844,
    dpr: 2,
    // 고른 새는 종을 확인할 만큼 커지고, 기존 Bottom Sheet 가 그대로 열린다
    click: 'TEST BIRD',
  },
  { name: '8-marine-regression', date: '2026-01-10', width: 1280, height: 900, dpr: 1, layer: null },
  { name: '9-mountain-regression', date: '2025-10-20', width: 1280, height: 900, dpr: 1, layer: '산' },
];

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      const slot = this.pending.get(msg.id);
      if (!slot) return;
      this.pending.delete(msg.id);
      if (msg.error) slot.reject(new Error(JSON.stringify(msg.error)));
      else slot.resolve(msg.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
}

/* 메뉴는 상태가 바뀐 뒤에야 그려지므로 여는 것과 고르는 것을 나눈다 */
const OPEN_MENU = `(() => {
  const trigger = [...document.querySelectorAll('button')]
    .find((b) => (b.getAttribute('aria-label') ?? '').startsWith('보는 자연') && b.offsetParent);
  if (!trigger) return 'no-trigger';
  trigger.click();
  return 'ok';
})()`;

const PICK_ITEM = (label) => `(() => {
  const item = [...document.querySelectorAll('[role="menuitem"]')]
    .find((b) => b.textContent.includes(${JSON.stringify(label)}) && b.offsetParent);
  if (!item) return 'no-item';
  item.click();
  return 'ok';
})()`;

async function main() {
  mkdirSync(OUT, { recursive: true });

  const chrome = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ]);
  chrome.stderr.on('data', () => {});

  let target = null;
  for (let i = 0; i < 60 && !target; i += 1) {
    await sleep(250);
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      target = list.find((t) => t.type === 'page');
    } catch {
      /* 아직 안 떴다 */
    }
  }
  if (!target) throw new Error('chrome 이 뜨지 않았습니다');

  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  for (const shot of SHOTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: shot.dpr,
      mobile: shot.width < 700,
    });

    await cdp.send('Page.navigate', { url: `${BASE}/map?date=${shot.date}` });
    await sleep(3500);

    const layer = 'layer' in shot ? shot.layer : '철새';
    if (layer) {
      const opened = await cdp.evaluate(OPEN_MENU);
      if (opened !== 'ok') console.warn(`  ${shot.name}: 메뉴 열기 ${opened}`);
      await sleep(500);
      const picked = await cdp.evaluate(PICK_ITEM(layer));
      if (picked !== 'ok') console.warn(`  ${shot.name}: 카테고리 전환 ${picked}`);
      await sleep(1600);
    }

    if (shot.click) {
      const clicked = await cdp.evaluate(`(() => {
        const target = [...document.querySelectorAll('button[aria-label]')]
          .find((b) => b.getAttribute('aria-label').includes(${JSON.stringify(shot.click)}) && b.offsetParent);
        if (!target) return 'no-target';
        target.click();
        return 'ok';
      })()`);
      if (clicked !== 'ok') console.warn(`  ${shot.name}: 클릭 ${clicked}`);
      await sleep(1200);
    }

    /*
     * webp 로 남긴다. 평평한 일러스트라 손실이 거의 보이지 않으면서
     * png 의 3분의 1 이하다 — 증거 열 몇 장이 저장소를 무겁게 만들지 않는다.
     */
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'webp',
      quality: 88,
      ...(shot.clip ? { clip: { ...shot.clip } } : null),
    });
    writeFileSync(`${OUT}/${shot.name}.webp`, Buffer.from(data, 'base64'));
    console.log(`ok ${shot.name}.webp`);
  }

  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
