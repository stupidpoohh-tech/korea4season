# 지금日지도 · Nature Now Korea

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
6. 상세 맨 위에서 `지금 시즌` 과 `잡아도 되나요` 를 **나란히, 그러나 따로** 읽는다.
7. `▶ 1년 재생` 을 누르면 대한민국 바다의 1년이 약 7초에 지나간다.

### 지도 상단 — 읽는 순서가 곧 구조

모든 기능을 같은 크기의 버튼으로 늘어놓지 않습니다. 상단은 네 계층입니다.

```
지금, 바다  23종 활동 중                        ⓘ
절정 13 · 좋음 7 · 보통 3      (데스크톱 · 모바일은 접음)

[   어종별   |   권역별   ]              [ ☰ 필터 ]

──────────────── 지도 ────────────────
              ✨ 이번 주 뭐 잡지?
──────────────── 시간 ────────────────
```

| 계층 | 무엇 | 표현 |
|---|---|---|
| 1 | **지금 상태** — 지금 바다가 어떤가 | 텍스트. 버튼이 아니다 |
| 2 | **보기 방식** — 어종별 / 권역별 | 이 화면의 유일한 primary control. 채워진 선택 상태 |
| 3 | **필터** — 필요할 때만 좁힌다 | 낮은 weight 의 outline 버튼 → 시트 |
| 4 | **도움말 · 추천** | ⓘ 아이콘 · 지도 위 floating CTA |

필터 시트 안에서도 축을 섞지 않습니다.

- **시즌 강도** (전체 · 절정 · 좋음 · 보통) — 상호배타적 분할입니다.
  `절정 + 좋음 + 보통 = 전체` 가 항상 성립하므로, 두 값을 더해 본 사용자가
  총합과 어긋난다고 읽지 않습니다. (예전 `잡기 좋은 때` 는 `피크` 를 포함해서
  두 칩의 합이 총합을 넘었습니다.)
- **시점** (`이제 막 시작한 시즌만`) — 강도와 **겹치는** 다른 축입니다.
  좋음이면서 시작 중일 수 있어서 위 분할에 넣지 않습니다.
- **규정** (`규정 있는 어종만`) — 잡아도 되는가. 0건이면 그리지 않습니다.

권역 모드는 시즌 강도 필터를 물려받지 않습니다. 권역은 어종 묶음이라
&lsquo;절정인 권역&rsquo;이 &lsquo;절정인 어종을 하나라도 가진 권역&rsquo;이 되고,
그러면 숫자와 지도가 서로 다른 것을 가리킵니다. 두 모드에서 뜻이 같은 축은
규정 하나뿐이라 그것만 남깁니다.

sprite 의 크기와 색은 시즌만 뜻합니다. 규정은 그림 색을 바꾸지 않고
모서리의 붉은 `!` 로만 알립니다. 체장 같은 조건부 규정은 대부분의 어종에
붙어 있어 지도에 그리면 배지가 배경이 되므로 상세에서만 말합니다.

> 금어기라고 sprite 를 지우지 않습니다.
> **"이 생물이 지금 없다"** 와 **"있지만 잡으면 안 된다"** 는 다른 사실이고,
> 사용자가 이 둘을 혼동하지 않게 하는 것이 Phase 1 의 핵심입니다.
> 규정이 걸린 생물은 지도에 그대로 남고 작은 제한 표시만 붙습니다.

---

## 화면

Phase 1 은 지도 한 화면에 집중합니다.
나머지 화면은 **삭제하지 않고 라우트를 살려 둔 채 탭에서만 감췄습니다.**

| 경로 | 화면 | 렌더링 | 진입 |
|---|---|---|---|
| `/` | → `/map` 리다이렉트 | — | — |
| `/map?date=&layer=&focus=` | **지도** — 이 앱의 본체. 어종 모드 · 권역 모드 | 클라이언트 | 시작점 |
| `/species/[slug]` | 어종 상세 — 시즌 우선 | SSG | 상세 시트 → "어종 자세히 보기" |
| `/zone/[slug]` | 권역 상세 — "지금 이 바다에서는" | SSG | 권역 시트 → "어종 전체 보기" |
| `/week?date=` | 이번 주 뭐 잡으러 갈까 | 서버 | 지도 위 "✨ 이번 주 뭐 잡지?" → 시트 → "전체 보기" |
| `/home` | 오늘 — 오늘의 바다 / 지금, 바다 / 이번 주 추천 | 서버 (ISR 15분) | **탭 숨김 · 링크 없음** |
| `/dex` | 자연도감 | 서버 셸 + 클라이언트 발견 상태 | **탭 숨김 · 링크 없음** |
| `/my` | 관심·알림·기록 | 클라이언트 | **탭 숨김 · 링크 없음** |
| `/event/[slug]` | 꽃·단풍·철새 상세. 해양은 `/species` 로 리다이렉트 | SSG + JSON-LD | 레이어가 꺼져 있어 생성 안 됨 |

