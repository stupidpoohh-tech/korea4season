#!/usr/bin/env node
/**
 * 철새 Prototype 용 합성 sprite 생성기.
 *
 *   node scripts/build-bird-prototype-sprites.mjs
 *   -> public/sprites/bird-prototype/test-bird-*.svg
 *
 * 실제 종을 그리지 않는다. 여기서 만드는 것은 **실루엣이 서로 구분되는가**를
 * 확인하기 위한 합성 도형이고, 파일명도 test-bird-* 로만 둔다.
 *
 * 지도 sprite 는 32~42px 로 작다. 그 크기에서 종이 구분되려면
 * 부리 · 목 · 다리 · 꼬리 · 몸통 비율 · 대표 색 블록이 먼저 읽혀야 하므로
 * 그 여섯 가지만 파라미터로 두고 나머지 장식은 넣지 않는다.
 *
 * 자세는 전부 측면 정지 자세다. 비행 자세를 기본 sprite 로 쓰지 않는다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/sprites/bird-prototype/', import.meta.url);

/**
 * body   몸통 반지름 (rx, ry)
 * neck   목 길이 · 굵기
 * bill   부리 길이 · 두께
 * leg    다리 길이 · 굵기 (0 이면 물에 뜬 자세)
 * tail   꼬리 길이 · 각도
 * base   몸통 색 / accent 머리·날개 블록 색
 */
const SPECIES = [
  { id: 'test-bird-a', body: [15, 11], neck: [22, 3.4], bill: [11, 2.2], leg: [20, 1.8], tail: [11, 22], base: '#8b93a8', accent: '#2f3948' },
  { id: 'test-bird-b', body: [18, 13], neck: [13, 5.2], bill: [7, 3.4], leg: [7, 2.4], tail: [9, 12], base: '#a98f6a', accent: '#5c4a2e' },
  { id: 'test-bird-c', body: [17, 12], neck: [8, 5.6], bill: [9, 3.8], leg: [5, 2.2], tail: [8, 8], base: '#7f9ca8', accent: '#28546a' },
  { id: 'test-bird-d', body: [10, 8], neck: [6, 4.2], bill: [5, 2.4], leg: [8, 1.4], tail: [10, 16], base: '#b8a44f', accent: '#4a4423' },
  { id: 'test-bird-e', body: [12, 9], neck: [10, 3.8], bill: [6, 2.6], leg: [11, 1.5], tail: [8, 14], base: '#93a67f', accent: '#3d4a30' },
  { id: 'test-bird-f', body: [16, 10], neck: [19, 3.0], bill: [14, 2.0], leg: [22, 1.6], tail: [9, 18], base: '#c9c2b4', accent: '#6b4f56' },
  { id: 'test-bird-g', body: [13, 10], neck: [9, 4.4], bill: [6, 3.0], leg: [9, 1.8], tail: [12, 20], base: '#9c7f96', accent: '#3a2b40' },
  { id: 'test-bird-h', body: [19, 12], neck: [11, 5.8], bill: [12, 4.6], leg: [13, 2.2], tail: [8, 10], base: '#b0b7bd', accent: '#333b42' },
  { id: 'test-bird-i', body: [14, 12], neck: [7, 5.0], bill: [5, 3.2], leg: [4, 2.0], tail: [7, 6], base: '#6f8f86', accent: '#24413c' },
  { id: 'test-bird-j', body: [15, 9], neck: [15, 3.2], bill: [8, 2.2], leg: [16, 1.6], tail: [14, 24], base: '#c08f6d', accent: '#4d2f22' },
];

const W = 96;
const H = 96;

function sprite(s) {
  const [bx, by] = s.body;
  const [neckLen, neckW] = s.neck;
  const [billLen, billW] = s.bill;
  const [legLen, legW] = s.leg;
  const [tailLen, tailAngle] = s.tail;

  // 다리 끝이 항상 같은 바닥선에 닿게 잡는다 — 접지가 읽혀야 '머무는 새' 가 된다
  const ground = H - 6;
  const cy = ground - legLen - by;
  const cx = W / 2 + 2;

  const headX = cx + bx * 0.72;
  const headY = cy - neckLen;
  const headR = Math.max(4.2, neckW * 1.35);

  const billTipX = headX + billLen;
  const billTipY = headY + billW * 0.3;

  const rad = (tailAngle * Math.PI) / 180;
  const tailX = cx - bx - Math.cos(rad) * tailLen;
  const tailY = cy + Math.sin(rad) * tailLen;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <title>${s.id} (synthetic prototype sprite)</title>
  <g stroke="${s.accent}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${cx - bx * 0.2} ${cy + by * 0.15} L${(cx - bx * 0.2 + tailX) / 2} ${(cy + tailY) / 2 - 2} L${tailX.toFixed(1)} ${tailY.toFixed(1)} Z" fill="${s.accent}" />
    <line x1="${(cx - bx * 0.35).toFixed(1)}" y1="${(cy + by).toFixed(1)}" x2="${(cx - bx * 0.35).toFixed(1)}" y2="${ground}" stroke-width="${legW}" />
    <line x1="${(cx + bx * 0.15).toFixed(1)}" y1="${(cy + by).toFixed(1)}" x2="${(cx + bx * 0.15).toFixed(1)}" y2="${ground}" stroke-width="${legW}" />
    <ellipse cx="${cx}" cy="${cy}" rx="${bx}" ry="${by}" fill="${s.base}" />
    <ellipse cx="${(cx - bx * 0.12).toFixed(1)}" cy="${(cy - by * 0.1).toFixed(1)}" rx="${(bx * 0.62).toFixed(1)}" ry="${(by * 0.55).toFixed(1)}" fill="${s.accent}" opacity="0.85" stroke="none" />
    <line x1="${headX.toFixed(1)}" y1="${headY.toFixed(1)}" x2="${(cx + bx * 0.45).toFixed(1)}" y2="${(cy - by * 0.35).toFixed(1)}" stroke-width="${neckW}" stroke="${s.base}" />
    <circle cx="${headX.toFixed(1)}" cy="${headY.toFixed(1)}" r="${headR.toFixed(1)}" fill="${s.accent}" />
    <path d="M${headX.toFixed(1)} ${(headY - billW / 2).toFixed(1)} L${billTipX.toFixed(1)} ${billTipY.toFixed(1)} L${headX.toFixed(1)} ${(headY + billW / 2).toFixed(1)} Z" fill="${s.base}" />
  </g>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const s of SPECIES) {
  writeFileSync(new URL(`${s.id}.svg`, OUT), sprite(s));
}
console.log(`ok ${SPECIES.length} synthetic bird sprites`);
