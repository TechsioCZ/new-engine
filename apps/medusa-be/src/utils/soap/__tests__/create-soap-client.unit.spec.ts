import { MedusaError } from "@medusajs/framework/utils"
import { soap } from "strong-soap"
import { TimeoutError } from "../../http"

const mockCreateClientAsync = jest.fn()
const mockWSSecurity = jest.fn()

jest.mock("strong-soap", () => {
  class MockWSSecurityClass {
    constructor(...args: unknown[]) {
      mockWSSecurity(...args)
    }
  }

  return {
    soap: {
      createClientAsync: (...args: unknown[]) => mockCreateClientAsync(...args),
      WSSecurity: MockWSSecurityClass,
    },
  }
})

import {
  callSoapOperation,
  createSoapClient,
  extractSoapFaultMessage,
} from "../create-soap-client"

describe("create-soap-client", () => {
  beforeEach(() => {
    ;(soap as unknown as { createClientAsync?: unknown }).createClientAsync = (
      ...args: unknown[]
    ) => mockCreateClientAsync(...args)
    ;(soap as unknown as { createClient?: unknown }).createClient = undefined
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it("throws INVALID_DATA when WSDL URL is missing", async () => {
    await expect(createSoapClient({ wsdlUrl: " " })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("passes endpoint, timeout, headers and WS-Security to strong-soap client creation", async () => {
    const client = {
      setEndpoint: jest.fn(),
      addHttpHeader: jest.fn(),
      setSecurity: jest.fn(),
    }
    mockCreateClientAsync.mockResolvedValue(client)

    await createSoapClient({
      wsdlUrl: "https://soap.example/wsdl",
      endpoint: "https://soap.example/endpoint",
      wsdlTimeout: 1500,
      wsdlHeaders: { "x-request-id": "req-1" },
      wsdlOptions: { keepAlive: true },
      httpHeaders: { Authorization: "Bearer token" },
      wsSecurity: {
        username: "user",
        password: "pass",
      },
    })

    expect(mockCreateClientAsync).toHaveBeenCalledWith(
      "https://soap.example/wsdl",
      expect.objectContaining({
        endpoint: "https://soap.example/endpoint",
        wsdl_headers: { "x-request-id": "req-1" },
        wsdl_options: expect.objectContaining({
          keepAlive: true,
          timeout: 1500,
          signal: expect.any(AbortSignal),
        }),
      })
    )
    expect(client.setEndpoint).toHaveBeenCalledWith(
      "https://soap.example/endpoint"
    )
    expect(client.addHttpHeader).toHaveBeenCalledWith(
      "Authorization",
      "Bearer token"
    )
    expect(mockWSSecurity).toHaveBeenCalledWith("user", "pass", {
      passwordType: "PasswordText",
      actor: undefined,
      mustUnderstand: undefined,
    })
    expect(client.setSecurity).toHaveBeenCalledTimes(1)
  })

  it("aborts WSDL fetch and throws TimeoutError when SOAP client creation times out", async () => {
    jest.useFakeTimers()
    let capturedSignal: AbortSignal | undefined

    mockCreateClientAsync.mockImplementation(
      async (_wsdlUrl: string, options: Record<string, unknown>) => {
        capturedSignal = (
          options.wsdl_options as { signal?: AbortSignal } | undefined
        )?.signal
        return await new Promise(() => {})
      }
    )

    const pending = createSoapClient({
      wsdlUrl: "https://soap.example/wsdl",
      wsdlTimeout: 25,
    })
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError)

    await jest.advanceTimersByTimeAsync(25)

    await assertion
    expect(capturedSignal?.aborted).toBe(true)
  })

  it("aborts async SOAP operation calls on timeout", async () => {
    jest.useFakeTimers()
    let requestSignal: AbortSignal | undefined

    const client = {
      checkVatAsync: jest.fn(
        async (
          _args: unknown,
          options?: { signal?: AbortSignal }
        ): Promise<unknown> => {
          requestSignal = options?.signal
          return await new Promise(() => {})
        }
      ),
    }

    const pending = callSoapOperation(client, "checkVat", { vat: "CZ123" }, 20)
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError)
    await jest.advanceTimersByTimeAsync(20)

    await assertion
    expect(requestSignal?.aborted).toBe(true)
  })

  it("aborts callback-based SOAP operation calls on timeout", async () => {
    jest.useFakeTimers()
    let requestSignal: AbortSignal | undefined

    const client = {
      checkVat: jest.fn(
        (
          _args: unknown,
          _callback: (error: unknown, value?: unknown) => void,
          options?: { signal?: AbortSignal }
        ): void => {
          requestSignal = options?.signal
        }
      ),
    }

    const pending = callSoapOperation(client, "checkVat", { vat: "CZ123" }, 20)
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError)
    await jest.advanceTimersByTimeAsync(20)

    await assertion
    expect(requestSignal?.aborted).toBe(true)
  })

  it("normalizes socket timeout errors to TimeoutError", async () => {
    const timeoutLikeError = Object.assign(new Error("socket timeout"), {
      code: "ETIMEDOUT",
    })
    const client = {
      checkVatAsync: jest.fn().mockRejectedValue(timeoutLikeError),
    }

    await expect(
      callSoapOperation(client, "checkVat", { vat: "CZ123" }, 200)
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  it("wraps validator parse failures as Medusa UNEXPECTED_STATE errors", async () => {
    const client = {
      checkVatAsync: jest.fn().mockResolvedValue([{}]),
    }

    await expect(
      callSoapOperation(client, "checkVat", { vat: "CZ123" }, 200, {
        parse: () => {
          throw new Error("schema mismatch")
        },
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      message: expect.stringContaining("schema mismatch"),
    })
  })

  it("extracts SOAP fault messages from direct and nested fault payloads", () => {
    expect(
      extractSoapFaultMessage({
        Fault: { faultstring: "Invalid VAT" },
      })
    ).toBe("Invalid VAT")

    expect(
      extractSoapFaultMessage({
        root: {
          Envelope: {
            Body: {
              Fault: { faultcode: "Server" },
            },
          },
        },
      })
    ).toBe("Server")

    expect(extractSoapFaultMessage({})).toBeNull()
  })

  it("falls back to callback createClient when createClientAsync is unavailable", async () => {
    const client = {}
    ;(soap as unknown as { createClientAsync?: unknown }).createClientAsync =
      undefined
    ;(soap as unknown as {
      createClient?: (
        wsdl: string,
        options: unknown,
        callback: (error: unknown, value?: unknown) => void
      ) => void
    }).createClient = (_wsdl, _options, callback) => callback(null, client)

    const result = await createSoapClient({
      wsdlUrl: "https://soap.example/wsdl",
    })

    expect(result).toBe(client)
  })

  it("throws when no SOAP client factory is available", async () => {
    ;(soap as unknown as { createClientAsync?: unknown }).createClientAsync =
      undefined
    ;(soap as unknown as { createClient?: unknown }).createClient = undefined

    await expect(
      createSoapClient({
        wsdlUrl: "https://soap.example/wsdl",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("throws when async SOAP factory returns an invalid client", async () => {
    mockCreateClientAsync.mockResolvedValue("invalid-client")

    await expect(
      createSoapClient({
        wsdlUrl: "https://soap.example/wsdl",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      message: expect.stringContaining("invalid client"),
    })
  })

  it("throws when callback SOAP factory returns empty client", async () => {
    ;(soap as unknown as { createClientAsync?: unknown }).createClientAsync =
      undefined
    ;(soap as unknown as {
      createClient?: (
        wsdl: string,
        options: unknown,
        callback: (error: unknown, value?: unknown) => void
      ) => void
    }).createClient = (_wsdl, _options, callback) => callback(null, undefined)

    await expect(
      createSoapClient({
        wsdlUrl: "https://soap.example/wsdl",
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      message: expect.stringContaining("returned empty client"),
    })
  })

  it("throws when WS-Security constructor is unavailable", async () => {
    const client = {
      setSecurity: jest.fn(),
    }
    mockCreateClientAsync.mockResolvedValue(client)
    ;(soap as unknown as { WSSecurity?: unknown }).WSSecurity = undefined

    await expect(
      createSoapClient({
        wsdlUrl: "https://soap.example/wsdl",
        wsSecurity: {
          username: "user",
          password: "pass",
        },
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("supports validator function signatures in callSoapOperation", async () => {
    const client = {
      checkVatAsync: jest.fn().mockResolvedValue([{ valid: true }]),
    }

    const result = await callSoapOperation(
      client,
      "checkVat",
      { vat: "CZ123" },
      200,
      (value: unknown): value is { valid: boolean } =>
        Boolean(
          value &&
            typeof value === "object" &&
            (value as { valid?: boolean }).valid === true
        )
    )

    expect(result).toEqual({ valid: true })
  })

  it("throws when validator function returns false", async () => {
    const client = {
      checkVatAsync: jest.fn().mockResolvedValue([{}]),
    }

    await expect(
      callSoapOperation(
        client,
        "checkVat",
        { vat: "CZ123" },
        200,
        (_value: unknown): _value is { valid: boolean } => false
      )
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("throws when SOAP operation result array is empty", async () => {
    const client = {
      checkVatAsync: jest.fn().mockResolvedValue([]),
    }

    await expect(
      callSoapOperation(client, "checkVat", { vat: "CZ123" }, 200)
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("throws when requested SOAP operation is not available", async () => {
    await expect(
      callSoapOperation({}, "missingOperation", {}, 200)
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("propagates callback SOAP operation errors", async () => {
    const client = {
      checkVat: jest.fn(
        (
          _args: unknown,
          callback: (error: unknown, value?: unknown) => void
        ): void => {
          callback(new Error("callback failed"))
        }
      ),
    }

    await expect(
      callSoapOperation(client, "checkVat", { vat: "CZ123" }, 200)
    ).rejects.toThrow("callback failed")
  })

  it("supports non-positive timeout values by skipping timeout wrapper", async () => {
    const client = {
      checkVatAsync: jest.fn().mockResolvedValue([{ valid: true }]),
    }

    await expect(
      callSoapOperation(client, "checkVat", { vat: "CZ123" }, 0)
    ).resolves.toEqual({ valid: true })
  })
})
