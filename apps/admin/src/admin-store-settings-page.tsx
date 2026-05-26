import { Badge } from "@techsio/ui-kit/atoms/badge"
import { type ReactNode, useMemo } from "react"
import {
  useAdminCurrencyPricePreferences,
  useAdminRegionReference,
  useAdminSalesChannelReference,
  useAdminStockLocationReference,
  useAdminStoreDetail,
} from "./admin-api"
import type {
  AdminPricePreference,
  AdminStoreCurrency,
  AdminStoreSummary,
} from "./admin-types"
import {
  AdminDetailField,
  AdminDetailFields,
} from "./components/admin-detail-field"
import { AdminPage, AdminPageHeader } from "./components/admin-page-header"
import { AdminDetailStack } from "./components/admin-panel"
import { AdminPanelHeader } from "./components/admin-panel-header"
import { AdminInlineList, AdminJsonPreview } from "./components/admin-preview"
import { AdminSettingsPanel } from "./components/admin-settings-form"
import { AdminState } from "./components/admin-state"
import { AdminTable } from "./components/admin-table"

export function StoreSettingsPage() {
  const store = useAdminStoreDetail()

  if (store.isLoading) {
    return (
      <StoreSettingsFrame>
        <AdminSettingsPanel>
          <AdminPanelHeader
            subtitle="Zakladni nastaveni obchodu dostupne pres Admin API."
            title="Store"
          />
          <AdminState isBusy>Nacitam store nastaveni...</AdminState>
        </AdminSettingsPanel>
      </StoreSettingsFrame>
    )
  }

  if (store.isError) {
    return (
      <StoreSettingsFrame>
        <AdminSettingsPanel>
          <AdminPanelHeader
            subtitle="Zakladni nastaveni obchodu dostupne pres Admin API."
            title="Store"
          />
          <AdminState tone="error">
            Store nastaveni se nepodarilo nacist.
          </AdminState>
        </AdminSettingsPanel>
      </StoreSettingsFrame>
    )
  }

  if (!store.data) {
    return (
      <StoreSettingsFrame>
        <AdminSettingsPanel>
          <AdminPanelHeader
            subtitle="Zakladni nastaveni obchodu dostupne pres Admin API."
            title="Store"
          />
          <AdminState>Zadny aktivni store nebyl nalezen.</AdminState>
        </AdminSettingsPanel>
      </StoreSettingsFrame>
    )
  }

  return (
    <StoreSettingsFrame>
      <StoreGeneralPanel store={store.data} />
      <StoreCurrenciesPanel
        currencies={store.data.supported_currencies ?? []}
      />
      <StoreLocalesPanel locales={store.data.supported_locales ?? []} />
      <StoreMetadataPanel metadata={store.data.metadata} />
      <StoreJsonPanel store={store.data} />
    </StoreSettingsFrame>
  )
}

function StoreSettingsFrame({ children }: { children: ReactNode }) {
  return (
    <AdminPage>
      <AdminPageHeader eyebrow="Nastaveni" title="Store" />
      <AdminDetailStack>{children}</AdminDetailStack>
    </AdminPage>
  )
}

function StoreGeneralPanel({ store }: { store: AdminStoreSummary }) {
  const region = useAdminRegionReference(store.default_region_id)
  const salesChannel = useAdminSalesChannelReference(
    store.default_sales_channel_id
  )
  const stockLocation = useAdminStockLocationReference(
    store.default_location_id
  )
  const defaultCurrency = store.supported_currencies?.find(
    (currency) => currency.is_default
  )

  return (
    <AdminSettingsPanel>
      <AdminPanelHeader
        subtitle="Zakladni nastaveni obchodu dostupne pres Admin API."
        title="Store"
      />
      <AdminDetailFields>
        <AdminDetailField label="Name" value={store.name} />
        <AdminDetailField
          label="Default currency"
          value={formatCurrencyLabel(defaultCurrency)}
        />
        <AdminDetailField
          label="Default region"
          value={formatReferenceLabel(
            region.data?.region.name,
            store.default_region_id,
            region.isLoading
          )}
        />
        <AdminDetailField
          label="Default sales channel"
          value={formatReferenceLabel(
            salesChannel.data?.sales_channel.name,
            store.default_sales_channel_id,
            salesChannel.isLoading
          )}
        />
        <AdminDetailField
          label="Default location"
          value={formatReferenceLabel(
            stockLocation.data?.stock_location.name,
            store.default_location_id,
            stockLocation.isLoading
          )}
        />
      </AdminDetailFields>
    </AdminSettingsPanel>
  )
}

