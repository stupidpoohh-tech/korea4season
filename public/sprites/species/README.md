# 어종 sprite 에셋

이 디렉터리에 파일을 넣으면 지도와 상세 화면의 이모지가 자동으로 교체됩니다.
파일이 없으면 `NatureEntity.icon`(이모지)으로 조용히 폴백합니다.

## 파일 규칙

```
public/sprites/species/<slug>.svg      ← 권장
public/sprites/species/<slug>.png      ← 사용 시 data-sources 의 illustration 확장자만 변경
```

`<slug>` 는 `src/data-sources/marine/species.json` 의 `code` 와 정확히 같아야 합니다.
어떤 slug 가 필요한지는 아래 "필요 목록" 참고.

## 에셋 규격

| 항목 | 값 |
|---|---|
| 종횡비 | 가로가 긴 형태 권장 (약 16:10) |
| 표시 크기 | 지도 sprite 안에서 약 28×18px, 상세에서 약 56×36px |
| 방향 | **오른쪽을 향하도록** 통일 (지도에서 방향이 섞이면 어수선해집니다) |
| 여백 | 상하좌우 여백 최소화. 컨테이너가 원형이라 꽉 채우면 잘립니다 |
| 배경 | 투명 |
| 색 | base map(플랫, 저채도 자연색)과 같은 결 권장 |
| PNG일 경우 | 2x (약 112×72) 이상 |

SVG는 `width`/`height` 없이 `viewBox`만 두면 어느 크기에서도 깨지지 않습니다.

## 필요 목록

`src/data-sources/marine/species.json` 의 `code` 값 전체가 대상입니다.
현재 필요한 slug 목록은 다음 명령으로 확인할 수 있습니다.

```bash
node -e "console.log(require('./src/data-sources/marine/species.json').species.map(s=>s.code).join('\n'))"
```
