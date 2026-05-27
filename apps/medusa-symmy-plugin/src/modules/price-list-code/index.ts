import type { ModuleExports } from "@medusajs/framework/types"
import { Module } from "@medusajs/framework/utils"
import { SymmyPriceListCodeModuleService } from "./service"

export const SYMMY_PRICE_LIST_CODE_MODULE = "symmy_price_list_code"

const symmyPriceListCodeModule: ModuleExports<
  typeof SymmyPriceListCodeModuleService
> = Module(SYMMY_PRICE_LIST_CODE_MODULE, {
  service: SymmyPriceListCodeModuleService,
})

export default symmyPriceListCodeModule

export type {
  ListSymmyPriceListCodesInput,
  SymmyPriceListCodeDTO,
  SymmyPriceListCodeModuleService,
  UpsertSymmyPriceListCodeInput,
} from "./service"
