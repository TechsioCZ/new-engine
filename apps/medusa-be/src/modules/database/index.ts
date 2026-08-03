import { Module } from "@medusajs/framework/utils"

import DatabaseModuleService from "./service"

export const DATABASE_MODULE = "database"

export default Module(DATABASE_MODULE, {
  service: DatabaseModuleService,
})
