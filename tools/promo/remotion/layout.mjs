// 세로 1080×1920 한 장의 자리 나눔. 숫자를 한 곳에 모아 둔다.
//
// 숏츠 플랫폼은 화면 가장자리에 자기 UI 를 얹는다 (아래 설명·계정, 오른쪽 버튼 줄).
// 그 위에 우리 글자가 겹치면 앱에서만 안 보이고, 렌더 결과로는 알 수 없다.
// 그래서 여기 값을 SafeArea 오버레이가 그대로 그려 검수에 쓴다.
export const W = 1080
export const H = 1920

/** 플랫폼 UI 가 덮는 영역 (검수 기준 · 대략값). */
export const PLATFORM = {
  top: 140,     // 상단 상태바·제목
  bottom: 400,  // 하단 설명·계정·진행바
  right: 200,   // 우측 버튼 줄 (좋아요·댓글·공유)
  left: 24,
}

/** 우리가 안전하게 쓸 수 있는 영역. */
export const SAFE = {
  top: PLATFORM.top,
  bottom: H - PLATFORM.bottom,
  left: PLATFORM.left + 36,
  right: W - PLATFORM.right,
}

/** 자막 띠 — 하단 UI 바로 위에 앉힌다. */
export const CAPTION_BAND = {
  bottom: PLATFORM.bottom + 40,
  left: 60,
  right: PLATFORM.right + 20,
}
