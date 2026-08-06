import { Module } from "@medusajs/framework/utils"

import ApiStoreModuleService from "./service"

export const API_STORE_MODULE = "apiStore"

export default Module(API_STORE_MODULE, {
  service: ApiStoreModuleService,
})

export type { default as ApiStoreModuleService } from "./service"
export type {
  ApiStoreAdminDTO,
  ApiStoreCreateInput,
  ApiStoreCredentials,
  ApiStoreSecretDTO,
  ApiStoreUpdateInput,
} from "./types"
