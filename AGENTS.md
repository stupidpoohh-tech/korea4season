<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-rules -->

# 이 저장소에서 일하는 방식

## 실행은 내가 한다

- 터미널 명령어를 사용자에게 건네고 직접 실행하라고 안내하지 않는다.
  코드 수정 · git · 빌드 · 테스트 · 린트 · 스크립트 실행처럼
  내가 할 수 있는 일은 **내가 직접 실행하고 결과만 보고한다.**
- "이 명령어를 실행하세요" 형태의 안내를 쓰지 않는다.
  대신 실행하고, 무엇을 했고 결과가 어땠는지 보고한다.

## 배포까지가 한 작업이다

지시받은 일은 **머지와 배포까지 끝내고 보고한다.** 브랜치에 푸시해 두고
"배포할까요?" 라고 묻지 않는다 — 화면에 반영되지 않은 것은 아직 끝난 것이 아니다.

```
작업 브랜치에 커밋 · 푸시
  → 배포 브랜치로 fast-forward 머지
  → GitHub Actions 배포 완료 확인
  → 결과 보고
```

배포 브랜치는 `.github/workflows/deploy.yml` 의 `on.push.branches` 가 정한다.
지금은 `claude/korea-seasonal-map-design-rlw8mk` 다 (이 저장소에 `main` 은 없다).

되돌려야 할 위험이 있는 것 — 이력을 다시 쓰는 머지, 남의 커밋을 덮는 강제 푸시,
운영 데이터를 지우는 변경 — 만 먼저 묻는다.

배포는 여기서 확인까지 한다. 다만 운영 주소(`*.workers.dev`)는 egress proxy 가
막고 있어 **화면 자체는 열 수 없다.** 배포 성공 여부는 GitHub Actions 실행
결과로 확인하고, 화면 확인이 필요하면 그것만 따로 부탁한다.

## 사용자 계정으로만 가능한 일

Cloudflare 대시보드, Firebase 콘솔, GitHub 저장소 설정처럼
**사용자 계정 인증이 있어야만 가능한 일**은 내가 대신할 수 없다.
이 경우에만 안내하되, 명령어가 아니라 **화면 클릭 경로**로 안내한다.

순서는 항상 이렇게 쓴다.

```
메뉴 이름 → 탭 이름 → 버튼 이름
```

예: `Storage & Databases → KV → Create namespace`

터미널 대안이 있더라도 클릭 경로를 먼저 제시한다.

## 보고 형식

- 무엇을 바꿨는지, 검증 결과가 어땠는지를 사실 그대로 적는다.
- 통과하지 못한 것이 있으면 숨기지 않고 그대로 밝힌다.
- 사용자가 해야 할 일이 남았다면 그것만 따로 분명히 표시한다.

<!-- END:project-rules -->
