import { request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { connect as connectNet } from "node:net"
import { connect as connectTls } from "node:tls"

const HTTP_STATUS_LINE = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\b/

const normalizedHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name.toLowerCase(),
      Array.isArray(value) ? value.join(", ") : value,
    ])
  )

export const createHttpClient = (fixture) => {
  const port = Number(
    fixture.baseUrl.port || (fixture.baseUrl.protocol === "https:" ? 443 : 80)
  )

  const request = ({ body, headers = {}, host, method = "GET", path }) =>
    new Promise((resolveRequest, rejectRequest) => {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(new Error("acceptance request timed out")),
        fixture.requestTimeoutMs
      )
      const transport =
        fixture.baseUrl.protocol === "https:" ? httpsRequest : httpRequest
      const outgoing = transport(
        {
          headers: { Host: host, ...headers },
          hostname: fixture.baseUrl.hostname,
          method,
          path,
          port,
          rejectUnauthorized: !fixture.allowSelfSignedTls,
          servername: host,
          signal: controller.signal,
        },
        (response) => {
          const chunks = []
          response.on("data", (chunk) => chunks.push(chunk))
          response.on("end", () => {
            clearTimeout(timeout)
            resolveRequest({
              body: Buffer.concat(chunks),
              headers: normalizedHeaders(response.headers),
              status: response.statusCode,
            })
          })
        }
      )
      outgoing.on("error", (error) => {
        clearTimeout(timeout)
        rejectRequest(error)
      })
      if (body !== undefined) {
        outgoing.write(body)
      }
      outgoing.end()
    })

  const rawRequest = ({ authority, host, method = "GET", requestTarget }) => {
    const requestAuthority = authority ?? host
    return new Promise((resolveRequest, rejectRequest) => {
      const chunks = []
      const socketOptions = {
        host: fixture.baseUrl.hostname,
        port,
      }
      const socket =
        fixture.baseUrl.protocol === "https:"
          ? connectTls({
              ...socketOptions,
              rejectUnauthorized: !fixture.allowSelfSignedTls,
              servername: host,
            })
          : connectNet(socketOptions)
      const timeout = setTimeout(() => {
        socket.destroy(new Error("raw acceptance request timed out"))
      }, fixture.requestTimeoutMs)

      socket.once(
        fixture.baseUrl.protocol === "https:" ? "secureConnect" : "connect",
        () => {
          socket.write(
            `${method} ${requestTarget} HTTP/1.1\r\nHost: ${requestAuthority}\r\nConnection: close\r\n\r\n`
          )
        }
      )
      socket.on("data", (chunk) => {
        chunks.push(chunk)
        if (chunks.reduce((total, part) => total + part.length, 0) > 128_000) {
          socket.destroy(new Error("raw response exceeded evidence limit"))
        }
      })
      socket.on("end", () => {
        clearTimeout(timeout)
        const response = Buffer.concat(chunks).toString("latin1")
        const match = response.match(HTTP_STATUS_LINE)
        if (!match) {
          rejectRequest(
            new Error("raw response did not contain an HTTP status")
          )
          return
        }
        resolveRequest({ response, status: Number(match[1]) })
      })
      socket.on("error", (error) => {
        clearTimeout(timeout)
        rejectRequest(error)
      })
    })
  }

  return Object.freeze({ rawRequest, request })
}
