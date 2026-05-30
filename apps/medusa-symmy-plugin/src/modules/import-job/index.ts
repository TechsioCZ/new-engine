import type { ModuleExports } from "@medusajs/framework/types"
import { Module } from "@medusajs/framework/utils"
import { SymmyImportJobModuleService } from "./service"

export const SYMMY_IMPORT_JOB_MODULE = "symmy_import_job"

const symmyImportJobModule: ModuleExports<typeof SymmyImportJobModuleService> =
  Module(SYMMY_IMPORT_JOB_MODULE, {
    service: SymmyImportJobModuleService,
  })

export default symmyImportJobModule

export type {
  SymmyImportJobDTO,
  SymmyImportJobModuleService,
  SymmyImportJobStatus,
} from "./service"
