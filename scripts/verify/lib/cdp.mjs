/* ────────────────────────────────────────────────────────────
 * 검증 도구가 브라우저를 다루는 공통 층.
 *
 * 검사마다 CDP 접속 코드를 다시 쓰지 않는다. 그러면 검사끼리 조금씩
 * 다른 조건(기기 크기 · CPU 감속 · 대기 시간)에서 재게 되고,
 * 수치를 나란히 놓고 비교할 수 없게 된다.
 * ──────────────────────────────────────────────────────────── */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export const BASE_URL = process.env.VERIFY_URL ?? 'http://localhost:3031';
export const CDP_URL = process.env.VERIFY_CDP ?? 'http://127.0.0.1:9222';

/** 모바일 기준 화면. 이 서비스의 지도 크기는 세로가 아니라 가로에 걸려 있다. */
export const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
export const DESKTOP = { width: 1360, height: 900, deviceScaleFactor: 1, mobile: false };

/**
 * 성능을 잴 때의 CPU 감속 배수.
 *
 * 개발 기계의 CPU 로 잰 프레임 시간은 휴대폰에서 아무 뜻이 없다.
 * 이 값을 바꾸면 과거 수치와 비교할 수 없으므로 한곳에 둔다.
 */
export const CPU_THROTTLE = 4;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

