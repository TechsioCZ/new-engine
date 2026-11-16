import type { BrowserContext, Page } from "@playwright/test"

// Thirty seconds of silent PCM: exercise the real media element without a CDN.
const BYTE_RANGE = /^bytes=(\d+)-(\d*)$/
const sampleRate = 8000
const audio = Buffer.alloc(44 + sampleRate * 30 * 2)
audio.write("RIFF", 0)
audio.writeUInt32LE(audio.length - 8, 4)
audio.write("WAVEfmt ", 8)
audio.writeUInt32LE(16, 16)
audio.writeUInt16LE(1, 20)
audio.writeUInt16LE(1, 22)
audio.writeUInt32LE(sampleRate, 24)
audio.writeUInt32LE(sampleRate * 2, 28)
audio.writeUInt16LE(2, 32)
audio.writeUInt16LE(16, 34)
audio.write("data", 36)
audio.writeUInt32LE(audio.length - 44, 40)

export async function installPlayerMediaFixture(target: BrowserContext | Page) {
  await target.route("**/sprite-fight/{audio.mp3,480p.mp4}", (route) => {
    const headers = { "Accept-Ranges": "bytes" }
    const range = route.request().headers().range?.match(BYTE_RANGE)
    if (!range) {
      return route.fulfill({ contentType: "audio/wav", headers, body: audio })
    }
    // WebKit requests byte ranges when seeking beyond its metadata buffer.
    const start = Number(range[1])
    const end = Math.min(
      range[2] ? Number(range[2]) : audio.length - 1,
      audio.length - 1
    )
    if (start > end) {
      return route.fulfill({
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${audio.length}` },
      })
    }
    return route.fulfill({
      status: 206,
      contentType: "audio/wav",
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${audio.length}`,
      },
      body: audio.subarray(start, end + 1),
    })
  })
}
