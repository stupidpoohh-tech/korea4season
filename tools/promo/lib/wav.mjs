// (everyday-ai tools/video/lib/wav.mjs 에서 그대로 가져왔다 — 순수 유틸이라 손댈 곳이 없다)
// WAV 를 직접 다룹니다 — ffmpeg 없이 길이를 재고, 이어 붙이고, 무음을 만듭니다.
// Typecast 에 wav 로 달라고 하는 이유가 이것입니다: 길이를 그 자리에서 알 수 있습니다.

const DEFAULT = { channels: 1, sampleRate: 44100, bitsPerSample: 16 }

/** RIFF/WAVE 를 뜯어 규격과 소리 알맹이를 돌려줍니다. */
export function readWav (buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' ||
      buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('WAV 파일이 아닙니다 (RIFF/WAVE 머리글이 없습니다)')
  }
  let fmt = null
  let data = null
  let p = 12
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4)
    const size = buf.readUInt32LE(p + 4)
    const body = p + 8
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14)
      }
    } else if (id === 'data') {
      data = buf.subarray(body, Math.min(body + size, buf.length))
    }
    p = body + size + (size % 2) // 청크는 짝수 경계로 정렬됩니다
  }
  if (!fmt || !data) throw new Error('WAV 안에 fmt 또는 data 청크가 없습니다')
  const bytesPerFrame = (fmt.bitsPerSample / 8) * fmt.channels
  return { ...fmt, data, seconds: data.length / (bytesPerFrame * fmt.sampleRate) }
}

/** 소리 알맹이에 머리글을 붙여 온전한 WAV 로 만듭니다. */
export function writeWav (data, spec = DEFAULT) {
  const { channels, sampleRate, bitsPerSample } = { ...DEFAULT, ...spec }
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const head = Buffer.alloc(44)
  head.write('RIFF', 0, 'ascii')
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVE', 8, 'ascii')
  head.write('fmt ', 12, 'ascii')
  head.writeUInt32LE(16, 16)              // PCM 은 fmt 청크가 16바이트
  head.writeUInt16LE(1, 20)               // 1 = PCM
  head.writeUInt16LE(channels, 22)
  head.writeUInt32LE(sampleRate, 24)
  head.writeUInt32LE(byteRate, 28)
  head.writeUInt16LE(channels * (bitsPerSample / 8), 32)
  head.writeUInt16LE(bitsPerSample, 34)
  head.write('data', 36, 'ascii')
  head.writeUInt32LE(data.length, 40)
  return Buffer.concat([head, data])
}

/** 정해진 길이의 무음. 키 없이 파이프라인 전체를 돌려볼 때 씁니다. */
export function silentWav (seconds, spec = DEFAULT) {
  const { channels, sampleRate, bitsPerSample } = { ...DEFAULT, ...spec }
  const frames = Math.max(1, Math.round(seconds * sampleRate))
  return writeWav(Buffer.alloc(frames * channels * (bitsPerSample / 8)), spec)
}

/** 여러 WAV 를 하나로. 규격이 다르면 조용히 섞지 않고 멈춥니다. */
export function concatWav (buffers) {
  if (buffers.length === 0) throw new Error('이어 붙일 WAV 가 없습니다')
  if (buffers.length === 1) return buffers[0]
  const parts = buffers.map(readWav)
  const first = parts[0]
  for (const p of parts.slice(1)) {
    if (p.channels !== first.channels || p.sampleRate !== first.sampleRate ||
        p.bitsPerSample !== first.bitsPerSample) {
      throw new Error('규격이 다른 WAV 는 이어 붙일 수 없습니다 ' +
        `(${first.sampleRate}Hz/${first.channels}ch/${first.bitsPerSample}bit ≠ ` +
        `${p.sampleRate}Hz/${p.channels}ch/${p.bitsPerSample}bit)`)
    }
  }
  return writeWav(Buffer.concat(parts.map((p) => p.data)), first)
}

/** 앞뒤에 무음을 붙인다. 숏츠에서는 앞 여백을 화면·자막과 같은 값으로 맞추는 데 쓴다. */
export function padWav (buf, headSeconds, tailSeconds) {
  const w = readWav(buf)
  const spec = { channels: w.channels, sampleRate: w.sampleRate, bitsPerSample: w.bitsPerSample }
  return concatWav([silentWav(headSeconds, spec), buf, silentWav(tailSeconds, spec)])
}

export function durationSeconds (buf) {
  return readWav(buf).seconds
}
