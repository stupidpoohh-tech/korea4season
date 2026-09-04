/* ────────────────────────────────────────────────────────────
 * Prototype fixture 와 production 을 구조적으로 갈라 놓는다.
 *
 * 지금 검증된 종 × 지역 × 월 기록은 0건이다. Prototype 실행은 승인됐지만
 * production 공개는 승인되지 않았다. 그 둘을 코드가 헷갈리지 않게
 * 여기 한 곳에서만 판정한다.
 *
 * 판정은 값 하나가 아니라 셋 중 하나라도 걸리면 mock 이다 —
 * fixture 를 만들 때 하나를 빠뜨려도 새어 나가지 않게 하려는 것이다.
 * ──────────────────────────────────────────────────────────── */

/**
 * production 데이터 상태.
 *
 * 이 값을 코드에서 올리지 않는다. 검증된 기록이 들어오고 HQ 가 공개를
 * 승인했을 때 사람이 바꾼다. Prototype 이 동작한다는 것은 production 이
 * 준비됐다는 뜻이 아니다.
 */
export const BIRD_PRODUCTION_DATA_STATUS = 'NOT_READY' as const;

/** 검증된 production 종 × 지역 × 월 기록 수. 지금은 0이다. */
export const BIRD_VERIFIED_RECORD_COUNT = 0;

export interface MockMarked {
  isMock?: boolean;
  sourceType?: string;
  evidenceStatus?: string;
}

/** 셋 중 하나라도 걸리면 prototype 자료다 */
export function isMockRecord(record: MockMarked): boolean {
  return (
    record.isMock === true ||
    record.sourceType === 'MOCK' ||
    record.evidenceStatus === 'MOCK'
  );
}

export class BirdMockLeakError extends Error {
  constructor(context: string, count: number) {
    super(
      `prototype mock 자료 ${count}건이 production 경로(${context})로 넘어가려 했습니다. ` +
        'production 은 검증된 자료만 통과합니다.',
    );
    this.name = 'BirdMockLeakError';
  }
}

/**
 * production payload 를 만드는 자리에서 부른다.
 * 조용히 걸러 내지 않고 던진다 — 조용히 걸러 내면 fixture 가 새어 나갔다는 사실 자체를
 * 아무도 모르게 되고, 다음번에는 더 늦게 발견된다.
 */
export function assertNoMockRecords(records: readonly MockMarked[], context: string): void {
  const leaked = records.filter(isMockRecord);
  if (leaked.length > 0) throw new BirdMockLeakError(context, leaked.length);
}

/**
 * 런타임에 실제로 쓸 기록만 남긴다.
 * allowMock 이 false 면 mock 은 한 건도 통과하지 못한다.
 */
export function filterRuntimeRecords<T extends MockMarked>(
  records: readonly T[],
  options: { allowMock: boolean },
): T[] {
  if (options.allowMock) return [...records];
  return records.filter((record) => !isMockRecord(record));
}
