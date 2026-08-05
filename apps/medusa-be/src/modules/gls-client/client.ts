import { createHash } from "node:crypto"
import { promisify } from "node:util"
import { gunzip } from "node:zlib"

import { MedusaError } from "@medusajs/framework/utils"

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
const DOT_NET_DATE_REGEX = /\/Date\((\d+)(?:[+-]\d+)?\)\//
const GLS_PARCEL_NUMBER_LENGTH = 10
const GLS_PARCEL_NUMBER_WITH_CHECK_DIGIT_LENGTH = 11
const MAX_DELIVERY_POINTS_PAYLOAD_BYTES = 20 * 1024 * 1024
const gunzipAsync = promisify(gunzip)

interface MyGLSErrorInfo {
  ErrorCode?: number
  ErrorDescription?: string
  ClientReferenceList?: string[]
  ParcelIdList?: number[]
}

interface PrintLabelsInfo {
  ClientReference?: string
  ParcelId?: number
  ParcelNumber?: number | string
  ParcelNumberWithCheckdigit?: number | string
}

interface PrintLabelsResponse {
  Labels?: number[]
  PrintLabelsErrorList?: MyGLSErrorInfo[]
  PrintLabelsInfoList?: PrintLabelsInfo[]
}

interface GetPrintDataResponse {
  Pdfdocument?: number[]
  PdfDocument?: number[]
  Labels?: number[]
  GetPrintDataErrorList?: MyGLSErrorInfo[]
  PrintDataInfoList?: PrintLabelsInfo[]
}

interface DeleteLabelsResponse {
  DeleteLabelsErrorList?: MyGLSErrorInfo[]
  SuccessfullyDeletedList?: Array<{
    ParcelId?: number
    SubParcelIdList?: number[]
  }>
}

interface ParcelStatus {
  DepotCity?: string
  DepotNumber?: string
  StatusCode?: string | number
  StatusDate?: string
  StatusDescription?: string
  StatusInfo?: string
}

interface GetParcelStatusResponse {
  ClientReference?: string
  DeliveryCountryCode?: string
  DeliveryZipCode?: string
  GetParcelStatusErrors?: MyGLSErrorInfo[]
  ParcelNumber?: number | string
  ParcelStatusList?: ParcelStatus[]
  POD?: number[]
  Weight?: number
}

interface DeliveryPoint {
  Id?: number | string
  Address?: {
    City?: string
    ContactEmail?: string
    ContactName?: string
    ContactPhone?: string
    CountryIsoCode?: string
    HouseNumber?: string
    HouseNumberInfo?: string
    Name?: string
    Street?: string
    ZipCode?: string
  }
  Latitude?: number | string
  Longitude?: number | string
  Matchcode?: string
  LegacyId?: string
  DeliveryPointType?: number
  PickupTime?: string
  IsActive?: boolean
}

