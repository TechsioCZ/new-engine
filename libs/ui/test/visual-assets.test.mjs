import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { after, before, test } from "node:test"
import { chromium } from "@playwright/test"
import { installVisualAssets } from "./visual-assets.mjs"

const replayMissing = /missing/
const malformedBody = /body changed|ENOENT|body is missing|body size changed/
const origin = "http://127.0.0.1:6006"
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>'
const hash = (bytes, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex")
const publishedHar = path.join(
  import.meta.dirname,
  "fixtures/visual-assets/assets.har"
)
let browserPromise

function getBrowser() {
  browserPromise ??= chromium.launch({ headless: true })
  return browserPromise
}
let temporaryRoot

before(async () => {
  temporaryRoot = await mkdtemp(
    path.join(
      await realpath(process.env.OWNED_TEMP_DIR ?? os.tmpdir()),
      "visual-assets-"
    )
  )
})

after(async () => {
  try {
    await browserPromise?.then(
      (browser) => browser.close(),
      () => undefined
    )
  } finally {
    if (temporaryRoot) {
      await rm(temporaryRoot, { recursive: true, force: true })
    }
  }
})

async function withReplay(harPath, run) {
  const context = await (await getBrowser()).newContext({
    serviceWorkers: "block",
  })
  try {
    await context.route(`${origin}/`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><body></body>",
      })
    )
    const dispose = await installVisualAssets(context, { harPath, origin })
    const page = await context.newPage()
    await page.goto(origin)
    await run(page, dispose, context)
  } finally {
    await context.close()
  }
}

async function requestImage(page, url) {
  const response = page.waitForResponse((candidate) => candidate.url() === url)
  await page.evaluate((source) => {
    const image = document.createElement("img")
    image.src = source
    document.body.append(image)
  }, url)
  return response
}

async function expectRejectedRequest(
  page,
  dispose,
  url,
  resourceType = "image"
) {
  const failed = page.waitForEvent(
    "requestfailed",
    (candidate) => candidate.url() === url
  )
  await page.evaluate(
    ({ source, type }) => {
      const element = document.createElement(type === "image" ? "img" : "link")
      if (element instanceof HTMLLinkElement) {
        element.rel = "stylesheet"
        element.href = source
      } else {
        element.src = source
      }
      document.body.append(element)
    },
    { source: url, type: resourceType }
  )
  const request = await failed
  // biome-ignore lint/suspicious/noMisplacedAssertion: Shared assertion helper is awaited by each contract test.
  assert.equal(request.resourceType(), resourceType)
  // biome-ignore lint/suspicious/noMisplacedAssertion: Shared assertion helper is awaited by each contract test.
  await assert.rejects(
    dispose.whenIdle(),
    (error) =>
      error instanceof AggregateError &&
      error.errors.some((cause) => replayMissing.test(cause.message))
  )
}

test("every remote HAR image retains its response bytes and headers", async () => {
  const har = JSON.parse(await readFile(publishedHar, "utf8"))
  assert.equal(har.log.entries.length, 35)
  await withReplay(publishedHar, async (page, dispose) => {
    for (const entry of har.log.entries) {
      const response = await requestImage(page, entry.request.url)
      assert.equal(response.status(), entry.response.status)
      assert.equal(response.request().resourceType(), entry._resourceType)
      assert.deepEqual(
        await response.body(),
        await readFile(
          path.join(path.dirname(publishedHar), entry.response.content._file)
        )
      )
      for (const header of entry.response.headers) {
        assert.equal(await response.headerValue(header.name), header.value)
      }
    }
    await dispose.whenIdle()
    await dispose()
  })
})

test("missing remote fixture", async () => {
  await withReplay(publishedHar, (page, dispose) =>
    expectRejectedRequest(page, dispose, "https://fixture.invalid/missing.png")
  )
})

test("a known image URL cannot be replayed as a stylesheet", async () => {
  const har = JSON.parse(await readFile(publishedHar, "utf8"))
  await withReplay(publishedHar, (page, dispose) =>
    expectRejectedRequest(
      page,
      dispose,
      har.log.entries[0].request.url,
      "stylesheet"
    )
  )
})

async function syntheticHar(content) {
  const directory = await mkdtemp(path.join(temporaryRoot, "har-"))
  const harPath = path.join(directory, "assets.har")
  const entry = {
    _resourceType: "image",
    request: {
      method: "GET",
      url: "https://fixture.invalid/source.svg",
      headers: [],
    },
    response: {
      status: 200,
      headers: [{ name: "content-type", value: "image/svg+xml" }],
      content: {
        mimeType: "image/svg+xml",
        size: Buffer.byteLength(svg),
        ...content,
      },
    },
  }
  await writeFile(
    harPath,
    JSON.stringify({
      log: {
        version: "1.2",
        creator: { name: "visual contract", version: "1" },
        entries: [entry],
      },
    })
  )
  return { directory, harPath, url: entry.request.url }
}

