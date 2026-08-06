import { createHash } from "node:crypto"
import { setTimeout as sleep } from "node:timers/promises"
import { promisify } from "node:util"
import { gunzip } from "node:zlib"

import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import type {
  GLSBranch,
  GLSCountryCode,
  GLSCreatePacketResult,
  GLSOptions,
  GLSPacketAttributes,
  GLSPacketStatusRecord,
} from "./types"
import { mapGLSStatusCode } from "./utils"

const COUNTRY_DOMAINS: Record<GLSCountryCode, string> = {
  CZ: "cz",
  HR: "hr",
  HU: "hu",
  RO: "ro",
  RS: "rs",
  SI: "si",
  SK: "sk",
}
const DOT_NET_DATE_REGEX = /\/Date\((?<timestamp>\d+)(?:[+-]\d+)?\)\//u
const GLS_PARCEL_NUMBER_LENGTH = 10
const GLS_PARCEL_NUMBER_WITH_CHECK_DIGIT_LENGTH = 11
const MAX_DELIVERY_POINTS_PAYLOAD_BYTES = 20 * 1024 * 1024
const MISSING_PARCEL_IDENTIFIERS_ERROR =
  "GLS PrintLabels returned no ParcelId/ParcelNumber"
const UNKNOWN_ERROR = "Unknown error"
const gunzipAsync = promisify(gunzip)

const jsonValueSchema = z.unknown()

const myGLSErrorInfoSchema = z.object({
  ClientReferenceList: z.string().array().optional(),
  ErrorCode: z.number().optional(),
  ErrorDescription: z.string().optional(),
  ParcelIdList: z.number().array().optional(),
})
type MyGLSErrorInfo = z.infer<typeof myGLSErrorInfoSchema>

const printLabelsInfoSchema = z.object({
  ClientReference: z.string().optional(),
  ParcelId: z.number().optional(),
  ParcelNumber: z.union([z.number(), z.string()]).optional(),
  ParcelNumberWithCheckdigit: z.union([z.number(), z.string()]).optional(),
})
const printLabelsResponseSchema = z.object({
  Labels: z.number().array().optional(),
  PrintLabelsErrorList: myGLSErrorInfoSchema.array().optional(),
  PrintLabelsInfoList: printLabelsInfoSchema.array().optional(),
})
const getPrintDataResponseSchema = z.object({
  GetPrintDataErrorList: myGLSErrorInfoSchema.array().optional(),
  Labels: z.number().array().optional(),
  PdfDocument: z.number().array().optional(),
  Pdfdocument: z.number().array().optional(),
  PrintDataInfoList: printLabelsInfoSchema.array().optional(),
})
const deleteLabelsResponseSchema = z.object({
  DeleteLabelsErrorList: myGLSErrorInfoSchema.array().optional(),
  SuccessfullyDeletedList: z
    .object({
      ParcelId: z.number().optional(),
      SubParcelIdList: z.number().array().optional(),
    })
    .array()
    .optional(),
})
const parcelStatusSchema = z.object({
  DepotCity: z.string().optional(),
  DepotNumber: z.string().optional(),
  StatusCode: z.union([z.string(), z.number()]).optional(),
  StatusDate: z.string().optional(),
  StatusDescription: z.string().optional(),
  StatusInfo: z.string().optional(),
})
const getParcelStatusResponseSchema = z.object({
  ClientReference: z.string().optional(),
  DeliveryCountryCode: z.string().optional(),
  DeliveryZipCode: z.string().optional(),
  GetParcelStatusErrors: myGLSErrorInfoSchema.array().optional(),
  POD: z.number().array().optional(),
  ParcelNumber: z.union([z.number(), z.string()]).optional(),
  ParcelStatusList: parcelStatusSchema.array().optional(),
  Weight: z.number().optional(),
})
const deliveryPointSchema = z.object({
  Address: z
    .object({
      City: z.string().optional(),
      ContactEmail: z.string().optional(),
      ContactName: z.string().optional(),
      ContactPhone: z.string().optional(),
      CountryIsoCode: z.string().optional(),
      HouseNumber: z.string().optional(),
      HouseNumberInfo: z.string().optional(),
      Name: z.string().optional(),
      Street: z.string().optional(),
      ZipCode: z.string().optional(),
    })
    .optional(),
  DeliveryPointType: z.number().optional(),
  Id: z.union([z.number(), z.string()]).optional(),
  IsActive: z.boolean().optional(),
  Latitude: z.union([z.number(), z.string()]).optional(),
  LegacyId: z.string().optional(),
  Longitude: z.union([z.number(), z.string()]).optional(),
  Matchcode: z.string().optional(),
  PickupTime: z.string().optional(),
})
type DeliveryPoint = z.infer<typeof deliveryPointSchema>

