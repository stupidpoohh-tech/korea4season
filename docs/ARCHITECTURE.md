# Architecture

## Phase 1 — 바다의 NOW

Phase 1 의 중심축은 "무엇을 잡으면 안 되는가" 가 아니라
**"지금 어느 바다에서 어떤 생물을 만날 수 있는가"** 다.

질문의 우선순위가 곧 코드의 구조다.

```
WHAT  →  WHERE  →  WHEN  →  ACTUAL NOW  →  LEGAL
어종      권역      시즌      현장 관측       규정
```

### 절대 합치지 않는 네 레이어

| 레이어 | 질문 | 도메인 |
|---|---|---|
| SPECIES | 어떤 생물인가 | `MarineSpecies` (`domain/marine.ts`) |
| OCCURRENCE | 어디서 언제 만날 수 있나 | `FishingOccurrence` |
| OBSERVATION | 실제로 최근 잡히고 있나 | `FishingObservation` |
| REGULATION | 잡아도 되나 | `LegalRule` (`domain/regulation.ts`) |

합치면 안 되는 이유는 단순하다. 하나로 뭉치면 사용자가

- **"이 생물이 지금 없다"** (시즌 밖) 와
- **"있지만 잡으면 안 된다"** (금어기)

를 구분하지 못한다. 지도에서 금어기 어종의 sprite 를 지우는 순간
바다가 실제보다 비어 보이고, 그것은 거짓이다.
그래서 sprite 는 **시즌**이 만들고, **규정**은 작은 제한 표시만 덧붙인다.

### evaluateMarineState

`domain/marine-state.ts` 의 단일 진입점이 셋을 각각 평가해
**합치지 않은 채로** 돌려준다.

```ts
evaluateMarineState({ speciesId, zoneId, date }, deps)
// →
{
  occurrence: { active, state: 'peak'|'good'|'fair'|'low'|'off', peak, evaluations, best },
  regulation: { overallStatus, matchedRules, activeClosedSeason, measurements,
                cautions, exceptions, nextTransition, sources, noData },
  observation: { recentCount, trend, windowDays, lastObservedAt, confidence },
}
```

`overallStatus` 는 `open | conditional | closed-season | prohibited | unknown` 이다.
규정 데이터가 아예 없으면 `unknown` 을 돌려주고 UI 는
"규정이 없다" 가 아니라 **"확인된 규정이 없다"** 라고 표기한다.

### 규정 엔진

`LegalRule` 은 `scope` 로 적용 범위를 잡고, 더 구체적인 `RuleOverride` 가
기본 규정을 대체한다. `TemporaryWaiver` 는 특정 연도 구간에서 규정을 유예한다.

```
RuleScope       해역 · 권역 · 시·도 · 어법, include/exclude
RuleWindow      금어기 구간 (MM-DD, 연말 넘김 허용)
MeasurementRule 금지체장/체중 (전장·항문장·두흉갑장·외투장·체중)
RuleOverride    시·도지사 고시 등 지역 조정 (더 구체적인 scope 가 이긴다)
RuleException   특정 어법·해역 예외
TemporaryWaiver 한시적 유예
```

성별·외포란 제한은 `sex-restriction` / `egg-bearing` 으로 두어
**종 전체를 막지 않고 주의로만 표시한다.**
(암컷 대게 금지를 종 단위 `year-round-ban` 으로 모델링하면
1월의 대게가 통째로 추천에서 빠져 버린다.)

### 지도 sprite 상태

sprite 하나는 세 값을 동시에 갖는다. 하나로 합치지 않는다.

```
occurrenceStatus  upcoming | starting | active | peak | ending | ended
seasonStrength    off | low | fair | good | peak     → prominence(크기·불투명도)
legalStatus       open | conditional | closed-season | prohibited | unknown
                                                     → 제한 배지(!)
```

- `off` 인 어종은 지도에서 뺀다 — 자연적으로 없기 때문이다.
- `closed-season` 인 어종은 **그대로 두고** 붉은 링과 `!` 배지를 붙인다.
- `peak` 는 가장 또렷하게, `fair` 는 옅게 그린다.

