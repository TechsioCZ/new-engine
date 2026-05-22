import { useMemo } from "react"
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

export function StoreSettingsPage() {
  const store = useAdminStoreDetail()

  if (store.isLoading) {
    return (
      <section className="admin-page">
        <PageTitle eyebrow="Settings" title="Store" />
        <div aria-busy="true" className="admin-panel admin-settings-panel">
          <div className="admin-table-state">Nacitam store nastaveni...</div>
        </div>
      </section>
    )
  }

  if (store.isError) {
    return (
      <section className="admin-page">
        <PageTitle eyebrow="Settings" title="Store" />
        <div className="admin-panel admin-settings-panel">
          <div className="admin-table-state admin-table-state-error">
            Store nastaveni se nepodarilo nacist.
          </div>
        </div>
      </section>
    )
  }

  if (!store.data) {
    return (
      <section className="admin-page">
        <PageTitle eyebrow="Settings" title="Store" />
        <div className="admin-panel admin-settings-panel">
          <div className="admin-table-state">
            Zadny aktivni store nebyl nalezen.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <PageTitle eyebrow="Settings" title="Store" />
      <div className="admin-detail-stack">
        <StoreGeneralPanel store={store.data} />
        <StoreCurrenciesPanel
          currencies={store.data.supported_currencies ?? []}
        />
        <StoreLocalesPanel locales={store.data.supported_locales ?? []} />
        <StoreMetadataPanel metadata={store.data.metadata} />
        <StoreJsonPanel store={store.data} />
      </div>
    </section>
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
    <div className="admin-panel admin-settings-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Store</h2>
          <span>Zakladni nastaveni obchodu dostupne pres Admin API.</span>
        </div>
      </div>
      <div className="admin-key-value-list">
        <KeyValue label="Name" value={store.name} />
        <KeyValue
          label="Default currency"
          value={formatCurrencyLabel(defaultCurrency)}
        />
        <KeyValue
          label="Default region"
          value={formatReferenceLabel(
            region.data?.region.name,
            store.default_region_id,
            region.isLoading
          )}
        />
        <KeyValue
          label="Default sales channel"
          value={formatReferenceLabel(
            salesChannel.data?.sales_channel.name,
            store.default_sales_channel_id,
            salesChannel.isLoading
          )}
        />
        <KeyValue
          label="Default location"
          value={formatReferenceLabel(
            stockLocation.data?.stock_location.name,
            store.default_location_id,
            stockLocation.isLoading
          )}
        />
      </div>
    </div>
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
    <div className="admin-panel admin-settings-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Currencies</h2>
          <span>Meny povolene pro tento store.</span>
        </div>
      </div>
      {currencies.length === 0 ? (
        <div className="admin-table-state">
          Store nema nastavene zadne meny.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-data-table admin-data-table-compact">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Tax inclusive pricing</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency) => (
                <tr key={currency.currency_code.toLowerCase()}>
                  <td>
                    <span className="admin-pill">
                      {currency.currency_code.toUpperCase()}
                    </span>
                  </td>
                  <td>{currency.currency?.name ?? "-"}</td>
                  <td>
                    {formatTaxInclusivePricing(
                      pricePreferenceByCode.get(
                        currency.currency_code.toLowerCase()
                      ),
                      pricePreferences.isLoading,
                      pricePreferences.isError
                    )}
                  </td>
                  <td>{currency.is_default ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StoreMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const keyCount = Object.keys(metadata ?? {}).length

  return (
    <div className="admin-panel admin-settings-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Metadata</h2>
          <span>{keyCount} keys</span>
        </div>
      </div>
      {keyCount > 0 ? (
        <pre className="admin-json-preview">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      ) : (
        <div className="admin-table-state">Store nema zadna metadata.</div>
      )}
    </div>
  )
}

function StoreJsonPanel({ store }: { store: AdminStoreSummary }) {
  return (
    <div className="admin-panel admin-settings-panel">
      <div className="admin-panel-header">
        <div>
          <h2>JSON</h2>
          <span>{Object.keys(store).length} keys</span>
        </div>
      </div>
      <pre className="admin-json-preview">{JSON.stringify(store, null, 2)}</pre>
    </div>
  )
}

function StoreLocalesPanel({
  locales,
}: {
  locales: NonNullable<AdminStoreSummary["supported_locales"]>
}) {
  return (
    <div className="admin-panel admin-settings-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Locales</h2>
          <span>Lokalizace dostupne pro obsah obchodu.</span>
        </div>
      </div>
      {locales.length === 0 ? (
        <div className="admin-table-state">
          Store nema nastavene zadne locales.
        </div>
      ) : (
        <div className="admin-inline-list admin-store-inline-list">
          {locales.map((locale) => (
            <span className="admin-pill" key={locale.locale_code}>
              {locale.locale?.name ?? locale.locale_code}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-key-value-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
    </header>
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

function formatTaxInclusivePricing(
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

  return preference?.is_tax_inclusive ? "True" : "False"
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
