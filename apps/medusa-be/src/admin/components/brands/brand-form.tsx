import { Trash } from "@medusajs/icons"
import {
  Button,
  Checkbox,
  Drawer,
  FocusModal,
  Input,
  Label,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useTranslation } from "react-i18next"

import { brandQueryKeys, createBrand, updateBrand } from "../../lib/brands"
import type {
  Brand,
  BrandAttribute,
  BrandAttributeType,
  BrandInput,
} from "../../lib/brands"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const TEXT_FIELD_NAMES = [
  "gpsr_contact_email",
  "gpsr_european_reseller_contact_email",
  "gpsr_european_reseller_manufacturing_company_name",
  "gpsr_european_reseller_postal_address",
  "gpsr_manufacturing_company_name",
  "gpsr_postal_address",
  "handle",
  "title",
] as const
const GPSR_EMAIL_FIELDS = [
  "gpsr_contact_email",
  "gpsr_european_reseller_contact_email",
] as const
const GPSR_REPRESENTATIVE_FIELDS = [
  "gpsr_european_reseller_manufacturing_company_name",
  "gpsr_european_reseller_postal_address",
  "gpsr_european_reseller_contact_email",
] as const

/**
 * Attribute rows carry a client-side `rowKey` so React can keep a row mounted
 * while its attribute type changes. Persisted ids are absent on freshly added
 * rows and the attribute name changes as the user edits, so neither is usable
 * as a stable list key. `rowKey` never leaves the form: {@link toBrandInput}
 * projects rows down to the `name`/`value` pair the API expects.
 */
export interface BrandAttributeRow extends BrandAttribute {
  rowKey: string
}

export interface BrandFormState {
  attributes: BrandAttributeRow[]
  gpsr_contact_email: string
  gpsr_european_reseller_contact_email: string
  gpsr_european_reseller_manufacturing_company_name: string
  gpsr_european_reseller_postal_address: string
  gpsr_manufactured_outside_eu: boolean
  gpsr_manufacturing_company_name: string
  gpsr_postal_address: string
  handle: string
  title: string
}

type TextFieldName = (typeof TEXT_FIELD_NAMES)[number]

type BrandFormErrors = Partial<Record<TextFieldName, string>>

let attributeRowSeed = 0

const nextAttributeRowKey = () => {
  attributeRowSeed += 1

  return `brand-attribute-${attributeRowSeed}`
}

const isLiveAttribute = (attribute: BrandAttribute) =>
  (attribute.attribute_type_deleted_at ?? "").length === 0

const isSelectableAttributeType = (
  attributeType: BrandAttributeType,
  selectedNames: ReadonlySet<string>,
) =>
  (attributeType.deleted_at ?? "").length === 0 &&
  !selectedNames.has(attributeType.name)

const toAttributeRow = (attribute: BrandAttribute): BrandAttributeRow => ({
  ...attribute,
  rowKey: nextAttributeRowKey(),
})

/**
 * Collects the attribute names already taken by other rows. `excludedName` is
 * the name owned by the row being edited, which must stay selectable for it.
 */
const collectSelectedNames = (
  attributes: readonly BrandAttribute[],
  excludedName = "",
): ReadonlySet<string> => {
  const names = new Set<string>()

  for (const attribute of attributes) {
    if (attribute.name.length > 0 && attribute.name !== excludedName) {
      names.add(attribute.name)
    }
  }

  return names
}

const emptyAttribute = (
  attributeTypes: readonly BrandAttributeType[],
  selectedNames: ReadonlySet<string>,
): BrandAttributeRow => ({
  name:
    attributeTypes.find((attributeType) =>
      isSelectableAttributeType(attributeType, selectedNames),
    )?.name ?? "",
  rowKey: nextAttributeRowKey(),
  value: "",
})

const emptyBrandFormState = (): BrandFormState => ({
  attributes: [],
  gpsr_contact_email: "",
  gpsr_european_reseller_contact_email: "",
  gpsr_european_reseller_manufacturing_company_name: "",
  gpsr_european_reseller_postal_address: "",
  gpsr_manufactured_outside_eu: false,
  gpsr_manufacturing_company_name: "",
  gpsr_postal_address: "",
  handle: "",
  title: "",
})

