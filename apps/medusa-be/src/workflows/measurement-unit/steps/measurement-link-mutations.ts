import type { Link } from "@medusajs/framework/modules-sdk"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { MEASUREMENT_UNIT_MODULE } from "../../../modules/measurement-unit"
import {
  productMeasurementLink,
  productVariantMeasurementLink,
} from "./helpers"

export interface ProductMeasurementLinkIds {
  product_id: string
  product_measurement_id: string
}

export interface ProductVariantMeasurementLinkIds {
  product_variant_id: string
  product_variant_measurement_id: string
}

const restoreProductMeasurementLinks = async (
  container: MedusaContainer,
  links: ProductMeasurementLinkIds[],
) => {
  if (!links.length) {
    return
  }

  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
  await link.restore({
    [MEASUREMENT_UNIT_MODULE]: {
      product_measurement_id: links.map(
        (current) => current.product_measurement_id,
      ),
    },
  })
}

const restoreProductVariantMeasurementLinks = async (
  container: MedusaContainer,
  links: ProductVariantMeasurementLinkIds[],
) => {
  if (!links.length) {
    return
  }

  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
  await link.restore({
    [MEASUREMENT_UNIT_MODULE]: {
      product_variant_measurement_id: links.map(
        (current) => current.product_variant_measurement_id,
      ),
    },
  })
}

export const dismissProductMeasurementLinksStep = createStep(
  "dismiss-product-measurement-links",
  async (links: ProductMeasurementLinkIds[], { container }) => {
    if (links.length) {
      const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
      await link.dismiss(
        links.map((current) =>
          productMeasurementLink(
            current.product_id,
            current.product_measurement_id,
          ),
        ),
      )
    }

    return new StepResponse(links, links)
  },
  async (links: ProductMeasurementLinkIds[] | undefined, { container }) => {
    await restoreProductMeasurementLinks(container, links ?? [])
  },
)

export const restoreProductMeasurementLinksStep = createStep(
  "restore-product-measurement-links",
  async (links: ProductMeasurementLinkIds[], { container }) => {
    await restoreProductMeasurementLinks(container, links)
    return new StepResponse(links, links)
  },
  async (links: ProductMeasurementLinkIds[] | undefined, { container }) => {
    if (!links?.length) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    await link.dismiss(
      links.map((current) =>
        productMeasurementLink(
          current.product_id,
          current.product_measurement_id,
        ),
      ),
    )
  },
)

export const dismissProductVariantMeasurementLinksStep = createStep(
  "dismiss-product-variant-measurement-links",
  async (links: ProductVariantMeasurementLinkIds[], { container }) => {
    if (links.length) {
      const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
      await link.dismiss(
        links.map((current) =>
          productVariantMeasurementLink(
            current.product_variant_id,
            current.product_variant_measurement_id,
          ),
        ),
      )
    }

    return new StepResponse(links, links)
  },
  async (
    links: ProductVariantMeasurementLinkIds[] | undefined,
    { container },
  ) => {
    await restoreProductVariantMeasurementLinks(container, links ?? [])
  },
)

export const restoreProductVariantMeasurementLinksStep = createStep(
  "restore-product-variant-measurement-links",
  async (links: ProductVariantMeasurementLinkIds[], { container }) => {
    await restoreProductVariantMeasurementLinks(container, links)
    return new StepResponse(links, links)
  },
  async (
    links: ProductVariantMeasurementLinkIds[] | undefined,
    { container },
  ) => {
    if (!links?.length) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    await link.dismiss(
      links.map((current) =>
        productVariantMeasurementLink(
          current.product_variant_id,
          current.product_variant_measurement_id,
        ),
      ),
    )
  },
)