### 집계 단위

권역 단위로 sprite 를 그리면 100개를 넘어 "지금 뭐가 있나" 가 오히려 안 보인다.
그래서 지도는 **어종 × 해역(서해·남해·동해·제주)** 으로 묶고,
sprite 위치는 그 해역에서 시즌인 권역들의 중심으로 잡는다.
권역별 차이는 상세와 권역 모드가 보여 준다.

지도에는 두 모드가 있다.

- **어종 모드** — "지금 뭐가 있지?"
- **권역 모드** — "어디로 가야 하지?" (권역 마커 + 종 수 배지)

### 화이트 지도

base map 은 흰 바탕이다. 바다는 칠하지 않고 페이지의 흰색을 그대로 쓴다.
육지와 바다를 가르는 것은 색이 아니라

```
해안 바깥  seaFar(54) > seaMid(30) > seaNear(13)   옅어지는 세 겹
해안       sand(20)                                 모래 띠
해안선     coast                                    육지를 칠한 뒤에 긋는다
```

해안선을 모래 띠보다 먼저 그으면 폭 20 짜리 띠에 덮여 보이지 않는다.

색을 갖는 것은 그 위에 놓이는 생물 sprite 하나뿐이다.
시즌 강도는 sprite 의 크기·불투명도로, 규정은 모서리 배지로 말한다 —
지도 바탕이 무채색이라 이 둘이 서로 묻히지 않는다.

### 상단 위계와 필터 축

상단은 **읽는 순서가 곧 구조**다. 같은 크기의 버튼을 늘어놓지 않는다.

| 계층 | 컴포넌트 | surface |
|---|---|---|
| 1 지금 상태 | `CurrentStateSummary` | 텍스트 (버튼 아님) |
| 2 보기 방식 | `ViewModeToggle` | 채워진 segmented control — 유일한 primary |
| 3 필터 | `FilterTrigger` → `MarineFilterSheet` | 낮은 weight outline |
| 4 도움말·추천 | `MarkerLegendPopover` · `WeeklyRecommendationCTA` | 아이콘 · floating |

`MarineMapHeader` 가 1~3 을 묶는다. 모바일은 가로 바, 데스크톱은 좌측 레일에
세로로 쌓는다 — 데스크톱 지도는 세로에 걸려 있어서 상단 바를 올리면
그 높이가 그대로 지도에서 깎이기 때문이다.

필터는 세 축이고, 서로 섞지 않는다.

```
시즌 강도  all | peak | good | fair      단일 선택. 상호배타적 분할
                                          peak + good + fair = all 이 항상 성립
시점       startingOnly                   강도와 겹친다 (good 이면서 starting 가능)
규정       legalOnly                      '잡아도 되는가'. 시즌과 무관
```

`fair` 는 남는 것을 전부 받는 칸이다. 지금 데이터에는 `low` 가 없지만
생기더라도 분할의 합이 총합과 어긋나지 않게 하려는 것이다.

권역 모드는 시즌 축을 물려받지 않는다. 권역은 어종 묶음이라
"절정인 권역" 이 "절정인 어종을 하나라도 가진 권역" 이 되고,
그러면 칩의 숫자와 지도가 서로 다른 것을 가리킨다.
두 모드에서 뜻이 같은 축은 규정 하나뿐이므로 모드를 바꾸면
시즌 축만 초기화하고 규정은 유지한다.

---

## 왜 이 구조인가

기능(금어기 / 꽃 / 단풍 / 철새)마다 별개 시스템을 만들면
"시간을 움직이면 대한민국이 변한다" 는 경험을 만들 수 없습니다.
전부 **하나의 자연현상 모델**로 다뤄야 타임라인 하나가 모든 레이어를 동시에 움직입니다.

```
NatureEntity      "무엇"           왕벚나무 · 꽃게 · 흑두루미
Location          "어디"           여의도 · 서해 · 순천만
NatureOccurrence  "무엇+어디+언제"  여의도 왕벚꽃 2026-04-03 ~ 04-14
```

