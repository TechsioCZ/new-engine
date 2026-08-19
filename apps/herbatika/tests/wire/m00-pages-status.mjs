import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { assertActualNextVersion } from "../../scripts/assert-next-version.mjs"

const baseUrlValue = process.env.M00_BASE_URL
if (!baseUrlValue) {
  throw new Error(
    "M00_BASE_URL is required; refusing to skip the production wire gate"
  )
}

const baseUrl = new URL(baseUrlValue)
if (!(baseUrl.protocol === "http:" || baseUrl.protocol === "https:")) {
  throw new Error("M00_BASE_URL must use http: or https:")
}

const appRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const NO_STORE = /no-store/

const request = ({
  headers = {},
  host = "herbatica.sk",
  method = "GET",
  pathname,
}) =>
  new Promise((resolveRequest, rejectRequest) => {
    let responseHeadReceived = false
    const transport = baseUrl.protocol === "https:" ? httpsRequest : httpRequest
    const outgoing = transport(
      {
        hostname: baseUrl.hostname,
        port: baseUrl.port,
        path: pathname,
        method,
        headers: { Host: host, ...headers },
        rejectUnauthorized: process.env.M00_ALLOW_SELF_SIGNED_TLS !== "1",
      },
      (response) => {
        responseHeadReceived = true
        const chunks = []
        response.on("data", (chunk) => {
          if (!responseHeadReceived) {
            rejectRequest(
              new Error("body arrived before the response-head callback")
            )
            return
          }
          chunks.push(chunk)
        })
        response.on("end", () => {
          resolveRequest({
            body: Buffer.concat(chunks),
            headers: response.headers,
            status: response.statusCode,
          })
        })
      }
    )
    outgoing.on("error", rejectRequest)
    outgoing.end()
  })

const stableHeaders = (response) => ({
  "cache-control": response.headers["cache-control"],
  location: response.headers.location,
  "retry-after": response.headers["retry-after"],
  "x-m00-resolution-phase": response.headers["x-m00-resolution-phase"],
  "x-robots-tag": response.headers["x-robots-tag"],
})

const cases = [
  { outcome: "current", status: 200 },
  {
    location: "https://herbatica.sk/__url-m00/current",
    outcome: "alias",
    status: 308,
  },
  { outcome: "missing", status: 404 },
  { outcome: "gone", status: 410 },
  { outcome: "unavailable", retryAfter: "30", status: 503 },
]

const requestProfiles = [
  { label: "ordinary", headers: {} },
  {
    label: "adversarial RSC",
    headers: {
      RSC: "1",
      "Next-Router-Prefetch": "1",
      "Next-Router-State-Tree": "%5B%22%22%5D",
      Purpose: "prefetch",
      Forwarded: "for=203.0.113.10;host=attacker.invalid;proto=http",
      "Sec-Purpose": "prefetch",
      "X-Canonical-Origin": "https://attacker.invalid",
      "X-Forwarded-For": "203.0.113.10",
      "X-Forwarded-Host": "attacker.invalid",
      "X-Forwarded-Port": "80",
      "X-Forwarded-Proto": "http",
      "X-Forwarded-Scheme": "http",
      "X-Market-Code": "attacker-controlled",
      "X-Middleware-Prefetch": "1",
      "X-Original-Host": "attacker.invalid",
      "X-Original-URL": "/attacker-controlled",
      "X-Real-IP": "203.0.113.10",
      "X-Sales-Channel-Id": "sc_attacker",
      "X-Sf-Market": "attacker-controlled",
    },
  },
]