탭을 다시 열려면 `src/components/layout/nav-items.ts` 의 `visible` 플래그를
바꾸고 `src/app/page.tsx` 의 리다이렉트를 걷어내면 됩니다.
꽃·단풍·철새를 다시 켜려면 `src/data-sources/index.ts` 의 `enabled` 하나만
바꾸면 지도·타임라인·도감·추천이 전부 따라옵니다.

지도의 상태는 URL 에 보존됩니다.

```
/map?date=2026-10-20
/map?date=2026-10-20&layer=foliage,bird
/map?date=2026-04-08&focus=occ:flower:cherry-seoul
```

---

## 배포 — Cloudflare Workers

**운영 주소: https://korea4season.stupidpoohh.workers.dev**

`@opennextjs/cloudflare` 어댑터로 Workers 에 올립니다.
(Pages 용 `@cloudflare/next-on-pages` 는 Next 15.5.2 가 상한이라 이 앱을 받지 못합니다.)

배포는 **GitHub Actions 가 수행합니다.** `main` 또는 개발 브랜치에 푸시되면
`.github/workflows/deploy.yml` 이 타입 검사 · 린트 · 빌드 · 배포를 순서대로 돌립니다.

### 준비 상태 (완료)

아래 셋은 Cloudflare · GitHub 계정 인증이 필요한 항목이며 **모두 완료되었습니다.**
새 환경을 다시 구성할 때만 참고하십시오.

**1. KV 네임스페이스 만들기** — ISR 증분 캐시용

```
Cloudflare 대시보드 → Storage & Databases → KV → Create namespace
  이름: korea4season-inc-cache
  → 생성 후 목록에서 Namespace ID 복사
```

**2. API 토큰 만들기** — Actions 가 배포할 때 씁니다

```
Cloudflare 대시보드 → 우측 상단 계정 아이콘 → Profile → API Tokens
  → Create Token → "Edit Cloudflare Workers" 템플릿 Use template
  → Account Resources 에서 본인 계정 선택
  → Continue to summary → Create Token → 값 복사(한 번만 보입니다)
```

Account ID 는 `Cloudflare 대시보드 → Workers & Pages` 우측 패널에서 확인합니다.

**3. GitHub 저장소에 값 등록**

```
GitHub 저장소 → Settings → Secrets and variables → Actions
  → New repository secret
     CLOUDFLARE_API_TOKEN   = 2번에서 복사한 토큰
     CLOUDFLARE_ACCOUNT_ID  = Account ID
```

Namespace ID 는 `wrangler.jsonc` 에 이미 반영돼 있습니다.
비어 있으면 워크플로가 이유를 밝히며 명시적으로 실패합니다.

### 배포 확인

```
Cloudflare 대시보드 → Workers & Pages → korea4season → Deployments
GitHub 저장소 → Actions → Deploy to Cloudflare Workers
```

### 알아둘 것

- **이미지 최적화 없음** — `next.config.ts` 에 `images.unoptimized = true` 를 두었습니다.
  이 앱이 `next/image` 로 다루는 것은 base map SVG 한 장뿐이라 최적화할 것이 없습니다.
  나중에 래스터 이미지를 쓰게 되면 Cloudflare Images 를 붙이거나 이 설정을 재검토하세요.
- **KV 캐시가 없으면 빌드 시점의 "오늘" 이 그대로 굳습니다.**
  모든 라우트가 `revalidate = 900` 인 이유가 날짜 갱신 하나이기 때문입니다.
- **태그 기반 재검증 미사용** — `revalidateTag` / `revalidatePath` 를 쓰지 않으므로
  tagCache 와 Durable Object 큐를 두지 않았습니다. `queue: "direct"` 로 충분합니다.
  나중에 on-demand 재검증이 필요해지면 `open-next.config.ts` 에 tagCache 를 추가해야 합니다.

### 로컬 Worker 검증 결과 (workerd 1.20260831.1)

```
/                       200   104KB
/map                    200
/species/blue-crab      200   SSG
/zone/chungnam-taean    200   SSG
/week?date=2026-10-20   200   동적 — 10월 19~25일 주간으로 렌더됨
/map/korea-base.svg     200   정적 자산
```

---

## base map asset 교체

