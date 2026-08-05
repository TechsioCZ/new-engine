"use client"

import { useToast } from "@techsio/ui-kit/molecules/toast"

type AppToastType = "error" | "success" | "warning"

interface AppToastMessage {
  description?: string
  title: string
}

const showToast = (
  toaster: ReturnType<typeof useToast>,
  type: AppToastType,
  message: AppToastMessage
) =>
  toaster.create({
    description: message.description,
    title: message.title,
    type,
  })

export function useAppToast() {
  const toaster = useToast()

  return {
    error: (message: AppToastMessage) => showToast(toaster, "error", message),
    success: (message: AppToastMessage) =>
      showToast(toaster, "success", message),
    warning: (message: AppToastMessage) =>
      showToast(toaster, "warning", message),
  }
}
