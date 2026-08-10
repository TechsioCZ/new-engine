import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import type { GLSClientModuleService } from "../../../modules/gls-client"
import { GLS_CLIENT_MODULE } from "../../../modules/gls-client"
import type {
  GLSConfigDTO,
  GLSConfigResponse,
  UpdateGLSConfigInput,
} from "../../../modules/gls-client/types"
import { updateGLSConfigWorkflow } from "../../../workflows/gls-config/update-gls-config"
import type { PostAdminGLSConfigSchemaType } from "./validators"

/** Maps config DTO to API response with sensitive fields masked. */
const toConfigResponse = (config: GLSConfigDTO): GLSConfigResponse => ({
  client_number: config.client_number,
  country_code: config.country_code,
  environment: config.environment,
  hide_phone_number_on_labels: config.hide_phone_number_on_labels,
  id: config.id,
  is_enabled: config.is_enabled,
  password_set: Boolean(config.password),
  print_position: config.print_position,
  sender_city: config.sender_city,
  sender_country: config.sender_country,
  sender_email: config.sender_email,
  sender_house_number: config.sender_house_number,
  sender_house_number_info: config.sender_house_number_info,
  sender_name: config.sender_name,
  sender_phone: config.sender_phone,
  sender_street: config.sender_street,
  sender_zip_code: config.sender_zip_code,
  type_of_printer: config.type_of_printer,
  username: config.username,
  webshop_engine: config.webshop_engine,
})

const toUpdateGLSConfigInput = (
  input: PostAdminGLSConfigSchemaType,
): UpdateGLSConfigInput => ({
  ...(input.client_number === undefined
    ? {}
    : { client_number: input.client_number }),
  ...(input.country_code === undefined
    ? {}
    : { country_code: input.country_code }),
  ...(input.hide_phone_number_on_labels === undefined
    ? {}
    : { hide_phone_number_on_labels: input.hide_phone_number_on_labels }),
  ...(input.is_enabled === undefined ? {} : { is_enabled: input.is_enabled }),
  ...(input.password === undefined ? {} : { password: input.password }),
  ...(input.print_position === undefined
    ? {}
    : { print_position: input.print_position }),
  ...(input.sender_city === undefined
    ? {}
    : { sender_city: input.sender_city }),
  ...(input.sender_country === undefined
    ? {}
    : { sender_country: input.sender_country }),
  ...(input.sender_email === undefined
    ? {}
    : { sender_email: input.sender_email }),
  ...(input.sender_house_number === undefined
    ? {}
    : { sender_house_number: input.sender_house_number }),
  ...(input.sender_house_number_info === undefined
    ? {}
    : { sender_house_number_info: input.sender_house_number_info }),
  ...(input.sender_name === undefined
    ? {}
    : { sender_name: input.sender_name }),
  ...(input.sender_phone === undefined
    ? {}
    : { sender_phone: input.sender_phone }),
  ...(input.sender_street === undefined
    ? {}
    : { sender_street: input.sender_street }),
  ...(input.sender_zip_code === undefined
    ? {}
    : { sender_zip_code: input.sender_zip_code }),
  ...(input.type_of_printer === undefined
    ? {}
    : { type_of_printer: input.type_of_printer }),
  ...(input.username === undefined ? {} : { username: input.username }),
  ...(input.webshop_engine === undefined
    ? {}
    : { webshop_engine: input.webshop_engine }),
})

const get = async (req: MedusaRequest, res: MedusaResponse) => {
  const glsService =
    req.scope.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)

  const glsConfig = await glsService.getConfig()
  if (!glsConfig) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "GLS configuration not found. Please restart the server to initialize.",
    )
  }

  res.json({ config: toConfigResponse(glsConfig) })
}

/**
 * POST /admin/gls-config
 *
 * Empty string on a sensitive field = keep existing value.
 * null on a sensitive field = clear it.
 */
const post = async (
  req: MedusaRequest<PostAdminGLSConfigSchemaType>,
  res: MedusaResponse,
) => {
  const { result: updated } = await updateGLSConfigWorkflow(req.scope).run({
    input: toUpdateGLSConfigInput(req.validatedBody),
  })

  res.json({ config: toConfigResponse(updated) })
}

export { get as GET, post as POST }
