import assert from "node:assert/strict"
import { once } from "node:events"
import { readFile } from "node:fs/promises"
import { connect as connectHttp2 } from "node:http2"
import { request as httpsRequest } from "node:https"
import { test } from "node:test"
import { setTimeout as delay } from "node:timers/promises"

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
  { host: "herbatica.sk", market: "sk" },
  { host: "herbatica.cz", market: "cz" },
  { host: "herbatica.hu", market: "hu" },
  { host: "herbatica.ro", market: "ro" },
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
      "x-canonical-origin": "https://attacker.invalid",
      "x-market-code": "xx",
      "x-nextjs-data": "1",
      "x-sales-channel-id": "sc_attacker",
      "x-sf-market": "xx",
    },
    name: "adversarial-rsc",
  },
]

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"]
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
  const protocols = [
    { name: "http/1.1", request: requestHttp1 },
    { name: "h2", request: requestHttp2 },
  ]
  const assertResponsePair = ({
    getResponse,
    headResponse,
    host,
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
      outcome.name === "alias" ? `https://${host}/__url-m00/current` : undefined
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

  for (const protocol of protocols) {
    for (const profile of PROFILES) {
      for (const { host, market } of MARKETS) {
        for (const outcome of OUTCOMES) {
          await t.test(
            `${protocol.name} ${profile.name} ${market} ${outcome.name}`,
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
                getResponse,
                headResponse,
                host,
                market,
                outcome,
              })
            }
          )
        }
      }
    }

    for (const { host, market } of MARKETS) {
      await t.test(`${protocol.name} method contract ${market}`, async () => {
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