const getDeliveryPointsResponseSchema = z.object({
  Data: z.number().array().optional(),
  ErrorCode: z.number().optional(),
  ErrorDescription: z.string().optional(),
  IsChanged: z.boolean().optional(),
  LastUpdateTime: z.string().optional(),
})
const deliveryPointsPayloadSchema = z.union([
  deliveryPointSchema.array(),
  z.object({ Data: deliveryPointSchema.array() }).transform(({ Data }) => Data),
])

type MyGLSServiceName = "ParcelService" | "MasterDataService"

interface RequestOptions {
  retryable?: boolean
}

type RetryAttemptResult<T> =
  | { retry: true; error: Error }
  | { retry: false; value: T }

/**
 * MyGLS JSON API client.
 *
 * The MyGLS API authenticates every request using a username and SHA512-hashed
 * password byte array in the JSON body. Labels are created through
 * ParcelService.PrintLabels and existing labels are retrieved through
 * ParcelService.GetPrintData.
 */
export class GLSClient {
  private readonly MAX_RETRIES = 3
  private readonly INITIAL_RETRY_DELAY_MS = 200
  private readonly REQUEST_TIMEOUT_MS = 30_000

  private readonly options: GLSOptions
  private readonly passwordBytes: number[]

  constructor(options: GLSOptions) {
    this.options = options
    this.passwordBytes = [
      ...createHash("sha512").update(options.password, "utf-8").digest(),
    ]
  }

  async createPacket(
    attributes: GLSPacketAttributes,
  ): Promise<GLSCreatePacketResult> {
    const response = await this.request(
      "ParcelService",
      "PrintLabels",
      {
        ...this.baseRequest(),
        HidePhoneNumberOnLabels: this.options.hide_phone_number_on_labels,
        ParcelList: [this.buildParcel(attributes)],
        PrintPosition: this.options.print_position,
        ShowPrintDialog: false,
        TypeOfPrinter: this.options.type_of_printer,
      },
      printLabelsResponseSchema,
      { retryable: false },
    )

    GLSClient.throwIfErrors(response.PrintLabelsErrorList, "PrintLabels")

    const info = response.PrintLabelsInfoList?.[0]
    if (info === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        MISSING_PARCEL_IDENTIFIERS_ERROR,
      )
    }

