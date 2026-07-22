import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { vi } from "vitest"
import { PRODUCT_REVIEW_MODULE } from "../../../src/modules/product-review"
import type ProductReviewModuleService from "../../../src/modules/product-review/service"
import { adminHeaders, createAdminUser } from "../../utils/admin"
import { productSeeder, salesChannelSeeder } from "../../utils/seeder"
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../utils/store"

type TestValue = any

vi.setConfig({ testTimeout: 60 * 1000 })

const createStoreUser = async ({
  api,
  email,
  storeHeaders,
}: {
  api: TestValue
  email: string
  storeHeaders: TestValue
}) => {
  const registerToken = (
    await api.post("/auth/customer/emailpass/register", {
      email,
      password: "password",
    })
  ).data.token

  const customer = (
    await api.post(
      "/store/customers",
      { email },
      {
        headers: {
          Authorization: `Bearer ${registerToken}`,
          ...storeHeaders.headers,
        },
      }
    )
  ).data.customer

  const token = (
    await api.post("/auth/customer/emailpass", {
      email,
      password: "password",
    })
  ).data.token

  return { customer, token }
}

const withBearerToken = (headers: TestValue, token: string) => ({
  headers: {
    ...headers.headers,
    Authorization: `Bearer ${token}`,
  },
})

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    JWT_SECRET: "supersecret",
  },
  testSuite: ({ api, getContainer }) => {
    let customer: TestValue
    let otherCustomer: TestValue
    let customerHeaders: TestValue
    let product: TestValue
    let otherProduct: TestValue
    let reviewService: ProductReviewModuleService

    beforeEach(async () => {
      const container = getContainer()
      await createAdminUser(adminHeaders, container)
      reviewService = container.resolve<ProductReviewModuleService>(
        PRODUCT_REVIEW_MODULE
      )

      const publishableKey = await generatePublishableKey(container)
      const storeHeaders = generateStoreHeaders({ publishableKey })
      const salesChannel = await salesChannelSeeder({
        api,
        adminHeaders,
        data: {},
      })

      product = await productSeeder({
        api,
        adminHeaders,
        data: {
          sales_channels: [{ id: salesChannel.id }],
        },
      })
      otherProduct = await productSeeder({
        api,
        adminHeaders,
        data: {
          handle: "other-test-product",
          sales_channels: [{ id: salesChannel.id }],
          title: "Other Test Product",
        },
      })

      await api.post(
        `/admin/api-keys/${publishableKey.id}/sales-channels`,
        { add: [salesChannel.id] },
        adminHeaders
      )

      const firstUser = await createStoreUser({
        api,
        email: "review-author@example.com",
        storeHeaders,
      })
      const secondUser = await createStoreUser({
        api,
        email: "other-review-author@example.com",
        storeHeaders,
      })

      customer = firstUser.customer
      otherCustomer = secondUser.customer
      customerHeaders = withBearerToken(storeHeaders, firstUser.token)
    })

    describe("PATCH /admin/reviews/:id", () => {
      it("lets the customer author update their own review and remoderates it", async () => {
        const review = await reviewService.createReviews({
          content: "Original review content",
          customer_id: customer.id,
          first_name: "Review",
          last_name: "Author",
          product_id: product.id,
          rating: 4,
          status: "approved",
          title: "Original title",
        })

        const response = await api.patch(
          `/admin/reviews/${review.id}`,
          {
            content: "Updated by the author",
            rating: 5,
            status: "approved",
            title: "Updated title",
          },
          customerHeaders
        )

        expect(response.status).toEqual(200)
        expect(response.data.review).toEqual(
          expect.objectContaining({
            id: review.id,
            content: "Updated by the author",
            customer_id: customer.id,
            product_id: product.id,
            rating: 5,
            status: "pending",
            title: "Updated title",
          })
        )
      })

      it("does not let a customer update someone else's review", async () => {
        const review = await reviewService.createReviews({
          content: "Someone else's review",
          customer_id: otherCustomer.id,
          first_name: "Other",
          last_name: "Author",
          product_id: product.id,
          rating: 3,
          status: "approved",
          title: "Other review",
        })

        const { response } = await api
          .patch(
            `/admin/reviews/${review.id}`,
            { content: "Illicit update", rating: 1, title: "Nope" },
            customerHeaders
          )
          .catch((error: TestValue) => error)

        expect(response.status).toEqual(404)
      })

      it("keeps the existing admin review update behavior", async () => {
        const review = await reviewService.createReviews({
          content: "Needs admin moderation",
          customer_id: customer.id,
          first_name: "Review",
          last_name: "Author",
          product_id: product.id,
          rating: 2,
          status: "pending",
          title: "Needs moderation",
        })

        const response = await api.patch(
          `/admin/reviews/${review.id}`,
          {
            content: "Approved by admin",
            rating: 4,
            status: "approved",
            title: "Approved title",
          },
          adminHeaders
        )

        expect(response.status).toEqual(200)
        expect(response.data.review).toEqual(
          expect.objectContaining({
            id: review.id,
            content: "Approved by admin",
            rating: 4,
            status: "approved",
            title: "Approved title",
          })
        )
      })
    })

    describe("GET /store/customers/me/reviews", () => {
      it("lists all reviews for the authenticated customer with product info", async () => {
        const ownApprovedReview = await reviewService.createReviews({
          content: "Already public",
          customer_id: customer.id,
          first_name: "Review",
          last_name: "Author",
          product_id: product.id,
          rating: 5,
          status: "approved",
          title: "Approved review",
        })
        const ownRejectedReview = await reviewService.createReviews({
          content: "Rejected content",
          customer_id: customer.id,
          first_name: "Review",
          last_name: "Author",
          product_id: otherProduct.id,
          rating: 1,
          status: "rejected",
          title: "Rejected review",
        })
        const otherReview = await reviewService.createReviews({
          content: "Other customer's content",
          customer_id: otherCustomer.id,
          first_name: "Other",
          last_name: "Author",
          product_id: product.id,
          rating: 4,
          status: "approved",
          title: "Other customer's review",
        })

        const response = await api.get(
          "/store/customers/me/reviews?limit=20&offset=0",
          customerHeaders
        )

        expect(response.status).toEqual(200)
        expect(response.data).toEqual(
          expect.objectContaining({
            count: 2,
            limit: 20,
            offset: 0,
          })
        )
        expect(response.data.reviews).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: ownApprovedReview.id,
              customer_id: customer.id,
              product_id: product.id,
              status: "approved",
              product: expect.objectContaining({
                handle: product.handle,
                id: product.id,
                thumbnail: product.thumbnail,
                title: product.title,
              }),
            }),
            expect.objectContaining({
              id: ownRejectedReview.id,
              customer_id: customer.id,
              product_id: otherProduct.id,
              status: "rejected",
              product: expect.objectContaining({
                handle: otherProduct.handle,
                id: otherProduct.id,
                thumbnail: otherProduct.thumbnail,
                title: otherProduct.title,
              }),
            }),
          ])
        )
        expect(
          response.data.reviews.some(
            (review: TestValue) => review.id === otherReview.id
          )
        ).toEqual(false)
      })
    })
  },
})
