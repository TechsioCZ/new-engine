"use client"

import type { MedusaCustomerProfileUpdateInput } from "@techsio/storefront-data/customers/medusa-service"
import { storefront } from "./storefront"

export type CustomerProfileUpdateInput = MedusaCustomerProfileUpdateInput

export const { useUpdateCustomer } = storefront.hooks.customers
