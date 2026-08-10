import { useEffect, useRef, useState } from "react"

const HOVER_CLOSE_DELAY_MS = 120

export const useCartPopoverHover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const clearHoverCloseTimeout = () => {
    if (!hoverCloseTimeoutRef.current) {
      return
    }

    clearTimeout(hoverCloseTimeoutRef.current)
    hoverCloseTimeoutRef.current = null
  }

  const handlePreviewOpen = () => {
    clearHoverCloseTimeout()
    setIsPopoverOpen(true)
  }

  const schedulePreviewClose = () => {
    clearHoverCloseTimeout()
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setIsPopoverOpen(false)
      hoverCloseTimeoutRef.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  const handleClose = () => {
    clearHoverCloseTimeout()
    setIsPopoverOpen(false)
  }

  useEffect(
    () => () => {
      if (hoverCloseTimeoutRef.current) {
        clearTimeout(hoverCloseTimeoutRef.current)
      }
    },
    [],
  )

  return {
    handleClose,
    handlePreviewOpen,
    isPopoverOpen,
    schedulePreviewClose,
    setIsPopoverOpen,
  }
}
