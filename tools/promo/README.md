# 지금日지도 홍보 영상 (tools/promo)

1080×1920 세로 홍보 영상을 만드는 **로컬 전용** 도구다.
지금 대본(`script/promo.json`)은 서비스 소개 7장면 · **약 50초**.

앱과 **완전히 분리된 별도 패키지**다. 여기에 자기 `package.json` 과 `node_modules`
(Remotion + React 18)가 있고, 앱(Next 16 + React 19)과 의존성이 섞이지 않는다.
**앱 코드(`src/`)는 한 줄도 고치지 않았다.**

---

## 빠르게

```bash
cd tools/promo
npm install

node run.mjs --check          # 대본만 확인 (TTS·렌더 없음)
node run.mjs --mock           # 가짜 TTS(무음)로 화면·자막 확인
node run.mjs --preview        # 이미 만들어 둔 소리로 저해상도 검수
node run.mjs --real --spend   # ★유료★ Typecast + 최종 렌더
npm test                      # 50개
```

`--real` 은 `--spend` 를 같이 적어야 돈다. 플래그 하나로는 값이 나가지 않는다.

결과는 `out/<모드>/<시각>-<대본id>/` 에 쌓인다. **기존 결과는 지우지 않는다.**

---

## 화면은 전부 실제 MVP 다

목업을 그리지 않는다. 프로덕션 빌드를 띄워 진짜 화면을 찍는다.

```bash
npm run build && npx next start -p 3031     # 저장소 뿌리
node tools/promo/capture/capture.mjs
```

브라우저를 다루는 코드는 **이 저장소가 이미 가진 검증 도구**(`scripts/verify/lib/cdp.mjs`)를
그대로 쓴다. 영상용으로 따로 쓰면 검증과 다른 조건(기기 크기 · 대기 방식)에서 찍히게 되고,
검증에서 본 화면과 영상 속 화면이 어긋나도 아무도 모른다.

무엇을 찍는지는 `capture/shots.json` 에 있다 — 날짜는 `?date=`, 카테고리는 상단
알약(보는 자연)으로 고른다. **앱이 실제로 하는 그대로다.**

| 파일 | 무엇 |
|---|---|
| `spring · summer · autumn · winter` | 산 — 같은 지도, 날짜만 다르다 |
| `sea · mountain · sky` | 바다 · 산 · 하늘(철새) |
| `map-now` | 오늘 화면 |

캡처가 없으면 그 장면만 자리표가 되고 나머지는 그대로 간다. 여러 장을 갈아 끼우는
장면은 **없는 것만 빼고** 나머지로 돈다.

---

## 시간 기준

`lib/timeline.mjs` 의 `LEAD_IN`(0.25초)이 **음성·자막·화면 셋 모두의 기준**이다.
장면마다 `audioFromFrame` 을 값으로 내보내고, 렌더는 그 값대로만 튼다.
`checkTimeline()` 이 렌더 직전에 다시 보고, `test/timing.test.mjs` 가 회귀를 막는다.

**말의 길이는 음성이 정한다.** 사람이 초를 적지 않는다.

다만 **화면이 바뀌는 것을 보여 주는 데 드는 시간**은 말과 무관하다. 계절 넷이
갈아 끼워지는 장면은 나레이션이 끝나도 몇 초 더 있어야 사람이 그 변화를 본다.
그 시간만 대본이 정한다 — `screen.holdSeconds`. **음성·자막의 기준에는 손대지 않고
뒤에 붙기만 한다** (`test/pipeline.test.mjs` 가 확인한다).

**화면이 갈아 끼워지는 시점도 말에 맞춘다.** `screen.anchorPhrases` 에 적은 구절이
실제로 발음되는 프레임에서 바뀐다 (`"산의"` 를 말할 때 산 화면으로). 초를 손으로
적지 않는다.

---

## 카피 규칙

- **앱에 없는 것을 말하지 않는다.**
- 여는 장면의 검색창은 **특정 포털을 흉내 내지 않는다.** 실재하는 회사의 UI·로고를
  그리면 그 회사가 만든 것처럼 보인다. 브랜드 없는 일반 검색창으로 "검색하는 느낌"만 낸다.
- **하늘(철새)은 이 저장소 기준 Prototype 이고 지금 그려지는 것은 합성 fixture 다**
  (`src/domain/nature-categories.ts`). 화면은 실제 MVP 그대로이지만, 공개 전에 그 점을
  표시할지는 사람이 정한다.

## 색과 글꼴

색은 `lib/brand.mjs` 가 **`src/app/globals.css` 에서 직접 읽는다.**
이 도구에는 hex 가 하나도 없다 — 앱이 색을 바꾸면 영상도 같이 바뀐다.
토큰 이름이 사라지면 렌더가 아니라 거기서 멈춘다.

글꼴은 npm 의 `pretendard` 를 publicDir 로 복사해 심는다(인터넷 없이 렌더된다).

## 목소리

`script/promo.json` 의 `voice` 에 있다. voice_id 는 비밀값이 아니라 **정한 것**이라
커밋한다. 키는 `.env` 에만 있다.

```bash
node voices.mjs                                   # 목록 (GET — 값이 나가지 않는다)
node voices.mjs --sample <voice_id> --spend       # 견본 wav (★유료★)
```

## 파일

```
run.mjs                 실행기 (mock / preview / real)
lib/timeline.mjs        ★음성·자막·화면의 단일 기준★ + holdSeconds + checkTimeline
lib/validate.mjs        역순·범위 초과·정렬 실패 검출
lib/ttsCache.mjs        wav + timestamps 한 쌍 캐시 (mock/real 폴더 분리)
lib/build.mjs           대본 → 소리·자막·전환 시점
lib/brand.mjs           globals.css 에서 색을 읽는다
lib/typecast.mjs        Timestamp TTS — ★이 파일만 키를 만진다★
script/promo.json       대본 (장면 7개)
capture/                제품 화면 캡처 (이 저장소의 검증 도구를 그대로 쓴다)
remotion/               Short · Captions · SafeArea · Watermark · 장면 3종
test/                   timing · validate · cache · pipeline · runDir · portable
```
