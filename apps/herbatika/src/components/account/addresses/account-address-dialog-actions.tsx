"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useTranslations } from "next-intl"

type AccountAddressDialogActionsProps = {
  formId: string
  isPending: boolean
  onCancel: () => void
}

export function AccountAddressDialogActions({
  formId,
  isPending,
  onCancel,
}: AccountAddressDialogActionsProps) {
  const tAuth = useTranslations("auth")

  return (
    <>
      <Button
        disabled={isPending}
        onClick={onCancel}
        size="sm"
        theme="outlined"
        type="button"
        variant="secondary"
      >
        {tAuth("account.addresses.cancel")}
      </Button>
      <Button
        disabled={isPending}
        form={formId}
        isLoading={isPending}
        size="sm"
        type="submit"
        variant="primary"
      >
        {tAuth("account.addresses.save")}
      </Button>
    </>
  )
}