test("M00 Pages Router production status matrix", async () => {
  assertActualNextVersion()
  const pagesManifest = JSON.parse(
    readFileSync(resolve(appRoot, ".next/server/pages-manifest.json"), "utf8")
  )
  const buildId = readFileSync(
    resolve(appRoot, ".next/BUILD_ID"),
    "utf8"
  ).trim()
  assert.ok(
    pagesManifest["/~sf/[market]/__m00/[outcome]"],
    "optimized build does not contain the M00 Pages Router route"
  )

  for (const profile of requestProfiles) {
    for (const testCase of cases) {
      const pathname = `/__url-m00/${testCase.outcome}`
      const [getResponse, headResponse] = await Promise.all([
        request({
          headers: profile.headers,
          method: "GET",
          pathname,
        }),
        request({
          headers: profile.headers,
          method: "HEAD",
          pathname,
        }),
      ])

      assert.equal(
        getResponse.status,
        testCase.status,
        `${profile.label} GET ${testCase.outcome}`
      )
      assert.equal(
        headResponse.status,
        testCase.status,
        `${profile.label} HEAD ${testCase.outcome}`
      )
      assert.equal(
        headResponse.body.byteLength,
        0,
        "HEAD response must be empty"
      )
      assert.deepEqual(
        stableHeaders(headResponse),
        stableHeaders(getResponse),
        `GET/HEAD header mismatch for ${profile.label} ${testCase.outcome}`
      )
      assert.equal(getResponse.headers["x-m00-resolution-phase"], "pre-flush")
      assert.match(getResponse.headers["cache-control"] ?? "", NO_STORE)
      assert.equal(getResponse.headers["x-robots-tag"], "noindex, nofollow")
      assert.equal(getResponse.headers.location, testCase.location)
      assert.equal(getResponse.headers["retry-after"], testCase.retryAfter)

      const getLength = getResponse.headers["content-length"]
      const headLength = headResponse.headers["content-length"]
      if (getLength !== undefined && headLength !== undefined) {
        assert.equal(headLength, getLength)
      }
    }
  }

  for (const [host, market] of [
    ["herbatica.sk", "sk"],
    ["herbatica.cz", "cz"],
    ["herbatica.hu", "hu"],
    ["herbatica.ro", "ro"],
  ]) {
    const response = await request({ host, pathname: "/__url-m00/current" })
    assert.equal(response.status, 200)
    assert.ok(
      response.body.toString("utf8").includes(`data-market="${market}"`)
    )
  }

  assert.equal(
    (await request({ pathname: "/~sf/sk/__m00/current" })).status,
    404
  )
  assert.equal(
    (
      await request({
        host: "unknown.example",
        pathname: "/__url-m00/current",
      })
    ).status,
    421
  )

  for (const [method, status] of [
    ["OPTIONS", 204],
    ["POST", 405],
    ["PUT", 405],
    ["PATCH", 405],
    ["DELETE", 405],
  ]) {
    const response = await request({
      method,
      pathname: "/__url-m00/current",
    })
    assert.equal(response.status, status, `${method} method status`)
    assert.equal(response.headers.allow, "GET, HEAD", `${method} Allow`)
    assert.equal(response.headers.location, undefined, `${method} redirect`)
  }

  const dataResponse = await request({
    host: "herbatica.cz",
    pathname: `/_next/data/${buildId}/~sf/sk/__m00/current.json`,
  })
  assert.equal(dataResponse.status, 404, "internal Pages data route")

  const boundaryPrefix = "/__url-m00/current?pad="
  const boundaryTarget = `${boundaryPrefix}${"a".repeat(
    2048 - Buffer.byteLength(boundaryPrefix)
  )}`
  const tooLongTarget = `${boundaryTarget}a`
  assert.equal(Buffer.byteLength(boundaryTarget), 2048)
  assert.equal(Buffer.byteLength(tooLongTarget), 2049)
  assert.equal((await request({ pathname: boundaryTarget })).status, 200)
  assert.equal(
    (
      await request({
        pathname: "/__url-m00/current?return=%2Faccount%5Csettings",
      })
    ).status,
    200
  )

  for (const boundaryCase of [
    { host: "herbatica.sk", pathname: tooLongTarget, status: 414 },
    {
      host: "herbatica.sk",
      pathname: "/__url-m00%2Fcurrent",
      status: 400,
    },
    {
      host: "herbatica.sk",
      pathname: "/__url-m00%5ccurrent",
      status: 400,
    },
    {
      host: "herbatica.sk:bad",
      pathname: "/__url-m00/current",
      status: 400,
    },
    {
      host: "herbatica.sk:65536",
      pathname: "/__url-m00/current",
      status: 400,
    },
    {
      host: "unknown.example",
      pathname: "/__url-m00/current",
      status: 421,
    },
  ]) {
    const [getResponse, headResponse] = await Promise.all([
      request({
        host: boundaryCase.host,
        method: "GET",
        pathname: boundaryCase.pathname,
      }),
      request({
        host: boundaryCase.host,
        method: "HEAD",
        pathname: boundaryCase.pathname,
      }),
    ])
    assert.equal(getResponse.status, boundaryCase.status)
    assert.equal(headResponse.status, boundaryCase.status)
    assert.equal(headResponse.body.byteLength, 0)
    assert.equal(getResponse.headers["cache-control"], "no-store")
    assert.equal(headResponse.headers["cache-control"], "no-store")
    assert.equal(getResponse.headers["x-robots-tag"], "noindex, nofollow")
    assert.equal(headResponse.headers["x-robots-tag"], "noindex, nofollow")
    assert.equal(getResponse.headers.location, undefined)
    assert.equal(headResponse.headers.location, undefined)
  }
})
