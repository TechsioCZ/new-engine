import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentSeries } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  StatusBadge,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  listReviews,
  type Review,
  type ReviewStatus,
  reviewQueryKeys,
  updateReviewStatus,
} from "../../lib/reviews"
import { useDebouncedValue } from "../../lib/use-debounced-value"

const PAGE_SIZE = 20

const STATUS_FILTERS: Array<{ label: string; value?: ReviewStatus }> = [
  { label: "All" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
]

const STATUS_BADGE_COLOR: Record<ReviewStatus, "green" | "orange" | "red"> = {
  approved: "green",
  pending: "orange",
  rejected: "red",
}

const formatDate = (date: string | undefined) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const getCustomerName = (review: Review) => {
  const name = [review.first_name, review.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  return name || review.customer_id
}

const ReviewRows = ({
  isLoading,
  reviews,
  selectedIds,
  onOpenReview,
  setSelectedIds,
}: {
  isLoading: boolean
  onOpenReview: (reviewId: string) => void
  reviews: Review[]
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
}) => {
  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>Loading...</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (!reviews.length) {
    return (
      <Table.Row>
        <Table.Cell>No reviews found.</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return reviews.map((review) => {
    const checked = selectedIds.has(review.id)

    return (
      <Table.Row
        className="cursor-pointer"
        key={review.id}
        onClick={() => onOpenReview(review.id)}
      >
        <Table.Cell onClick={(event) => event.stopPropagation()}>
          <input
            aria-label={`Select review ${review.title}`}
            checked={checked}
            onChange={(event) => {
              const next = new Set(selectedIds)

              if (event.target.checked) {
                next.add(review.id)
              } else {
                next.delete(review.id)
              }

              setSelectedIds(next)
            }}
            type="checkbox"
          />
        </Table.Cell>
        <Table.Cell>
          <div className="flex max-w-[360px] flex-col gap-1">
            <Text weight="plus">{review.title}</Text>
            <Text className="line-clamp-2 text-ui-fg-subtle" size="small">
              {review.content}
            </Text>
          </div>
        </Table.Cell>
        <Table.Cell>{review.rating}/5</Table.Cell>
        <Table.Cell>
          <StatusBadge color={STATUS_BADGE_COLOR[review.status]}>
            {review.status}
          </StatusBadge>
        </Table.Cell>
        <Table.Cell>
          <div className="flex flex-col">
            <Text>{review.product?.title ?? review.product_id}</Text>
            {review.product?.handle ? (
              <Text className="text-ui-fg-subtle" size="small">
                {review.product.handle}
              </Text>
            ) : null}
          </div>
        </Table.Cell>
        <Table.Cell>{getCustomerName(review)}</Table.Cell>
        <Table.Cell>{formatDate(review.created_at)}</Table.Cell>
      </Table.Row>
    )
  })
}

const ReviewsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [query, setQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<ReviewStatus | undefined>("pending")
  const debouncedQuery = useDebouncedValue(query, 250)
  const params = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: "-created_at",
      q: debouncedQuery || undefined,
      status,
    }),
    [debouncedQuery, pageIndex, status]
  )
  const { data, isLoading } = useQuery({
    queryFn: () => listReviews(params),
    queryKey: reviewQueryKeys.list(params),
  })
  const reviews = data?.reviews ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const selectedCount = selectedIds.size
  const selectedReviewsOnPage = reviews.filter((review) =>
    selectedIds.has(review.id)
  )
  const allOnPageSelected =
    reviews.length > 0 && selectedReviewsOnPage.length === reviews.length
  const statusMutation = useMutation({
    mutationFn: updateReviewStatus,
    onError: () => {
      toast.error("Failed to update reviews")
    },
    onSuccess: () => {
      setSelectedIds(new Set())
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.lists(),
      })
      toast.success("Reviews updated")
    },
  })

  const updateSelected = (nextStatus: ReviewStatus) => {
    if (!selectedIds.size) {
      return
    }

    statusMutation.mutate({
      ids: [...selectedIds],
      status: nextStatus,
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Heading>Reviews</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Moderate customer product reviews.
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!selectedCount || statusMutation.isPending}
              onClick={() => updateSelected("approved")}
              size="small"
              variant="secondary"
            >
              Approve
            </Button>
            <Button
              disabled={!selectedCount || statusMutation.isPending}
              onClick={() => updateSelected("rejected")}
              size="small"
              variant="secondary"
            >
              Reject
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="max-w-[320px]"
            onChange={(event) => {
              setPageIndex(0)
              setQuery(event.target.value)
            }}
            placeholder="Search reviews"
            value={query}
          />
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((item) => (
              <Button
                key={item.value ?? "all"}
                onClick={() => {
                  setPageIndex(0)
                  setSelectedIds(new Set())
                  setStatus(item.value)
                }}
                size="small"
                variant={status === item.value ? "primary" : "secondary"}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {selectedCount ? (
            <Text className="text-ui-fg-subtle" size="small">
              {selectedCount} selected
            </Text>
          ) : null}
        </div>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell className="w-[1%]">
              <input
                aria-label="Select all reviews on page"
                checked={allOnPageSelected}
                onChange={(event) => {
                  const next = new Set(selectedIds)

                  for (const review of reviews) {
                    if (event.target.checked) {
                      next.add(review.id)
                    } else {
                      next.delete(review.id)
                    }
                  }

                  setSelectedIds(next)
                }}
                type="checkbox"
              />
            </Table.HeaderCell>
            <Table.HeaderCell>Review</Table.HeaderCell>
            <Table.HeaderCell>Rating</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Product</Table.HeaderCell>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <ReviewRows
            isLoading={isLoading}
            onOpenReview={(reviewId) => navigate(`/reviews/${reviewId}`)}
            reviews={reviews}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />
        </Table.Body>
      </Table>
      <Table.Pagination
        canNextPage={pageIndex + 1 < pageCount}
        canPreviousPage={pageIndex > 0}
        count={count}
        nextPage={() => setPageIndex((current) => current + 1)}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => setPageIndex((current) => Math.max(current - 1, 0))}
        translations={{
          next: "Next",
          of: "of",
          pages: "pages",
          prev: "Previous",
          results: "results",
        }}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  icon: DocumentSeries,
  label: "Reviews",
})

export default ReviewsPage
