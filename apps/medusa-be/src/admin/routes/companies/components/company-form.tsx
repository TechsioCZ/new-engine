import { Button, Drawer, Input, Label, Select, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { AdminUpdateCompany } from "../../../../types"
import { useRegions } from "../../../hooks/api"

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
  const { t } = useTranslation("companies")
  const [formData, setFormData] = useState<AdminUpdateCompany>(
    company || ({} as AdminUpdateCompany)
  )

  const { regions, isPending: regionsLoading } = useRegions()

  const currencyCodes = regions?.map((region) => region.currency_code)
  const countries = regions?.flatMap((region) => region.countries)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCurrencyChange = (value: string) => {
    setFormData({ ...formData, currency_code: value })
  }

  const handleCountryChange = (value: string) => {
    setFormData({ ...formData, country: value })
  }

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await handleSubmit(formData)
  }

  return (
    <form onSubmit={handleFormSubmit}>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <Label size="xsmall">{t("fields.name")}</Label>
          <Input
            name="name"
            onChange={handleChange}
            placeholder={t("placeholders.name")}
            type="text"
            value={formData.name}
          />
          <Label size="xsmall">{t("fields.phone")}</Label>
          <Input
            name="phone"
            onChange={handleChange}
            placeholder={t("placeholders.phone")}
            type="text"
            value={formData.phone}
          />
          <Label size="xsmall">{t("fields.email")}</Label>
          <Input
            name="email"
            onChange={handleChange}
            placeholder={t("placeholders.email")}
            type="email"
            value={formData.email}
          />
          <Label size="xsmall">{t("fields.address")}</Label>
          <Input
            name="address"
            onChange={handleChange}
            placeholder={t("placeholders.address")}
            type="text"
            value={formData.address || ""}
          />
          <Label size="xsmall">{t("fields.city")}</Label>
          <Input
            name="city"
            onChange={handleChange}
            placeholder={t("placeholders.city")}
            type="text"
            value={formData.city || ""}
          />
          <Label size="xsmall">{t("fields.state")}</Label>
          <Input
            name="state"
            onChange={handleChange}
            placeholder={t("placeholders.state")}
            type="text"
            value={formData.state || ""}
          />
          <Label size="xsmall">{t("fields.zip")}</Label>
          <Input
            name="zip"
            onChange={handleChange}
            placeholder={t("placeholders.zip")}
            type="text"
            value={formData.zip || ""}
          />
          <div className="flex w-full gap-4">
            <div className="flex w-1/2 flex-col gap-2">
              <Label size="xsmall">{t("fields.country")}</Label>
              <Select
                disabled={regionsLoading}
                name="country"
                onValueChange={handleCountryChange}
                value={formData.country || ""}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder={t("form.selectCountry")} />
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
              <Label size="xsmall">{t("fields.currency")}</Label>

              <Select
                defaultValue={currencyCodes?.[0]}
                disabled={regionsLoading}
                name="currency_code"
                onValueChange={handleCurrencyChange}
                value={formData.currency_code || ""}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder={t("form.selectCurrency")} />
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
          {/* TODO: Add logo upload */}
          <Label size="xsmall">{t("fields.logoUrl")}</Label>
          <Input
            name="logo_url"
            onChange={handleChange}
            placeholder={t("placeholders.logoUrl")}
            type="text"
            value={formData.logo_url || ""}
          />
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button type="button" variant="secondary">
            {t("actions.cancel")}
          </Button>
        </Drawer.Close>
        <Button isLoading={loading} type="submit">
          {t("actions.save")}
        </Button>
        {error && (
          <Text className="txt-compact-small text-ui-fg-warning">
            {t("errors.saveErrorPrefix")} {error?.message}
          </Text>
        )}
      </Drawer.Footer>
    </form>
  )
}