    const parcelId = info.ParcelId
    if (parcelId === undefined || parcelId === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        MISSING_PARCEL_IDENTIFIERS_ERROR,
      )
    }

    const responseParcelNumber = info.ParcelNumber
    if (
      responseParcelNumber === undefined ||
      responseParcelNumber === "" ||
      responseParcelNumber === 0
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        MISSING_PARCEL_IDENTIFIERS_ERROR,
      )
    }

    const parcelNumber = String(responseParcelNumber)
    const barcode = String(
      info.ParcelNumberWithCheckdigit ?? responseParcelNumber,
    )

    return {
      barcode,
      barcodeText: barcode,
      id: parcelId,
      label_pdf: GLSClient.bytesToBuffer(response.Labels),
      parcel_number: parcelNumber,
    }
  }

  async cancelPacket(packetId: string | number): Promise<boolean> {
    const parcelId = GLSClient.toPositiveInteger(packetId, "ParcelId")

    const response = await this.request(
      "ParcelService",
      "DeleteLabels",
      {
        ...this.baseRequest(),
        ParcelIdList: [parcelId],
      },
      deleteLabelsResponseSchema,
      { retryable: false },
    )

    const errors = response.DeleteLabelsErrorList ?? []
    if (errors.length > 0) {
      return false
    }

    return (response.SuccessfullyDeletedList ?? []).some(
      (item) => item.ParcelId === parcelId,
    )
  }

  async packetStatus(
    parcelNumber: string | number,
  ): Promise<GLSPacketStatusRecord[]> {
    const response = await this.request(
      "ParcelService",
      "GetParcelStatuses",
      {
        ...this.baseRequest(),
        LanguageIsoCode: this.getLanguageIsoCode(),
        ParcelNumber: GLSClient.toParcelNumber(parcelNumber),
        ReturnPOD: false,
      },
      getParcelStatusResponseSchema,
    )

    GLSClient.throwIfErrors(response.GetParcelStatusErrors, "GetParcelStatuses")

    return (response.ParcelStatusList ?? []).map((status) => {
      const statusCode = status.StatusCode ?? "unknown"
      const statusName =
        status.StatusDescription ?? status.StatusInfo ?? String(statusCode)

      return {
        dateTime: GLSClient.normalizeMyGLSDate(status.StatusDate),
        state: mapGLSStatusCode(statusCode, statusName),
        statusCode,
        statusName,
      }
    })
  }

  async downloadLabelPdf(packetId: string | number): Promise<Buffer> {
    return await this.downloadLabelsPdf([packetId])
  }

  async downloadLabelsPdf(packetIds: (string | number)[]): Promise<Buffer> {
    const parcelIds = packetIds.map((id) =>
      GLSClient.toPositiveInteger(id, "ParcelId"),
    )

    if (parcelIds.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: ParcelIdList must not be empty",
      )
    }

    const response = await this.request(
      "ParcelService",
      "GetPrintData",
      {
        ...this.baseRequest(),
        ParcelIdList: parcelIds,
      },
      getPrintDataResponseSchema,
    )

    GLSClient.throwIfErrors(response.GetPrintDataErrorList, "GetPrintData")

    const pdf = GLSClient.bytesToBuffer(
      response.Pdfdocument ?? response.PdfDocument ?? response.Labels,
    )
    if (pdf.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS GetPrintData returned no PDF data",
      )
    }

    return pdf
  }

  async getBranchList(): Promise<GLSBranch[]> {
    const response = await this.request(
      "MasterDataService",
      "GetDeliveryPoints",
      {
        ...this.baseRequest(),
        CountryIsoCode: this.options.country_code,
      },
      getDeliveryPointsResponseSchema,
    )

    if (response.ErrorCode !== undefined && response.ErrorCode !== 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `GLS GetDeliveryPoints error ${response.ErrorCode}: ${
          response.ErrorDescription ?? UNKNOWN_ERROR
        }`,
      )
    }

    if (response.Data === undefined || response.Data.length === 0) {
      return []
    }

    const decompressed = await gunzipAsync(
      GLSClient.bytesToBuffer(response.Data),
      {
        maxOutputLength: MAX_DELIVERY_POINTS_PAYLOAD_BYTES,
      },
    )
    const payload = jsonValueSchema.parse(
      JSON.parse(decompressed.toString("utf-8")),
    )
    const parsedPoints = deliveryPointsPayloadSchema.safeParse(payload)
    if (!parsedPoints.success) {
      return []
    }

    return parsedPoints.data.map((point) => this.mapDeliveryPoint(point))
  }

  private buildParcel(attributes: GLSPacketAttributes) {
    const recipientName = `${attributes.name} ${attributes.surname}`.trim()
    const codAmount = attributes.cod ?? 0

    return {
      CODAmount: codAmount,
      ...(codAmount > 0 && {
        CODCurrency: attributes.currency,
        CODReference: attributes.number,
      }),
      ClientNumber: this.options.client_number,
      ClientReference: attributes.number,
      Content: attributes.content ?? `Order ${attributes.number}`,
      Count: 1,
      DeliveryAddress: {
        City: attributes.delivery_city,
        ContactEmail: attributes.email,
        ContactName: recipientName,
        ContactPhone: attributes.phone,
        CountryIsoCode: attributes.delivery_country,
        HouseNumber: attributes.delivery_house_number,
        ...(attributes.delivery_house_number_info !== undefined &&
          attributes.delivery_house_number_info.length > 0 && {
            HouseNumberInfo: attributes.delivery_house_number_info,
          }),
        Name: recipientName,
        Street: attributes.delivery_street,
        ZipCode: attributes.delivery_zip_code,
      },
      ...(attributes.weight !== undefined &&
        attributes.weight !== 0 && {
          ParcelPropertyList: [
            {
              Content: attributes.content ?? `Order ${attributes.number}`,
              PackageType: 1,
              Weight: attributes.weight,
            },
          ],
        }),
      PickupAddress: {
        City: this.options.sender_city,
        ContactEmail: this.options.sender_email,
        ContactName: this.options.sender_name,
        ContactPhone: this.options.sender_phone,
        CountryIsoCode: this.options.sender_country,
        HouseNumber: this.options.sender_house_number,
        ...(this.options.sender_house_number_info !== undefined &&
          this.options.sender_house_number_info.length > 0 && {
            HouseNumberInfo: this.options.sender_house_number_info,
          }),
        Name: this.options.sender_name,
        Street: this.options.sender_street,
        ZipCode: this.options.sender_zip_code,
      },
      PickupDate: GLSClient.getPickupDate(),
      ServiceList: [
        {
          Code: "PSD",
          PSDParameter: {
            StringValue: attributes.addressId,
          },
        },
      ],
    }
  }

  private static getPickupDate(): string {
    const date = new Date()
    date.setHours(23, 59, 59, 0)
    return `/Date(${date.getTime()})/`
  }

  private baseRequest(): Record<string, unknown> {
    return {
      ClientNumberList: [this.options.client_number],
      Password: this.passwordBytes,
      Username: this.options.username,
      WebshopEngine: this.options.webshop_engine ?? "new-engine-medusa",
    }
  }

  private async request<T>(
    serviceName: MyGLSServiceName,
    methodName: string,
    body: Record<string, unknown>,
    responseSchema: z.ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    return await this.withRetry(
      async () =>
        await GLSClient.fetchWithTimeout(
          this.getServiceUrl(serviceName, methodName),
          {
            body: JSON.stringify(body),
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json; charset=utf-8",
            },
            method: "POST",
          },
          this.REQUEST_TIMEOUT_MS,
        ),
      async (response) => {
        const text = await response.text()
        if (!response.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `GLS ${methodName} failed: ${response.status} - ${text}`,
          )
        }

        if (text.length === 0) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `GLS ${methodName}: empty response body`,
          )
        }

        const payload = jsonValueSchema.parse(JSON.parse(text))
        return responseSchema.parse(payload)
      },
      `GLS ${methodName}`,
      options.retryable ?? true,
    )
  }

  private getServiceUrl(serviceName: MyGLSServiceName, methodName: string) {
    const domain = COUNTRY_DOMAINS[this.options.country_code]
    const hostPrefix =
      this.options.environment === "testing" ? "api.test.mygls" : "api.mygls"

    return `https://${hostPrefix}.${domain}/${serviceName}.svc/json/${methodName}`
  }

  private static throwIfErrors(
    errors: MyGLSErrorInfo[] | undefined,
    methodName: string,
  ): void {
    const errorList = errors ?? []
    if (errorList.length === 0) {
      return
    }

    const message = errorList
      .map((error) => {
        const description = GLSClient.enhanceErrorDescription(
          error.ErrorDescription ?? UNKNOWN_ERROR,
        )
        const code = error.ErrorCode ?? "unknown"
        const references =
          error.ClientReferenceList !== undefined &&
          error.ClientReferenceList.length > 0
            ? ` references=${error.ClientReferenceList.join(",")}`
            : ""
        const parcelIds =
          error.ParcelIdList !== undefined && error.ParcelIdList.length > 0
            ? ` parcelIds=${error.ParcelIdList.join(",")}`
            : ""
        return `${code}: ${description}${references}${parcelIds}`
      })
      .join("; ")

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `GLS ${methodName} error: ${message}`,
    )
  }

  private static enhanceErrorDescription(description: string): string {
    if (description.includes("Invalid service parameter, Service 'PSD'")) {
      return `${description} (ParcelShop/box delivery validation failed: check that the recipient phone is a valid mobile number for the delivery country and that the pickup point id/address/country match.)`
    }

    return description
  }

  private static bytesToBuffer(value: number[] | undefined): Buffer {
    return Buffer.from(value ?? [])
  }

  private static toPositiveInteger(
    value: string | number,
    field: string,
  ): number {
    const integerPrefix =
      typeof value === "string" ? /^\s*[+-]?\d+/u.exec(value)?.[0] : undefined
    const numberValue =
      typeof value === "number" ? value : Number(integerPrefix)

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `GLS: ${field} must be a positive integer`,
      )
    }

    return numberValue
  }

  private static toParcelNumber(value: string | number): number {
    const digits =
      typeof value === "number" ? String(value) : value.replaceAll(/\D/gu, "")
    const normalized =
      digits.length === GLS_PARCEL_NUMBER_WITH_CHECK_DIGIT_LENGTH
        ? digits.slice(0, GLS_PARCEL_NUMBER_LENGTH)
        : digits
    return GLSClient.toPositiveInteger(normalized, "ParcelNumber")
  }

  private getLanguageIsoCode(): string {
    switch (this.options.country_code) {
      case "CZ":
      case "RS": {
        return "CS"
      }
      case "SK": {
        return "SK"
      }
      case "SI": {
        return "SL"
      }
      case "HR": {
        return "HR"
      }
      case "HU": {
        return "HU"
      }
      case "RO": {
        return "RO"
      }
      default: {
        return "CS"
      }
    }
  }

  private static normalizeMyGLSDate(value: string | undefined): string {
    if (value === undefined || value.length === 0) {
      return new Date().toISOString()
    }

    const dotNetMatch = DOT_NET_DATE_REGEX.exec(value)
    const timestamp = dotNetMatch?.groups?.["timestamp"]
    if (timestamp !== undefined && timestamp.length > 0) {
      return new Date(Number(timestamp)).toISOString()
    }

    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }

    return value
  }

  private mapDeliveryPoint(point: DeliveryPoint): GLSBranch {
    const address = point.Address ?? {}
    const id = String(point.Matchcode ?? point.LegacyId ?? point.Id ?? "")
    const street = [address.Street, address.HouseNumber]
      .filter(Boolean)
      .join(" ")
      .trim()

    return {
      branchType: GLSClient.getDeliveryPointBranchType(point.DeliveryPointType),
      city: address.City ?? "",
      country: address.CountryIsoCode ?? this.options.country_code,
      id,
      ...(point.Latitude === undefined
        ? {}
        : { latitude: String(point.Latitude) }),
      ...(point.Longitude === undefined
        ? {}
        : { longitude: String(point.Longitude) }),
      name: address.Name ?? point.Matchcode ?? id,
      nameStreet: [address.Name, street].filter(Boolean).join(", "),
      ...(point.PickupTime === undefined
        ? {}
        : { openingHours: point.PickupTime }),
      street,
      zip: address.ZipCode ?? "",
    }
  }

  private static getDeliveryPointBranchType(type: number | undefined): string {
    if (type === 2) {
      return "locker"
    }

    if (type === 3) {
      return "depot"
    }

    return "parcelshop"
  }

  private static isRetryable(status: number): boolean {
    return status === 429 || status >= 500
  }

  private static async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const timeoutController = new AbortController()
    const controller = new AbortController()
    const requestSignal = init.signal
    const abortFromRequestSignal = () => {
      controller.abort()
    }
    const abortFromTimeout = () => {
      controller.abort()
    }

    if (requestSignal?.aborted === true) {
      controller.abort()
    } else {
      requestSignal?.addEventListener("abort", abortFromRequestSignal, {
        once: true,
      })
    }

    timeoutController.signal.addEventListener("abort", abortFromTimeout, {
      once: true,
    })

    const timeoutId = setTimeout(() => {
      timeoutController.abort()
    }, timeoutMs)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        timeoutController.signal.aborted
      ) {
        const abortError = new Error(
          `GLS request timed out after ${timeoutMs}ms: ${url}`,
        )
        abortError.name = "AbortError"
        throw abortError
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
      requestSignal?.removeEventListener("abort", abortFromRequestSignal)
      timeoutController.signal.removeEventListener("abort", abortFromTimeout)
    }
  }

  private async withRetry<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    errorContext: string,
    retryable = true,
  ): Promise<T> {
    return await this.executeRetryAttempt(
      operation,
      handleResponse,
      errorContext,
      retryable,
      0,
    )
  }

  private async executeRetryAttempt<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    errorContext: string,
    retryable: boolean,
    attempt: number,
  ): Promise<T> {
    await this.waitBeforeRetry(attempt)

    try {
      const result = await this.runRetryAttempt(
        operation,
        handleResponse,
        attempt,
      )
      if (!result.retry) {
        return result.value
      }

      if (!retryable) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${errorContext}: ${result.error.message}`,
        )
      }

      return await this.executeRetryAttempt(
        operation,
        handleResponse,
        errorContext,
        retryable,
        attempt + 1,
      )
    } catch (error) {
      const lastError = GLSClient.normalizeRetryError(error)
      this.throwIfFinalAttempt(attempt, errorContext, lastError, retryable)
      return await this.executeRetryAttempt(
        operation,
        handleResponse,
        errorContext,
        retryable,
        attempt + 1,
      )
    }
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    if (attempt === 0) {
      return
    }

    await sleep(this.INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1))
  }

  private async runRetryAttempt<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    attempt: number,
  ): Promise<RetryAttemptResult<T>> {
    const response = await operation()

    if (GLSClient.isRetryable(response.status) && attempt < this.MAX_RETRIES) {
      return {
        error: new Error(`${response.status} - ${await response.text()}`),
        retry: true,
      }
    }

    return {
      retry: false,
      value: await handleResponse(response),
    }
  }

  private static normalizeRetryError(error: unknown): Error {
    if (error instanceof MedusaError) {
      throw error
    }

    return error instanceof Error ? error : new Error(String(error))
  }

  private throwIfFinalAttempt(
    attempt: number,
    errorContext: string,
    lastError: Error,
    retryable: boolean,
  ): void {
    if (retryable && attempt !== this.MAX_RETRIES) {
      return
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${errorContext} after ${retryable ? this.MAX_RETRIES + 1 : 1} attempts: ${lastError.message}`,
    )
  }
}
