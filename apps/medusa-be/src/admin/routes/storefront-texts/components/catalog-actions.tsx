import { ArrowDownTray, ArrowUpTray } from "@medusajs/icons"
import {
  Button,
  FocusModal,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  getStorefrontTextMarketConfiguration,
  type StorefrontTextMarket,
} from "../../../../modules/storefront-text/configuration"
import {
  getStorefrontTextCatalog,
  importStorefrontTextCatalog,
  type StorefrontTextCatalogResponse,
  storefrontTextQueryKeys,
} from "../../../lib/storefront-texts"

const downloadCatalog = (catalog: StorefrontTextCatalogResponse) => {
  const blob = new Blob([`${JSON.stringify(catalog, null, 2)}\n`], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.download = `${catalog.market}-${catalog.locale}.json`
  anchor.href = url
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export const StorefrontTextCatalogActions = ({
  market,
}: {
  market?: StorefrontTextMarket
}) => {
  const { t } = useTranslation("storefrontTexts")
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [open, setOpen] = useState(false)
  const marketConfiguration = market
    ? getStorefrontTextMarketConfiguration(market)
    : undefined
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!market) {
        throw new Error(t("errors.selectMarket"))
      }

      const catalog = await getStorefrontTextCatalog(market)
      downloadCatalog(catalog)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.exportFailed")
      )
    },
    onSuccess: () => toast.success(t("toasts.exported")),
  })
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!(file && market)) {
        throw new Error(t("errors.missingCatalog"))
      }

      let catalog: unknown

      try {
        catalog = JSON.parse(await file.text())
      } catch {
        throw new Error(t("errors.invalidCatalog"))
      }

      return importStorefrontTextCatalog({ catalog, market })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.importFailed")
      )
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: storefrontTextQueryKeys.lists(),
      })
      toast.success(
        t("toasts.imported", {
          unchanged: response.result.unchanged_count,
          updated: response.result.updated_count,
        })
      )
      setOpen(false)
      setFile(null)
    },
  })

  return (
    <>
      <Button
        disabled={!market || exportMutation.isPending}
        isLoading={exportMutation.isPending}
        onClick={() => exportMutation.mutate()}
        size="small"
        type="button"
        variant="secondary"
      >
        <ArrowDownTray />
        {t("actions.export")}
      </Button>
      <Button
        disabled={!market || importMutation.isPending}
        onClick={() => setOpen(true)}
        size="small"
        type="button"
        variant="secondary"
      >
        <ArrowUpTray />
        {t("actions.import")}
      </Button>
      <FocusModal
        onOpenChange={(nextOpen) => {
          if (!nextOpen && importMutation.isPending) {
            return
          }

          setOpen(nextOpen)
          if (!nextOpen) {
            setFile(null)
          }
        }}
        open={open}
      >
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>{t("catalog.title")}</FocusModal.Title>
            <FocusModal.Description className="sr-only">
              {t("catalog.description")}
            </FocusModal.Description>
          </FocusModal.Header>
          <FocusModal.Body className="flex justify-center overflow-y-auto">
            <div className="flex w-full max-w-xl flex-col gap-4 px-6 py-8">
              <div className="flex flex-col gap-1">
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.market")}
                </Text>
                <Text size="small" weight="plus">
                  {marketConfiguration
                    ? t(`markets.${marketConfiguration.market}`)
                    : ""}
                </Text>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="storefront-text-catalog">
                  {t("catalog.file")}
                </Label>
                <Input
                  accept=".json,application/json"
                  disabled={importMutation.isPending}
                  id="storefront-text-catalog"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
              </div>
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <Button
              disabled={importMutation.isPending}
              onClick={() => setOpen(false)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={!file || importMutation.isPending}
              isLoading={importMutation.isPending}
              onClick={() => importMutation.mutate()}
              size="small"
              type="button"
            >
              {t("actions.import")}
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}
