import { ArrowLeft, PencilSquare } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  StatusBadge,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  type Review,
  type ReviewFormInput,
  type ReviewInput,
  type ReviewStatus,
  retrieveReview,
  reviewQueryKeys,
  updateReview,
} from "../../../lib/reviews"

const STATUS_BADGE_COLOR: Record<ReviewStatus, "green" | "orange" | "red"> = {
  approved: "green",
  pending: "orange",
  rejected: "red",
}

const STATUS_OPTIONS: ReviewStatus[] = ["pending", "approved", "rejected"]

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

const toFormState = (review: Review): ReviewFormInput => ({
  content: review.content,
  first_name: review.first_name ?? "",
  last_name: review.last_name ?? "",
  rating: review.rating,
  status: review.status,
  title: review.title,
})

const ReviewEditDrawer = ({
  onOpenChange,
  open,
  review,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  review: Review
}) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ReviewFormInput>(() => toFormState(review))

  useEffect(() => {
    if (open) {
      setForm(toFormState(review))
    }
  }, [open, review])

  const mutation = useMutation({
    mutationFn: (input: ReviewInput) => updateReview(review.id, input),
    onError: () => {
      toast.error("Failed to update review")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.detail(review.id),
      })
      await queryClient.invalidateQueries({ queryKey: reviewQueryKeys.lists() })
      toast.success("Review updated")
      onOpenChange(false)
    },
  })

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit review</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-auto p-4">
          <div className="flex flex-col gap-2">
            <Label>Title</Label>
            <Input
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              value={form.title}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Content</Label>
            <Textarea
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              rows={8}
              value={form.content}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Rating</Label>
              <Input
                max={5}
                min={1}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rating: Number(event.target.value),
                  }))
                }
                type="number"
                value={form.rating}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as ReviewStatus,
                  }))
                }
                value={form.status}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {STATUS_OPTIONS.map((status) => (
                    <Select.Item key={status} value={status}>
                      {status}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>First name</Label>
              <Input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    first_name: event.target.value,
                  }))
                }
                value={form.first_name ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Last name</Label>
              <Input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    last_name: event.target.value,
                  }))
                }
                value={form.last_name ?? ""}
              />
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button size="small" variant="secondary">
              Cancel
            </Button>
          </Drawer.Close>
          <Button
            disabled={mutation.isPending}
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
            size="small"
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const ReviewsDetailPage = () => {
  const { id } = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const { data, isLoading } = useQuery({
    enabled: Boolean(id),
    queryFn: () => retrieveReview(id as string),
    queryKey: reviewQueryKeys.detail(id as string),
  })
  const review = data?.review

  if (isLoading) {
    return <Container>Loading...</Container>
  }

  if (!review) {
    return <Container>Review not found.</Container>
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Link
          className="inline-flex items-center gap-1 text-ui-fg-subtle"
          to="/reviews"
        >
          <ArrowLeft />
          <Text size="small">Back to reviews</Text>
        </Link>
      </div>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-1">
            <Heading>{review.title}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {review.product?.title ?? review.product_id}
            </Text>
          </div>
          <Button
            onClick={() => setEditOpen(true)}
            size="small"
            variant="secondary"
          >
            <PencilSquare />
            Edit
          </Button>
        </div>
        <div className="grid gap-6 px-6 py-4 md:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-3">
            <Text leading="compact" size="small" weight="plus">
              Review content
            </Text>
            <Text>{review.content}</Text>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <Text leading="compact" size="small" weight="plus">
                Status
              </Text>
              <StatusBadge color={STATUS_BADGE_COLOR[review.status]}>
                {review.status}
              </StatusBadge>
            </div>
            <div>
              <Text leading="compact" size="small" weight="plus">
                Rating
              </Text>
              <Text>{review.rating}/5</Text>
            </div>
            <div>
              <Text leading="compact" size="small" weight="plus">
                Customer
              </Text>
              <Text>{getCustomerName(review)}</Text>
            </div>
            <div>
              <Text leading="compact" size="small" weight="plus">
                Created
              </Text>
              <Text>{formatDate(review.created_at)}</Text>
            </div>
            <div>
              <Text leading="compact" size="small" weight="plus">
                Updated
              </Text>
              <Text>{formatDate(review.updated_at)}</Text>
            </div>
          </div>
        </div>
      </Container>
      <ReviewEditDrawer
        onOpenChange={setEditOpen}
        open={editOpen}
        review={review}
      />
    </div>
  )
}

export default ReviewsDetailPage
