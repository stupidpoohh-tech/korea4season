# 계절지도 · Nature Now Korea

> 대한민국 자연의 시간을 탐험하는 살아있는 지도

지금 대한민국의 자연에서는 무슨 일이 일어나고 있을까 —
금어기, 개화, 단풍, 철새를 **하나의 지도** 위에 올리고
**시간을 움직이면 지도가 바뀌는** 웹앱입니다.

금어기 정보 사이트도, 꽃 정보 사이트도, 관광 지도도 아닙니다.
`장소(Where) + 시간(When) + 자연현상(What)` 을 한 인터페이스로 다룹니다.

---

## 빠르게 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

검증:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## 핵심 경험

1. 대한민국 게임 월드맵을 본다.
2. 바다에 어종 sprite 가 pop-in 하며 나타난다.
3. 물고기를 누르면 지금 금어기인지 알 수 있다.
4. 하단 슬라이더를 움직이면 물고기가 나타났다 사라진다.
5. **"이 지도는 시간에 따라 변하는구나"** 를 깨닫는다.
6. `▶ 1년 재생` 을 누르면 대한민국의 1년이 약 7초에 지나간다.

---

## 화면

| 경로 | 화면 | 렌더링 |
|---|---|---|
| `/` | 오늘 — 오늘의 자연 / Nature Now / 지도 미리보기 / 이번 주 | 서버 (ISR 15분) |
| `/map?date=&layer=&focus=` | **지도** — 이 앱의 본체 | 클라이언트 |
| `/week?date=` | 이번 주 어디 갈까 | 서버 |
| `/dex` | 자연도감 | 서버 셸 + 클라이언트 발견 상태 |
| `/my` | 관심·알림·기록 | 클라이언트 |
| `/event/[slug]` | 자연현상 상세 (SEO 진입점) | SSG + metadata + JSON-LD |

지도의 상태는 URL 에 보존됩니다.

```
/map?date=2026-10-20
/map?date=2026-10-20&layer=foliage,bird
/map?date=2026-04-08&focus=occ:flower:cherry-seoul
```

---

## base map asset 교체

`public/map/korea-base.svg` 는 `scripts/generate-base-map.mjs` 가 실제 위경도로
해안선을 잡고 산맥·숲·강·도서를 결정론적 난수로 배치해 굽는 결과물입니다.

```bash
npm run map:generate
```

**원본 일러스트(PNG/WebP)로 교체하려면**

1. `public/map/` 에 파일을 넣습니다.
2. `src/lib/map-asset.ts` 의 `BASE_MAP_SRC` 를 그 경로로 바꿉니다.
3. 이미지의 종횡비를 `src/domain/map-bounds.json` 의
   `viewWidth : viewHeight`(= 1000 : 1300)에 맞춥니다.

sprite 위치는 지도 크기 대비 `0~1` 정규 좌표로 계산되므로
이미지만 바꾸면 나머지는 그대로 맞습니다.
지도 좌표계가 달라졌다면 `map-bounds.json` 의 위경도 범위를 조정한 뒤

```bash
node scripts/check-positions.mjs   # public/map/__check.svg 로 위치 검증
```

로 모든 장소가 바다/육지에 제대로 앉는지 눈으로 확인할 수 있습니다.

---

## 데이터

**현재 모든 데이터는 개발용 DEMO fixture 입니다.** UI 곳곳에 DEMO 배지와
출처·기준일·신뢰도가 노출됩니다.

- 금어기·금지체장은 수산자원관리법 시행령 개정과 시·도지사 고시에 따라 달라집니다.
- 개화·단풍 시기는 해마다 기온에 따라 크게 변합니다.
- 조업·낚시·방문 전에는 반드시 원문과 관할 기관 고시를 확인해야 합니다.

실데이터 연결은 `src/data-sources/<source>/` 의 원본 JSON 과 adapter 만
교체하면 되고, 화면·지도·도감·추천 코드는 손대지 않습니다.
자세한 내용은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 사내 서체

`public/fonts/Freesentation.woff2` 를 넣으면 자동 적용됩니다.
없으면 Pretendard → 시스템 한글 폰트로 조용히 내려갑니다.

---

## 기술 선택

| 영역 | 선택 | 이유 |
|---|---|---|
| Next.js 16 (App Router) | 상세 페이지 SSR/SSG | 검색 유입이 중요한 서비스 (#32) |
| React 19 / TypeScript | — | — |
| Tailwind CSS v4 | 토큰 기반 절제된 UI | 지도가 이미 시각적으로 풍부함 |
| Motion (Framer Motion) | pop-in / spring / sheet | reduced-motion 대응 내장 |
| Zustand | `selectedDate` 전역 상태 | selector 단위 구독으로 재렌더 억제 |
| DOM + SVG sprite overlay | 지도 렌더러 | 동시 sprite 30개 이하 — PixiJS 과설계 회피 (#18) |

지도 렌더러는 `MapRendererProps` 인터페이스 뒤에 있습니다.
sprite 가 수백 개로 늘거나 파티클·철새 이동이 필요해지면
같은 인터페이스를 만족하는 Canvas/PixiJS 렌더러로 교체합니다.
