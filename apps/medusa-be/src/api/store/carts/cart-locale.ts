import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

type LocaleBindableCartBody = {
  locale?: null | string
}

/**
 * Medusa snapshots line item titles at write time and localizes them from
 * `cart.locale` (getTranslatedLineItemsStep). Storefront clients only carry the
 * market locale in the `x-medusa-locale` header, so without this binding every
 * CZ/HU/RO cart keeps the Slovak source titles on its items and on the order
 * created from it.
 */
export const bindCartLocaleFromRequest = (
  req: MedusaRequest<LocaleBindableCartBody>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const requestLocale = req.locale?.trim()

  if (requestLocale && req.validatedBody && !req.validatedBody.locale) {
    req.validatedBody.locale = requestLocale
  }

  next()
}
