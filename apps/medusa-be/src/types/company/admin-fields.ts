export const adminCompanyDisplayFields = [
  "id",
  "name",
  "logo_url",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "country",
  "currency_code",
  "deleted_at",
  "*employees",
  "*employees.customer",
  "*employees.company",
  "*customer_group",
  "*approval_settings",
] as const

export const adminCompanyDisplayFieldsQuery =
  adminCompanyDisplayFields.join(",")