export const toBrandFormState = (brand?: Brand): BrandFormState => {
  if (brand === undefined) {
    return emptyBrandFormState()
  }

  return {
    attributes: brand.attributes.flatMap((attribute) =>
      isLiveAttribute(attribute) ? [toAttributeRow(attribute)] : [],
    ),
    gpsr_contact_email: brand.gpsr_contact_email ?? "",
    gpsr_european_reseller_contact_email:
      brand.gpsr_european_reseller_contact_email ?? "",
    gpsr_european_reseller_manufacturing_company_name:
      brand.gpsr_european_reseller_manufacturing_company_name ?? "",
    gpsr_european_reseller_postal_address:
      brand.gpsr_european_reseller_postal_address ?? "",
    gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu ?? false,
    gpsr_manufacturing_company_name:
      brand.gpsr_manufacturing_company_name ?? "",
    gpsr_postal_address: brand.gpsr_postal_address ?? "",
    handle: brand.handle,
    title: brand.title,
  }
}

const trimmedOrNull = (value: string) => value.trim() || null

const toBrandInput = (form: BrandFormState): BrandInput => ({
  attributes: form.attributes.flatMap((attribute) => {
    const name = attribute.name.trim()

    return name.length === 0 ? [] : [{ name, value: attribute.value }]
  }),
  gpsr_contact_email: trimmedOrNull(form.gpsr_contact_email),
  gpsr_european_reseller_contact_email: trimmedOrNull(
    form.gpsr_european_reseller_contact_email,
  ),
  gpsr_european_reseller_manufacturing_company_name: trimmedOrNull(
    form.gpsr_european_reseller_manufacturing_company_name,
  ),
  gpsr_european_reseller_postal_address: trimmedOrNull(
    form.gpsr_european_reseller_postal_address,
  ),
  gpsr_manufactured_outside_eu: form.gpsr_manufactured_outside_eu,
  gpsr_manufacturing_company_name: trimmedOrNull(
    form.gpsr_manufacturing_company_name,
  ),
  gpsr_postal_address: trimmedOrNull(form.gpsr_postal_address),
  handle: form.handle.trim() || undefined,
  title: form.title.trim(),
})

const validateBrandForm = (
  form: BrandFormState,
  messages: { invalidEmail: string; mustBeEmpty: string; required: string },
) => {
  const errors: BrandFormErrors = {}

  if (!form.title.trim()) {
    errors.title = messages.required
  }

  for (const field of GPSR_EMAIL_FIELDS) {
    const value = form[field].trim()
    if (value && !EMAIL_PATTERN.test(value)) {
      errors[field] = messages.invalidEmail
    }
  }

  for (const field of GPSR_REPRESENTATIVE_FIELDS) {
    const isPresent = form[field].trim().length > 0
    const isInvalid = form.gpsr_manufactured_outside_eu ? !isPresent : isPresent
    if (isInvalid) {
      errors[field] = form.gpsr_manufactured_outside_eu
        ? messages.required
        : messages.mustBeEmpty
    }
  }

  return errors
}

/**
 * Drops the listed fields from the error map by rebuilding it, so cleared
 * fields are absent rather than present with an `undefined` message.
 */
const withoutErrors = (
  errors: BrandFormErrors,
  clearedFields: readonly TextFieldName[],
): BrandFormErrors => {
  const remaining: BrandFormErrors = {}

  for (const field of TEXT_FIELD_NAMES) {
    const message = errors[field]

    if (message !== undefined && !clearedFields.includes(field)) {
      remaining[field] = message
    }
  }

  return remaining
}

