/** Local demonstration rules, not payment-provider or server-side validation. */
const CARD_EXPIRY = /^(\d{2})\/(\d{2})$/
const PRODUCT_SKU = /^[A-Z0-9][A-Z0-9-]{2,}$/
export function cardExpiryValid(value: string, now = new Date()): boolean {
  const match = CARD_EXPIRY.exec(value.trim())
  if (!match) {
    return false
  }
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  return (
    month >= 1 &&
    month <= 12 &&
    year * 12 + month >= now.getFullYear() * 12 + now.getMonth() + 1
  )
}

export function parcelComplete(
  values: readonly (number | undefined)[]
): boolean {
  return (
    values.length === 4 &&
    values.every(
      (value) => value !== undefined && Number.isFinite(value) && value > 0
    )
  )
}

/** Prices are exclusive of tax. Calculate and round in integer euro cents. */
export function orderAmounts(
  lines: readonly { qty: number; unitPrice: number }[],
  deliveryMinor = 0,
  taxBasisPoints = 2100
) {
  const subtotalMinor = lines.reduce(
    (sum, line) => sum + line.qty * Math.round(line.unitPrice * 100),
    0
  )
  const taxMinor = Math.round((subtotalMinor * taxBasisPoints) / 10_000)
  const capturedMinor = subtotalMinor + deliveryMinor + taxMinor
  return { subtotalMinor, deliveryMinor, taxMinor, capturedMinor }
}

export function normalizeProductDraft<T extends { name: string; sku: string }>(
  draft: T,
  rows: readonly { id: string; sku: string }[],
  editingId?: string
) {
  const normalized = {
    ...draft,
    name: draft.name.trim(),
    sku: draft.sku.trim().toUpperCase(),
  }
  const errors: { name?: string; sku?: string } = {}
  if (normalized.name.length < 3) {
    errors.name =
      "Enter a product name with at least 3 characters after trimming."
  }
  if (!PRODUCT_SKU.test(normalized.sku)) {
    errors.sku =
      "Use at least 3 letters, numbers or hyphens; start with a letter or number."
  } else if (
    rows.some(
      (row) =>
        row.id !== editingId && row.sku.trim().toUpperCase() === normalized.sku
    )
  ) {
    errors.sku =
      "This SKU already belongs to another product. Enter a unique SKU."
  }
  return { normalized, errors }
}

export function templateText(
  text: string,
  registry: readonly { token: string; sample: string }[]
) {
  const samples = new Map(registry.map((entry) => [entry.token, entry.sample]))
  const unknown = [...new Set(text.match(/\{\{[^{}]*\}\}/g) ?? [])].filter(
    (token) => !samples.has(token)
  )
  return {
    unknown,
    rendered: text.replace(
      /\{\{[^{}]*\}\}/g,
      (token) => samples.get(token) ?? token
    ),
  }
}

export function paymentPathError(
  shipping: readonly {
    name: string
    enabled: boolean
    customers: string
    payments: readonly string[]
  }[],
  payments: readonly { id: string; enabled: boolean; customers: string }[]
): string | undefined {
  for (const method of shipping) {
    if (!method.enabled) {
      continue
    }
    const audiences =
      method.customers === "all" ? ["B2C", "B2B"] : [method.customers]
    for (const audience of audiences) {
      if (
        !payments.some(
          (payment) =>
            payment.enabled &&
            method.payments.includes(payment.id) &&
            (payment.customers === "all" || payment.customers === audience)
        )
      ) {
        return `${method.name} needs an enabled payment available to ${audience}. Add a compatible payment or disable this shipping method first.`
      }
    }
  }
  return undefined
}
