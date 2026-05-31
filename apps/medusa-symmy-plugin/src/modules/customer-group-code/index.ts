import type { ModuleExports } from "@medusajs/framework/types"
import { Module } from "@medusajs/framework/utils"
import { SymmyCustomerGroupCodeModuleService } from "./service"

export const SYMMY_CUSTOMER_GROUP_CODE_MODULE = "symmy_customer_group_code"

const symmyCustomerGroupCodeModule: ModuleExports<
  typeof SymmyCustomerGroupCodeModuleService
> = Module(SYMMY_CUSTOMER_GROUP_CODE_MODULE, {
  service: SymmyCustomerGroupCodeModuleService,
})

export default symmyCustomerGroupCodeModule

export type {
  SymmyCustomerGroupCodeDTO,
  SymmyCustomerGroupCodeModuleService,
  UpsertSymmyCustomerGroupCodeInput,
} from "./service"