const BrandTextField = ({
  errors,
  form,
  id,
  label,
  name,
  required = false,
  setErrors,
  setForm,
  type,
}: {
  errors: BrandFormErrors
  form: BrandFormState
  id: string
  label: string
  name: TextFieldName
  required?: boolean
  setErrors: Dispatch<SetStateAction<BrandFormErrors>>
  setForm: Dispatch<SetStateAction<BrandFormState>>
  type?: "email"
}) => {
  const error = errors[name]
  const errorId = `${id}-error`
  const hasError = error !== undefined && error.length > 0

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : null}
      </Label>
      <Input
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        aria-required={required}
        id={id}
        onChange={(event) => {
          const { value } = event.target

          setForm((current) => ({
            ...current,
            [name]: value,
          }))
          setErrors((current) => withoutErrors(current, [name]))
        }}
        required={required}
        type={type}
        value={form[name]}
      />
      {hasError ? (
        <Text
          className="text-ui-fg-error"
          id={errorId}
          role="alert"
          size="small"
        >
          {error}
        </Text>
      ) : null}
    </div>
  )
}

const BrandFormFields = ({
  attributeTypes,
  errors,
  form,
  idPrefix,
  setErrors,
  setForm,
}: {
  attributeTypes: BrandAttributeType[]
  errors: BrandFormErrors
  form: BrandFormState
  idPrefix: string
  setErrors: Dispatch<SetStateAction<BrandFormErrors>>
  setForm: Dispatch<SetStateAction<BrandFormState>>
}) => {
  const { t } = useTranslation("brands")
  const required = form.gpsr_manufactured_outside_eu
  const selectedAttributeNames = collectSelectedNames(form.attributes)
  const canAddAttribute = attributeTypes.some((attributeType) =>
    isSelectableAttributeType(attributeType, selectedAttributeNames),
  )

  const updateAttribute = (
    rowKey: string,
    key: keyof BrandAttribute,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute) =>
        attribute.rowKey === rowKey
          ? { ...attribute, [key]: value }
          : attribute,
      ),
    }))
  }

  const removeAttribute = (rowKey: string) => {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.filter(
        (attribute) => attribute.rowKey !== rowKey,
      ),
    }))
  }

  const addAttribute = () => {
    setForm((current) => ({
      ...current,
      attributes: [
        ...current.attributes,
        emptyAttribute(attributeTypes, selectedAttributeNames),
      ],
    }))
  }

  const getAttributeOptions = (selectedName: string) => {
    const selectedNames = collectSelectedNames(form.attributes, selectedName)

    return attributeTypes.filter((attributeType) =>
      isSelectableAttributeType(attributeType, selectedNames),
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BrandTextField
        errors={errors}
        form={form}
        id={`${idPrefix}-title`}
        label={t("fields.title")}
        name="title"
        required
        setErrors={setErrors}
        setForm={setForm}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-handle`}>{t("fields.handle")}</Label>
        <Input
          id={`${idPrefix}-handle`}
          onChange={(event) => {
            const { value } = event.target

            setForm((current) => ({
              ...current,
              handle: value,
            }))
          }}
          placeholder={t("form.handlePlaceholder")}
          value={form.handle}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Text leading="compact" size="small" weight="plus">
          {t("fields.gpsr")}
        </Text>
        <div className="grid gap-3 md:grid-cols-2">
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-manufacturing-company-name`}
            label={t("fields.gpsr_manufacturing_company_name")}
            name="gpsr_manufacturing_company_name"
            setErrors={setErrors}
            setForm={setForm}
          />
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-postal-address`}
            label={t("fields.gpsr_postal_address")}
            name="gpsr_postal_address"
            setErrors={setErrors}
            setForm={setForm}
          />
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-contact-email`}
            label={t("fields.gpsr_contact_email")}
            name="gpsr_contact_email"
            setErrors={setErrors}
            setForm={setForm}
            type="email"
          />
          <div className="flex items-center gap-3 rounded-md border border-ui-border-base px-3 py-2">
            <Checkbox
              checked={form.gpsr_manufactured_outside_eu}
              id={`${idPrefix}-gpsr-manufactured-outside-eu`}
              onCheckedChange={(checked) => {
                const isOutsideEu = checked === true
                setForm((current) => ({
                  ...current,
                  gpsr_european_reseller_contact_email: isOutsideEu
                    ? current.gpsr_european_reseller_contact_email
                    : "",
                  gpsr_european_reseller_manufacturing_company_name: isOutsideEu
                    ? current.gpsr_european_reseller_manufacturing_company_name
                    : "",
                  gpsr_european_reseller_postal_address: isOutsideEu
                    ? current.gpsr_european_reseller_postal_address
                    : "",
                  gpsr_manufactured_outside_eu: isOutsideEu,
                }))
                setErrors((current) =>
                  withoutErrors(current, GPSR_REPRESENTATIVE_FIELDS),
                )
              }}
            />
            <Label htmlFor={`${idPrefix}-gpsr-manufactured-outside-eu`}>
              {t("fields.gpsr_manufactured_outside_eu")}
            </Label>
          </div>
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-eu-company-name`}
            label={t(
              "fields.gpsr_european_reseller_manufacturing_company_name",
            )}
            name="gpsr_european_reseller_manufacturing_company_name"
            required={required}
            setErrors={setErrors}
            setForm={setForm}
          />
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-eu-address`}
            label={t("fields.gpsr_european_reseller_postal_address")}
            name="gpsr_european_reseller_postal_address"
            required={required}
            setErrors={setErrors}
            setForm={setForm}
          />
          <div className="md:col-span-2">
            <BrandTextField
              errors={errors}
              form={form}
              id={`${idPrefix}-gpsr-eu-email`}
              label={t("fields.gpsr_european_reseller_contact_email")}
              name="gpsr_european_reseller_contact_email"
              required={required}
              setErrors={setErrors}
              setForm={setForm}
              type="email"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Text leading="compact" size="small" weight="plus">
            {t("attributes.title")}
          </Text>
          <Button
            disabled={!canAddAttribute}
            onClick={addAttribute}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.add")}
          </Button>
        </div>
        {form.attributes.length ? (
          form.attributes.map((attribute) => (
            <div
              className="grid grid-cols-[1fr_1fr_auto] gap-2"
              key={attribute.rowKey}
            >
              <Select
                onValueChange={(value) => {
                  updateAttribute(attribute.rowKey, "name", value)
                }}
                value={attribute.name}
              >
                <Select.Trigger>
                  <Select.Value placeholder={t("fields.attribute")} />
                </Select.Trigger>
                <Select.Content>
                  {getAttributeOptions(attribute.name).map((attributeType) => (
                    <Select.Item
                      key={attributeType.id}
                      value={attributeType.name}
                    >
                      {attributeType.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Input
                onChange={(event) => {
                  updateAttribute(attribute.rowKey, "value", event.target.value)
                }}
                placeholder={t("fields.value")}
                value={attribute.value}
              />
              <Button
                aria-label={t("actions.remove")}
                onClick={() => {
                  removeAttribute(attribute.rowKey)
                }}
                size="small"
                type="button"
                variant="secondary"
              >
                <Trash />
              </Button>
            </div>
          ))
        ) : (
          <Text className="text-ui-fg-subtle" size="small">
            {t("attributes.empty")}
          </Text>
        )}
      </div>
    </div>
  )
}

/**
 * Seeds the draft from `brand` whenever the dialog opens, or while it is open
 * and a different brand is supplied. The reset runs during render — instead of
 * from an effect — so the reopened dialog never paints the previous draft.
 */
const useBrandFormState = (brand: Brand | undefined, open: boolean) => {
  const brandId = brand?.id ?? ""
  const [form, setForm] = useState<BrandFormState>(() =>
    toBrandFormState(brand),
  )
  const [errors, setErrors] = useState<BrandFormErrors>({})
  const [lastOpen, setLastOpen] = useState(false)
  const [lastBrandId, setLastBrandId] = useState(brandId)

  if (open && (!lastOpen || lastBrandId !== brandId)) {
    setForm(toBrandFormState(brand))
    setErrors({})
  }

  if (lastOpen !== open) {
    setLastOpen(open)
  }

  if (lastBrandId !== brandId) {
    setLastBrandId(brandId)
  }

  return { errors, form, setErrors, setForm }
}

const useValidatedSubmit = (
  form: BrandFormState,
  setErrors: Dispatch<SetStateAction<BrandFormErrors>>,
  submit: (input: BrandInput) => void,
) => {
  const { t } = useTranslation("brands")

  return () => {
    const nextErrors = validateBrandForm(form, {
      invalidEmail: t("validation.invalidEmail"),
      mustBeEmpty: t("validation.mustBeEmpty"),
      required: t("validation.required"),
    })

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      toast.error(t("validation.summary"))
      return
    }

    submit(toBrandInput(form))
  }
}

/** Blocks dialog open/close transitions while a save is in flight. */
const createOpenChangeHandler =
  (isPending: boolean, onOpenChange: (open: boolean) => void) =>
  (nextOpen: boolean) => {
    if (!isPending) {
      onOpenChange(nextOpen)
    }
  }

export const BrandCreateModal = ({
  attributeTypes,
  onOpenChange,
  open,
}: {
  attributeTypes: BrandAttributeType[]
  onOpenChange: (open: boolean) => void
  open: boolean
}) => {
  const { t } = useTranslation("brands")
  const queryClient = useQueryClient()
  const { errors, form, setErrors, setForm } = useBrandFormState(
    undefined,
    open,
  )
  const mutation = useMutation({
    mutationFn: createBrand,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveBrandFailed"),
      )
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.attributeTypesLists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.attributeTypeDetails(),
        }),
      ])
      toast.success(t("toasts.brandCreated"))
      onOpenChange(false)
    },
  })
  const save = useValidatedSubmit(form, setErrors, mutation.mutate)
  const handleOpenChange = createOpenChangeHandler(
    mutation.isPending,
    onOpenChange,
  )

  return (
    <FocusModal onOpenChange={handleOpenChange} open={open}>
      <FocusModal.Content
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) {
            event.preventDefault()
          }
        }}
      >
        <FocusModal.Header>
          <FocusModal.Title>{t("form.createBrand")}</FocusModal.Title>
        </FocusModal.Header>
        <FocusModal.Body className="flex justify-center overflow-y-auto px-6 py-8">
          <div className="w-full max-w-3xl">
            <BrandFormFields
              attributeTypes={attributeTypes}
              errors={errors}
              form={form}
              idPrefix="brand-create"
              setErrors={setErrors}
              setForm={setForm}
            />
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                handleOpenChange(false)
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={mutation.isPending}
              isLoading={mutation.isPending}
              onClick={save}
              size="small"
              type="button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

