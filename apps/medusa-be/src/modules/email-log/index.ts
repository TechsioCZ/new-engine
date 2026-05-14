import { Module } from "@medusajs/framework/utils"
import EmailLogModuleService from "./service"

export const EMAIL_LOG_MODULE = "email_log"

export default Module(EMAIL_LOG_MODULE, {
  service: EmailLogModuleService,
})
