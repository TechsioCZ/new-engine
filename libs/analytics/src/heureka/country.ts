import type { HeurekaCountry } from "./types"

export const isHeurekaCountry = (country: unknown): country is HeurekaCountry =>
  country === "cz" || country === "sk"

export const normalizeHeurekaCountry = (country: unknown): HeurekaCountry =>
  country === "sk" ? "sk" : "cz"
