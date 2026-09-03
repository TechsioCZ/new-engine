import assert from "node:assert/strict"
import { once } from "node:events"
import { readFile } from "node:fs/promises"
import { connect as connectHttp2 } from "node:http2"
import { request as httpsRequest } from "node:https"
import { test } from "node:test"
import { setTimeout as delay } from "node:timers/promises"
import { connect as connectTls } from "node:tls"

const INGRESS_HOST = process.env.M00_INGRESS_HOST ?? "caddy"
const CADDY_CA_PATH =
  process.env.M00_CADDY_CA_PATH ?? "/data/caddy/pki/authorities/local/root.crt"

const parsePositiveInteger = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback)
  if (!(Number.isInteger(value) && value > 0)) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

const REQUEST_TIMEOUT_MS = parsePositiveInteger(
  "M00_REQUEST_TIMEOUT_MS",
  10_000
)
const READINESS_TIMEOUT_MS = parsePositiveInteger(
  "M00_READINESS_TIMEOUT_MS",
  90_000
)

const parseIngressPort = () => {
  const value = Number(process.env.M00_INGRESS_PORT ?? "443")
  if (!(Number.isInteger(value) && value >= 1 && value <= 65_535)) {
    throw new Error("M00_INGRESS_PORT must be an integer from 1 through 65535")
  }
  return value
}

const INGRESS_PORT = parseIngressPort()

const MARKETS = [
  { canonicalHost: "herbatica.sk", host: "herbatica.sk", market: "sk" },
  { canonicalHost: "herbatica.sk", host: "www.herbatica.sk", market: "sk" },
  {
    canonicalHost: "herbatica.sk",
    host: "test-engine-herbatika-sk-zane.web-revolution.cz",
    market: "sk",
  },
  {
    canonicalHost: "herbatica.sk",
    host: "test-engine-herbatika-zane.web-revolution.cz",
    market: "sk",
  },
  { canonicalHost: "herbatica.cz", host: "herbatica.cz", market: "cz" },
  { canonicalHost: "herbatica.cz", host: "www.herbatica.cz", market: "cz" },
  {
    canonicalHost: "herbatica.cz",
    host: "test-engine-herbatika-cz-zane.web-revolution.cz",
    market: "cz",
  },
  { canonicalHost: "herbatica.hu", host: "herbatica.hu", market: "hu" },
  { canonicalHost: "herbatica.hu", host: "www.herbatica.hu", market: "hu" },
  {
    canonicalHost: "herbatica.hu",
    host: "test-engine-herbatika-hu-zane.web-revolution.cz",
    market: "hu",
  },
  { canonicalHost: "herbatica.ro", host: "herbatica.ro", market: "ro" },
  { canonicalHost: "herbatica.ro", host: "www.herbatica.ro", market: "ro" },
  {
    canonicalHost: "herbatica.ro",
    host: "test-engine-herbatika-ro-zane.web-revolution.cz",
    market: "ro",
  },
]

const OUTCOMES = [
  { name: "current", status: 200 },
  { name: "alias", status: 308 },
  { name: "missing", status: 404 },
  { name: "gone", status: 410 },
  { name: "unavailable", retryAfter: "30", status: 503 },
]

const PROFILES = [
  { headers: {}, name: "ordinary" },
  {
    headers: {
      rsc: "1",
      "next-router-prefetch": "1",
      "next-router-segment-prefetch": "/_tree",
      "next-router-state-tree": "%5B%22%22%5D",
      "next-url": "/attacker-controlled",
      purpose: "prefetch",
      forwarded: "for=203.0.113.10;host=attacker.invalid;proto=http",
      "sec-purpose": "prefetch",
      "x-canonical-origin": "https://attacker.invalid",
      "x-forwarded-for": "203.0.113.10",
      "x-forwarded-host": "attacker.invalid",
      "x-forwarded-port": "80",
      "x-forwarded-proto": "http",
      "x-forwarded-scheme": "http",
      "x-market-code": "xx",
      "x-middleware-prefetch": "1",
      "x-nextjs-data": "1",
      "x-original-host": "attacker.invalid",
      "x-original-url": "/attacker-controlled",
      "x-real-ip": "203.0.113.10",
      "x-sales-channel-id": "sc_attacker",
      "x-sf-market": "xx",
    },
    name: "adversarial-rsc",
  },
]

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"]
const HTTP1_STATUS_LINE_PATTERN = /^HTTP\/1\.[01] (\d{3})(?: |$)/
const NEXT_DATA_SCRIPT_PATTERN =
  /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i

