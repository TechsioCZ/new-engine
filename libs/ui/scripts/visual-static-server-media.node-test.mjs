import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { createInterface } from "node:readline"
import test from "node:test"
import { fileURLToPath } from "node:url"

test("the static server supports native media HTTP requests", {
  timeout: 10_000,
}, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "storybook-media-server-"))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bytes = Buffer.from("0123456789")
  await writeFile(path.join(root, "sample.mp4"), bytes)
  await writeFile(path.join(root, "empty.mp4"), "")
  await mkdir(path.join(root, "docs"))
  await writeFile(path.join(root, "docs/index.html"), "<h1>Docs</h1>")
  const types = {
    "master.m3u8": "application/vnd.apple.mpegurl",
    "stream.mpd": "application/dash+xml",
    "segment.m4s": "video/iso.segment",
    "sample.mp3": "audio/mpeg",
    "sample.wav": "audio/wav",
    "captions.vtt": "text/vtt; charset=utf-8",
  }
  await Promise.all(
    Object.keys(types).map((file) => writeFile(path.join(root, file), bytes))
  )
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../test/visual-static-server.mjs", import.meta.url)
      ),
    ],
    {
      env: {
        ...process.env,
        VISUAL_STORYBOOK_STATIC_DIR: root,
        VISUAL_STORYBOOK_PORT: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  )
  t.after(async () => {
    if (child.exitCode === null) {
      const exit = once(child, "exit")
      child.kill()
      await exit
    }
  })
  const lines = createInterface({ input: child.stdout })
  t.after(() => lines.close())
  const [line] = await once(lines, "line")
  const base = line.replace("Serving Storybook on ", "")
  const get = (file, options) => fetch(new URL(file, base), options)

  await t.test(
    "full GET and HEAD advertise the real representation",
    async () => {
      const response = await get("sample.mp4")
      assert.equal(response.status, 200)
      assert.equal(response.headers.get("content-type"), "video/mp4")
      assert.equal(response.headers.get("content-length"), "10")
      assert.equal(response.headers.get("accept-ranges"), "bytes")
      assert.equal(response.headers.get("cache-control"), "no-store")
      assert.equal(response.headers.get("x-content-type-options"), "nosniff")
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
      const head = await get("sample.mp4", {
        method: "HEAD",
        headers: { Range: "bytes=2-4" },
      })
      assert.equal(head.status, 200)
      assert.equal(head.headers.get("content-length"), "10")
      assert.equal(head.headers.get("content-range"), null)
      assert.equal(await head.text(), "")
    }
  )

  await t.test(
    "bounded, open-ended and suffix ranges stream exact bytes",
    async () => {
      for (const [header, contentRange, body] of [
        ["bytes=0-0", "bytes 0-0/10", "0"],
        ["bytes=2-4", "bytes 2-4/10", "234"],
        ["bytes=7-", "bytes 7-9/10", "789"],
        ["bytes=-3", "bytes 7-9/10", "789"],
        ["bytes=-100", "bytes 0-9/10", "0123456789"],
        ["bytes=8-100", "bytes 8-9/10", "89"],
      ]) {
        const response = await get("sample.mp4", { headers: { Range: header } })
        assert.equal(response.status, 206, header)
        assert.equal(
          response.headers.get("content-range"),
          contentRange,
          header
        )
        assert.equal(
          response.headers.get("content-length"),
          String(body.length),
          header
        )
        assert.equal(await response.text(), body, header)
      }
    }
  )

  await t.test(
    "unsatisfiable ranges return 416 with the representation size",
    async () => {
      for (const [file, range, size] of [
        ["sample.mp4", "bytes=10-", 10],
        ["sample.mp4", "bytes=8-7", 10],
        ["sample.mp4", "bytes=-0", 10],
        ["empty.mp4", "bytes=0-", 0],
      ]) {
        const response = await get(file, { headers: { Range: range } })
        assert.equal(response.status, 416)
        assert.equal(response.headers.get("content-range"), `bytes */${size}`)
        assert.equal(response.headers.get("content-length"), "0")
        assert.equal(await response.text(), "")
      }
    }
  )

  await t.test(
    "unsupported ranges and unvalidated If-Range use a full response",
    async () => {
      for (const headers of [
        { Range: "bytes=0-1,4-5" },
        { Range: "bytes=invalid" },
        { Range: "items=0-1" },
        { Range: "bytes=0-1", "If-Range": '"old-version"' },
      ]) {
        const response = await get("sample.mp4", { headers })
        assert.equal(response.status, 200)
        assert.equal(response.headers.get("content-range"), null)
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
      }
    }
  )

  await t.test(
    "streaming manifests, segments and captions have explicit MIME types",
    async () => {
      for (const [file, type] of Object.entries(types)) {
        const response = await get(file, { method: "HEAD" })
        assert.equal(response.status, 200)
        assert.equal(response.headers.get("content-type"), type)
      }
    }
  )

  await t.test(
    "directory indexes and the root boundary remain intact",
    async () => {
      assert.equal(await (await get("docs/")).text(), "<h1>Docs</h1>")
      assert.equal((await get("missing.mp4")).status, 404)
      assert.equal((await get("%2e%2e%2foutside.mp4")).status, 404)
    }
  )
})
