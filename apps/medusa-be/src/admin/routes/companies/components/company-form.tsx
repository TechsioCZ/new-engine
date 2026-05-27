import { Button, Drawer, Input, Label, Select, Text } from "@medusajs/ui"
import { useState } from "react"
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

  return (
    <form>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <Label size="xsmall">Company Name</Label>
          <Input
            name="name"
            onChange={handleChange}
            placeholder="Medusa"
            type="text"
            value={formData.name}
          />
          <Label size="xsmall">Company Phone</Label>
          <Input
            name="phone"
            onChange={handleChange}
            placeholder="1234567890"
            type="text"
            value={formData.phone}
          />
          <Label size="xsmall">Company Email</Label>
          <Input
            name="email"
            onChange={handleChange}
            placeholder="medusa@medusa.com"
            type="email"
            value={formData.email}
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
          <Label size="xsmall">Company State</Label>
          <Input
            name="state"
            onChange={handleChange}
            placeholder="NY"
            type="text"
            value={formData.state || ""}
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
