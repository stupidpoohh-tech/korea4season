# 사내 서체

`Freesentation.woff2` 를 이 디렉터리에 넣으면 앱 전체에 자동 적용됩니다.
파일이 없으면 Pretendard → 시스템 한글 폰트 순으로 조용히 내려갑니다.

```
public/fonts/Freesentation.woff2
```

선언은 `src/app/globals.css` 의 `@font-face` 에 있습니다.
로컬에 설치된 사본이 있으면 네트워크 요청 없이 그것을 씁니다.