const normalizeHeaders = (headers) => {
  const normalized = {}
  for (const [name, value] of Object.entries(headers)) {
    if (!name.startsWith(":")) {
      if (Array.isArray(value)) {
        normalized[name.toLowerCase()] = value.join(", ")
      } else {
        normalized[name.toLowerCase()] =
          value === undefined ? undefined : String(value)
      }
    }
  }
  return normalized
}

const semanticHeaders = ({ headers }) => ({
  "cache-control": headers["cache-control"],
  location: headers.location,
  "retry-after": headers["retry-after"],
  "x-m00-resolution-phase": headers["x-m00-resolution-phase"],
  "x-robots-tag": headers["x-robots-tag"],
})

const assertTlsSocket = (socket, expectedProtocol, servername) => {
  if (!socket.authorized) {
    throw new Error(
      `TLS authorization failed for ${servername}: ${socket.authorizationError ?? "unknown error"}`
    )
  }
  if (socket.alpnProtocol !== expectedProtocol) {
    throw new Error(
      `Expected ALPN ${expectedProtocol} for ${servername}, received ${socket.alpnProtocol}`
    )
  }
  if (socket.servername !== servername) {
    throw new Error(
      `Expected TLS SNI ${servername}, received ${socket.servername ?? "none"}`
    )
  }
}

const extractBuildId = (response) => {
  const html = response.body.toString("utf8")
  const nextDataMatch = html.match(NEXT_DATA_SCRIPT_PATTERN)

  if (!nextDataMatch) {
    throw new Error("current HTML must contain __NEXT_DATA__")
  }
  const nextData = JSON.parse(nextDataMatch[1])
  if (typeof nextData?.buildId !== "string" || nextData.buildId.length === 0) {
    throw new Error("__NEXT_DATA__ must contain a non-empty buildId")
  }
  return nextData.buildId
}

const requestHttp1 = ({ ca, headers, host, method, pathname }) =>
  new Promise((resolveRequest, rejectRequest) => {
    let responseHeadReceived = false
    let settled = false
    const chunks = []
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort(
        new Error(`HTTP/1.1 ${method} ${host}${pathname} timed out`)
      )
    }, REQUEST_TIMEOUT_MS)

    const settle = (callback, value) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      callback(value)
    }

    const outgoing = httpsRequest(
      {
        ALPNProtocols: ["http/1.1"],
        ca,
        headers: {
          Host: host,
          ...headers,
        },
        hostname: INGRESS_HOST,
        method,
        path: pathname,
        port: INGRESS_PORT,
        rejectUnauthorized: true,
        servername: host,
        signal: controller.signal,
      },
      (response) => {
        try {
          assertTlsSocket(response.socket, "http/1.1", host)
          responseHeadReceived = true
        } catch (error) {
          response.destroy(error)
          settle(rejectRequest, error)
          return
        }

        response.on("data", (chunk) => {
          if (!responseHeadReceived) {
            settle(
              rejectRequest,
              new Error("HTTP/1.1 body arrived before response headers")
            )
            response.destroy()
            return
          }
          chunks.push(chunk)
        })
        response.on("end", () => {
          settle(resolveRequest, {
            body: Buffer.concat(chunks),
            headers: normalizeHeaders(response.headers),
            protocol: "http/1.1",
            responseHeadReceived,
            status: response.statusCode,
          })
        })
        response.on("error", (error) => settle(rejectRequest, error))
      }
    )

    outgoing.on("error", (error) => settle(rejectRequest, error))
    outgoing.end()
  })