for (const encoding of ["utf8", "base64", "sha256", "sha1"]) {
  test(`SVG source and native replay support ${encoding} HAR bodies`, async () => {
    const file = ["sha256", "sha1"].includes(encoding)
      ? `${hash(svg, encoding)}.svg`
      : undefined
    let content = { text: svg }
    if (file) {
      content = { _file: file }
    } else if (encoding === "base64") {
      content = {
        text: Buffer.from(svg).toString("base64"),
        encoding: "base64",
      }
    }
    const fixture = await syntheticHar(content)
    if (file) {
      await writeFile(path.join(fixture.directory, file), svg)
    }
    await withReplay(fixture.harPath, async (page, dispose) => {
      assert.equal(await dispose.readSvg(fixture.url), svg)
      const response = await requestImage(page, fixture.url)
      assert.deepEqual(await response.body(), Buffer.from(svg))
      await dispose.whenIdle()
      await dispose()
    })
  })
}

for (const failure of [
  "changed hash",
  "missing attachment",
  "missing embedded body",
  "wrong size",
]) {
  test(`invalid HAR rejects ${failure} before routing`, async () => {
    const file = `${hash(svg)}.svg`
    let content = { _file: file }
    if (failure === "missing embedded body") {
      content = {}
    } else if (failure === "wrong size") {
      content = { text: svg, size: 1 }
    }
    const fixture = await syntheticHar(content)
    if (failure === "changed hash") {
      await writeFile(
        path.join(fixture.directory, file),
        svg.replace("red", "tan")
      )
    }
    await assert.rejects(
      withReplay(fixture.harPath, () =>
        assert.fail("Invalid HAR was accepted")
      ),
      malformedBody
    )
  })
}

test("idle waits for a delayed image request to finish", async () => {
  await withReplay(publishedHar, async (page, dispose, context) => {
    const url = `${origin}/delayed.svg`
    let release
    const held = new Promise((resolve) => {
      release = resolve
    })
    const intercepted = Promise.withResolvers()
    await context.route(url, async (route) => {
      intercepted.resolve()
      await held
      await route.fulfill({ contentType: "image/svg+xml", body: svg })
    })
    const response = requestImage(page, url)
    await intercepted.promise
    let completed = false
    const idle = dispose.whenIdle().then(() => {
      completed = true
    })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(completed, false)
    release()
    await response
    await idle
    await dispose()
  })
})

test("native minimal attached HAR recording can be replayed without conversion", async () => {
  const directory = await mkdtemp(path.join(temporaryRoot, "native-har-"))
  const harPath = path.join(directory, "assets.har")
  const url = "https://fixture.invalid/native.svg"
  const recording = await (await getBrowser()).newContext({
    serviceWorkers: "block",
    recordHar: { path: harPath, content: "attach", mode: "minimal" },
  })
  try {
    await recording.route(url, (route) =>
      route.fulfill({ contentType: "image/svg+xml", body: svg })
    )
    const page = await recording.newPage()
    const response = await requestImage(page, url)
    assert.deepEqual(await response.body(), Buffer.from(svg))
  } finally {
    await recording.close()
  }
  const har = JSON.parse(await readFile(harPath, "utf8"))
  assert.equal(har.log.entries[0]._resourceType, "image")
  await withReplay(harPath, async (page, dispose) => {
    assert.equal(await dispose.readSvg(url), svg)
    assert.deepEqual(
      await (await requestImage(page, url)).body(),
      Buffer.from(svg)
    )
    await dispose()
  })
})

test("replacing an image cancels its request without poisoning idle", {
  timeout: 5000,
}, async () => {
  await withReplay(publishedHar, async (page, dispose, context) => {
    const url = `${origin}/cancelled.svg`
    const held = Promise.withResolvers()
    const intercepted = Promise.withResolvers()
    await context.route(url, async (route) => {
      intercepted.resolve()
      await held.promise
      await route.fulfill({ contentType: "image/svg+xml", body: svg })
    })
    try {
      const failed = page.waitForEvent(
        "requestfailed",
        (request) => request.url() === url
      )
      await page.evaluate((source) => {
        const image = document.createElement("img")
        image.id = "cancelled-image"
        image.src = source
        document.body.append(image)
      }, url)
      await intercepted.promise
      await page.evaluate(() => {
        document.getElementById("cancelled-image").src =
          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
      })
      assert.equal((await failed).failure().errorText, "net::ERR_ABORTED")
      await dispose.whenIdle()
      await dispose()
    } finally {
      held.resolve()
    }
  })
})

test("closing the context resolves the pending idle barrier", {
  timeout: 5000,
}, async () => {
  await withReplay(publishedHar, async (page, dispose, context) => {
    const url = `${origin}/closing.svg`
    const held = Promise.withResolvers()
    const intercepted = Promise.withResolvers()
    await context.route(url, async () => {
      intercepted.resolve()
      await held.promise
    })
    try {
      await page.evaluate((source) => {
        const image = document.createElement("img")
        image.src = source
        document.body.append(image)
      }, url)
      await intercepted.promise
      let completed = false
      const idle = dispose.whenIdle().then(() => {
        completed = true
      })
      await new Promise((resolve) => setImmediate(resolve))
      assert.equal(completed, false)
      await context.close()
      await idle
      assert.equal(completed, true)
    } finally {
      held.resolve()
    }
  })
})
