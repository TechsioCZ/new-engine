import { z } from "@medusajs/framework/zod"
import {
  VAT_ID_REGEX,
  VAT_ID_REGEX_MESSAGE,
} from "../../../modules/company-check/constants"

export const VatIdentificationNumberSchema = z
  .string()
  .regex(VAT_ID_REGEX, VAT_ID_REGEX_MESSAGE)
