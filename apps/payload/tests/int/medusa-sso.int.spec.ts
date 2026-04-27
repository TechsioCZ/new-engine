import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('payload', () => {
  class APIError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }

  return {
    APIError,
    headersWithCors: vi.fn(({ headers }: { headers: Headers }) => headers),
    generatePayloadCookie: vi.fn(() => 'payload-cookie'),
    jwtSign: vi.fn().mockResolvedValue({ token: 'payload-token' }),
  }
})

vi.mock('jose', () => ({
  importSPKI: vi.fn(),
  jwtVerify: vi.fn(),
}))

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  return {
    ...actual,
    randomUUID: () => 'session-id',
  }
})

import { generatePayloadCookie, headersWithCors, jwtSign } from 'payload'
import { importSPKI, jwtVerify } from 'jose'
import { medusaSsoPostEndpoint } from '@/lib/endpoints/medusa-sso'

const headersWithCorsMock = vi.mocked(headersWithCors)
const generatePayloadCookieMock = vi.mocked(generatePayloadCookie)
const jwtSignMock = vi.mocked(jwtSign)
const importSPKIMock = vi.mocked(importSPKI)
const jwtVerifyMock = vi.mocked(jwtVerify)
type JwtVerifyReturn = Awaited<ReturnType<typeof jwtVerify>>

const ORIGINAL_ENV = { ...process.env }

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'string') {
      process.env[key] = value
    }
  }
}

const createFormData = (values: Record<string, string>) => {
  const form = new FormData()
  for (const [key, value] of Object.entries(values)) {
    form.append(key, value)
  }
  return form
}

const createRequest = (overrides: Record<string, unknown> = {}) => {
  const payload = {
    secret: 'secret',
    config: {
      admin: { user: 'users' },
      cookiePrefix: 'payload',
    },
    collections: {
      users: {
        config: {
          auth: {
            useSessions: true,
            tokenExpiration: 60,
          },
        },
      },
    },
    find: vi.fn(),
    db: {
      updateOne: vi.fn(),
    },
  }

  return {
    headers: new Headers({ origin: 'https://allowed.com' }),
    payload,
    formData: vi.fn(),
    url: 'http://localhost/medusa-sso',
    ...overrides,
  } as any
}

beforeEach(() => {
  headersWithCorsMock.mockClear()
  generatePayloadCookieMock.mockClear()
  jwtSignMock.mockClear()
  importSPKIMock.mockReset()
  jwtVerifyMock.mockReset()
})

afterEach(() => {
  resetEnv()
})

describe('medusa SSO endpoint', () => {
  it('rejects requests from disallowed origins', async () => {
    process.env.PAYLOAD_SSO_ALLOWED_ORIGINS = 'https://allowed.com'
    process.env.PAYLOAD_SSO_PUBLIC_KEY = 'public-key'

    const req = createRequest({
      headers: new Headers({ origin: 'https://evil.com' }),
    })

    await expect(medusaSsoPostEndpoint.handler(req)).rejects.toMatchObject({
      message: 'Origin is not allowed.',
      status: 403,
    })
  })

  it('rejects when token is missing', async () => {
    process.env.PAYLOAD_SSO_PUBLIC_KEY = 'public-key'

    const req = createRequest()
    req.formData.mockResolvedValue(createFormData({ returnTo: '/admin' }))

    await expect(medusaSsoPostEndpoint.handler(req)).rejects.toMatchObject({
      message: 'Missing SSO token.',
      status: 400,
    })
  })

  it('creates a session and redirects on success', async () => {
    process.env.PAYLOAD_SSO_PUBLIC_KEY = 'public-key'

    importSPKIMock.mockResolvedValue({} as Awaited<ReturnType<typeof importSPKI>>)
    jwtVerifyMock.mockResolvedValue(
      {
        payload: { email: 'user@example.com' },
        protectedHeader: { alg: 'RS256' },
      } as unknown as JwtVerifyReturn
    )

    const req = createRequest()
    req.formData.mockResolvedValue(
      createFormData({ token: 'token-value', returnTo: '//example.com' })
    )
    req.payload.find.mockResolvedValue({
      docs: [{ id: 'user_1', sessions: [] }],
    })

    const response = await medusaSsoPostEndpoint.handler(req)

    expect(req.payload.db.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user_1',
        collection: 'users',
        data: expect.objectContaining({
          sessions: [
            expect.objectContaining({
              id: expect.any(String),
              createdAt: expect.any(Date),
              expiresAt: expect.any(Date),
            }),
          ],
        }),
        req,
      })
    )

    expect(jwtSignMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldsToSign: expect.objectContaining({
          collection: 'users',
          id: 'user_1',
          sid: expect.any(String),
        }),
      })
    )

    expect(generatePayloadCookieMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'payload-token',
      })
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/')
    expect(response.headers.get('Set-Cookie')).toBe('payload-cookie')
  })
})