같은 `왕벚나무`가 제주 · 부산 · 서울 · 강원에서 서로 다른 시기에 피는 것을
`NatureEntity` 하나 + `NatureOccurrence` 넷으로 표현합니다.
도감은 Entity 단위, 지도는 Occurrence 단위로 동작합니다.

---

## 레이어

```
                    UI (app/ · components/)
                              ▲
                   ResolvedOccurrence 만 소비
                              │
   services/nature-service.ts  ── 날짜 · 레이어 · 지역 질의, 지도 배치, 문장 생성
                              ▲
   repositories/nature-repository.ts ── 모든 소스를 하나의 인덱스로 병합
                              ▲
   data-sources/<source>/adapter.ts   ── 원본 스키마 → 도메인 모델 normalize
                              ▲
   data-sources/<source>/*.json       ── 원본 (지금은 DEMO fixture)
                              
   domain/                            ── 프레임워크 무관 순수 로직
     types.ts        모델
     date.ts         DateKey('YYYY-MM-DD') 유틸
     occurrence.ts   기간 해석 · 상태 계산
     projection.ts   위경도 ↔ 지도 정규좌표
     korean.ts       조사 처리
```

**컴포넌트 안에서 데이터를 선언하지 않습니다.** 반드시 위 경로를 지납니다.

---

## 시간 해석

날짜는 앱 전역에서 `'YYYY-MM-DD'` 문자열(`DateKey`)로 다룹니다.
URL 에 그대로 실리고, 서버/클라이언트 타임존 차이로 hydration 이 어긋나지 않습니다.
"오늘" 은 사용자 타임존과 무관하게 항상 **한국 기준**입니다 (`todayKey()`).

`NatureOccurrence` 는 두 가지 반복 형태를 갖습니다.

| recurrence | 날짜 형식 | 예 |
|---|---|---|
| `annual` | `MM-DD` | 꽃게 금어기 `06-21` ~ `08-20` |
| `once` | `YYYY-MM-DD` | 특정 연도 개화 예보 |

`resolveWindow(occurrence, 기준일)` 이 기준일에 해당하는 실제 구간을 고릅니다.

1. 기준일을 포함하는 구간
2. 최근 14일 이내에 끝난 구간 → `ended` 로 노출 ("금어기가 종료됐습니다")
3. 다음에 시작할 구간 → `upcoming`

연말을 넘기는 구간(흑두루미 `10-20` ~ `03-10`)과 윤년 `02-29` 를 모두 처리합니다.

### 상태

| status | 기호 | 관찰 대상 | 금어기 |
|---|---|---|---|
| `upcoming` | ● | 시작 전 | 조업 가능 |
| `starting` | ◔ | 시작됨 | 금어기 시작 |
| `active` | ◐ | 진행 중 | 금어기 |
| `peak` | ★ | 절정 | — |
| `ending` | ◕ | 저무는 중 | 해제 임박 |
| `ended` | ○ | 종료 | 금어기 해제 |

`polarity` 가 `restricted`(금어기)면 같은 상태라도 뜻이 반대이므로
라벨과 색이 뒤집힙니다. 색만으로 상태를 전달하지 않고 기호 + 텍스트를 함께 씁니다.

---

## 지도 좌표

base map 은 GIS 타일이 아니라 한 장의 일러스트입니다.
따라서 sprite 위치는 **컨테이너 크기 대비 0~1 정규 좌표**로 다룹니다.

```ts
mapPosition = location.mapPosition ?? projectGeo(location.geo)
```

`Location` 은 실제 `lat/lng` 를 항상 갖고, base map 이 담는 경도 범위
(`src/domain/map-bounds.json` 의 `west`~`east`) 밖에 있는 울릉도·독도·백령도만
`mapPosition` 으로 override 합니다.
지도 컨테이너는 container query 단위로 **항상 `viewWidth : viewHeight` 비율을
유지**합니다 — 비율이 깨지면 정규 좌표가 어긋나 sprite 가 엉뚱한 곳에 찍힙니다.
이 비율과 높이 상한은 `src/lib/map-asset.ts` 가 `map-bounds.json` 에서 계산하므로
화면 코드에 숫자를 다시 적지 않습니다.

