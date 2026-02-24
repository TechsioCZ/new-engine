import { Badge, Button, Drawer, Input, Label, Select, Text } from "@medusajs/ui"
import { type ChangeEvent, useMemo, useState } from "react"
import type { AdminUpdateCompany } from "../../../../types"
import {
  type CompanyCheckCzInfoResult,
  useCompanyCheckCzAddressCount,
  useCompanyCheckCzInfo,
  useCompanyCheckCzTaxReliability,
  useCompanyCheckVies,
  useRegions,
} from "../../../hooks/api"
import {
  buildCompanyInfoLookupQuery,
  hasAddressCountWarning,
  isDefined,
  normalizeCountryCodeFromCompanyInfo,
  resolveCurrencyFromCountry,
  taxReliabilityBadge,
  toTrimmedOrNull,
  viesValidationBadge,
} from "../../../utils"

export function CompanyForm({
  company,
  handleSubmit,
  loading,
  error,
}: {
  company?: AdminUpdateCompany
  handleSubmit: (data: AdminUpdateCompany) => Promise<void>
  loading: boolean
  error: Error | null
}) {
  const isCreateMode = !company
  const [formData, setFormData] = useState<AdminUpdateCompany>(
    company || ({} as AdminUpdateCompany)
  )
  const [selectedCompanyInfoIndex, setSelectedCompanyInfoIndex] = useState("0")

  const { regions, isPending: regionsLoading } = useRegions()
  const companyInfoLookupQuery = useMemo(
    () => (isCreateMode ? buildCompanyInfoLookupQuery(formData) : undefined),
    [formData, isCreateMode]
  )
  const {
    data: companyInfoResults,
    isFetching: isCompanyInfoFetching,
    error: companyInfoError,
    refetch: refetchCompanyInfo,
  } = useCompanyCheckCzInfo(companyInfoLookupQuery, {
    enabled: false,
    retry: false,
  })
  const {
    data: addressCountData,
    isFetching: isAddressCountFetching,
    error: addressCountError,
  } = useCompanyCheckCzAddressCount(
    {
      street: formData.address,
      city: formData.city,
    },
    {
      retry: false,
    }
  )
  const {
    data: taxReliabilityData,
    isFetching: isTaxReliabilityFetching,
    error: taxReliabilityError,
  } = useCompanyCheckCzTaxReliability(
    {
      vat_identification_number: formData.vat_identification_number,
    },
    {
      retry: false,
    }
  )
  const {
    data: viesData,
    isFetching: isViesFetching,
    error: viesError,
  } = useCompanyCheckVies(
    {
      vat_identification_number: formData.vat_identification_number,
    },
    {
      retry: false,
    }
  )

  const currencyCodes = regions?.map((region) => region.currency_code)
  const countries = regions
    ?.flatMap((region) => region.countries ?? [])
    .filter(isDefined)

  const selectedCompanyInfo = companyInfoResults?.[Number(selectedCompanyInfoIndex)]
  const taxReliability = taxReliabilityBadge(taxReliabilityData?.reliable)
  const viesValidation = viesValidationBadge(viesData)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "company_identification_number") {
      setFormData((previousFormData) => ({
        ...previousFormData,
        company_identification_number: toTrimmedOrNull(value),
      }))
      return
    }

    if (name === "vat_identification_number") {
      setFormData((previousFormData) => ({
        ...previousFormData,
        vat_identification_number: toTrimmedOrNull(value)?.toUpperCase() ?? null,
      }))
      return
    }

    setFormData((previousFormData) => ({
      ...previousFormData,
      [name]: value,
    }))
  }

  const handleCurrencyChange = (value: string) => {
    setFormData((previousFormData) => ({
      ...previousFormData,
      currency_code: value,
    }))
  }

  const handleCountryChange = (value: string) => {
    setFormData((previousFormData) => ({
      ...previousFormData,
      country: value,
    }))
  }

  const handleLookupCompanyInfo = async () => {
    if (!companyInfoLookupQuery) {
      return
    }

    const result = await refetchCompanyInfo()

    if (result.data?.length) {
      setSelectedCompanyInfoIndex("0")
    }
  }

  const handleApplyCompanyInfo = (companyInfo: CompanyCheckCzInfoResult) => {
    const normalizedCountry = normalizeCountryCodeFromCompanyInfo(
      companyInfo.country_code
    )
    const resolvedCurrencyCode = resolveCurrencyFromCountry(
      normalizedCountry,
      regions
    )

    setFormData((previousFormData) => ({
      ...previousFormData,
      name: companyInfo.company_name || previousFormData.name || "",
      address: companyInfo.street || previousFormData.address || "",
      city: companyInfo.city || previousFormData.city || "",
      zip: companyInfo.postal_code || previousFormData.zip || "",
      country: normalizedCountry ?? previousFormData.country,
      currency_code: resolvedCurrencyCode ?? previousFormData.currency_code,
      company_identification_number:
        companyInfo.company_identification_number ||
        previousFormData.company_identification_number ||
        null,
      vat_identification_number:
        companyInfo.vat_identification_number?.toUpperCase() ||
        previousFormData.vat_identification_number ||
        null,
    }))
  }

  const hasAddressCountWarningState = hasAddressCountWarning(addressCountData?.count)

  return (
    <form>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          {isCreateMode && (
            <div className="mt-2 flex flex-col gap-2 rounded-lg border border-ui-border-base p-3">
              <div className="flex items-center justify-between gap-2">
                <Text className="txt-compact-small font-medium">
                  Company registry lookup
                </Text>
                <Button
                  disabled={!companyInfoLookupQuery}
                  isLoading={isCompanyInfoFetching}
                  onClick={handleLookupCompanyInfo}
                  size="small"
                  type="button"
                  variant="secondary"
                >
                  Lookup
                </Button>
              </div>
              <Text className="txt-compact-small text-ui-fg-subtle">
                Uses ICO, then VAT, then company name as lookup input.
              </Text>
              {!companyInfoLookupQuery && (
                <Text className="txt-compact-small text-ui-fg-muted">
                  Enter ICO, VAT, or company name to run autofill.
                </Text>
              )}
              {companyInfoResults && companyInfoResults.length > 0 && (
                <>
                  <Label size="xsmall">Lookup Result</Label>
                  <Select
                    onValueChange={setSelectedCompanyInfoIndex}
                    value={selectedCompanyInfoIndex}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Select a lookup result" />
                    </Select.Trigger>
                    <Select.Content className="z-50">
                      {companyInfoResults.map((result, index) => (
                        <Select.Item
                          key={`${result.company_identification_number}-${index}`}
                          value={String(index)}
                        >
                          {result.company_name || "Unnamed company"} (
                          {result.company_identification_number || "No ICO"})
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  <Button
                    disabled={!selectedCompanyInfo}
                    onClick={() =>
                      selectedCompanyInfo &&
                      handleApplyCompanyInfo(selectedCompanyInfo)
                    }
                    size="small"
                    type="button"
                    variant="secondary"
                  >
                    Apply Selected Result
                  </Button>
                </>
              )}
              {companyInfoResults &&
                companyInfoResults.length === 0 &&
                !isCompanyInfoFetching && (
                  <Text className="txt-compact-small text-ui-fg-muted">
                    No company was found for the current lookup value.
                  </Text>
                )}
              {companyInfoError && (
                <Text className="txt-compact-small text-ui-fg-warning">
                  Lookup failed: {companyInfoError.message}
                </Text>
              )}
            </div>
          )}
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-ui-border-base p-3">
            <Text className="txt-compact-small font-medium">Company Checks</Text>
            <div className="flex items-center justify-between gap-2">
              <Text className="txt-compact-small text-ui-fg-subtle">
                Address concentration
              </Text>
              {isAddressCountFetching ? (
                <Badge color="grey" size="2xsmall">
                  Checking
                </Badge>
              ) : addressCountError ? (
                <Badge color="orange" size="2xsmall">
                  Check unavailable
                </Badge>
              ) : typeof addressCountData?.count === "number" ? (
                <Badge
                  color={hasAddressCountWarningState ? "orange" : "green"}
                  size="2xsmall"
                >
                  {hasAddressCountWarningState
                    ? `Warning (${addressCountData.count})`
                    : `OK (${addressCountData.count})`}
                </Badge>
              ) : (
                <Badge color="grey" size="2xsmall">
                  Not run
                </Badge>
              )}
            </div>
            {hasAddressCountWarningState && (
              <Text className="txt-compact-small text-ui-fg-warning">
                {addressCountData?.count} companies share this address.
              </Text>
            )}
            {addressCountError && (
              <Text className="txt-compact-small text-ui-fg-warning">
                Address count check failed: {addressCountError.message}
              </Text>
            )}
            <div className="flex items-center justify-between gap-2">
              <Text className="txt-compact-small text-ui-fg-subtle">
                VIES VAT verification
              </Text>
              {isViesFetching ? (
                <Badge color="grey" size="2xsmall">
                  Checking
                </Badge>
              ) : viesError ? (
                <Badge color="orange" size="2xsmall">
                  Check unavailable
                </Badge>
              ) : !formData.vat_identification_number ? (
                <Badge color="grey" size="2xsmall">
                  Not run
                </Badge>
              ) : (
                <Badge color={viesValidation.color} size="2xsmall">
                  {viesValidation.label}
                </Badge>
              )}
            </div>
            {viesData?.valid === false && (
              <Text className="txt-compact-small text-ui-fg-warning">
                VAT is not valid in VIES.
              </Text>
            )}
            {viesError && (
              <Text className="txt-compact-small text-ui-fg-warning">
                VIES check failed: {viesError.message}
              </Text>
            )}
            <div className="flex items-center justify-between gap-2">
              <Text className="txt-compact-small text-ui-fg-subtle">
                Tax reliability
              </Text>
              {isTaxReliabilityFetching ? (
                <Badge color="grey" size="2xsmall">
                  Checking
                </Badge>
              ) : taxReliabilityError ? (
                <Badge color="orange" size="2xsmall">
                  Check unavailable
                </Badge>
              ) : !formData.vat_identification_number ? (
                <Badge color="grey" size="2xsmall">
                  Not run
                </Badge>
              ) : (
                <Badge color={taxReliability.color} size="2xsmall">
                  {taxReliability.label}
                </Badge>
              )}
            </div>
            {taxReliabilityData?.reliable === false &&
              taxReliabilityData.unreliable_published_at && (
                <Text className="txt-compact-small text-ui-fg-warning">
                  Published as unreliable payer on{" "}
                  {taxReliabilityData.unreliable_published_at}.
                </Text>
              )}
            {taxReliabilityError && (
              <Text className="txt-compact-small text-ui-fg-warning">
                Tax reliability check failed: {taxReliabilityError.message}
              </Text>
            )}
          </div>
          <Label size="xsmall">Company Name</Label>
          <Input
            name="name"
            onChange={handleChange}
            placeholder="Medusa"
            type="text"
            value={formData.name || ""}
          />
          <Label size="xsmall">Company Identification Number (ICO)</Label>
          <Input
            name="company_identification_number"
            onChange={handleChange}
            placeholder="12345678"
            type="text"
            value={formData.company_identification_number || ""}
          />
          <Label size="xsmall">VAT Identification Number (DIC)</Label>
          <Input
            name="vat_identification_number"
            onChange={handleChange}
            placeholder="CZ12345678"
            type="text"
            value={formData.vat_identification_number || ""}
          />
          <Label size="xsmall">Company Address</Label>
          <Input
            name="address"
            onChange={handleChange}
            placeholder="1234 Main St"
            type="text"
            value={formData.address || ""}
          />
          <Label size="xsmall">Company City</Label>
          <Input
            name="city"
            onChange={handleChange}
            placeholder="New York"
            type="text"
            value={formData.city || ""}
          />
          <Label size="xsmall">Company Zip</Label>
          <Input
            name="zip"
            onChange={handleChange}
            placeholder="10001"
            type="text"
            value={formData.zip || ""}
          />
          <div className="flex w-full gap-4">
            <div className="flex w-1/2 flex-col gap-2">
              <Label size="xsmall">Company Country</Label>
              <Select
                disabled={regionsLoading}
                name="country"
                onValueChange={handleCountryChange}
                value={formData.country || ""}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder="Select a country" />
                </Select.Trigger>
                <Select.Content className="z-50">
                  {countries?.map((country) => (
                    <Select.Item
                      key={country?.iso_2 || ""}
                      value={country?.iso_2 || ""}
                    >
                      {country?.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex w-1/2 flex-col gap-2">
              <Label size="xsmall">Currency</Label>

              <Select
                defaultValue={currencyCodes?.[0]}
                disabled={regionsLoading}
                name="currency_code"
                onValueChange={handleCurrencyChange}
                value={formData.currency_code || ""}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder="Select a currency" />
                </Select.Trigger>

                <Select.Content className="z-50">
                  {currencyCodes?.map((currencyCode) => (
                    <Select.Item key={currencyCode} value={currencyCode}>
                      {currencyCode.toUpperCase()}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
          <Label size="xsmall">Company State</Label>
          <Input
            name="state"
            onChange={handleChange}
            placeholder="NY"
            type="text"
            value={formData.state || ""}
          />
          <Label size="xsmall">Company Email</Label>
          <Input
            name="email"
            onChange={handleChange}
            placeholder="medusa@medusa.com"
            type="email"
            value={formData.email || ""}
          />
          <Label size="xsmall">Company Phone</Label>
          <Input
            name="phone"
            onChange={handleChange}
            placeholder="1234567890"
            type="text"
            value={formData.phone || ""}
          />
          {/* TODO: Add logo upload */}
          <Label size="xsmall">Company Logo URL</Label>
          <Input
            name="logo_url"
            onChange={handleChange}
            placeholder="https://example.com/logo.png"
            type="text"
            value={formData.logo_url || ""}
          />
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button variant="secondary">Cancel</Button>
        </Drawer.Close>
        <Button
          isLoading={loading}
          type="button"
          onClick={async () => await handleSubmit(formData)}
        >
          Save
        </Button>
        {error && (
          <Text className="txt-compact-small text-ui-fg-warning">
            Error: {error?.message}
          </Text>
        )}
      </Drawer.Footer>
    </form>
  )
}