`public/map/korea-base.svg` 는 `scripts/generate-base-map.mjs` 가 실제 위경도로
해안선을 잡고 산맥·숲·강을 결정론적 난수로 배치해 굽는 결과물입니다.
담는 범위와 캔버스 크기는 `src/domain/map-bounds.json` 하나가 정합니다
(현재 `125.37~130.3°E · 32.6~38.75°N`, `850 : 1300`).

```bash
npm run map:generate
```

경도 범위를 바꾸면 그림·land mask·sprite 좌표가 함께 움직입니다.
범위 밖으로 밀려나는 장소는 울릉도·독도·백령도처럼 `mapX`/`mapY` 로 직접 앉혀야
하고, `scripts/generate-base-map.mjs` 안의 정규 좌표(섬 분포 밴드, 압축 배치한
섬 중심)도 같이 옮겨야 합니다.

### 해안선은 실제 지형

해안선·제주·다도해는 실제 위경도입니다. Natural Earth 1:10m Cultural Vectors
(public domain)를 npm `world-atlas` 로 받아 단순화해 씁니다.

```bash
npm run map:coastline   # scripts/korea-coastline.json 을 다시 굽는다
npm run map:generate    # 그 좌표로 SVG 와 land mask 를 굽는다
```

두 단계로 줄입니다.

| 용도 | 점 수 | 왜 |
|---|---|---|
| 그림 | 본토 446 · 제주 29 · 섬 49개 390 | 만과 반도가 살아 있을 만큼 |
| 육지 판정 | 본토 112 · 제주 | 더 굵게 일반화 — 작은 만을 메우는 방향 |

판정선을 더 굵게 잡는 것은 안전한 방향입니다. 실제 해안선을 그대로 부풀리면
좁은 만마다 법선이 겹쳐 스파이크가 생기고, 그런 만은 어차피 sprite 하나 들어갈
넓이가 아닙니다. 만을 메우면 육지를 넓게 보게 되므로 바다 생물이 뭍에 걸치지
않습니다.

> 해안 띠의 폭은 지도 축척에 매여 있습니다 — 20px 은 실제로 10km 쯤입니다.
> 해안선이 실제 지형이 된 뒤로 그 폭은 리아스식 만을 통째로 메웠습니다.
> 지금은 바다 테두리 34/19/8, 모래 띠 9 로 두르고 있습니다.

지도는 여전히 GIS 타일이 아니라 일러스트입니다. 실루엣만 진짜입니다 —
산맥·숲·강은 실제 위경도에 결정론적 난수로 배치한 그림입니다.

지도 배경은 칠하지 않습니다. SVG 바탕이 비어 있어 페이지의 흰색이 그대로
비칩니다.

**원본 일러스트(PNG/WebP)로 교체하려면**

1. `public/map/` 에 파일을 넣습니다.
2. `src/lib/map-asset.ts` 의 `BASE_MAP_SRC` 를 그 경로로 바꿉니다.
3. 이미지의 종횡비를 `src/domain/map-bounds.json` 의
   `viewWidth : viewHeight`(= 850 : 1300)에 맞춥니다.

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

`public/sprites/species/<slug>.webp` 를 넣으면 지도와 상세의 이모지가 자동으로
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

---

## 현재 상태 · 다음 작업

_이 절은 새 세션이 저장소만 보고 이어받을 수 있게 두는 기록입니다._

### 지금까지 온 곳

- Phase 1 은 **바다의 NOW** 한 화면(`/map`)에 집중. 나머지 탭은 감춤(위 표 참고).
- 어종 sprite 22종 중 **19종은 일러스트**, 3종은 이모지 폴백:
  `marbled-flounder`(문치가자미) · `dark-banded-rockfish`(볼락) ·
  `yellowfin-goby`(망둥어). 그림을 넣고 `AVAILABLE_SPRITES` 에 등록하면 켜집니다.
- 지도 마커는 **육지에 앉지 않습니다.** `src/domain/land-mask.json`(생성물)을
  기준으로 판정하고, 밀려나면 해안선을 따라 옆으로 미끄러집니다.
- 과밀은 **해역별 상한**으로 조절합니다. 상한은 바다마다 다릅니다 —
  제주는 섬 둘레의 좁은 고리뿐이라 같은 수를 놓으면 겹칠 수밖에 없습니다.
- 바탕은 **흰색**입니다. 지도 배경도 칠하지 않아 그대로 흰색이 비칩니다
  (계절 톤 오버레이는 걷어냈습니다 — 계절은 타임라인 칩이 알립니다).