같은 장소에 여러 개가 겹치면 `buildMapLayout()` 이 작은 원형으로 흩어 놓고,
전체 sprite 는 `MAX_SPRITES`(30)로 잘라 레이어를 다 켜도 화면이 무너지지 않게 합니다.

---

## 상태 관리

| store | 담는 것 |
|---|---|
| `time-store` | `selectedDate`, 재생 상태 — 앱 전역이 이것을 본다 |
| `map-store` | 선택 레이어, 보기 방식(mode), 필터 세 축, 선택된 occurrence, viewport(pan/zoom) |
| `dex-store` | 자연도감 발견 기록, 알림 구독 (localStorage 영속) |

`selectedDate` 가 바뀔 때 전체 페이지가 아니라 구독 중인 컴포넌트만 다시 그립니다.
지도 배치는 `useMemo(date, layers)` 로 캐시합니다.

1년 재생은 `setInterval` 이 아니라 rAF + 경과시간 기반이라
프레임이 밀려도 속도가 일정합니다 (`PLAYBACK_DAYS_PER_SECOND = 52`, 1년 ≈ 7초).

---

## 낚시 포인트 공개 원칙

낚시에서 특정 포인트 공개는 민감하고, 한 곳에 사람이 몰리는 문제도 있다.
그래서 위치는 세 단계로 다룬다.

```
EXACT   정확한 위치
AREA    약 3km 권역
REGION  시군구 / 넓은 권역
```

초기 서비스의 기본은 **권역 기반 discovery** 다.
`FishingZone` 이 discovery 단위이고, 방파제·해변·낚시공원처럼
널리 알려진 곳만 `FishingSpot` 으로 공개한다.
`FishingObservation.locationVisibility` 가 제보의 공개 범위를 담는다.

## 관측이 '실제 지금' 인 이유

`FishingObservation` 은 절대 날짜가 아니라 **오늘 기준 상대일**로 저장된다.
그리고 사용자가 슬라이더로 4월을 보고 있을 때는 관측을 보여주지 않는다.

```ts
observationApplies(date)  // 실제 오늘 ±3일 안에서만 true
```

선택 날짜의 가상 시점에 오늘의 제보를 섞으면 그것은 거짓말이 된다.
UI 는 대신 "선택한 날짜에는 현장 관측이 적용되지 않습니다" 라고 말한다.

## 데이터 소스 추가하기

새 자연현상을 붙이는 데 필요한 작업은 셋뿐입니다.

1. `src/data-sources/<source>/<data>.json` — 원본 데이터
2. `src/data-sources/<source>/adapter.ts` — normalize
   (꽃·단풍·철새처럼 `entity + occurrence` 모양이면
   `shared/seasonal-adapter.ts` 를 그대로 재사용)
3. `src/data-sources/index.ts` 레지스트리에 등록

지도 · 타임라인 · 도감 · 이번 주 추천 · 상세 페이지가 자동으로 따라옵니다.

원본 JSON 의 `meta` 는 `confidence` 와 `isDemo` 를 반드시 포함해야 하며
UI 는 이 값을 근거로 DEMO 배지와 출처 블록을 노출합니다.
**실제 법규·예보 데이터를 임의로 만들어 넣지 마십시오.**

---

## Phase 4 를 위한 DB 스키마 (참고)

지금은 파일 기반이지만 모델은 그대로 관계형으로 옮겨집니다.
Postgres(Supabase) 기준 초안입니다. MVP 단계에서 PostGIS 는 도입하지 않습니다.

