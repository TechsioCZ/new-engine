import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { RichHtmlEditor } from "../components/rich-html-editor"
import { sdk } from "../lib/sdk"

type ProductCategoryWithMetadata = {
  id: string
  metadata?: Record<string, unknown> | null
}

type CategoryDescriptionEditorProps = Partial<
  DetailWidgetProps<ProductCategoryWithMetadata>
>

type UpdateCategoryResponse = {
  product_category: ProductCategoryWithMetadata
}

const TOP_DESCRIPTION_METADATA_KEY = "top_description_html"
const BOTTOM_DESCRIPTION_METADATA_KEY = "bottom_description_html"

const getMetadataHtml = (
  metadata: ProductCategoryWithMetadata["metadata"],
  key: string
) => {
  const value = metadata?.[key]

  return typeof value === "string" ? value : ""
}

const CategoryDescriptionEditor = ({
  data: category,
}: CategoryDescriptionEditorProps) => {
  const queryClient = useQueryClient()
  const [savedTopDescriptionHtml, setSavedTopDescriptionHtml] = useState(() =>
    getMetadataHtml(category?.metadata, TOP_DESCRIPTION_METADATA_KEY)
  )
  const [savedBottomDescriptionHtml, setSavedBottomDescriptionHtml] = useState(
    () => getMetadataHtml(category?.metadata, BOTTOM_DESCRIPTION_METADATA_KEY)
  )
  const topDescriptionHtmlRef = useRef(savedTopDescriptionHtml)
  const bottomDescriptionHtmlRef = useRef(savedBottomDescriptionHtml)

  useEffect(() => {
    const nextTopDescriptionHtml = getMetadataHtml(
      category?.metadata,
      TOP_DESCRIPTION_METADATA_KEY
    )
    const nextBottomDescriptionHtml = getMetadataHtml(
      category?.metadata,
      BOTTOM_DESCRIPTION_METADATA_KEY
    )

    topDescriptionHtmlRef.current = nextTopDescriptionHtml
    bottomDescriptionHtmlRef.current = nextBottomDescriptionHtml
    setSavedTopDescriptionHtml(nextTopDescriptionHtml)
    setSavedBottomDescriptionHtml(nextBottomDescriptionHtml)
  }, [category?.metadata])

  const mutation = useMutation({
    mutationFn: ({
      bottomDescriptionHtml,
      topDescriptionHtml,
    }: {
      bottomDescriptionHtml: string
      topDescriptionHtml: string
    }) =>
      sdk.client.fetch<UpdateCategoryResponse>(
        `/admin/product-categories/${category?.id}`,
        {
          body: {
            metadata: {
              ...(category?.metadata ?? {}),
              [TOP_DESCRIPTION_METADATA_KEY]: topDescriptionHtml,
              [BOTTOM_DESCRIPTION_METADATA_KEY]: bottomDescriptionHtml,
            },
          },
          method: "POST",
        }
      ),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save category descriptions"
      )
    },
    onSuccess: (response, variables) => {
      const responseTopDescriptionHtml = getMetadataHtml(
        response.product_category.metadata,
        TOP_DESCRIPTION_METADATA_KEY
      )
      const responseBottomDescriptionHtml = getMetadataHtml(
        response.product_category.metadata,
        BOTTOM_DESCRIPTION_METADATA_KEY
      )
      const nextTopDescriptionHtml =
        responseTopDescriptionHtml || variables.topDescriptionHtml
      const nextBottomDescriptionHtml =
        responseBottomDescriptionHtml || variables.bottomDescriptionHtml

      topDescriptionHtmlRef.current = nextTopDescriptionHtml
      bottomDescriptionHtmlRef.current = nextBottomDescriptionHtml
      setSavedTopDescriptionHtml(nextTopDescriptionHtml)
      setSavedBottomDescriptionHtml(nextBottomDescriptionHtml)
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category descriptions saved")
    },
  })

  const handleSave = () => {
    mutation.mutate({
      bottomDescriptionHtml: bottomDescriptionHtmlRef.current,
      topDescriptionHtml: topDescriptionHtmlRef.current,
    })
  }

  if (!category?.id) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Category descriptions</Heading>
        <Button
          isLoading={mutation.isPending}
          onClick={handleSave}
          size="small"
          type="button"
        >
          Save
        </Button>
      </div>
      <div className="divide-y">
        <section>
          <div className="px-6 py-4">
            <Text size="small" weight="plus">
              Top description
            </Text>
          </div>
          <RichHtmlEditor
            ariaLabel="Category top description"
            onChangeHtml={(html) => {
              topDescriptionHtmlRef.current = html
            }}
            onError={(message) => toast.error(message)}
            valueHtml={savedTopDescriptionHtml}
          />
        </section>
        <section>
          <div className="px-6 py-4">
            <Text size="small" weight="plus">
              Bottom description
            </Text>
          </div>
          <RichHtmlEditor
            ariaLabel="Category bottom description"
            onChangeHtml={(html) => {
              bottomDescriptionHtmlRef.current = html
            }}
            onError={(message) => toast.error(message)}
            valueHtml={savedBottomDescriptionHtml}
          />
        </section>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.before",
})

export default CategoryDescriptionEditor
