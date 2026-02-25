import { zodResolver } from "@hookform/resolvers/zod"
import type { AdminOrderPreview } from "@medusajs/framework/types"
import {
  Button,
  Container,
  clx,
  Heading,
  Select,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useParams } from "react-router-dom"
import { z } from "@medusajs/framework/zod"
import type { QueryQuote } from "../../../../types"
import { Form } from "../../../components/common/form"
import { useCreateQuoteMessage } from "../../../hooks/api/quotes"
import { QuoteItem } from "./quote-details"

export const CreateQuoteMessageForm = z.object({
  text: z.string().min(1),
  item_id: z.string().nullish(),
})

export function QuoteMessages({
  quote,
  preview,
}: {
  quote: QueryQuote
  preview: AdminOrderPreview
}) {
  const { quoteId } = useParams()

  /**
   * FORM
   */
  const form = useForm<z.infer<typeof CreateQuoteMessageForm>>({
    defaultValues: () =>
      Promise.resolve({
        text: "",
        item_id: null,
      }),
    resolver: zodResolver(CreateQuoteMessageForm),
  })

  const { mutateAsync: createMessage, isPending: isCreatingMessage } =
    useCreateQuoteMessage(quoteId!)

  const originalItemsMap = useMemo(
    () => new Map(quote?.draft_order?.items?.map((item) => [item.id, item])),
    [quote?.draft_order]
  )

  const previewItemsMap = useMemo(
    () => new Map(preview?.items?.map((item) => [item.id, item])),
    [preview]
  )

  const handleCreateMessage = async () => {
    await createMessage(
      {},
      {
        onSuccess: () => toast.success("Successfully sent message to customer"),
        onError: (e) => toast.error(e.message),
      }
    )
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    await createMessage(
      {
        text: data.text,
        item_id: data.item_id,
      },
      {
        onSuccess: () => {
          form.reset()
          toast.success("Successfully sent message to customer")
        },
        onError: (e) => toast.error(e.message),
      }
    )
  })

  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Messages</Heading>
      </div>

      <div>
        {quote.messages?.map((message) => (
          <div
            className={clx("flex flex-col gap-y-2 px-6 py-4 text-sm", {
              "!bg-ui-bg-subtle !inset-x-5 !inset-y-3": !!message.admin_id,
            })}
            key={message.id}
          >
            <div className="txt-compact-small font-medium font-sans text-ui-fg-subtle">
              {!!message.admin &&
                `${message.admin.first_name} ${message.admin.last_name}`}

              {!!message.customer &&
                `${message.customer.first_name} ${message.customer.last_name}`}
            </div>

            {!!message.item_id && (
              <div className="my-2 border border-neutral-400 border-dashed">
                <QuoteItem
                  currencyCode={quote.draft_order.currency_code}
                  item={previewItemsMap.get(message.item_id)!}
                  originalItem={originalItemsMap.get(message.item_id)!}
                />
              </div>
            )}

            <div>{message.text}</div>
          </div>
        ))}
      </div>

      <div className="px-4 pt-5 pb-3">
        <Form {...form}>
          <form className="flex flex-col gap-y-3" onSubmit={handleSubmit}>
            <Form.Field
              control={form.control}
              name="item_id"
              render={({ field: { onChange, ref, ...field } }) => (
                <Form.Item>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Form.Label>Pick Quote Item</Form.Label>
                      <Form.Hint>
                        Select a quote item to write a message around
                      </Form.Hint>
                    </div>
                    <div className="flex-1">
                      <Form.Control>
                        <Select
                          onValueChange={onChange}
                          {...field}
                          value={field.value ?? undefined}
                        >
                          <Select.Trigger className="bg-ui-bg-base" ref={ref}>
                            <Select.Value placeholder="Select Item" />
                          </Select.Trigger>
                          <Select.Content>
                            {preview.items.map((l) => (
                              <Select.Item key={l.id} value={l.id}>
                                {l.variant_sku}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </Form.Control>
                    </div>
                  </div>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              name={"text"}
              render={({ field: { ref, ...field } }) => (
                <Form.Item>
                  <Form.Control>
                    <Textarea {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Button
              className="self-end"
              disabled={isCreatingMessage}
              onClick={() => handleCreateMessage}
              size="small"
              type="submit"
            >
              Send
            </Button>
          </form>
        </Form>
      </div>
    </Container>
  )
}
