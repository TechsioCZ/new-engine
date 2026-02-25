import { z } from "@medusajs/framework/zod"
import { VatIdentificationNumberSchema } from "../../../../../companies/check/validators"
import {
  ICO_REGEX,
  ICO_REGEX_MESSAGE,
} from "../../../../../../modules/company-check/constants"

export const CzCompanyIdentificationNumberSchema = z
  .string()
  .regex(ICO_REGEX, ICO_REGEX_MESSAGE)

export type CzCompanyIdentificationNumberType = z.infer<
  typeof CzCompanyIdentificationNumberSchema
>

export const StoreCompaniesCheckCzInfoSchema = z
  .object({
    vat_identification_number: VatIdentificationNumberSchema.optional(),
    company_identification_number: CzCompanyIdentificationNumberSchema.optional(),
    company_name: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const provided = [
      data.vat_identification_number,
      data.company_identification_number,
      data.company_name,
    ].filter((value) => typeof value === "string")

    if (provided.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Exactly one of vat_identification_number, company_identification_number, or company_name is required",
      })
    }
  })

export type StoreCompaniesCheckCzInfoSchemaType = z.infer<
  typeof StoreCompaniesCheckCzInfoSchema
>
