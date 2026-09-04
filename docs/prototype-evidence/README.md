# 철새 Prototype 화면 증거

`node scripts/shoot.mjs http://localhost:3111 docs/prototype-evidence` 로 다시 만든다.

**여기 보이는 새는 전부 합성 자료다.** `TEST_BIRD_*` × `TEST_REGION_*` 이며
실제 종 · 지역 · 도래 시기가 아니다. production 검증 기록은 0건이고
`production_data_status` 는 `NOT_READY` 다.

| 파일 | 무엇을 보이는가 |
|---|---|
| `1-mobile-national.webp` | 모바일 전국 화면 (2026-01-10). 활성 20건 가운데 10마리 |
| `2-desktop-national.webp` | 데스크톱 전국 화면 (2026-01-10). 활성 20건 가운데 14마리 |
| `3-starting.webp` | 2025-11-20 — 도래 시작 |
| `4-peak.webp` | 2026-01-05 — 가장 많은 시기 |
| `5-ending.webp` | 2026-02-14 — 떠나는 중 |
| `6-off.webp` | 2026-06-25 — 시즌 밖. 지도가 비는 것이 정상이다 |
| `7-mobile-density.webp` | 활성 17건인 날의 모바일 화면. 상한 10 이 걸린다 |
| `10-selected.webp` | 하나를 골랐을 때. 기존 Bottom Sheet 를 그대로 쓴다 |
| `11-production-guard.webp` | `NEXT_PUBLIC_BIRD_PRODUCTION=1` — mock 이 전부 차단되어 0마리 |
| `8-marine-regression.webp` | 지금 바다 — 그대로 동작한다 |
| `9-mountain-regression.webp` | 지금 산(단풍) — 계절이 지형을 칠하는 것은 그대로다 |

## 지도 바탕은 고정이다

바다와 철새에서는 지형에 계절색을 얹지 않는다. 위 화면들이 1월인데도
지도가 눈이 아니라 base map 그대로인 것이 그 때문이다 — 배경이 날짜마다
바뀌면 그 위에 놓인 변화가 안 읽힌다.

1월 15일과 7월 20일을 견주면(지도 영역에서 sprite 자리를 뺀 배경):

```
바다    비교 178,016px   차이 0
철새    비교 192,303px   차이 0
산      비교 271,124px   차이 91,602   ← 산은 계속 계절을 탄다
```

## anchor 고정 증거

`anchor-1-starting` ~ `anchor-5-off` 은 **같은 화면 좌표를 다섯 날짜에 걸쳐
같은 크기로 잘라 낸 것**이다. `TEST_BIRD_A × TEST 북부` 하나를 담고 있다.

| 파일 | 날짜 | 상태 |
|---|---|---|
| `anchor-1-starting.webp` | 2025-11-20 | STARTING |
| `anchor-2-good.webp` | 2025-12-05 | GOOD |
| `anchor-3-peak.webp` | 2026-01-05 | PEAK |
| `anchor-4-ending.webp` | 2026-02-14 | ENDING |
| `anchor-5-off.webp` | 2026-06-25 | OFF (그려지지 않는다) |

다섯 장에서 새는 **같은 자리에 있고 존재감만 변한다**.
브라우저에서 잰 실제 값도 네 날짜 모두 `(770.91, 151.95)` 로 같았다.
날짜에 따라 새가 지도 위를 옮겨 다니면 그것은 실패다 — 이 지도는
이동 경로를 그리지 않는다.
