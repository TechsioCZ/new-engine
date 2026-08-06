import { clx, FocusModal } from "@medusajs/ui"
import { useEffect, useState } from "react"
import type { PropsWithChildren } from "react"
import { useNavigate } from "react-router-dom"

import { RouteModalForm } from "./route-modal-form"
import { RouteModalProvider } from "./route-modal-provider"
import { StackedModalProvider } from "./stacked-modal-provider"
import { useRouteModal } from "./use-route-modal"

type RouteFocusModalProps = PropsWithChildren<{
  prev?: string
}>

type ContentProps = PropsWithChildren<{
  stackedModalOpen: boolean
}>

const Content = ({ stackedModalOpen, children }: ContentProps) => {
  const { __internal } = useRouteModal()

  const shouldPreventClose = !__internal.closeOnEscape

  return (
    <FocusModal.Content
      className={clx({
        "!bg-ui-bg-disabled !inset-x-5 !inset-y-3": stackedModalOpen,
      })}
      {...(shouldPreventClose
        ? {
            onEscapeKeyDown: (e: globalThis.KeyboardEvent) => {
              e.preventDefault()
            },
          }
        : {})}
    >
      {children}
    </FocusModal.Content>
  )
}

const Root = ({ prev = "..", children }: RouteFocusModalProps) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [stackedModalOpen, setStackedModalOpen] = useState(false)

  /**
   * Open the modal when the component mounts. This
   * ensures that the entry animation is played.
   */
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setOpen(true)
    })
    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      document.body.style.pointerEvents = "auto"
      navigate(prev, { replace: true })
      return
    }

    setOpen(nextOpen)
  }

  return (
    <FocusModal onOpenChange={handleOpenChange} open={open}>
      <FocusModal.Title />
      <FocusModal.Description />

      <RouteModalProvider prev={prev}>
        <StackedModalProvider onOpenChange={setStackedModalOpen}>
          <Content stackedModalOpen={stackedModalOpen}>{children}</Content>
        </StackedModalProvider>
      </RouteModalProvider>
    </FocusModal>
  )
}

const { Header } = FocusModal
const { Title } = FocusModal
const { Description } = FocusModal
const { Footer } = FocusModal
const { Body } = FocusModal
const { Close } = FocusModal
const Form = RouteModalForm

/**
 * FocusModal that is used to render a form on a separate route.
 *
 * Typically used for forms creating a resource or forms that require
 * a lot of space.
 */
export const RouteFocusModal = Object.assign(Root, {
  Body,
  Close,
  Description,
  Footer,
  Form,
  Header,
  Title,
})
