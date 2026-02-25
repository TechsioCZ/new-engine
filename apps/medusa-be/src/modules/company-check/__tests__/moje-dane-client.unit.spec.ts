import { MedusaError } from "@medusajs/framework/utils"
import { TimeoutError } from "../../../utils/http"

const mockCreateSoapClient = jest.fn()
const mockCallSoapOperation = jest.fn()
const mockExtractSoapFaultMessage = jest.fn()

jest.mock("../../../utils/soap/create-soap-client", () => ({
  createSoapClient: (...args: unknown[]) => mockCreateSoapClient(...args),
  callSoapOperation: (...args: unknown[]) => mockCallSoapOperation(...args),
  extractSoapFaultMessage: (...args: unknown[]) =>
    mockExtractSoapFaultMessage(...args),
}))

import { MojeDaneClient } from "../clients/moje-dane-client"

describe("MojeDaneClient", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("throws when WSDL URL is missing", () => {
    expect(() => new MojeDaneClient({ wsdlUrl: " " })).toThrow(MedusaError)
  })

  it("calls SOAP operation and returns parsed status payload", async () => {
    mockCreateSoapClient.mockResolvedValue({})
    mockCallSoapOperation.mockResolvedValue({
      Envelope: {
        Body: {
          payload: {
            nespolehlivyPlatce: "NE",
            datumZverejneniNespolehlivosti: null,
            typSubjektu: "PLATCE",
          },
        },
      },
    })

    const client = new MojeDaneClient({
      wsdlUrl: "https://mojedane.invalid/wsdl",
    })

    const result = await client.getStatusNespolehlivySubjektRozsirenyV2(
      "12345678"
    )

    expect(result).toEqual({
      nespolehlivyPlatce: "NE",
      datumZverejneniNespolehlivosti: null,
      typSubjektu: "PLATCE",
    })
    expect(mockCreateSoapClient).toHaveBeenCalledTimes(1)
    expect(mockCallSoapOperation).toHaveBeenCalledWith(
      expect.any(Object),
      "getStatusNespolehlivySubjektRozsirenyV2",
      {
        StatusNespolehlivySubjektRozsirenyV2Request: {
          dic: ["12345678"],
        },
      },
      12_000
    )
  })

  it("reuses SOAP client across calls after successful initialization", async () => {
    mockCreateSoapClient.mockResolvedValue({})
    mockCallSoapOperation.mockResolvedValue({
      nespolehlivyPlatce: "ANO",
    })

    const client = new MojeDaneClient({
      wsdlUrl: "https://mojedane.invalid/wsdl",
    })

    await client.getStatusNespolehlivySubjektRozsirenyV2("1")
    await client.getStatusNespolehlivySubjektRozsirenyV2("2")

    expect(mockCreateSoapClient).toHaveBeenCalledTimes(1)
    expect(mockCallSoapOperation).toHaveBeenCalledTimes(2)
  })

  it("resets cached SOAP client when client creation fails", async () => {
    mockCreateSoapClient
      .mockRejectedValueOnce(new Error("bootstrap failed"))
      .mockResolvedValueOnce({})
    mockCallSoapOperation.mockResolvedValue({
      nespolehlivyPlatce: "NENALEZEN",
    })

    const client = new MojeDaneClient({
      wsdlUrl: "https://mojedane.invalid/wsdl",
    })

    await expect(
      client.getStatusNespolehlivySubjektRozsirenyV2("123")
    ).rejects.toBeInstanceOf(Error)

    const second = await client.getStatusNespolehlivySubjektRozsirenyV2("123")

    expect(second.nespolehlivyPlatce).toBe("NENALEZEN")
    expect(mockCreateSoapClient).toHaveBeenCalledTimes(2)
  })

  it("propagates TimeoutError without remapping", async () => {
    mockCreateSoapClient.mockResolvedValue({})
    mockCallSoapOperation.mockRejectedValue(
      new TimeoutError("SOAP timed out after 12000ms")
    )

    const client = new MojeDaneClient({
      wsdlUrl: "https://mojedane.invalid/wsdl",
    })

    await expect(
      client.getStatusNespolehlivySubjektRozsirenyV2("12345678")
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  it("maps SOAP faults to UNEXPECTED_STATE MedusaError", async () => {
    mockCreateSoapClient.mockResolvedValue({})
    mockCallSoapOperation.mockRejectedValue(new Error("soap error"))
    mockExtractSoapFaultMessage.mockReturnValue("fault-string")

    const client = new MojeDaneClient({
      wsdlUrl: "https://mojedane.invalid/wsdl",
    })

    await expect(
      client.getStatusNespolehlivySubjektRozsirenyV2("12345678")
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      message: expect.stringContaining("Moje Dane SOAP fault: fault-string"),
    })
  })

  it("throws UNEXPECTED_STATE when response payload is missing", async () => {
    mockCreateSoapClient.mockResolvedValue({})
    mockCallSoapOperation.mockResolvedValue({
      Envelope: {
        Body: {},
      },
    })

    const client = new MojeDaneClient({
      wsdlUrl: "https://mojedane.invalid/wsdl",
    })

    await expect(
      client.getStatusNespolehlivySubjektRozsirenyV2("12345678")
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("throws UNEXPECTED_STATE when response payload fails schema validation", async () => {
    mockCreateSoapClient.mockResolvedValue({})
    mockCallSoapOperation.mockResolvedValue({
      Envelope: {
        Body: {
          payload: {
            nespolehlivyPlatce: "INVALID",
            datumZverejneniNespolehlivosti: null,
            typSubjektu: "PLATCE",
          },
        },
      },
    })

    const client = new MojeDaneClient({
      wsdlUrl: "https://mojedane.invalid/wsdl",
    })

    await expect(
      client.getStatusNespolehlivySubjektRozsirenyV2("12345678")
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      message: expect.stringContaining("Moje Dane response validation failed"),
    })
  })
})