const parseRawHttp1Response = (buffer) => {
  const headEnd = buffer.indexOf("\r\n\r\n")
  if (headEnd === -1) {
    throw new Error("raw HTTP/1.1 response must contain headers")
  }

  const head = buffer.subarray(0, headEnd).toString("latin1")
  const [statusLine, ...headerLines] = head.split("\r\n")
  const statusMatch = statusLine.match(HTTP1_STATUS_LINE_PATTERN)
  if (!statusMatch) {
    throw new Error(`invalid HTTP/1.1 status line: ${statusLine}`)
  }

  const headers = {}
  for (const line of headerLines) {
    const separator = line.indexOf(":")
    if (separator === -1) {
      throw new Error(`invalid HTTP/1.1 header line: ${line}`)
    }
    const name = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    headers[name] = headers[name] ? `${headers[name]}, ${value}` : value
  }

  return {
    body: buffer.subarray(headEnd + 4),
    headers,
    protocol: "http/1.1",
    responseHeadReceived: true,
    status: Number(statusMatch[1]),
  }
}

const requestRawHttp1 = ({ ca, rawRequest, servername = MARKETS[0].host }) =>
  new Promise((resolveRequest, rejectRequest) => {
    let settled = false
    const chunks = []
    const socket = connectTls({
      ALPNProtocols: ["http/1.1"],
      ca,
      host: INGRESS_HOST,
      port: INGRESS_PORT,
      rejectUnauthorized: true,
      servername,
    })
    const timeout = setTimeout(() => {
      socket.destroy(
        new Error(`raw HTTP/1.1 request timed out for ${servername}`)
      )
    }, REQUEST_TIMEOUT_MS)

    const settle = (callback, value) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      callback(value)
    }

    socket.once("secureConnect", () => {
      try {
        assertTlsSocket(socket, "http/1.1", servername)
        socket.end(rawRequest)
      } catch (error) {
        socket.destroy()
        settle(rejectRequest, error)
      }
    })
    socket.on("data", (chunk) => chunks.push(chunk))
    socket.once("end", () => {
      try {
        settle(resolveRequest, parseRawHttp1Response(Buffer.concat(chunks)))
      } catch (error) {
        settle(rejectRequest, error)
      }
    })
    socket.once("error", (error) => settle(rejectRequest, error))
  })

const rawHttp1RequestBytes = ({ authority, method, target }) =>
  Buffer.concat([
    Buffer.from(`${method} `, "latin1"),
    Buffer.isBuffer(target) ? target : Buffer.from(target, "latin1"),
    Buffer.from(
      ` HTTP/1.1\r\nHost: ${authority}\r\nConnection: close\r\n\r\n`,
      "latin1"
    ),
  ])

const requestHttp2 = async ({ ca, headers, host, method, pathname }) => {
  const session = connectHttp2(`https://${INGRESS_HOST}:${INGRESS_PORT}`, {
    ALPNProtocols: ["h2"],
    ca,
    rejectUnauthorized: true,
    servername: host,
  })
  const connectionController = new AbortController()
  const connectionTimeout = setTimeout(() => {
    connectionController.abort(
      new Error(`HTTP/2 TLS connection for ${host} timed out`)
    )
  }, REQUEST_TIMEOUT_MS)

  try {
    await once(session, "connect", { signal: connectionController.signal })
    clearTimeout(connectionTimeout)
    assertTlsSocket(session.socket, "h2", host)

    return await new Promise((resolveRequest, rejectRequest) => {
      let responseHeadReceived = false
      let settled = false
      let responseHeaders = {}
      let responseStatus
      const chunks = []
      const timeout = setTimeout(() => {
        stream.close()
        settle(
          rejectRequest,
          new Error(`HTTP/2 ${method} ${host}${pathname} timed out`)
        )
      }, REQUEST_TIMEOUT_MS)

      const settle = (callback, value) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timeout)
        callback(value)
      }

      const stream = session.request({
        ":authority": host,
        ":method": method,
        ":path": pathname,
        ":scheme": "https",
        ...headers,
      })

      stream.on("response", (incomingHeaders) => {
        responseHeadReceived = true
        responseHeaders = normalizeHeaders(incomingHeaders)
        responseStatus = Number(incomingHeaders[":status"])
      })
      stream.on("data", (chunk) => {
        if (!responseHeadReceived) {
          settle(
            rejectRequest,
            new Error("HTTP/2 body arrived before response headers")
          )
          stream.close()
          return
        }
        chunks.push(chunk)
      })
      stream.on("end", () => {
        settle(resolveRequest, {
          body: Buffer.concat(chunks),
          headers: responseHeaders,
          protocol: "h2",
          responseHeadReceived,
          status: responseStatus,
        })
      })
      stream.on("error", (error) => settle(rejectRequest, error))
      stream.end()
    })
  } finally {
    clearTimeout(connectionTimeout)
    session.close()
  }
}

