import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /*
   * Workers 에는 Next 의 이미지 최적화 서버가 없다.
   * 이 앱이 next/image 로 다루는 것은 base map SVG 한 장뿐이라
   * 최적화해서 얻을 것이 없다. 원본을 그대로 내보낸다.
   */
  images: { unoptimized: true },
};

export default nextConfig;

// 로컬 `next dev` 에서도 Cloudflare 바인딩(KV 등)에 접근할 수 있게 한다
initOpenNextCloudflareForDev();