```sql
create table nature_entity (
  id           text primary key,
  slug         text unique not null,
  category     text not null,          -- fishing | flower | foliage | bird | marine | nature
  sub_category text,
  name         text not null,
  species_name text,
  icon         text not null,
  illustration text,
  summary      text not null,
  description  text,
  rarity       smallint,
  metadata     jsonb default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table fishing_rule (              -- nature_entity 의 subtype
  entity_id            text primary key references nature_entity(id) on delete cascade,
  closed_season_start  text,             -- MM-DD
  closed_season_end    text,
  minimum_size_cm      numeric,
  minimum_weight_g     integer,
  region_rules         jsonb default '[]',
  exceptions           jsonb default '[]',
  law_source           jsonb
);

create table location (
  id         text primary key,
  slug       text unique not null,
  name       text not null,
  region     text not null,
  subregion  text,
  type       text not null,
  lat        double precision not null,
  lng        double precision not null,
  map_x      real,                       -- base map 위치 override
  map_y      real,
  description text
);

create table nature_occurrence (
  id           text primary key,
  slug         text unique not null,
  entity_id    text not null references nature_entity(id) on delete cascade,
  regions      text[] not null default '{}',
  recurrence   text not null,            -- annual | once
  start_date   text not null,            -- MM-DD | YYYY-MM-DD
  end_date     text not null,
  peak_start   text,
  peak_end     text,
  polarity     text not null,            -- observable | restricted
  confidence   text not null,            -- official | predicted | estimated | demo
  source       jsonb not null,
  rules        jsonb default '[]',
  notes        jsonb default '[]',
  exceptions   jsonb default '[]',
  weight       real default 0.5,
  is_demo      boolean not null default true,
  metadata     jsonb default '{}'
);

create table occurrence_location (       -- many-to-many
  occurrence_id text references nature_occurrence(id) on delete cascade,
  location_id   text references location(id) on delete cascade,
  primary key (occurrence_id, location_id)
);

-- 바다의 NOW (Phase 1)
create table fishing_zone (
  id                text primary key,
  slug              text unique not null,
  name              text not null,
  region            text not null,        -- 시·도
  subregion         text,
  sea_region        text not null,        -- 서해 | 남해 | 동해 | 제주
  lat               double precision not null,
  lng               double precision not null,
  map_x             real,
  map_y             real,
  water_type        text not null,        -- coastal | offshore | estuary | bay
  shore_types       text[] not null default '{}',
  description       text,
  public_visibility text not null default 'REGION'  -- EXACT | AREA | REGION
);

create table fishing_spot (
  id                text primary key,
  slug              text unique not null,
  zone_id           text not null references fishing_zone(id) on delete cascade,
  name              text not null,
  lat               double precision not null,
  lng               double precision not null,
  type              text not null,        -- BEACH | BREAKWATER | ROCK | PIER | FISHING_PARK | PORT | OTHER
  public_known_spot boolean not null default true,
  access_info       text,
  metadata          jsonb default '{}'
);

create table fishing_occurrence (          -- 시즌. 규정은 여기 들어오지 않는다.
  id                  text primary key,
  species_id          text not null references nature_entity(id) on delete cascade,
  zone_id             text not null references fishing_zone(id) on delete cascade,
  start_date          text not null,       -- MM-DD
  end_date            text not null,
  peak_start_date     text,
  peak_end_date       text,
  season_strength     text not null,       -- low | fair | good | peak
  confidence          text not null,       -- official | predicted | estimated | demo
  recommended_methods text[] not null default '{}',
  source_ids          text[] not null default '{}',
  year_specific       integer,
  last_verified_at    date,                -- null 이면 미검증
  note                text
);

create table legal_source (
  id             text primary key,
  name           text not null,
  url            text,
  document_type  text not null,            -- statute | enforcement-decree | ministerial-rule | local-notice | agency-guide
  published_at   date,
  effective_from date,
  effective_to   date,
  note           text
);

create table legal_rule (                  -- 규정. 시즌과 분리된 채로 유지한다.
  id               text primary key,
  species_id       text not null references nature_entity(id) on delete cascade,
  kind             text not null,          -- closed-season | size-limit | sex-restriction | egg-bearing | year-round-ban
  scope            jsonb not null,         -- RuleScope
  windows          jsonb not null default '[]',
  measurements     jsonb not null default '[]',
  overrides        jsonb not null default '[]',
  exceptions       jsonb not null default '[]',
  waivers          jsonb not null default '[]',
  source_id        text not null references legal_source(id),
  confidence       text not null,
  last_verified_at date,
  note             text
);

create table fishing_observation (
  id                  uuid primary key default gen_random_uuid(),
  species_id          text not null references nature_entity(id),
  zone_id             text not null references fishing_zone(id),
  spot_id             text references fishing_spot(id),
  observed_at         timestamptz not null,
  quantity_level      text,                -- few | some | many
  catch_size_cm       numeric,
  fishing_method      text,
  user_id             uuid,
  verification_count  integer not null default 0,
  source_type         text not null,       -- USER | OFFICIAL | PARTNER | IMPORTED
  location_visibility text not null default 'REGION',
  photo_url           text,
  note                text
);

create index on fishing_occurrence (species_id);
create index on fishing_occurrence (zone_id);
create index on legal_rule (species_id, kind);
create index on fishing_observation (zone_id, observed_at desc);
create index on fishing_observation (species_id, observed_at desc);

-- 개인화 (Phase 4)
create table dex_record (
  user_id       uuid not null,
  entity_id     text not null references nature_entity(id),
  kind          text not null,           -- discovered | observed
  discovered_at timestamptz not null default now(),
  observed_at   timestamptz,
  context_date  date,
  primary key (user_id, entity_id)
);

create table nature_subscription (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  occurrence_id      text not null references nature_occurrence(id) on delete cascade,
  entity_id          text not null references nature_entity(id),
  notification_types text[] not null,    -- before-start | start | peak | end
  created_at         timestamptz default now(),
  unique (user_id, occurrence_id)
);

create table observation (               -- 현장제보
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  occurrence_id      text references nature_occurrence(id),
  entity_id          text not null references nature_entity(id),
  location_id        text references location(id),
  lat                double precision,
  lng                double precision,
  observed_at        timestamptz not null,
  status             text not null,
  progress_percent   smallint,
  note               text,
  photo_url          text,
  verification_count integer not null default 0
);

create index on nature_occurrence (entity_id);
create index on nature_occurrence (polarity, confidence);
create index on observation (occurrence_id, observed_at desc);
```

