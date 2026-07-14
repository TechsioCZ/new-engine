import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Container, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "../lib/sdk"
import {
  formatPercent,
  getCountriesByCode,
  getSalesRegionRows,
  type ProductSalesRegionsResponse,
} from "../utils/product-sales-regions"

type ProductSalesRegionsWidgetProps = Partial<DetailWidgetProps<AdminProduct>>

function SalesRegionsContent({
  error,
  isLoading,
  rows,
}: {
  error: unknown
  isLoading: boolean
  rows: ReturnType<typeof getSalesRegionRows>
}) {
  const { i18n, t } = useTranslation("productSalesRegions")

  if (error) {
    return (
      <Text className="text-ui-fg-error" size="small">
        {t("loadFailed")}
      </Text>
    )
  }

  if (isLoading) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        {t("loading")}
      </Text>
    )
  }

  if (!rows.length) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        {t("empty")}
      </Text>
    )
  }

  return rows.map((row) => (
    <div className="flex items-baseline gap-2" key={row.country_code}>
      <Text size="small">{row.countryName}</Text>
      <div className="mb-1 grow border-ui-border-base border-b border-dotted" />
      <Text className="text-ui-fg-subtle" size="small">
        {formatPercent(row.rate, i18n.resolvedLanguage ?? i18n.language)}
      </Text>
    </div>
  ))
}

const ProductSalesRegionsWidget = ({
  data: product,
}: ProductSalesRegionsWidgetProps) => {
  const { i18n, t } = useTranslation("productSalesRegions")
  const productId = product?.id

  const {
    data: regionsData,
    error: regionsError,
    isLoading: regionsLoading,
  } = useQuery({
    enabled: !!productId,
    queryFn: () => sdk.admin.region.list(),
    queryKey: ["product-sales-regions", "regions"],
  })

  const { data, error, isLoading } = useQuery({
    enabled: !!productId,
    queryFn: () =>
      sdk.client.fetch<ProductSalesRegionsResponse>(
        `/admin/products/${productId}/sales-regions`
      ),
    queryKey: ["product-sales-regions", productId],
  })

  if (!productId) {
    return null
  }

  const countriesByCode = getCountriesByCode(regionsData?.regions)
  const rows = getSalesRegionRows(
    data,
    countriesByCode,
    i18n.resolvedLanguage ?? i18n.language
  )
  const salesChannelCount = data?.product.sales_channels.length ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-3 px-6 py-4">
        <div className="min-w-0">
          <Text leading="compact" size="small" weight="plus">
            {t("title")}
          </Text>
          <Text className="text-ui-fg-subtle" leading="compact" size="small">
            {t("description")}
          </Text>
        </div>
        <Badge className="shrink-0 whitespace-nowrap" size="2xsmall">
          {t("badge.channel", { count: salesChannelCount })}
        </Badge>
      </div>
      <div className="flex flex-col gap-2 px-6 py-4">
        <SalesRegionsContent
          error={error ?? regionsError}
          isLoading={isLoading || regionsLoading}
          rows={rows}
        />
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductSalesRegionsWidget
