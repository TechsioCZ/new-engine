import type { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  RedisClient,
  type RedisClientDependencies,
} from "../../utils/redis-client"
import {
  isMedusaInvalidData404Error,
  withMedusaStatusCode,
} from "../../utils/errors"
import { AresClient } from "./clients/ares-client"
import { MojeDaneClient } from "./clients/moje-dane-client"
import { ViesClient } from "./clients/vies-client"
import {
  AresEconomicSubjectSchema,
  AresEconomicSubjectSearchResponseSchema,
  AresStandardizedAddressSearchResponseSchema,
  TaxReliabilityResultSchema,
  ViesCheckVatResponseSchema,
} from "./schema"
import type {
  AresEconomicSubject,
  AresEconomicSubjectSearchRequest,
  AresEconomicSubjectSearchResponse,
  AresStandardizedAddressSearchRequest,
  AresStandardizedAddressSearchResponse,
  TaxReliabilityResult,
  ViesCheckVatRequest,
  ViesCheckVatResponse,
} from "./types"
import {
  CACHE_KEYS,
  CACHE_TTL,
  LOCK_KEYS,
  resolveAresEconomicSubjectsSearchCache,
  resolveAresStandardizedAddressSearchCache,
} from "./cache-utils"
import { mapMojeDaneStatus, normalizeDicDigits } from "./utils"

type InjectedDependencies = RedisClientDependencies & {
  logger: Logger
}

export class CompanyCheckModuleService {
  private readonly redis_: RedisClient
  private readonly aresClient_: AresClient
  private readonly viesClient_: ViesClient
  private readonly mojeDaneClient_: MojeDaneClient

  constructor(container: InjectedDependencies) {
    this.redis_ = new RedisClient(container, { name: "Company Check" })

    const aresBaseUrl = process.env.ARES_BASE_URL?.trim()
    if (!aresBaseUrl) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "ARES base URL is not configured"
      )
    }

    const viesBaseUrl = process.env.VIES_BASE_URL?.trim()
    if (!viesBaseUrl) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "VIES base URL is not configured"
      )
    }

    const mojeDaneWsdlUrl = process.env.MOJE_DANE_WSDL_URL?.trim()
    if (!mojeDaneWsdlUrl) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Moje Dane WSDL URL is not configured"
      )
    }

    this.aresClient_ = new AresClient({ baseUrl: aresBaseUrl })
    this.viesClient_ = new ViesClient({ baseUrl: viesBaseUrl })
    this.mojeDaneClient_ = new MojeDaneClient({ wsdlUrl: mojeDaneWsdlUrl })
  }

  async checkVatNumber(
    input: ViesCheckVatRequest
  ): Promise<ViesCheckVatResponse> {
    const cacheKey = CACHE_KEYS.vies(input.countryCode, input.vatNumber)
    const lockKey = LOCK_KEYS.vies(input.countryCode, input.vatNumber)

    return this.redis_.getOrSet(cacheKey, () => this.viesClient_.checkVatNumber(input), {
      lockKey,
      parser: (value) => {
        const parsed = ViesCheckVatResponseSchema.safeParse(value)
        return parsed.success ? parsed.data : undefined
      },
      ttl: (value) => (value.valid ? CACHE_TTL.VIES : CACHE_TTL.VIES_NEGATIVE),
    })
  }

  async checkTaxReliability(
    dicDigits: string
  ): Promise<TaxReliabilityResult> {
    const normalizedDic = normalizeDicDigits(dicDigits)
    const cacheKey = CACHE_KEYS.mojeDane(normalizedDic)
    const lockKey = LOCK_KEYS.mojeDane(normalizedDic)

    return this.redis_.getOrSet(
      cacheKey,
      async () => {
        const response =
          await this.mojeDaneClient_.getStatusNespolehlivySubjektRozsirenyV2(
            normalizedDic
          )
        return mapMojeDaneStatus(response)
      },
      {
        lockKey,
        parser: (value) => {
          const parsed = TaxReliabilityResultSchema.safeParse(value)
          return parsed.success ? parsed.data : undefined
        },
        ttl: (value) =>
          value.reliable === null
            ? CACHE_TTL.MOJE_DANE_NEGATIVE
            : CACHE_TTL.MOJE_DANE,
      }
    )
  }

  async getAresEconomicSubjectByIco(ico: string): Promise<AresEconomicSubject> {
    const normalizedIco = ico.trim()
    const cacheKey = CACHE_KEYS.aresIco(normalizedIco)
    const lockKey = LOCK_KEYS.aresIco(normalizedIco)

    const cachedOrFetchedSubject = await this.redis_.getOrSet<
      AresEconomicSubject | null
    >(
      cacheKey,
      async () => {
        try {
          return await this.aresClient_.getEconomicSubjectByIco(normalizedIco)
        } catch (error) {
          if (!isMedusaInvalidData404Error(error)) {
            throw error
          }
          return null
        }
      },
      {
        lockKey,
        cacheNull: true,
        parser: (value) => {
          const parsed = AresEconomicSubjectSchema.safeParse(value)
          return parsed.success ? parsed.data : undefined
        },
        ttl: (value) =>
          value === null ? CACHE_TTL.ARES_NEGATIVE : CACHE_TTL.ARES,
      }
    )

    if (!cachedOrFetchedSubject) {
      throw withMedusaStatusCode(
        new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "ARES economic-subject lookup failed: 404"
        ),
        404
      )
    }

    return cachedOrFetchedSubject
  }

  async searchAresEconomicSubjects(
    payload: AresEconomicSubjectSearchRequest
  ): Promise<AresEconomicSubjectSearchResponse> {
    const { cacheKey, lockKey } = resolveAresEconomicSubjectsSearchCache(payload)

    return this.redis_.getOrSet(
      cacheKey,
      () => this.aresClient_.searchEconomicSubjects(payload),
      {
        lockKey,
        parser: (value) => {
          const parsed = AresEconomicSubjectSearchResponseSchema.safeParse(value)
          return parsed.success ? parsed.data : undefined
        },
        ttl: (value) =>
          value.pocetCelkem > 0 ? CACHE_TTL.ARES : CACHE_TTL.ARES_NEGATIVE,
      }
    )
  }

  async searchAresStandardizedAddresses(
    payload: AresStandardizedAddressSearchRequest
  ): Promise<AresStandardizedAddressSearchResponse> {
    const { cacheKey, lockKey } =
      resolveAresStandardizedAddressSearchCache(payload)

    return this.redis_.getOrSet(
      cacheKey,
      () => this.aresClient_.searchStandardizedAddresses(payload),
      {
        lockKey,
        parser: (value) => {
          const parsed = AresStandardizedAddressSearchResponseSchema.safeParse(value)
          return parsed.success ? parsed.data : undefined
        },
        ttl: (value) =>
          value.pocetCelkem > 0 ? CACHE_TTL.ARES : CACHE_TTL.ARES_NEGATIVE,
      }
    )
  }
}
