/**
 * 테스트 실행 중에만 '@/...' 를 컴파일 결과로 이어 준다.
 *
 * tsc 는 경로 별칭을 출력 코드에 그대로 남기므로(별칭을 다시 쓰지 않는다)
 * node 가 그 이름을 알아야 한다. 번들러 없이 도는 자리라 이 열 줄이 필요하다.
 */
const Module = require('node:module');
const path = require('node:path');

const SRC = path.resolve(__dirname, '../.test-out/src');
const original = Module._resolveFilename;

Module._resolveFilename = function resolveWithAlias(request, ...rest) {
  const mapped = request.startsWith('@/') ? path.join(SRC, request.slice(2)) : request;
  return original.call(this, mapped, ...rest);
};
