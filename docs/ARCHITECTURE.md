# Architecture

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

`Location` 은 실제 `lat/lng` 를 항상 갖고, base map 에서 위치를 압축해 그린
울릉도·독도만 `mapPosition` 으로 override 합니다.
지도 컨테이너는 container query 단위로 **항상 1000:1300 비율을 유지**합니다 —
비율이 깨지면 정규 좌표가 어긋나 sprite 가 엉뚱한 곳에 찍힙니다.

같은 장소에 여러 개가 겹치면 `buildMapLayout()` 이 작은 원형으로 흩어 놓고,
전체 sprite 는 `MAX_SPRITES`(30)로 잘라 레이어를 다 켜도 화면이 무너지지 않게 합니다.

---

## 상태 관리

| store | 담는 것 |
|---|---|
| `time-store` | `selectedDate`, 재생 상태 — 앱 전역이 이것을 본다 |
| `map-store` | 선택 레이어, 선택된 occurrence, viewport(pan/zoom) |
| `dex-store` | 자연도감 발견 기록, 알림 구독 (localStorage 영속) |

`selectedDate` 가 바뀔 때 전체 페이지가 아니라 구독 중인 컴포넌트만 다시 그립니다.
지도 배치는 `useMemo(date, layers)` 로 캐시합니다.

1년 재생은 `setInterval` 이 아니라 rAF + 경과시간 기반이라
프레임이 밀려도 속도가 일정합니다 (`PLAYBACK_DAYS_PER_SECOND = 52`, 1년 ≈ 7초).

---

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

### Phase 1 (구현 완료)
지도 · pan/zoom · 날짜 상태 · 타임라인 · 오늘 버튼 · 어종 sprite ·
pop-in · 상세 · 금어기 상태 · 출처 구조 · 레이어 필터 · 오늘의 자연 ·
Nature Now · 1년 재생 · 반응형 · URL 동기화

### Phase 2 (데이터·UI 완료, 실데이터 대기)
꽃 · 단풍 occurrence 가 지도에서 실제로 나타나고 사라집니다.
남은 일은 기상청 개화 예보 / 국립공원 단풍 정보 연동입니다.

### Phase 3
철새·해양생물·자연현상 데이터는 들어가 있습니다.
남은 일은 철새 이동 경로 애니메이션 — sprite 수가 늘면
`MapRendererProps` 를 만족하는 canvas 렌더러로 교체합니다.

### Phase 4
- 인증 (Google / Kakao) — 지도 탐색은 계속 로그인 없이
- `dex-store` / `NatureSubscription` 을 서버 동기화로 승격
- Web Push / Email 발송
- `Observation` 현장제보 (모델과 UI 자리는 준비됨)
- `DexRecord.kind` 의 `observed` 분리 — 앱상 발견과 실제 관찰을 구분
