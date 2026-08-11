import {
  Button,
  Checkbox,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
} from "@medusajs/ui"
import type { Dispatch, FormEvent, SetStateAction } from "react"
import { useEffect, useMemo, useState } from "react"
import {
  type SalesChannelOption,
  type SearchIndexType,
  type SearchProfile,
  type SearchProfileInput,
  toSearchProfileInput,
} from "../../../../lib/search-profiles"

const INDEX_TYPES: SearchIndexType[] = [
  "product",
  "category",
  "brand",
  "content",
]

type AutocompleteLimitField =
  | "autocomplete_product_limit"
  | "autocomplete_category_limit"
  | "autocomplete_brand_limit"
  | "autocomplete_content_limit"

const AUTOCOMPLETE_LIMIT_FIELD_BY_TYPE: Record<
  SearchIndexType,
  AutocompleteLimitField
> = {
  product: "autocomplete_product_limit",
  category: "autocomplete_category_limit",
  brand: "autocomplete_brand_limit",
  content: "autocomplete_content_limit",
}

const NumberField = ({
  description,
  label,
  max,
  min = 1,
  onChange,
  value,
}: {
  description: string
  label: string
  max: number
  min?: number
  onChange: (value: number) => void
  value: number
}) => {
  const id = `search-profile-${label.toLowerCase().replaceAll(" ", "-")}`

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>

      <Input
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        required
        type="number"
        value={value}
      />

      <Text className="text-ui-fg-subtle" size="xsmall">
        {description}
      </Text>
    </div>
  )
}

const ToggleField = ({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean
  description: string
  label: string
  onCheckedChange: (checked: boolean) => void
}) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-ui-border-base p-3">
    <div>
      <Text weight="plus">{label}</Text>

      <Text className="text-ui-fg-subtle" size="small">
        {description}
      </Text>
    </div>

    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
)

const normalizeProfileKeySegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/[^a-z0-9_-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")
const generatedProfileKey = (form: SearchProfileInput) =>
  [form.shop, form.domain, form.locale]
    .map(normalizeProfileKeySegment)
    .filter(Boolean)
    .join("-")

const SearchProfileFields = ({
  form,
  salesChannels,
  setForm,
}: {
  form: SearchProfileInput
  salesChannels: SalesChannelOption[]
  setForm: Dispatch<SetStateAction<SearchProfileInput>>
}) => {
  const effectiveScore =
    form.minimum_ranking_score ?? (form.strict ? 0.98 : 0.55)

  const toggleSalesChannel = (id: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      sales_channel_ids: checked
        ? [...new Set([...current.sales_channel_ids, id])]
        : current.sales_channel_ids.filter((entry) => entry !== id),
    }))
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section className="flex flex-col gap-4">
        <div>
          <Heading level="h2">Storefront scope</Heading>

          <Text className="text-ui-fg-subtle" size="small">
            The stable Shop, Domain ID, and Language generate the profile key.
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="search-profile-key">Profile key</Label>

            <Input
              id="search-profile-key"
              placeholder="herbatika-1-sk"
              readOnly
              required
              value={generatedProfileKey(form)}
            />
          </div>

          {(
            [
              ["shop", "Shop", "herbatika"],
              ["domain", "Domain ID", "1"],
              ["locale", "Language", "sk"],
            ] as const
          ).map(([field, label, placeholder]) => (
            <div className="flex flex-col gap-2" key={field}>
              <Label htmlFor={`search-profile-${field}`}>{label}</Label>

              <Input
                id={`search-profile-${field}`}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field]: event.target.value.toLowerCase(),
                  }))
                }
                placeholder={placeholder}
                required
                value={form[field]}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <Heading level="h2">Sales Channels</Heading>

          <Text className="text-ui-fg-subtle" size="small">
            Assign the Sales Channels where this profile provides search. A
            profile without an assigned Sales Channel is disabled.
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {salesChannels.length ? (
            salesChannels.map((channel) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-ui-border-base p-3"
                htmlFor={`search-profile-channel-${channel.id}`}
                key={channel.id}
              >
                <Checkbox
                  checked={form.sales_channel_ids.includes(channel.id)}
                  id={`search-profile-channel-${channel.id}`}
                  onCheckedChange={(checked) =>
                    toggleSalesChannel(channel.id, checked === true)
                  }
                />

                <span>
                  <Text weight="plus">{channel.name}</Text>

                  <Text className="text-ui-fg-subtle" size="xsmall">
                    {channel.id}
                  </Text>
                </span>
              </label>
            ))
          ) : (
            <Text className="text-ui-fg-subtle">
              No Sales Channels were returned by Medusa.
            </Text>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <Heading level="h2">Search behavior</Heading>

          <Text className="text-ui-fg-subtle" size="small">
            These settings are applied by catalog search, autocomplete, and
            every index rebuild.
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToggleField
            checked={form.strict}
            description="Uses a high relevance threshold and excludes product titles from category documents."
            label="Strict search"
            onCheckedChange={(strict) =>
              setForm((current) => {
                const scoreFollowedPreviousDefault =
                  current.minimum_ranking_score ===
                  (current.strict ? 0.98 : 0.55)

                return {
                  ...current,
                  strict,
                  minimum_ranking_score: scoreFollowedPreviousDefault
                    ? null
                    : current.minimum_ranking_score,
                }
              })
            }
          />

          <ToggleField
            checked={form.separate_variant_results}
            description="Show every matching variant as its own product card. Disable to group matches into one product card."
            label="Separate matching variants"
            onCheckedChange={(separateVariantResults) =>
              setForm((current) => ({
                ...current,
                separate_variant_results: separateVariantResults,
              }))
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="search-profile-availability">Availability</Label>

            <Select
              onValueChange={(availability) =>
                setForm((current) => ({
                  ...current,
                  availability: availability as "all" | "in-stock",
                }))
              }
              value={form.availability}
            >
              <Select.Trigger id="search-profile-availability">
                <Select.Value />
              </Select.Trigger>

              <Select.Content>
                <Select.Item value="all">
                  All published and orderable products
                </Select.Item>

                <Select.Item value="in-stock">
                  Only products in stock
                </Select.Item>
              </Select.Content>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="search-profile-ranking-score">
              Minimum ranking score
            </Label>

            <Input
              id="search-profile-ranking-score"
              max={1}
              min={0}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  minimum_ranking_score:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                }))
              }
              placeholder={`Automatic: ${form.strict ? "0.98" : "0.55"}`}
              step="0.01"
              type="number"
              value={form.minimum_ranking_score ?? ""}
            />

            <Text className="text-ui-fg-subtle" size="xsmall">
              Effective score: {effectiveScore}. Leave empty to follow the
              strict/loose default.
            </Text>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <Heading level="h2">Result limits</Heading>

          <Text className="text-ui-fg-subtle" size="small">
            Keep browser payloads and authoritative Medusa hydration bounded on
            large shops.
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NumberField
            description="Maximum products returned on one catalog page."
            label="Results per page"
            max={100}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                max_results_per_page: value,
              }))
            }
            value={form.max_results_per_page}
          />

          <NumberField
            description="Maximum Meilisearch candidates hydrated for exact ranking and price sorting."
            label="Full search candidates"
            max={1000}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                full_search_limit: value,
              }))
            }
            value={form.full_search_limit}
          />

          <NumberField
            description="Products returned by an empty-query popular-products panel."
            label="Popular products"
            max={48}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                popular_limit: value,
              }))
            }
            value={form.popular_limit}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {INDEX_TYPES.map((type) => {
            const field = AUTOCOMPLETE_LIMIT_FIELD_BY_TYPE[type]

            return (
              <NumberField
                description={`${type[0]?.toUpperCase() + type.slice(1)} suggestions.`}
                key={type}
                label={`Autocomplete ${type}`}
                max={24}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    [field]: value,
                  }))
                }
                value={form[field]}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

