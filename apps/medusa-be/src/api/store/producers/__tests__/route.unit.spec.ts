import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

jest.mock("../../../../links/product-producer", () => ({
  ProductProducerLink: {
    entryPoint: "product_producer",
  },
}))

import { ProductProducerLink } from "../../../../links/product-producer"
import { GET as getProducerDetail } from "../[id]/route"
import { GET as getProducerProducts } from "../[id]/products/route"
import { GET as getProducers } from "../route"

type QueryMock = {
  graph: jest.Mock
}

const createResponse = () => ({
  json: jest.fn(),
})

const createRequest = (query: QueryMock, extras: Record<string, unknown> = {}) => ({
  scope: {
    resolve: (key: string) => {
      if (key === ContainerRegistrationKeys.QUERY) {
        return query
      }

      throw new Error(`Unexpected key: ${key}`)
    },
  },
  ...extras,
})

describe("store producers routes", () => {
  it("lists producers", async () => {
    const query = {
      graph: jest.fn().mockResolvedValue({ data: [{ id: "prod_1" }] }),
    }
    const req = createRequest(query, {
      queryConfig: { fields: ["id", "name"], pagination: { skip: 0, take: 20 } },
    })
    const res = createResponse()

    await getProducers(req as never, res as never)

    expect(query.graph).toHaveBeenCalledWith({
      entity: "producer",
      fields: ["id", "name"],
      pagination: { skip: 0, take: 20 },
    })
    expect(res.json).toHaveBeenCalledWith({ producers: [{ id: "prod_1" }] })
  })

  it("returns a producer by id and falls back to empty object", async () => {
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({ data: [{ id: "producer_1", name: "Acme" }] })
        .mockResolvedValueOnce({ data: [] }),
    }

    const firstReq = createRequest(query, {
      params: { id: "producer_1" },
      queryConfig: { fields: ["id"] },
    })
    const secondReq = createRequest(query, {
      params: {},
      queryConfig: {},
    })
    const firstRes = createResponse()
    const secondRes = createResponse()

    await getProducerDetail(firstReq as never, firstRes as never)
    await getProducerDetail(secondReq as never, secondRes as never)

    expect(query.graph).toHaveBeenNthCalledWith(1, {
      entity: "producer",
      filters: {
        id: "producer_1",
      },
      fields: ["id"],
    })
    expect(firstRes.json).toHaveBeenCalledWith({ id: "producer_1", name: "Acme" })

    expect(query.graph).toHaveBeenNthCalledWith(2, {
      entity: "producer",
      filters: {
        id: "-1",
      },
    })
    expect(secondRes.json).toHaveBeenCalledWith({})
  })

  it("returns products linked to a producer", async () => {
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          data: [{ product_id: "prod_1" }, { product_id: "prod_2" }],
        })
        .mockResolvedValueOnce({
          data: [{ id: "prod_1" }, { id: "prod_2" }],
        }),
    }

    const req = createRequest(query, {
      params: { id: "producer_1" },
      queryConfig: { fields: ["id", "title"] },
    })
    const res = createResponse()

    await getProducerProducts(req as never, res as never)

    expect(query.graph).toHaveBeenNthCalledWith(1, {
      entity: ProductProducerLink.entryPoint,
      filters: {
        producer_id: "producer_1",
      },
      fields: ["product_id"],
    })
    expect(query.graph).toHaveBeenNthCalledWith(2, {
      entity: "product",
      filters: {
        id: {
          $in: ["prod_1", "prod_2"],
        },
      },
      fields: ["id", "title"],
    })
    expect(res.json).toHaveBeenCalledWith({
      products: [{ id: "prod_1" }, { id: "prod_2" }],
    })
  })

  it("falls back to -1 producer id when route param is missing", async () => {
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          data: [],
        })
        .mockResolvedValueOnce({
          data: [],
        }),
    }

    const req = createRequest(query, {
      params: {},
      queryConfig: { fields: ["id"] },
    })
    const res = createResponse()

    await getProducerProducts(req as never, res as never)

    expect(query.graph).toHaveBeenNthCalledWith(1, {
      entity: ProductProducerLink.entryPoint,
      filters: {
        producer_id: "-1",
      },
      fields: ["product_id"],
    })
    expect(query.graph).toHaveBeenNthCalledWith(2, {
      entity: "product",
      filters: {
        id: {
          $in: [],
        },
      },
      fields: ["id"],
    })
    expect(res.json).toHaveBeenCalledWith({
      products: [],
    })
  })
})
