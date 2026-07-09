import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Container, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { normalizeCountryCode } from "../../utils/country-code"
import { sdk } from "../lib/sdk"

type ProductSalesRegionsWidgetProps = Partial<DetailWidgetProps<AdminProduct>>

type ProductSalesRegionsResponse = {
  product: {
    id: string
    sales_channels: { id: string; name?: string | null }[]
  }
  country_rates: {
    country_code: string
    rate: number
    tax_rate_id?: string
    tax_rate_name?: string | null
    tax_region_id: string
  }[]
}

type RegionCountry = {
  iso_2?: string | null
  iso_3?: string | null
  display_name?: string | null
  name?: string | null
}

type AdminRegionWithCountries = {
  id: string
  name: string
  countries?: RegionCountry[]
}

type RegionsResponse = {
  regions: AdminRegionWithCountries[]
}

const REGION_PRIORITY = ["sk", "cz"]

function formatPercent(rate: number) {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(rate) ? 0 : 2,
  }).format(rate)}%`
}

function getCountryName(
  country: RegionCountry | undefined,
  countryCode: string
) {
  const explicitName = country?.display_name ?? country?.name

  if (explicitName) {
    return explicitName
  }

  try {
    return (
      new Intl.DisplayNames(undefined, { type: "region" }).of(
        countryCode.toUpperCase()
      ) ?? countryCode.toUpperCase()
    )
  } catch {
    return countryCode.toUpperCase()
  }
}

function getCountriesByCode(regions: AdminRegionWithCountries[] = []) {
  const countriesByCode = new Map<string, RegionCountry>()

  for (const region of regions) {
    for (const country of region.countries ?? []) {
      const countryCode = normalizeCountryCode(country.iso_2 ?? country.iso_3)

      if (countryCode) {
        countriesByCode.set(countryCode, country)
      }
    }
  }

  return countriesByCode
}

function sortSalesRegionRows<
  TRow extends { country_code: string; countryName: string },
>(first: TRow, second: TRow) {
  const firstPriority = REGION_PRIORITY.indexOf(first.country_code)
  const secondPriority = REGION_PRIORITY.indexOf(second.country_code)

  if (firstPriority !== -1 || secondPriority !== -1) {
    return (
      (firstPriority === -1 ? REGION_PRIORITY.length : firstPriority) -
      (secondPriority === -1 ? REGION_PRIORITY.length : secondPriority)
    )
  }

  return first.countryName.localeCompare(second.countryName)
}

function getSalesRegionRows(
  data: ProductSalesRegionsResponse | undefined,
  countriesByCode: Map<string, RegionCountry>
) {
  const availableCountryCodes = new Set(countriesByCode.keys())

  return (data?.country_rates ?? [])
    .filter(
      ({ country_code }) =>
        availableCountryCodes.size === 0 ||
        availableCountryCodes.has(country_code)
    )
    .map((countryRate) => ({
      ...countryRate,
      countryName: getCountryName(
        countriesByCode.get(countryRate.country_code),
        countryRate.country_code
      ),
    }))
    .sort(sortSalesRegionRows)
}

function SalesRegionsContent({
  error,
  isLoading,
  rows,
}: {
  error: unknown
  isLoading: boolean
  rows: ReturnType<typeof getSalesRegionRows>
}) {
  if (error) {
    return (
      <Text className="text-ui-fg-error" size="small">
        Failed to load sales regions.
      </Text>
    )
  }

  if (isLoading) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        Loading sales regions…
      </Text>
    )
  }

  if (!rows.length) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        No VAT rates found for this product's sales regions.
      </Text>
    )
  }

  return rows.map((row) => (
    <div className="flex items-baseline gap-2" key={row.country_code}>
      <Text size="small">{row.countryName}</Text>
      <div className="mb-1 grow border-ui-border-base border-b border-dotted" />
      <Text className="text-ui-fg-subtle" size="small">
        {formatPercent(row.rate)}
      </Text>
    </div>
  ))
}

const ProductSalesRegionsWidget = ({
  data: product,
}: ProductSalesRegionsWidgetProps) => {
  const productId = product?.id

  const {
    data: regionsData,
    error: regionsError,
    isLoading: regionsLoading,
  } = useQuery({
    enabled: !!productId,
    queryFn: () => sdk.admin.region.list() as Promise<RegionsResponse>,
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
  const rows = getSalesRegionRows(data, countriesByCode)
  const salesChannelCount = data?.product.sales_channels.length ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div>
          <Text size="small" weight="plus">
            Sales regions
          </Text>
          <Text className="text-ui-fg-subtle" size="small">
            Regions where this product is sold and their VAT rate.
          </Text>
        </div>
        <Badge size="2xsmall">{salesChannelCount} channels</Badge>
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
