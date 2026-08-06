import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps } from "@medusajs/framework/types"
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  StatusBadge,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import {
  deleteProductVariantMeasurement,
  measurementUnitQueryKeys,
  retrieveProductVariantMeasurement,
  setProductVariantMeasurement,
} from "../lib/measurement-units"
import type { ProductVariantMeasurementResponse } from "../lib/measurement-units"

type ProductVariantMeasurementWidgetProps = Partial<
  DetailWidgetProps<{
    id?: string
    product_id?: null | string
    sku?: null | string
    title?: null | string
  }>
>

const ProductVariantMeasurementContent = ({
  data,
  error,
  isLoading,
}: {
  data?: ProductVariantMeasurementResponse | undefined
  error: unknown
  isLoading: boolean
}) => {
  const { t } = useTranslation("measurementUnits")

  if (error !== null && error !== undefined) {
    return (
      <Text className="text-ui-fg-error" size="small">
        {t("widget.variantLoadFailed")}
      </Text>
    )
  }

  if (isLoading) {
    return <Text size="small">{t("status.loading")}</Text>
  }

  if (data?.measurement === undefined || data.measurement === null) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        {t("widget.variantRequiresProductUnit")}
      </Text>
    )
  }

  if (
    data.variant_measurement === undefined ||
    data.variant_measurement === null
  ) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        {t("widget.variantEmpty")}
      </Text>
    )
  }

  const unitIsDeleted =
    data.measurement.unit.deleted_at !== null &&
    data.measurement.unit.deleted_at !== undefined

  return (
    <div>
      <div className="flex items-center gap-2">
        <Text size="small" weight="plus">
          {data.variant_measurement.product_unit_quantity}{" "}
          {data.measurement.unit.symbol}
        </Text>
        {unitIsDeleted ? (
          <StatusBadge color="red">{t("status.deleted")}</StatusBadge>
        ) : null}
      </div>
      <Text className="text-ui-fg-subtle" size="small">
        {data.measurement.unit.name}
      </Text>
    </div>
  )
}

const ProductVariantMeasurementDrawer = ({
  data,
  onOpenChange,
  open,
  productId,
  productVariantId,
}: {
  data?: ProductVariantMeasurementResponse | undefined
  onOpenChange: (open: boolean) => void
  open: boolean
  productId: string
  productVariantId: string
}) => {
  const { t } = useTranslation("measurementUnits")
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState(
    () => data?.variant_measurement?.product_unit_quantity.toString() ?? "",
  )
  const quantityNumber = Number(quantity)
  const isValidQuantity = Number.isFinite(quantityNumber) && quantityNumber > 0

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: measurementUnitQueryKeys.productVariantMeasurement(
        productId,
        productVariantId,
      ),
    })
    await queryClient.invalidateQueries({
      queryKey: measurementUnitQueryKeys.productMeasurement(productId),
    })
    await queryClient.invalidateQueries({ queryKey: ["product", productId] })
    await queryClient.invalidateQueries({ queryKey: ["product_variant"] })
  }

  const saveMutation = useMutation({
    mutationFn: async () =>
      await setProductVariantMeasurement(productId, productVariantId, {
        product_unit_quantity: quantityNumber,
      }),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveFailed"),
      )
    },
    onSuccess: async () => {
      await invalidate()
      toast.success(t("toasts.productVariantMeasurementUpdated"))
      onOpenChange(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () =>
      await deleteProductVariantMeasurement(productId, productVariantId),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.clearFailed"),
      )
    },
    onSuccess: async () => {
      await invalidate()
      toast.success(t("toasts.productVariantMeasurementCleared"))
      onOpenChange(false)
    },
  })

  let canSave = false
  if (data?.measurement !== undefined && data.measurement !== null) {
    const { deleted_at: deletedAt } = data.measurement.unit
    canSave = (deletedAt === null || deletedAt === undefined) && isValidQuantity
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("widget.variantManageTitle")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          {data?.measurement === undefined || data.measurement === null ? (
            <Text className="text-ui-fg-subtle" size="small">
              {t("widget.variantRequiresProductUnit")}
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="variant-measurement-quantity">
                {t("fields.quantity")}
              </Label>
              <Input
                id="variant-measurement-quantity"
                onChange={(event) => {
                  setQuantity(event.target.value)
                }}
                placeholder={t("placeholders.quantity")}
                step="any"
                type="number"
                value={quantity}
              />
              <Text className="text-ui-fg-subtle" size="small">
                {data.measurement.unit.name} ({data.measurement.unit.symbol})
              </Text>
              {quantity.length > 0 && !isValidQuantity ? (
                <Text className="text-ui-fg-error" size="small">
                  {t("validation.quantityPositive")}
                </Text>
              ) : null}
              {data.measurement.unit.deleted_at !== null &&
              data.measurement.unit.deleted_at !== undefined ? (
                <Text className="text-ui-fg-error" size="small">
                  {t("widget.variantDeletedUnit")}
                </Text>
              ) : null}
            </div>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex justify-between gap-2">
            <Button
              disabled={
                data?.variant_measurement === undefined ||
                data.variant_measurement === null ||
                deleteMutation.isPending
              }
              isLoading={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate()
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.clear")}
            </Button>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  onOpenChange(false)
                }}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.cancel")}
              </Button>
              <Button
                disabled={!canSave}
                isLoading={saveMutation.isPending}
                onClick={() => {
                  saveMutation.mutate()
                }}
                size="small"
                type="button"
              >
                {t("actions.save")}
              </Button>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const ProductVariantMeasurementWidget = ({
  data: variant,
}: ProductVariantMeasurementWidgetProps) => {
  const { t } = useTranslation("measurementUnits")
  const params = useParams()
  const productId = variant?.product_id ?? params["id"]
  const productVariantId = variant?.id ?? params["variant_id"]
  const [open, setOpen] = useState(false)
  const hasProductId =
    productId !== undefined && productId !== null && productId.length > 0
  const hasProductVariantId =
    productVariantId !== undefined && productVariantId.length > 0

  const { data, error, isLoading } = useQuery({
    enabled: hasProductId && hasProductVariantId,
    queryFn: async () => {
      if (!hasProductId || !hasProductVariantId) {
        throw new Error("Product and variant ids are required")
      }

      return await retrieveProductVariantMeasurement(
        productId,
        productVariantId,
      )
    },
    queryKey: measurementUnitQueryKeys.productVariantMeasurement(
      productId,
      productVariantId,
    ),
  })

  if (!hasProductId || !hasProductVariantId) {
    return null
  }

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">{t("widget.variantTitle")}</Heading>
          </div>
          <Button
            onClick={() => {
              setOpen(true)
            }}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.edit")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 px-6 py-4">
          <ProductVariantMeasurementContent
            data={data}
            error={error}
            isLoading={isLoading}
          />
        </div>
      </Container>
      <ProductVariantMeasurementDrawer
        data={data}
        key={`${open}:${data?.variant_measurement?.product_unit_quantity ?? ""}`}
        onOpenChange={setOpen}
        open={open}
        productId={productId}
        productVariantId={productVariantId}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.side.after",
})

export default ProductVariantMeasurementWidget