interface GetDeliveryPointsResponse {
  ErrorCode?: number
  ErrorDescription?: string
  IsChanged?: boolean
  LastUpdateTime?: string
  Data?: number[]
}

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
    this.passwordBytes = [...createHash('sha512').update(options.password, 'utf8').digest()]
  }

  async createPacket(
    attributes: GLSPacketAttributes,
  ): Promise<GLSCreatePacketResult> {
    const response = await this.request<PrintLabelsResponse>(
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
      { retryable: false },
    )

    this.throwIfErrors(response.PrintLabelsErrorList, "PrintLabels")

    const info = response.PrintLabelsInfoList?.[0]
    if (!(info?.ParcelId && info.ParcelNumber)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS PrintLabels returned no ParcelId/ParcelNumber",
      )
    }

    const parcelNumber = String(info.ParcelNumber)
    const barcode = String(info.ParcelNumberWithCheckdigit ?? info.ParcelNumber)

    return {
      barcode,
      barcodeText: barcode,
      id: info.ParcelId,
      label_pdf: this.bytesToBuffer(response.Labels),
      parcel_number: parcelNumber,
    }
  }

  async cancelPacket(packetId: string | number): Promise<boolean> {
    const parcelId = this.toPositiveInteger(packetId, "ParcelId")

    const response = await this.request<DeleteLabelsResponse>(
      "ParcelService",
      "DeleteLabels",
      {
        ...this.baseRequest(),
        ParcelIdList: [parcelId],
      },
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
    const response = await this.request<GetParcelStatusResponse>(
      "ParcelService",
      "GetParcelStatuses",
      {
        ...this.baseRequest(),
        LanguageIsoCode: this.getLanguageIsoCode(),
        ParcelNumber: this.toParcelNumber(parcelNumber),
        ReturnPOD: false,
      },
    )

    this.throwIfErrors(response.GetParcelStatusErrors, "GetParcelStatuses")

    return (response.ParcelStatusList ?? []).map((status) => {
      const statusCode = status.StatusCode ?? "unknown"
      const statusName =
        status.StatusDescription ?? status.StatusInfo ?? String(statusCode)

      return {
        dateTime: this.normalizeMyGLSDate(status.StatusDate),
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
      this.toPositiveInteger(id, "ParcelId"),
    )

    if (parcelIds.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: ParcelIdList must not be empty",
      )
    }

    const response = await this.request<GetPrintDataResponse>(
      "ParcelService",
      "GetPrintData",
      {
        ...this.baseRequest(),
        ParcelIdList: parcelIds,
      },
    )

    this.throwIfErrors(response.GetPrintDataErrorList, "GetPrintData")

    const pdf = this.bytesToBuffer(
      response.Pdfdocument ?? response.PdfDocument ?? response.Labels,
    )
    if (!pdf) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS GetPrintData returned no PDF data",
      )
    }

    return pdf
  }

  async getBranchList(): Promise<GLSBranch[]> {
    const response = await this.request<GetDeliveryPointsResponse>(
      "MasterDataService",
      "GetDeliveryPoints",
      {
        ...this.baseRequest(),
        CountryIsoCode: this.options.country_code,
      },
    )

    if (response.ErrorCode && response.ErrorCode !== 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `GLS GetDeliveryPoints error ${response.ErrorCode}: ${
          response.ErrorDescription ?? "Unknown error"
        }`,
      )
    }

    if (!response.Data || response.Data.length === 0) {
      return []
    }

    const decompressed = await gunzipAsync(this.bytesToBuffer(response.Data), {
      maxOutputLength: MAX_DELIVERY_POINTS_PAYLOAD_BYTES,
    })
    const payload = JSON.parse(decompressed.toString("utf-8")) as unknown
    const points = this.getDeliveryPointsPayload(payload)

    return points
      .filter(isDeliveryPoint)
      .map((point) => this.mapDeliveryPoint(point))
  }

  private buildParcel(attributes: GLSPacketAttributes) {
    const recipientName = `${attributes.name} ${attributes.surname}`.trim()
    const codAmount = attributes.cod ?? 0

    return {
      ClientNumber: this.options.client_number,
      ClientReference: attributes.number,
      CODAmount: codAmount,
      ...(codAmount > 0 && {
        CODCurrency: attributes.currency,
        CODReference: attributes.number,
      }),
      Content: attributes.content ?? `Order ${attributes.number}`,
      Count: 1,
      PickupDate: this.getPickupDate(),
      DeliveryAddress: {
        ContactEmail: attributes.email,
        ContactName: recipientName,
        ContactPhone: attributes.phone,
        CountryIsoCode: attributes.delivery_country,
        HouseNumber: attributes.delivery_house_number,
        ...(attributes.delivery_house_number_info && {
          HouseNumberInfo: attributes.delivery_house_number_info,
        }),
        Name: recipientName,
        Street: attributes.delivery_street,
        City: attributes.delivery_city,
        ZipCode: attributes.delivery_zip_code,
      },
      PickupAddress: {
        ContactEmail: this.options.sender_email,
        ContactName: this.options.sender_name,
        ContactPhone: this.options.sender_phone,
        CountryIsoCode: this.options.sender_country,
        HouseNumber: this.options.sender_house_number,
        ...(this.options.sender_house_number_info && {
          HouseNumberInfo: this.options.sender_house_number_info,
        }),
        Name: this.options.sender_name,
        Street: this.options.sender_street,
        City: this.options.sender_city,
        ZipCode: this.options.sender_zip_code,
      },
      ServiceList: [
        {
          Code: "PSD",
          PSDParameter: {
            StringValue: attributes.addressId,
          },
        },
      ],
      ...(attributes.weight && {
        ParcelPropertyList: [
          {
            Content: attributes.content ?? `Order ${attributes.number}`,
            PackageType: 1,
            Weight: attributes.weight,
          },
        ],
      }),
    }
  }

  private getPickupDate(): string {
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
    options: RequestOptions = {},
  ): Promise<T> {
    return await this.withRetry(
       async () =>
        this.fetchWithTimeout(this.getServiceUrl(serviceName, methodName), {
          body: JSON.stringify(body),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
          },
          method: "POST",
        }),
      async (response) => {
        const text = await response.text()
        if (!response.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `GLS ${methodName} failed: ${response.status} - ${text}`,
          )
        }

        if (!text) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `GLS ${methodName}: empty response body`,
          )
        }

        return JSON.parse(text) as T
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

  private throwIfErrors(
    errors: MyGLSErrorInfo[] | undefined,
    methodName: string,
  ): void {
    const errorList = errors ?? []
    if (errorList.length === 0) {
      return
    }

    const message = errorList
      .map((error) => {
        const description = this.enhanceErrorDescription(
          error.ErrorDescription ?? "Unknown error",
        )
        const code = error.ErrorCode ?? "unknown"
        const references = error.ClientReferenceList?.length
          ? ` references=${error.ClientReferenceList.join(",")}`
          : ""
        const parcelIds = error.ParcelIdList?.length
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

  private enhanceErrorDescription(description: string): string {
    if (description.includes("Invalid service parameter, Service 'PSD'")) {
      return `${description} (ParcelShop/box delivery validation failed: check that the recipient phone is a valid mobile number for the delivery country and that the pickup point id/address/country match.)`
    }

    return description
  }

  private bytesToBuffer(value: number[] | undefined): Buffer {
    return Buffer.from(value ?? [])
  }

  private toPositiveInteger(value: string | number, field: string): number {
    const numberValue =
      typeof value === "number" ? value : Number.parseInt(value, 10)

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `GLS: ${field} must be a positive integer`,
      )
    }

    return numberValue
  }

  private toParcelNumber(value: string | number): number {
    const digits =
      typeof value === "number" ? String(value) : value.replaceAll(/\D/g, "")
    const normalized =
      digits.length === GLS_PARCEL_NUMBER_WITH_CHECK_DIGIT_LENGTH
        ? digits.slice(0, GLS_PARCEL_NUMBER_LENGTH)
        : digits
    return this.toPositiveInteger(normalized, "ParcelNumber")
  }

  private getLanguageIsoCode() {
    switch (this.options.country_code) {
      case "CZ": {
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

  private normalizeMyGLSDate(value: string | undefined): string {
    if (!value) {
      return new Date().toISOString()
    }

    const dotNetMatch = DOT_NET_DATE_REGEX.exec(value)
    if (dotNetMatch?.[1]) {
      return new Date(Number.parseInt(dotNetMatch[1], 10)).toISOString()
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
      branchType: this.getDeliveryPointBranchType(point.DeliveryPointType),
      city: address.City ?? "",
      country: address.CountryIsoCode ?? this.options.country_code,
      id,
      latitude:
        point.Latitude !== undefined ? String(point.Latitude) : undefined,
      longitude:
        point.Longitude !== undefined ? String(point.Longitude) : undefined,
      name: address.Name ?? point.Matchcode ?? id,
      nameStreet: [address.Name, street].filter(Boolean).join(", "),
      openingHours: point.PickupTime,
      street,
      zip: address.ZipCode ?? "",
    }
  }

  private getDeliveryPointsPayload(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload
    }

    if (isRecord(payload) && Array.isArray(payload.Data)) {
      return payload.Data
    }

    return []
  }

  private getDeliveryPointBranchType(type: number | undefined): string {
    if (type === 2) {
      return "locker"
    }

    if (type === 3) {
      return "depot"
    }

    return "parcelshop"
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status >= 500
  }

  private  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number = this.REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const timeoutController = new AbortController()
    const controller = new AbortController()
    const requestSignal = init.signal
    const abortFromRequestSignal = () =>{  controller.abort(); }
    const abortFromTimeout = () =>{  controller.abort(); }

    if (requestSignal?.aborted) {
      controller.abort()
    } else {
      requestSignal?.addEventListener("abort", abortFromRequestSignal, {
        once: true,
      })
    }

    timeoutController.signal.addEventListener("abort", abortFromTimeout, {
      once: true,
    })

    const timeoutId = setTimeout(() =>{  timeoutController.abort(); }, timeoutMs)

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
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      await this.waitBeforeRetry(attempt)

      try {
        const result = await this.runRetryAttempt(
          operation,
          handleResponse,
          attempt,
        )
        if (result.retry) {
          lastError = result.error
          if (!retryable) {
            break
          }
          continue
        }

        return result.value
      } catch (error) {
        lastError = this.normalizeRetryError(error)
        this.throwIfFinalAttempt(attempt, errorContext, lastError, retryable)
      }
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${errorContext}: ${lastError?.message ?? "Unknown error"}`,
    )
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    if (attempt === 0) {
      return
    }

    await this.sleep(this.INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1))
  }

  private async runRetryAttempt<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    attempt: number,
  ): Promise<RetryAttemptResult<T>> {
    const response = await operation()

    if (this.isRetryable(response.status) && attempt < this.MAX_RETRIES) {
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

  private normalizeRetryError(error: unknown): Error {
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

function isDeliveryPoint(value: unknown): value is DeliveryPoint {
  return isRecord(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
