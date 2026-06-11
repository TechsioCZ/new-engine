"use client"

import { useToast } from "@techsio/ui-kit/molecules/toast"

type AppToastType = "error" | "warning"

type AppToastMessage = {
  description?: string
  title: string
}

const showToast = (
  toaster: ReturnType<typeof useToast>,
  type: AppToastType,
  message: AppToastMessage
) =>
  toaster.create({
    type,
    title: message.title,
    description: message.description,
  })

export function useAppToast() {
  const toaster = useToast()

  return {
    error: (message: AppToastMessage) => showToast(toaster, "error", message),
    warning: (message: AppToastMessage) =>
      showToast(toaster, "warning", message),
  }
}
