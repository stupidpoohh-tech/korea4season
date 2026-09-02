import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

/**
 * Cloudflare Workers 배포 설정.
 *
 * 이 앱이 서버에서 하는 일은 사실상 하나다 — "오늘" 을 최신으로 유지하는 것.
 * 모든 라우트가 `revalidate = 900` 이고 revalidateTag/revalidatePath 는 쓰지 않는다.
 *
 *  - incrementalCache: 재검증된 페이지를 KV 에 쓴다.
 *    이게 없으면 빌드 시점의 "오늘" 이 그대로 굳는다.
 *  - queue: "direct" — 재검증을 요청 안에서 바로 처리한다.
 *    태그 기반 on-demand 재검증이 없으므로 Durable Object 큐가 필요 없다.
 *  - tagCache: 태그를 쓰지 않으므로 두지 않는다 (기본 dummy).
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  queue: 'direct',
});