async function cdpAlive() {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 헤드리스 브라우저를 띄운다. 이미 떠 있으면 그것을 쓴다.
 *
 * 검사를 이어서 돌릴 때마다 다시 띄우면 첫 화면 캐시가 매번 비어 있어
 * 첫 검사만 느리게 나온다.
 */
export async function ensureBrowser() {
  if (await cdpAlive()) return null;

  const bin = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!bin) {
    throw new Error(
      `헤드리스 브라우저를 찾지 못했습니다. CHROME_PATH 로 경로를 지정하거나 ${CDP_URL} 에 미리 띄워 두십시오.`,
    );
  }

  const port = new URL(CDP_URL).port || '9222';
  const child = spawn(
    bin,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=/tmp/korea4season-verify-${port}`,
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  );
  child.unref();

  for (let i = 0; i < 40; i += 1) {
    await new Promise((r) => setTimeout(r, 300));
    if (await cdpAlive()) return child;
  }
  throw new Error('브라우저가 뜨지 않았습니다.');
}

/** 검사 대상 서버가 살아 있는가 */
export async function ensureServer() {
  try {
    const res = await fetch(`${BASE_URL}/map`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) return;
  } catch {
    /* 아래에서 한 번에 알린다 */
  }
  throw new Error(
    `${BASE_URL} 가 응답하지 않습니다. 프로덕션 빌드를 띄운 뒤 다시 실행하십시오 ` +
      `(VERIFY_URL 로 주소를 바꿀 수 있습니다).`,
  );
}

/**
 * 페이지 하나에 붙는다.
 *
 * 콘솔 오류와 예외는 붙는 순간부터 모은다 — 열어 본 뒤에 걸면
 * hydration 오류처럼 첫 순간에만 나는 것을 놓친다.
 */
export async function attach() {
  const list = await (await fetch(`${CDP_URL}/json/list`)).json();
  const target = list.find((t) => t.type === 'page');
  if (!target) throw new Error('열린 페이지가 없습니다.');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const errors = [];

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = (id += 1);
      pending.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  ws.onmessage = (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) reject(new Error(`${m.error.message} (${JSON.stringify(m.error.data ?? '')})`));
      else resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      errors.push(
        `${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200)}`,
      );
    }
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(`exception: ${(m.params.exceptionDetails.exception?.description ?? '').slice(0, 200)}`);
    }
    if (m.method === 'Inspector.targetCrashed') errors.push('탭이 죽었습니다');
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('CDP 접속 실패'));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Inspector.enable');

  const page = {
    send,
    errors,
    close: () => ws.close(),

    /** JS 를 실행하고 값을 돌려받는다 */
    async eval(expression) {
      const out = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (out.exceptionDetails) {
        throw new Error(out.exceptionDetails.exception?.description ?? '평가 실패');
      }
      return out.result?.value;
    },

    async viewport(v) {
      await send('Emulation.setDeviceMetricsOverride', v);
    },

    async touch(on = true) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: on, maxTouchPoints: on ? 5 : 0 });
    },

    async throttle(rate) {
      await send('Emulation.setCPUThrottlingRate', { rate });
    },

    /** 지도 화면으로 간다. 하이드레이션이 끝날 때까지 기다린다. */
    async openMap(query = '') {
      errors.length = 0;
      await send('Page.navigate', { url: `${BASE_URL}/map${query}` });
      await page.settle();
    },

    /**
     * 화면이 자리 잡을 때까지.
     *
     * 고정 대기 대신 슬라이더가 나타나는 것을 본다 — 하이드레이션이 끝나야
     * 존재하므로, 느린 기계에서 헛되이 오래 기다리거나 빠른 기계에서
     * 덜 기다리는 일이 없다.
     */
    async settle(timeoutMs = 15000) {
      const until = Date.now() + timeoutMs;
      while (Date.now() < until) {
        const ready = await page.eval(
          `!!document.querySelector('input.date-range') && !!document.querySelector('[style*="aspect-ratio"]')`,
        );
        if (ready) {
          await new Promise((r) => setTimeout(r, 900));
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error('지도가 뜨지 않았습니다.');
    },

    /** 보이는 버튼을 글자로 찾아 누른다 */
    async click(text, waitMs = 700) {
      const hit = await page.eval(
        `(() => {
          const n = [...document.querySelectorAll('button,label,a')]
            .filter((e) => e.offsetParent)
            .find((e) => ((e.innerText||'') + ' ' + (e.getAttribute('aria-label')||'')).replace(/\\s+/g,' ').includes(${JSON.stringify(text)}));
          if (!n) return false;
          n.click();
          return true;
        })()`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      return hit;
    },

    /** 상위 카테고리를 바꾼다 ('산' · '바다') */
    async chooseLayer(label) {
      const opened = await page.eval(
        `(() => {
          const b = [...document.querySelectorAll('button')].find((e) => (e.getAttribute('aria-label')||'').startsWith('보는 자연'));
          if (!b) return false;
          b.click();
          return true;
        })()`,
      );
      if (!opened) return false;
      await new Promise((r) => setTimeout(r, 400));
      const picked = await page.eval(
        `(() => {
          const n = [...document.querySelectorAll('[role=menuitem]')]
            .find((e) => (e.innerText||'').replace(/\\s+/g,'').endsWith(${JSON.stringify(label)}));
          if (!n) return false;
          n.click();
          return true;
        })()`,
      );
      await new Promise((r) => setTimeout(r, 1200));
      return picked;
    },

    /** 날짜 슬라이더의 화면상 위치 */
    slider() {
      return page.eval(
        `(() => { const r = document.querySelector('input.date-range').getBoundingClientRect();
          return { x: r.x, y: r.y + r.height / 2, w: r.width, max: +document.querySelector('input.date-range').max }; })()`,
      );
    },

    async touchStart(x, y) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    },
    async touchMove(x, y) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    },
    async touchEnd() {
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    },

    /** 방향키로 정확한 날짜에 세운다 (드래그·재생은 목표일에 딱 서지 않는다) */
    async stepTo(day, limit = 400) {
      for (let i = 0; i < limit; i += 1) {
        const cur = await page.eval(`+document.querySelector('input.date-range').value`);
        if (cur === day) return true;
        const forward = cur < day;
        const key = forward ? 'ArrowRight' : 'ArrowLeft';
        const code = forward ? 39 : 37;
        await page.eval(`document.querySelector('input.date-range').focus()`);
        await send('Input.dispatchKeyEvent', {
          type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
        });
        await send('Input.dispatchKeyEvent', {
          type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
        });
        await new Promise((r) => setTimeout(r, 55));
      }
      return false;
    },

    async heapMB() {
      const used = (await send('Runtime.getHeapUsage')).usedSize;
      return +(used / 1048576).toFixed(1);
    },

    async gc() {
      await send('HeapProfiler.enable');
      await send('HeapProfiler.collectGarbage');
      await new Promise((r) => setTimeout(r, 600));
    },
  };

  return page;
}

/** 검사 하나를 감싸 실행한다 — 결과를 같은 모양으로 모으기 위해서다 */
export async function check(name, fn) {
  await ensureServer();
  await ensureBrowser();
  const page = await attach();
  try {
    const result = await fn(page);
    return { name, pass: result.pass, lines: result.lines ?? [] };
  } finally {
    page.close();
  }
}

export function report({ name, pass, lines }) {
  console.log(`\n[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  for (const line of lines) console.log(`  ${line}`);
  return pass;
}
