/*
 * 지금 배포 경로에서 쓰이지 않는다.
 *
 * 이 앱은 정적 내보내기(next.config.ts 의 output: 'export')로 바뀌었고,
 * wrangler 는 out/ 을 정적 파일로만 올린다 — Worker 가 없다.
 * 이 파일은 SSR 로 되돌릴 때를 위해 남겨 둔다.
 *
 * 되돌리는 순서:
 *   1. next.config.ts 에서 output: 'export' 제거
 *   2. wrangler.jsonc 에 main 과 kv_namespaces 복구
 *   3. package.json 의 deploy 를 opennextjs-cloudflare 로 복구
 *
 * 되돌리면 화면 요청마다 Worker 가 깨어나므로 Workers Free(요청당 CPU 10ms)
 * 로는 운영할 수 없다. 그때는 유료 플랜이 필요하다.
 */
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  queue: 'direct',
});