`nature-repository.ts` 만 async 로 바꾸고 service 시그니처를 유지하면
UI 는 손대지 않아도 됩니다.

---

## 단계별 남은 일

### Phase 1 — 바다의 NOW (구현 완료)
어종 카탈로그 · 낚시 권역 · 시즌 · 규정 엔진 · 관측 아키텍처 ·
어종/권역 두 모드 지도 · 시즌 강도 prominence · 제한 배지 ·
오늘의 바다 · 지금 바다 · 이번 주 뭐 잡으러 갈까 ·
어종/권역 상세 페이지 · 타임라인 · 1년 재생 · URL 동기화

남은 일: **시즌 데이터 검증**. 현재 `seasons.json` 은 근거를 대조하지 않은
placeholder 이며 `lastVerifiedAt` 이 비어 있습니다. 공공기관·연구기관
자료로 교체하고 `confidence` 를 올려야 production 데이터가 됩니다.
규정도 `regulations.json` 을 시행령 원문과 대조해야 합니다.

### Phase 2 — 계절 지도 (데이터·UI 완료, 실데이터 대기)
꽃 · 단풍 occurrence 가 같은 occurrence 엔진 위에서 동작하며
지도에서 실제로 나타나고 사라집니다.
남은 일은 기상청 개화 예보 / 국립공원 단풍 정보 연동입니다.

### Phase 3 — 살아있는 대한민국
철새·해양생물·자연현상 데이터는 들어가 있습니다.
남은 일은 철새 이동 경로 애니메이션과 Observation Network 강화 —
sprite 수가 늘면 `MapRendererProps` 를 만족하는 canvas 렌더러로 교체합니다.

### Phase 4 — 개인화
- 인증 (Google / Kakao) — 지도 탐색은 계속 로그인 없이
- `dex-store` / `NatureSubscription` 을 서버 동기화로 승격
- Web Push / Email 발송
- `Observation` 현장제보 (모델과 UI 자리는 준비됨)
- `DexRecord.kind` 를 `UNDISCOVERED → DISCOVERED → OBSERVED → CAUGHT` 로 확장
- 알림 우선순위: SEASON > OBSERVATION > PEAK > REGULATION
  ("인천권 보리멸 시즌이 시작됐어요" 가 "금어기 시작 7일 전" 보다 앞선다)