export const BrandEditDrawer = ({
  attributeTypes,
  brand,
  onOpenChange,
  open,
}: {
  attributeTypes: BrandAttributeType[]
  brand: Brand
  onOpenChange: (open: boolean) => void
  open: boolean
}) => {
  const { t } = useTranslation("brands")
  const queryClient = useQueryClient()
  const { errors, form, setErrors, setForm } = useBrandFormState(brand, open)
  const mutation = useMutation({
    mutationFn: async (input: BrandInput) => await updateBrand(brand.id, input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveBrandFailed"),
      )
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.detail(brand.id),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.attributeTypesLists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.attributeTypeDetails(),
        }),
      ])
      toast.success(t("toasts.brandUpdated"))
      onOpenChange(false)
    },
  })
  const save = useValidatedSubmit(form, setErrors, mutation.mutate)
  const handleOpenChange = createOpenChangeHandler(
    mutation.isPending,
    onOpenChange,
  )

  return (
    <Drawer onOpenChange={handleOpenChange} open={open}>
      <Drawer.Content
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) {
            event.preventDefault()
          }
        }}
      >
        <Drawer.Header>
          <Drawer.Title>{t("form.editBrand")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <BrandFormFields
            attributeTypes={attributeTypes}
            errors={errors}
            form={form}
            idPrefix={`brand-edit-${brand.id}`}
            setErrors={setErrors}
            setForm={setForm}
          />
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                handleOpenChange(false)
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={mutation.isPending}
              isLoading={mutation.isPending}
              onClick={save}
              size="small"
              type="button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