export const SearchProfileFormModal = ({
  onOpenChange,
  onSubmit,
  open,
  profile,
  salesChannels,
  submitting,
}: {
  onOpenChange: (open: boolean) => void
  onSubmit: (input: SearchProfileInput) => void
  open: boolean
  profile?: SearchProfile
  salesChannels: SalesChannelOption[]
  submitting: boolean
}) => {
  const [form, setForm] = useState<SearchProfileInput>(() =>
    toSearchProfileInput(profile)
  )

  useEffect(() => {
    if (open) {
      setForm(toSearchProfileInput(profile))
    }
  }, [open, profile])

  const valid = useMemo(
    () =>
      [generatedProfileKey(form), form.shop, form.domain, form.locale].every(
        (value) => value.trim().length > 0
      ) &&
      [
        form.autocomplete_product_limit,
        form.autocomplete_category_limit,
        form.autocomplete_brand_limit,
        form.autocomplete_content_limit,
        form.full_search_limit,
        form.max_results_per_page,
        form.popular_limit,
      ].every((value) => Number.isInteger(value) && value > 0) &&
      (form.minimum_ranking_score === null ||
        (form.minimum_ranking_score >= 0 && form.minimum_ranking_score <= 1)),

    [form]
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const submittedForm = {
      ...form,
      key: generatedProfileKey(form),
      shop: form.shop.trim(),
      domain: form.domain.trim(),
      locale: form.locale.trim(),
    }

    onSubmit(submittedForm)
  }

  return (
    <FocusModal onOpenChange={onOpenChange} open={open}>
      <FocusModal.Content>
        <form
          className="flex h-full flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <FocusModal.Header>
            <FocusModal.Title>
              {profile ? `Edit ${profile.key}` : "Create search profile"}
            </FocusModal.Title>
          </FocusModal.Header>

          <FocusModal.Body className="overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-6 py-8">
              <SearchProfileFields
                form={form}
                salesChannels={salesChannels}
                setForm={setForm}
              />
            </div>
          </FocusModal.Body>

          <FocusModal.Footer>
            <div className="flex w-full justify-end gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>

              <Button disabled={!valid} isLoading={submitting} type="submit">
                Save profile
              </Button>
            </div>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}
