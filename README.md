# 계절지도 · Nature Now Korea

> 대한민국 자연의 시간을 탐험하는 살아있는 지도

**Phase 1 — 바다의 NOW (Marine Now)**

> 지금 대한민국의 어느 바다에서 어떤 생물을 만날 수 있는가

시간을 움직이면 지도 위의 바다 생물 구성이 바뀝니다.
금어기와 금지체장은 사라지지 않지만, 콘텐츠가 아니라
**행동 직전의 safety layer** 로 자리를 옮겼습니다.

사용자가 먼저 보는 것은 `여기서 지금 뭘 만날 수 있지?` 이고,
그 다음이 `이걸 지금 잡아도 되는가?` 입니다.

낚시 전문 플랫폼이 아닙니다. 낚시는 대한민국 자연의 시간성을 증명하는
첫 번째 vertical 이고, 같은 엔진 위에 꽃 · 단풍 · 철새가 올라갑니다.

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
2. 지금 시즌인 생물들이 바다에 pop-in 한다. 시즌이 좋을수록 또렷하게 그려진다.
3. 보리멸을 누른다 → **"지금 시즌이구나"**
4. `지금 만나기 좋은 권역` 을 눌러 인천·경기·충남 권역을 본다.
5. 하단 슬라이더를 움직이면 생물 구성과 분포가 바뀐다.
6. 규정이 있으면 금어기·금지체장 경고를 확인한다.
7. `▶ 1년 재생` 을 누르면 대한민국 바다의 1년이 약 7초에 지나간다.

> 금어기라고 sprite 를 지우지 않습니다.
> **"이 생물이 지금 없다"** 와 **"있지만 잡으면 안 된다"** 는 다른 사실이고,
> 사용자가 이 둘을 혼동하지 않게 하는 것이 Phase 1 의 핵심입니다.
> 규정이 걸린 생물은 지도에 그대로 남고 작은 제한 표시만 붙습니다.

---

## 화면

| 경로 | 화면 | 렌더링 |
|---|---|---|
| `/` | 오늘 — 오늘의 바다 / 지금, 바다 / 이번 주 뭐 잡으러 갈까 / 지도 / 바다 밖 자연 | 서버 (ISR 15분) |
| `/map?date=&layer=&focus=` | **지도** — 이 앱의 본체. 어종 모드 · 권역 모드 | 클라이언트 |
| `/species/[slug]` | 어종 상세 — 시즌 우선 (SEO 진입점) | SSG |
| `/zone/[slug]` | 권역 상세 — "지금 이 바다에서는" (SEO 진입점) | SSG |
| `/week?date=` | 이번 주 뭐 잡으러 갈까 | 서버 |
| `/dex` | 자연도감 | 서버 셸 + 클라이언트 발견 상태 |
| `/my` | 관심·알림·기록 | 클라이언트 |
| `/event/[slug]` | 꽃·단풍·철새 상세 (SEO). 해양은 `/species` 로 리다이렉트 | SSG + JSON-LD |

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

## 데이터 — 네 개의 레이어

이 넷을 **절대 하나의 모델로 합치지 않습니다.**

| 레이어 | 질문 | 파일 |
|---|---|---|
| SPECIES | 어떤 생물인가 | `src/data-sources/marine/species.json` |
| OCCURRENCE | 어디에서 언제 만날 가능성이 높은가 | `.../seasons.json` |
| OBSERVATION | 실제로 최근 무엇이 확인되었는가 | `.../observations.json` |
| REGULATION | 법적으로 잡아도 되는가 | `.../regulations.json` |

**현재 모든 데이터는 개발용 DEMO fixture 입니다.**

- **시즌 데이터는 근거를 대조하지 않은 placeholder 입니다.** `lastVerifiedAt` 이
  비어 있고 `confidence` 는 전부 `demo` 입니다. 실제 출조 판단에 쓰면 안 됩니다.
- 금어기·금지체장은 수산자원관리법 시행령 개정과 시·도지사 고시에 따라 달라집니다.
- 개화·단풍 시기는 해마다 기온에 따라 크게 변합니다.

실데이터 연결은 `src/data-sources/<source>/` 의 원본 JSON 과 adapter 만
교체하면 되고, 화면·지도·도감·추천 코드는 손대지 않습니다.
자세한 내용은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 어종 sprite 에셋

`public/sprites/species/<slug>.svg` 를 넣으면 지도와 상세의 이모지가 자동으로
교체됩니다. 규격과 필요한 slug 목록은
[`public/sprites/species/README.md`](public/sprites/species/README.md) 참고.
에셋을 추가한 뒤 `src/data-sources/marine/adapter.ts` 의 `AVAILABLE_SPRITES` 에
slug 를 등록하면 켜집니다.

## 낚시 포인트 공개 원칙

정확한 낚시 포인트를 무조건 공개하지 않습니다.
discovery 의 기본 단위는 **권역(FishingZone)** 이고, 방파제·해변·낚시공원처럼
널리 알려진 곳만 `FishingSpot` 으로 제공합니다.
사용자 제보의 위치 공개 범위는 `EXACT / AREA / REGION` 세 단계로 설계돼 있습니다.

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
