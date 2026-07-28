import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { vi } from "vitest"
import { PRODUCT_REVIEW_MODULE } from "../../../src/modules/product-review"
import type ProductReviewModuleService from "../../../src/modules/product-review/service"
import { adminHeaders, createAdminUser } from "../../utils/admin"
import { productSeeder, salesChannelSeeder } from "../../utils/seeder"
import { generatePublishableKey, generateStoreHeaders } from "../../utils/store"

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

const expectRequestRejected = async (request: Promise<TestValue>) => {
  try {
    await request
  } catch (error) {
    return error as { response: { status: number } }
  }

  throw new Error("Expected the request to be rejected")
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    JWT_SECRET: "supersecret",
  },
  testSuite: ({ api, getContainer }) => {
    let customer: TestValue
    let otherCustomer: TestValue
    let customerHeaders: TestValue
    let otherCustomerHeaders: TestValue
    let storeHeaders: TestValue
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
      storeHeaders = generateStoreHeaders({ publishableKey })
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
          variants: [
            {
              title: "Other test variant",
              sku: "other-test-variant",
              manage_inventory: false,
              prices: [{ currency_code: "usd", amount: 100 }],
              options: {
                color: "green",
                size: "large",
              },
            },
          ],
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
      otherCustomerHeaders = withBearerToken(storeHeaders, secondUser.token)
    })

    describe("PATCH review endpoints", () => {
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
          `/store/customers/me/reviews/${review.id}`,
          {
            content: "Updated by the author",
            rating: 5,
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

        const { response } = await expectRequestRejected(
          api.patch(
            `/store/customers/me/reviews/${review.id}`,
            { content: "Illicit update", rating: 1, title: "Nope" },
            customerHeaders
          )
        )

        const unchangedReview = await reviewService.retrieveReview(review.id)

        expect(response.status).toEqual(404)
        expect(unchangedReview).toEqual(
          expect.objectContaining({
            content: "Someone else's review",
            rating: 3,
            status: "approved",
            title: "Other review",
          })
        )
      })

      it("does not let an unauthenticated request update a review", async () => {
        const review = await reviewService.createReviews({
          content: "Protected review",
          customer_id: customer.id,
          first_name: "Review",
          last_name: "Author",
          product_id: product.id,
          rating: 4,
          status: "approved",
          title: "Protected title",
        })

        const { response } = await expectRequestRejected(
          api.patch(
            `/store/customers/me/reviews/${review.id}`,
            { content: "Anonymous update", rating: 1, title: "Anonymous" },
            storeHeaders
          )
        )

        const unchangedReview = await reviewService.retrieveReview(review.id)

        expect(response.status).toEqual(401)
        expect(unchangedReview).toEqual(
          expect.objectContaining({
            content: "Protected review",
            rating: 4,
            status: "approved",
            title: "Protected title",
          })
        )
      })

      it("does not let another customer update the author's review", async () => {
        const review = await reviewService.createReviews({
          content: "Author-only review",
          customer_id: customer.id,
          first_name: "Review",
          last_name: "Author",
          product_id: product.id,
          rating: 5,
          status: "approved",
          title: "Author-only title",
        })

        const { response } = await expectRequestRejected(
          api.patch(
            `/store/customers/me/reviews/${review.id}`,
            { content: "Other customer update", rating: 1, title: "Hacked" },
            otherCustomerHeaders
          )
        )

        const unchangedReview = await reviewService.retrieveReview(review.id)

        expect(response.status).toEqual(404)
        expect(unchangedReview).toEqual(
          expect.objectContaining({
            content: "Author-only review",
            rating: 5,
            status: "approved",
            title: "Author-only title",
          })
        )
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

      it("lets admins update reviews from any customer", async () => {
        const customerReview = await reviewService.createReviews({
          content: "Customer review",
          customer_id: customer.id,
          first_name: "Review",
          last_name: "Author",
          product_id: product.id,
          rating: 2,
          status: "pending",
          title: "Customer review title",
        })
        const otherCustomerReview = await reviewService.createReviews({
          content: "Other customer review",
          customer_id: otherCustomer.id,
          first_name: "Other",
          last_name: "Author",
          product_id: otherProduct.id,
          rating: 1,
          status: "rejected",
          title: "Other customer review title",
        })

        const customerResponse = await api.patch(
          `/admin/reviews/${customerReview.id}`,
          {
            content: "Admin edited first customer review",
            rating: 4,
            status: "approved",
            title: "Admin edited first",
          },
          adminHeaders
        )
        const otherCustomerResponse = await api.patch(
          `/admin/reviews/${otherCustomerReview.id}`,
          {
            content: "Admin edited other customer review",
            rating: 5,
            status: "approved",
            title: "Admin edited other",
          },
          adminHeaders
        )

        expect(customerResponse.status).toEqual(200)
        expect(otherCustomerResponse.status).toEqual(200)
        expect(customerResponse.data.review).toEqual(
          expect.objectContaining({
            id: customerReview.id,
            content: "Admin edited first customer review",
            customer_id: customer.id,
            rating: 4,
            status: "approved",
            title: "Admin edited first",
          })
        )
        expect(otherCustomerResponse.data.review).toEqual(
          expect.objectContaining({
            id: otherCustomerReview.id,
            content: "Admin edited other customer review",
            customer_id: otherCustomer.id,
            rating: 5,
            status: "approved",
            title: "Admin edited other",
          })
        )
      })
    })

    describe("POST /store/reviews", () => {
      it("lets guests submit anonymous reviews with a valid review token", async () => {
        const reviewToken = await reviewService.createReviewTokens({
          customer_id: null,
          email: "guest-reviewer@example.com",
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
          order_id: "guest-order-1",
          product_id: product.id,
          token: "guest-review-token-1",
        })

        const response = await api.post(
          "/store/reviews",
          {
            content: "Guest token review content",
            product_id: product.id,
            rating: 5,
            review_token: reviewToken.token,
            title: "Guest token review",
          },
          storeHeaders
        )

        expect(response.status).toEqual(200)
        expect(response.data.review).toEqual(
          expect.objectContaining({
            content: "Guest token review content",
            customer_id: `review-token:${reviewToken.id}`,
            first_name: "Anonym",
            last_name: null,
            product_id: product.id,
            rating: 5,
            title: "Guest token review",
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