- 해안선은 **실제 지형**입니다. Natural Earth 1:10m 을 단순화해 씁니다.
- 상단은 **상태 → 보기 방식 → (필요할 때) 필터** 네 계층으로 정리했습니다.
  같은 크기의 버튼 8개가 두 줄로 늘어서 있던 자리가 지금은 4개입니다
  (어종별 · 권역별 · 필터 · ⓘ). 나머지는 시트와 지도 위 CTA 로 옮겼습니다.
- base map 의 **좌측 빈 서해를 잘라냈습니다.** 서쪽 경계가 `124.5°E → 125.37°E`,
  캔버스가 `1000 : 1300 → 850 : 1300` 입니다. 축척(경도 1도당 172.4px)은
  그대로이므로 육지가 그려지는 크기는 데스크톱에서 바뀌지 않고, 폭만 줄었습니다.
  잘린 물에는 어떤 sprite 도 놓이지 않았습니다 — 가장 서쪽 권역이 `126.05°E`
  (옛 정규 x 0.267), 12개월 전수에서 실제 최소 sprite x 가 0.225 였습니다.

측정값 (2026년 12개월 전수, `style.left/top` 기준):

| 항목 | 잘라내기 전 | 지금 |
|---|---|---|
| 육지 위 sprite | 0개 | 0개 |
| 최악 sprite 간격 (어종) | 0.068 | 0.068 |
| 최악 sprite 간격 (권역) | 0.087 | 0.087 |
| 최대 동시 sprite | 22개 (확대 시 28) | 22개 (확대 시 28) |
| 모바일 지도 (390×844) | 374 × 486, 세로 여백 131px | 374 × 572, 세로 여백 45px |
| 데스크톱 지도 (1360×900) | 515 × 669 | 438 × 669 |

상단 재구성으로 지도가 한 번 더 커졌습니다. 좌우 여백까지 지도에 돌려주고
(모바일에서 지도는 카드가 아니라 주인공입니다) 상단 두 줄을 한 묶음으로 줄인 결과입니다.

| 뷰포트 | 상단 재구성 전 | 지금 |
|---|---|---|
| 390 × 844 | 374 × 572 | **390 × 596** (면적 +8.7%) |
| 390 × 750 | 342 × 523 | **347 × 531** (면적 +3.0%) |
| 1360 × 900 | 438 × 669 | 438 × 669 (그대로) |
| 지도 위 버튼 수 | 8개 | 4개 |

### 신뢰할 수 없는 것

- **`seasons.json` 은 근거를 대조하지 않은 placeholder 입니다.**
  `confidence: 'demo'`, `lastVerifiedAt` 비어 있음. 출조 판단에 쓰면 안 됩니다.
- `regulations.json` 은 시행령 원문과 대조 전입니다.
- `observations.json` 은 실제 오늘 ±3일에만 적용되는 고정 fixture 입니다.
- 알림 구독과 도감은 브라우저에만 저장됩니다. 발송·계정 연동은 Phase 4.

### 알려진 한계

- 모바일에서 지도 크기는 여전히 세로가 아니라 **가로에 걸려 있습니다.**
  좌측 여백을 잘라 세로 여백이 131px → 45px 로 줄었지만 0 은 아닙니다.
  남은 45px 을 마저 쓰려면 base map 아래쪽 여백(현재 세로의 약 7%)을 줄이거나
  컨트롤 줄을 줄여야 하는데, 아래쪽을 자르면 비율이 다시 가로로 넓어져
  모바일에서는 되레 손해입니다.
- 권역 모드에서 서해 전역의 대표 어종이 보리멸로 반복됩니다.
  사실이지만 정보량이 낮습니다.
- 꺼진 데이터 소스(꽃·단풍·철새·자연현상)의 JSON 약 15KB 가
  클라이언트 번들에 그대로 실립니다. `data-sources/index.ts` 의 레지스트리가
  모듈 최상단에서 어댑터를 전부 import 하기 때문입니다.
  전체 JS 1MB 대비 작아 지금은 두었습니다.

### 다음 우선순위

1. **`seasons.json` 근거 대조** — 지금 화면이 말하는 모든 판단의 뿌리
2. 권역 모드 대표 어종 반복 완화
3. 남은 3종 sprite

끝난 것

- ~~base map 좌측 여백 정리~~ — 서쪽 경계를 `125.37°E` 로 당기고 캔버스를
  `850 : 1300` 으로 줄였습니다. 모바일 지도 높이 486px → 572px.
- ~~상단 컨트롤 위계 정리~~ — 상태 → 보기 방식 → 필터 네 계층.
  시즌 필터를 상호배타적 분할로 바꾸고, 필터는 시트로, 마커 뜻은 ⓘ 로,
  이번 주 추천은 지도 위 CTA 로 옮겼습니다.

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
