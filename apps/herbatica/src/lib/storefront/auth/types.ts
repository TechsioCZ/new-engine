import type {
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
} from "@techsio/storefront-data/auth/medusa-service"

export type AuthLoginInput = MedusaAuthCredentials
export type AuthRegisterWholesaleInput = {
  company_name: string
  company_identifier: string
  currency_code: string
  billing_address: {
    address_1: string
    address_2?: string
    city: string
    postal_code: string
    country_code: string
  }
}

export type AuthRegisterInput = MedusaRegisterData & {
  wholesale?: AuthRegisterWholesaleInput
}
export type AuthUpdateInput = MedusaUpdateCustomerData

export type AuthProxyResponse = {
  token: string
}
