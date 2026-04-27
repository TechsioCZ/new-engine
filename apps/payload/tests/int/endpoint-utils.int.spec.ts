import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('payload', () => ({
  headersWithCors: vi.fn(({ headers }: { headers: Headers }) => headers),
}))

import { headersWithCors } from 'payload'
import { buildJsonResponse, getLocaleFromRequest, getQueryParam } from '@/lib/utils/endpoint'

const headersWithCorsMock = vi.mocked(headersWithCors)

describe('endpoint utilities', () => {
  beforeEach(() => {
    headersWithCorsMock.mockClear()
  })

  it('getQueryParam normalizes null and undefined values', () => {
    const req = { url: 'http://localhost?foo=null&bar=undefined&baz=value' } as any
    expect(getQueryParam(req, 'foo')).toBeUndefined()
    expect(getQueryParam(req, 'bar')).toBeUndefined()
    expect(getQueryParam(req, 'baz')).toBe('value')
  })

  it('getLocaleFromRequest returns valid locale or all', () => {
    const baseReq = {
      payload: {
        config: {
          localization: { localeCodes: ['en', 'cs'] },
        },
      },
    }

    const reqAll = { ...baseReq, url: 'http://localhost?locale=all' } as any
    expect(getLocaleFromRequest(reqAll)).toBe('all')

    const reqValid = { ...baseReq, url: 'http://localhost?locale=cs' } as any
    expect(getLocaleFromRequest(reqValid)).toBe('cs')

    const reqInvalid = { ...baseReq, url: 'http://localhost?locale=de' } as any
    expect(getLocaleFromRequest(reqInvalid)).toBeUndefined()
  })

  it('buildJsonResponse returns JSON with CORS headers', async () => {
    const req = { url: 'http://localhost' } as any
    const response = buildJsonResponse(req, { ok: true })

    expect(headersWithCorsMock).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
