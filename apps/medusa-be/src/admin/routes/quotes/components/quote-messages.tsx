import type { AdminOrderPreview } from "@medusajs/framework/types"
import { z } from "@medusajs/framework/zod"
import {
  Button,
  Container,
  clx,
  Heading,
  Select,
  Textarea,
  toast,
} from "@medusajs/ui"
import { type Resolver, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import type { QueryQuote } from "../../../../types"
import { Form } from "../../../components/common/form"
import { useCreateQuoteMessage } from "../../../hooks/api"
import { QuoteItem } from "./quote-details"

export const CreateQuoteMessageForm = z.object({
  text: z.string().min(1),
  item_id: z.string().nullish(),
})

type CreateQuoteMessageFormValues = z.infer<typeof CreateQuoteMessageForm>

const createQuoteMessageResolver: Resolver<
  CreateQuoteMessageFormValues
> = async (values) => {
  const result = CreateQuoteMessageForm.safeParse(values)

  if (result.success) {
    return { errors: {}, values: result.data }
  }

  const textIssue = result.error.issues.find(
    (issue) => issue.path[0] === "text"
  )
  const itemIdIssue = result.error.issues.find(
    (issue) => issue.path[0] === "item_id"
  )

  return {
    errors: {
      ...(textIssue
        ? { text: { message: textIssue.message, type: textIssue.code } }
        : {}),
      ...(itemIdIssue
        ? { item_id: { message: itemIdIssue.message, type: itemIdIssue.code } }
        : {}),
    },
    values: {},
  }
}

export function QuoteMessages({
  quote,
  preview,
}: {
  quote: QueryQuote
  preview: AdminOrderPreview
}) {
  const { t } = useTranslation("quotes")
  const { quoteId } = useParams()

  if (!quoteId) {
    throw new Error(t("validation.missingQuoteId"))
  }

  /**
   * FORM
   */
  const form = useForm<CreateQuoteMessageFormValues>({
    defaultValues: () =>
      Promise.resolve({
        text: "",
        item_id: null,
      }),
    resolver: createQuoteMessageResolver,
  })

  const { mutateAsync: createMessage, isPending: isCreatingMessage } =
    useCreateQuoteMessage(quoteId)

  const originalItemsMap = new Map(
    quote?.draft_order?.items?.map((item) => [item.id, item])
  )
  const previewItemsMap = new Map(
    preview?.items?.map((item) => [item.id, item])
  )

  const handleSubmit = form.handleSubmit(async (data) => {
    await createMessage(
      {
        text: data.text,
        ...(data.item_id ? { item_id: data.item_id } : {}),
      },
      {
        onSuccess: () => {
          form.reset()
          toast.success(t("toasts.messageSent"))
        },
        onError: (e) => toast.error(e.message),
      }
    )
  })

  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("messages.title")}</Heading>
      </div>

      <div>
        {quote.messages?.map((message) => {
          const previewItem = message.item_id
            ? previewItemsMap.get(message.item_id)
            : undefined
          const originalItem = message.item_id
            ? originalItemsMap.get(message.item_id)
            : undefined

          return (
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

              {!!previewItem && !!originalItem && (
                <div className="my-2 border border-neutral-400 border-dashed">
                  <QuoteItem
                    currencyCode={quote.draft_order.currency_code}
                    item={previewItem}
                    originalItem={originalItem}
                  />
                </div>
              )}

              <div>{message.text}</div>
            </div>
          )
        })}
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
                      <Form.Label>{t("form.itemMessageLabel")}</Form.Label>
                      <Form.Hint>{t("form.itemMessageHint")}</Form.Hint>
                    </div>
                    <div className="flex-1">
                      <Form.Control>
                        <Select
                          onValueChange={onChange}
                          {...field}
                          value={field.value ?? ""}
                        >
                          <Select.Trigger className="bg-ui-bg-base" ref={ref}>
                            <Select.Value placeholder={t("form.selectItem")} />
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
                    <Textarea
                      {...field}
                      placeholder={t("form.messagePlaceholder")}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Button
              className="self-end"
              disabled={isCreatingMessage}
              size="small"
              type="submit"
            >
              {t("actions.send")}
            </Button>
          </form>
        </Form>
      </div>
    </Container>
  )
}
