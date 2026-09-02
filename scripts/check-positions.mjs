#!/usr/bin/env node
/**
 * 개발용 검증 도구.
 * 모든 Location 을 base map 위에 찍어 바다 sprite 가 바다에,
 * 육지 sprite 가 육지에 놓이는지 눈으로 확인한다.
 *
 *   node scripts/check-positions.mjs
 *   -> public/map/__check.svg (브라우저로 열어 확인, 커밋하지 않음)
 */
import { readFileSync, writeFileSync } from 'node:fs';
const B = JSON.parse(readFileSync(new URL('../src/domain/map-bounds.json', import.meta.url),'utf8'));
const L = JSON.parse(readFileSync(new URL('../src/data-sources/shared/locations.json', import.meta.url),'utf8')).locations;
const svg = readFileSync(new URL('../public/map/korea-base.svg', import.meta.url),'utf8');
const px = (lng) => ((lng - B.west)/(B.east-B.west))*B.viewWidth;
const py = (lat) => ((B.north - lat)/(B.north-B.south))*B.viewHeight;
const marks = L.map(l => {
  const x = l.mapX !== undefined ? l.mapX*B.viewWidth : px(l.lng);
  const y = l.mapY !== undefined ? l.mapY*B.viewHeight : py(l.lat);
  const sea = ['sea','island','coast'].includes(l.type);
  return `<g><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="11" fill="${sea?'#0b64c8':'#d61f4a'}" stroke="#fff" stroke-width="3"/><text x="${(x+15).toFixed(0)}" y="${(y+5).toFixed(0)}" font-size="19" fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke">${l.name}</text></g>`;
}).join('');
writeFileSync(new URL('../public/map/__check.svg', import.meta.url), svg.replace('</svg>', `<g id="debug">${marks}</g></svg>`));
console.log('ok', L.length);