function StoreCurrenciesPanel({
  currencies,
}: {
  currencies: AdminStoreCurrency[]
}) {
  const currencyCodes = currencies.map((currency) => currency.currency_code)
  const pricePreferences = useAdminCurrencyPricePreferences(currencyCodes)
  const pricePreferenceByCode = useMemo(
    () =>
      new Map(
        (pricePreferences.data ?? []).map((preference) => [
          preference.value?.toLowerCase() ?? "",
          preference,
        ])
      ),
    [pricePreferences.data]
  )

  return (
    <AdminSettingsPanel>
      <AdminPanelHeader
        subtitle="Meny povolene pro tento store."
        title="Currencies"
      />
      {currencies.length === 0 ? (
        <AdminState>Store nema nastavene zadne meny.</AdminState>
      ) : (
        <AdminTable width="2xl">
          <AdminTable.Header>
            <AdminTable.Row>
              <AdminTable.ColumnHeader>Code</AdminTable.ColumnHeader>
              <AdminTable.ColumnHeader>Name</AdminTable.ColumnHeader>
              <AdminTable.ColumnHeader>
                Tax inclusive pricing
              </AdminTable.ColumnHeader>
              <AdminTable.ColumnHeader>Default</AdminTable.ColumnHeader>
            </AdminTable.Row>
          </AdminTable.Header>
          <AdminTable.Body>
            {currencies.map((currency) => (
              <AdminTable.Row key={currency.currency_code.toLowerCase()}>
                <AdminTable.Cell>
                  <Badge size="sm" variant="outline">
                    {currency.currency_code.toUpperCase()}
                  </Badge>
                </AdminTable.Cell>
                <AdminTable.Cell>
                  {currency.currency?.name ?? "-"}
                </AdminTable.Cell>
                <AdminTable.Cell>
                  {renderTaxInclusivePricing(
                    pricePreferenceByCode.get(
                      currency.currency_code.toLowerCase()
                    ),
                    pricePreferences.isLoading,
                    pricePreferences.isError
                  )}
                </AdminTable.Cell>
                <AdminTable.Cell>
                  <Badge
                    size="sm"
                    variant={currency.is_default ? "success" : "outline"}
                  >
                    {currency.is_default ? "Yes" : "No"}
                  </Badge>
                </AdminTable.Cell>
              </AdminTable.Row>
            ))}
          </AdminTable.Body>
        </AdminTable>
      )}
    </AdminSettingsPanel>
  )
}

function StoreMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const keyCount = Object.keys(metadata ?? {}).length

  return (
    <AdminSettingsPanel>
      <AdminPanelHeader subtitle={`${keyCount} keys`} title="Metadata" />
      {keyCount > 0 ? (
        <AdminJsonPreview>{JSON.stringify(metadata, null, 2)}</AdminJsonPreview>
      ) : (
        <AdminState>Store nema zadna metadata.</AdminState>
      )}
    </AdminSettingsPanel>
  )
}

function StoreJsonPanel({ store }: { store: AdminStoreSummary }) {
  return (
    <AdminSettingsPanel>
      <AdminPanelHeader
        subtitle={`${Object.keys(store).length} keys`}
        title="JSON"
      />
      <AdminJsonPreview>{JSON.stringify(store, null, 2)}</AdminJsonPreview>
    </AdminSettingsPanel>
  )
}

function StoreLocalesPanel({
  locales,
}: {
  locales: NonNullable<AdminStoreSummary["supported_locales"]>
}) {
  return (
    <AdminSettingsPanel>
      <AdminPanelHeader
        subtitle="Lokalizace dostupne pro obsah obchodu."
        title="Locales"
      />
      {locales.length === 0 ? (
        <AdminState>Store nema nastavene zadne locales.</AdminState>
      ) : (
        <div className="px-8 py-7">
          <AdminInlineList>
            {locales.map((locale) => (
              <Badge key={locale.locale_code} size="sm" variant="outline">
                {locale.locale?.name ?? locale.locale_code}
              </Badge>
            ))}
          </AdminInlineList>
        </div>
      )}
    </AdminSettingsPanel>
  )
}

function formatCurrencyLabel(currency: AdminStoreCurrency | undefined) {
  if (!currency) {
    return "-"
  }

  const code = currency.currency_code.toUpperCase()
  const name = currency.currency?.name

  return name ? `${code} ${name}` : code
}

function renderTaxInclusivePricing(
  preference: AdminPricePreference | undefined,
  isLoading: boolean,
  isError: boolean
) {
  if (isLoading) {
    return "Loading..."
  }

  if (isError) {
    return "Unavailable"
  }

  if (typeof preference?.is_tax_inclusive !== "boolean") {
    return "Unavailable"
  }

  return (
    <Badge
      size="sm"
      variant={preference.is_tax_inclusive ? "success" : "outline"}
    >
      {preference.is_tax_inclusive ? "True" : "False"}
    </Badge>
  )
}

function formatReferenceLabel(
  name: string | null | undefined,
  fallbackId: string | null | undefined,
  isLoading: boolean
) {
  if (isLoading) {
    return "Loading..."
  }

  return name ?? fallbackId ?? "-"
}
