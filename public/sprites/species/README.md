# 어종 sprite 에셋

이 디렉터리의 파일이 지도와 상세 화면의 이모지를 대체합니다.
파일이 없거나 `AVAILABLE_SPRITES` 에 등록되지 않은 종은
`NatureEntity.icon`(이모지)으로 조용히 폴백합니다.

## 파일 규칙

```
public/sprites/species/<slug>.webp
```

`<slug>` 는 `src/data-sources/marine/species.json` 의 `code` 와 정확히 같아야 하고,
`src/data-sources/marine/adapter.ts` 의 `AVAILABLE_SPRITES` 에 등록해야 켜집니다.

## 규격

| 항목 | 값 |
|---|---|
| 형식 | WebP (투명 배경) |
| 크기 | 긴 변 128px 안팎 |
| 방향 | **왼쪽을 향하도록** 통일 (지도에서 방향이 섞이면 어수선합니다) |
| 여백 | 상하좌우 4px 정도. 정사각 박스에 contain 으로 담깁니다 |
| 표시 | 지도 sprite 안에서 약 30px, 상세에서 약 22~28px |

세로로 긴 오징어·문어와 가로로 긴 물고기가 섞여 있어도
정사각 박스에 맞춰 담기므로 잘리지 않습니다.

## 현재 상태

시트에서 잘라 넣은 18종이 들어와 있습니다.

```
korean-rockfish  olive-flounder  japanese-sillago  japanese-seabass
red-seabream  japanese-horse-mackerel  blue-crab  webfoot-octopus
common-octopus  long-arm-octopus  black-porgy  spanish-mackerel
largehead-hairtail  chub-mackerel  pacific-cod  snow-crab
common-squid  small-yellow-croaker
```

아직 이모지로 남아 있는 종은 셋입니다.

```
marbled-flounder      문치가자미(도다리)
dark-banded-rockfish  볼락
yellowfin-goby        망둥어
```

## 원본에서 다시 만들기

시트에서 잘라내는 스크립트는 `scratch/build-sprites.py` 에 있습니다.
셀 격자로 나눈 뒤 연결 성분 마스크로 옆 칸 조각을 걸러내고,
긴 변 128px WebP 로 저장합니다.
