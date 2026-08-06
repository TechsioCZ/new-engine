import { isRecord } from "@techsio/std/object"

interface TestHeaders {
  headers: Record<string, string>
}

interface TestApi {
  post: (url: string, body?: unknown, config?: TestHeaders) => Promise<unknown>
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

const extractSeededEntity = (
  response: unknown,
  entityKey: string,
  context: string,
): unknown => {
  if (!isRecord(response)) {
    throw new TypeError(`Expected ${context} to return an HTTP response`)
  }
  const { data } = response
  if (!isRecord(data)) {
    throw new TypeError(`Expected ${context} response data to be a record`)
  }
  return data[entityKey]
}

export const regionSeeder = async ({
  api,
  adminHeaders,
  data,
}: AdminSeederInput): Promise<unknown> => {
  const response = await api.post(
    "/admin/regions",
    { currency_code: "usd", name: "Test region", ...data },
    adminHeaders,
  )
  return extractSeededEntity(response, "region", "regionSeeder")
}

export const salesChannelSeeder = async ({
  api,
  adminHeaders,
  data,
}: AdminSeederInput): Promise<unknown> => {
  const response = await api.post(
    "/admin/sales-channels",
    { name: "test sales channel", ...data },
    adminHeaders,
  )
  return extractSeededEntity(response, "sales_channel", "salesChannelSeeder")
}

export const productSeeder = async ({
  api,
  adminHeaders,
  data,
}: AdminSeederInput): Promise<unknown> => {
  const response = await api.post(
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
          manage_inventory: false,
          options: {
            color: "green",
            size: "large",
          },
          prices: [
            {
              amount: 100,
              currency_code: "usd",
            },
          ],
          sku: "test-variant",
          title: "Test variant",
        },
      ],
      ...data,
    },
    adminHeaders,
  )
  return extractSeededEntity(response, "product", "productSeeder")
}

export const cartSeeder = async ({
  api,
  storeHeaders,
  data,
}: StoreSeederInput): Promise<unknown> => {
  const response = await api.post(
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
  return extractSeededEntity(response, "cart", "cartSeeder")
}
