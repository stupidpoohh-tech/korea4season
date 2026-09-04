import next from 'eslint-config-next';
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      // 테스트 전용 컴파일 결과 (npm test 가 만든다)
      '.test-out/**',
      '.open-next/**',
      '.wrangler/**',
      'node_modules/**',
      'public/**',
      // wrangler 가 생성하는 런타임 타입 (npm run cf-typegen)
      'cloudflare-env.d.ts',
    ],
  },
  ...next,
  ...coreWebVitals,
  ...nextTypescript,
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    // node --require 로 먼저 실려야 하는 파일이라 CommonJS 여야 한다
    files: ['tests/**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];

export default eslintConfig;
