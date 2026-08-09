import { describe, expect, it, vi } from "vitest"
import {
  ACCESS_TOKEN_API_STORE_NAME,
  calculateNextRefreshDelayMs,
  extractZboziAccessToken,
  extractZboziRefreshToken,
  parseZboziTokenResponse,
  REFRESH_TOKEN_API_STORE_NAME,
  shouldRefreshZboziAccessToken,
} from "../zbozi-token"

describe("zbozi token helpers", () => {
  it("uses deterministic API store names", () => {
    expect(REFRESH_TOKEN_API_STORE_NAME).toBe("Zboží")
    expect(ACCESS_TOKEN_API_STORE_NAME).toBe("Zboží Access token")
  })

  it("extracts refresh token only from the refresh API store api_key", () => {
    expect(
      extractZboziRefreshToken({
        api_key: " refresh-token ",
        credentials: { refresh_token: "ignored" },
        name: REFRESH_TOKEN_API_STORE_NAME,
      })
    ).toBe("refresh-token")
  })

  it("rejects refresh token fallbacks from credentials", () => {
    expect(() =>
      extractZboziRefreshToken({
        api_key: null,
        credentials: { refresh_token: "do-not-use" },
        name: REFRESH_TOKEN_API_STORE_NAME,
      })
    ).toThrow('API store config "Zboží" must contain api_key')
  })

  it("extracts only non-expired access token from the access token API store api_key", () => {
    expect(
      extractZboziAccessToken(
        {
          access_token_expires_at: "2026-01-01T01:00:00.000Z",
          api_key: " access-token ",
          name: ACCESS_TOKEN_API_STORE_NAME,
        },
        new Date("2026-01-01T00:00:00.000Z")
      )
    ).toBe("access-token")
  })

  it("rejects missing or expired access tokens", () => {
    expect(() =>
      extractZboziAccessToken(
        {
          access_token_expires_at: "2026-01-01T00:00:00.000Z",
          api_key: "access-token",
          name: ACCESS_TOKEN_API_STORE_NAME,
        },
        new Date("2026-01-01T00:00:01.000Z")
      )
    ).toThrow("Zboží access token is missing or expired")
  })

  it("parses token response access_token and expires_in into an expiry date", () => {
    expect(
      parseZboziTokenResponse(
        { access_token: "abc", expires_in: 3600 },
        new Date("2026-01-01T00:00:00.000Z")
      )
    ).toEqual({
      accessToken: "abc",
      expiresAt: new Date("2026-01-01T01:00:00.000Z"),
    })
  })

  it("rejects token responses without valid expires_in", () => {
    expect(() =>
      parseZboziTokenResponse(
        { access_token: "abc" },
        new Date("2026-01-01T00:00:00.000Z")
      )
    ).toThrow("Zboží access token response must contain expires_in")
  })

  it("refreshes immediately when the token is inside the 2 minute window", () => {
    expect(
      shouldRefreshZboziAccessToken({
        expiresAt: new Date("2026-01-01T00:01:59.000Z"),
        now: new Date("2026-01-01T00:00:00.000Z"),
      })
    ).toBe(true)
  })

  it("schedules refresh 2 minutes before expiry", () => {
    expect(
      calculateNextRefreshDelayMs({
        expiresAt: new Date("2026-01-01T01:00:00.000Z"),
        now: new Date("2026-01-01T00:00:00.000Z"),
      })
    ).toBe(58 * 60 * 1000)
  })

  it("warns and returns immediate delay when the refresh time is already due", () => {
    const warn = vi.fn()

    expect(
      calculateNextRefreshDelayMs({
        expiresAt: new Date("2026-01-01T00:01:00.000Z"),
        now: new Date("2026-01-01T00:00:00.000Z"),
        warn,
      })
    ).toBe(0)
    expect(warn).toHaveBeenCalledWith(
      "Zboží access token refresh time is already due or in the past; scheduling immediate refresh."
    )
  })
})
