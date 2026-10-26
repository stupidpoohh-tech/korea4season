/** 측정 실행 중에만 '@/...' 를 컴파일 결과로 이어 준다 (tests/alias.cjs 와 같은 방식). */
const Module = require('node:module');
const path = require('node:path');
const SRC = path.resolve(__dirname, '../.bench-out/src');
const original = Module._resolveFilename;
Module._resolveFilename = function resolveWithAlias(request, ...rest) {
  return original.call(this, request.startsWith('@/') ? path.join(SRC, request.slice(2)) : request, ...rest);
};
