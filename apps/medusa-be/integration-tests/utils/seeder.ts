import type { MedusaSuiteOptions } from "@medusajs/test-utils"

type TestApi = MedusaSuiteOptions["api"]
interface TestHeaders {
  headers: Record<string, string>
}
type SeederData = Record<string, unknown>

interface AdminSeederInput {
  api: TestApi
  adminHeaders: TestHeaders
  data: SeederData
}

interface StoreSeederInput {
  api: TestApi
  storeHeaders: TestHeaders
  data: SeederData
}

export async function regionSeeder({
  api,
  adminHeaders,
  data,
}: AdminSeederInput) {
  return (
    await api.post(
      "/admin/regions",
      { currency_code: "usd", name: "Test region", ...data },
      adminHeaders,
    )
  ).data.region
}

export async function salesChannelSeeder({
  api,
  adminHeaders,
  data,
}: AdminSeederInput) {
  return (
    await api.post(
      "/admin/sales-channels",
      { name: "test sales channel", ...data },
      adminHeaders,
    )
  ).data.sales_channel
}

export async function productSeeder({
  api,
  adminHeaders,
  data,
}: AdminSeederInput) {
  return (
    await api.post(
      "/admin/products",
      {
        handle: "test-product",
        options: [
          { title: "size", values: ["large", "small"] },
          { title: "color", values: ["green"] },
        ],
        status: "published",
        title: "Test Product",
        variants: [
          {
            title: "Test variant",
            sku: "test-variant",
            manage_inventory: false,
            prices: [
              {
                currency_code: "usd",
                amount: 100,
              },
            ],
            options: {
              size: "large",
              color: "green",
            },
          },
        ],
        ...data,
      },
      adminHeaders,
    )
  ).data.product
}

export async function cartSeeder({
  api,
  storeHeaders,
  data,
}: StoreSeederInput) {
  return (
    await api.post(
      "/store/carts",
      {
        currency_code: "usd",
        email: "tony@stark-industries.com",
        shipping_address: {
          address_1: "test address 1",
          address_2: "test address 2",
          city: "ny",
          country_code: "us",
          postal_code: "94016",
          province: "ny",
        },
        ...data,
      },
      storeHeaders,
    )
  ).data.cart
}
