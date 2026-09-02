import next from 'eslint-config-next';
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
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
];

export default eslintConfig;
