import type { BrowserContext, Page } from "@playwright/test"

// Thirty seconds of silent PCM: exercise the real media element without a CDN.
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
  await target.route("**/sprite-fight/{audio.mp3,480p.mp4}", (route) =>
    route.fulfill({
      contentType: "audio/wav",
      headers: { "Accept-Ranges": "bytes" },
      body: audio,
    })
  )
}