const waitForIngress = async () => {
  const deadline = Date.now() + READINESS_TIMEOUT_MS
  let lastError

  while (Date.now() < deadline) {
    try {
      const ca = await readFile(CADDY_CA_PATH)
      const response = await requestHttp1({
        ca,
        headers: {},
        host: MARKETS[0].host,
        method: "GET",
        pathname: "/__url-m00/current",
      })
      if (response.status === 200) {
        return ca
      }
      lastError = new Error(
        `readiness request returned unexpected status ${response.status}`
      )
    } catch (error) {
      lastError = error
    }

    await delay(250)
  }

  throw new Error(
    `M00 ingress did not become ready within ${READINESS_TIMEOUT_MS} ms`,
    { cause: lastError }
  )
}

// biome-ignore lint/style/noDoneCallback: node:test passes a TestContext used for named subtests, not a completion callback.
test("M00 production standalone keeps hard statuses through Caddy TLS", async (t) => {
  const ca = await waitForIngress()
  assert.equal(MARKETS.length, 13)
  const protocols = [
    { name: "http/1.1", request: requestHttp1 },
    { name: "h2", request: requestHttp2 },
  ]
  const assertResponsePair = ({
    canonicalHost,
    getResponse,
    headResponse,
    market,
    outcome,
  }) => {
    assert.equal(getResponse.status, outcome.status)
    assert.equal(headResponse.status, outcome.status)
    assert.equal(getResponse.responseHeadReceived, true)
    assert.equal(headResponse.responseHeadReceived, true)
    assert.equal(headResponse.body.byteLength, 0, "HEAD body must be empty")
    assert.deepEqual(
      semanticHeaders(headResponse),
      semanticHeaders(getResponse)
    )

    assert.ok((getResponse.headers["cache-control"] ?? "").includes("no-store"))
    assert.equal(getResponse.headers["x-m00-resolution-phase"], "pre-flush")
    assert.equal(getResponse.headers["x-robots-tag"], "noindex, nofollow")
    assert.equal(
      getResponse.headers.location,
      outcome.name === "alias"
        ? `https://${canonicalHost}/__url-m00/current`
        : undefined
    )
    assert.equal(getResponse.headers["retry-after"], outcome.retryAfter)

    if (outcome.name === "current") {
      assert.ok(
        getResponse.body.toString("utf8").includes(`data-market="${market}"`)
      )
    }

    const getLength = getResponse.headers["content-length"]
    const headLength = headResponse.headers["content-length"]
    if (getLength !== undefined && headLength !== undefined) {
      assert.equal(headLength, getLength)
    }
  }

  const assertBoundaryPair = ({ getResponse, headResponse, status }) => {
    assert.equal(getResponse.status, status)
    assert.equal(headResponse.status, status)
    assert.equal(headResponse.body.byteLength, 0, "HEAD body must be empty")
    assert.equal(getResponse.headers["cache-control"], "no-store")
    assert.equal(headResponse.headers["cache-control"], "no-store")
    assert.equal(getResponse.headers["x-robots-tag"], "noindex, nofollow")
    assert.equal(headResponse.headers["x-robots-tag"], "noindex, nofollow")
    assert.equal(getResponse.headers.location, undefined)
    assert.equal(headResponse.headers.location, undefined)
  }

  await t.test("HTTP/1.1 validates the raw request boundary", async (raw) => {
    const host = MARKETS[0].host
    const boundaryPrefix = "/__url-m00/current?pad="
    const boundaryTarget = `${boundaryPrefix}${"a".repeat(
      2048 - Buffer.byteLength(boundaryPrefix)
    )}`
    const tooLongTarget = `${boundaryTarget}a`
    assert.equal(Buffer.byteLength(boundaryTarget), 2048)
    assert.equal(Buffer.byteLength(tooLongTarget), 2049)

    const allowedBoundary = await requestHttp1({
      ca,
      headers: {},
      host,
      method: "GET",
      pathname: boundaryTarget,
    })
    assert.equal(allowedBoundary.status, 200)

    const encodedQuery = await requestHttp1({
      ca,
      headers: {},
      host,
      method: "GET",
      pathname: "/__url-m00/current?return=%2Faccount%5Csettings",
    })
    assert.equal(encodedQuery.status, 200)

    const handlerCases = [
      {
        authority: host,
        name: "overlong request-target",
        status: 414,
        target: tooLongTarget,
      },
      {
        authority: host,
        name: "encoded slash",
        status: 400,
        target: "/__url-m00%2Fcurrent",
      },
      {
        authority: host,
        name: "encoded backslash",
        status: 400,
        target: "/__url-m00%5ccurrent",
      },
      {
        authority: `${host}:bad`,
        name: "malformed authority",
        status: 400,
        target: "/__url-m00/current",
      },
      {
        authority: `${host}:65536`,
        name: "out-of-range authority port",
        status: 400,
        target: "/__url-m00/current",
      },
      {
        authority: "unknown.example",
        name: "unknown authority",
        status: 421,
        target: "/__url-m00/current",
      },
      {
        authority: host,
        name: "invalid UTF-8",
        status: 400,
        target: Buffer.concat([
          Buffer.from("/__url-m00/", "latin1"),
          Buffer.from([0xc3, 0x28]),
          Buffer.from("current", "latin1"),
        ]),
      },
    ]

    for (const boundaryCase of handlerCases) {
      await raw.test(boundaryCase.name, async () => {
        const [getResponse, headResponse] = await Promise.all(
          ["GET", "HEAD"].map((method) =>
            requestRawHttp1({
              ca,
              rawRequest: rawHttp1RequestBytes({
                authority: boundaryCase.authority,
                method,
                target: boundaryCase.target,
              }),
            })
          )
        )
        assertBoundaryPair({
          getResponse,
          headResponse,
          status: boundaryCase.status,
        })
      })
    }

    // Go's HTTP parser rejects these before Caddy handlers. Its native malformed
    // HEAD response may include an error body, so only status parity is configurable.
    const parserCases = [
      {
        name: "malformed percent escape",
        target: "/__url-m00/%",
      },
      {
        name: "raw control character",
        target: Buffer.concat([
          Buffer.from("/__url-m00/", "latin1"),
          Buffer.from([0x01]),
          Buffer.from("current", "latin1"),
        ]),
      },
    ]

    for (const parserCase of parserCases) {
      await raw.test(parserCase.name, async () => {
        for (const method of ["GET", "HEAD"]) {
          const response = await requestRawHttp1({
            ca,
            rawRequest: rawHttp1RequestBytes({
              authority: host,
              method,
              target: parserCase.target,
            }),
          })
          assert.equal(response.status, 400)
          assert.equal(response.headers.location, undefined)
        }
      })
    }
  })

  await t.test(
    "HTTP/1.1 does not let x-forwarded-host rescue an unknown Host",
    async () => {
      const host = MARKETS[0].host
      const [getResponse, headResponse] = await Promise.all(
        ["GET", "HEAD"].map((method) =>
          requestHttp1({
            ca,
            headers: {
              Host: "unknown.example",
              "x-forwarded-host": host,
            },
            host,
            method,
            pathname: "/__url-m00/current",
          })
        )
      )
      assertBoundaryPair({ getResponse, headResponse, status: 421 })
    }
  )

  await t.test("HTTP/2 preserves ingress status parity", async (http2) => {
    const host = MARKETS[0].host
    const boundaryPrefix = "/__url-m00/current?pad="
    const tooLongTarget = `${boundaryPrefix}${"a".repeat(
      2049 - Buffer.byteLength(boundaryPrefix)
    )}`
    const cases = [
      {
        headers: {},
        name: "overlong request-target",
        pathname: tooLongTarget,
        status: 414,
      },
      {
        headers: {},
        name: "encoded separator",
        pathname: "/__url-m00%2Fcurrent",
        status: 400,
      },
      {
        headers: { ":authority": "herbatica.sk:bad" },
        name: "malformed authority",
        pathname: "/__url-m00/current",
        status: 400,
      },
      {
        headers: { ":authority": "herbatica.sk:65536" },
        name: "out-of-range authority port",
        pathname: "/__url-m00/current",
        status: 400,
      },
      {
        headers: { ":authority": "unknown.example" },
        name: "unknown authority",
        pathname: "/__url-m00/current",
        status: 421,
      },
    ]

    for (const boundaryCase of cases) {
      await http2.test(boundaryCase.name, async () => {
        const [getResponse, headResponse] = await Promise.all(
          ["GET", "HEAD"].map((method) =>
            requestHttp2({
              ca,
              headers: boundaryCase.headers,
              host,
              method,
              pathname: boundaryCase.pathname,
            })
          )
        )
        assertBoundaryPair({
          getResponse,
          headResponse,
          status: boundaryCase.status,
        })
      })
    }
  })

  await t.test(
    "HTTP/2 does not let x-forwarded-host rescue an unknown authority",
    async () => {
      const host = MARKETS[0].host
      const [getResponse, headResponse] = await Promise.all(
        ["GET", "HEAD"].map((method) =>
          requestHttp2({
            ca,
            headers: {
              ":authority": "unknown.example",
              "x-forwarded-host": host,
            },
            host,
            method,
            pathname: "/__url-m00/current",
          })
        )
      )
      assertBoundaryPair({ getResponse, headResponse, status: 421 })
    }
  )

  for (const protocol of protocols) {
    for (const profile of PROFILES) {
      for (const { canonicalHost, host, market } of MARKETS) {
        for (const outcome of OUTCOMES) {
          await t.test(
            `${protocol.name} ${profile.name} ${host} ${outcome.name}`,
            async () => {
              const pathname = `/__url-m00/${outcome.name}`
              const [getResponse, headResponse] = await Promise.all([
                protocol.request({
                  ca,
                  headers: profile.headers,
                  host,
                  method: "GET",
                  pathname,
                }),
                protocol.request({
                  ca,
                  headers: profile.headers,
                  host,
                  method: "HEAD",
                  pathname,
                }),
              ])

              assertResponsePair({
                canonicalHost,
                getResponse,
                headResponse,
                market,
                outcome,
              })
            }
          )
        }
      }
    }

    for (const { host } of MARKETS) {
      await t.test(`${protocol.name} method contract ${host}`, async () => {
        const pathname = "/__url-m00/alias"
        const responses = await Promise.all([
          protocol.request({
            ca,
            headers: PROFILES[1].headers,
            host,
            method: "OPTIONS",
            pathname,
          }),
          ...MUTATING_METHODS.map((method) =>
            protocol.request({
              ca,
              headers: PROFILES[1].headers,
              host,
              method,
              pathname,
            })
          ),
        ])

        const [optionsResponse, ...mutatingResponses] = responses
        assert.equal(optionsResponse.status, 204)
        assert.equal(optionsResponse.headers.allow, "GET, HEAD")
        assert.equal(optionsResponse.headers.location, undefined)

        for (const response of mutatingResponses) {
          assert.equal(response.status, 405)
          assert.equal(response.headers.allow, "GET, HEAD")
          assert.equal(response.headers.location, undefined)
        }
      })
    }

    await t.test(
      `${protocol.name} rejects cross-market Next data route`,
      async () => {
        const currentResponse = await protocol.request({
          ca,
          headers: {},
          host: "herbatica.sk",
          method: "GET",
          pathname: "/__url-m00/current",
        })
        assert.equal(currentResponse.status, 200)
        assert.ok(
          currentResponse.body.toString("utf8").includes('data-market="sk"')
        )

        const buildId = extractBuildId(currentResponse)
        const dataResponse = await protocol.request({
          ca,
          headers: {},
          host: "herbatica.cz",
          method: "GET",
          pathname: `/_next/data/${encodeURIComponent(buildId)}/~sf/sk/__m00/current.json`,
        })

        assert.equal(dataResponse.status, 404)
        assert.equal(dataResponse.headers.location, undefined)
      }
    )
  }
})
