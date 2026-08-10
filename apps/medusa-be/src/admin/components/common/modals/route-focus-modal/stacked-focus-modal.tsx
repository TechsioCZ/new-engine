import { clx, FocusModal } from "@medusajs/ui"
import { useEffect } from "react"
import type {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  ReactNode,
  Ref,
} from "react"

import { useStackedModal } from "./use-stacked-modal"

type StackedFocusModalProps = PropsWithChildren<{
  /**
   * A unique identifier for the modal. This is used to differentiate stacked modals,
   * when multiple stacked modals are registered to the same parent modal.
   */
  id: string
}>

/**
 * A stacked modal that can be rendered above a parent modal.
 */
export const Root = ({ id, children }: StackedFocusModalProps) => {
  const { register, unregister, getIsOpen, setIsOpen } = useStackedModal()

  useEffect(() => {
    register(id)

    return () => {
      unregister(id)
    }
  }, [id, register, unregister])

  return (
    <FocusModal
      onOpenChange={(open) => {
        setIsOpen(id, open)
      }}
      open={getIsOpen(id)}
    >
      <FocusModal.Title />
      <FocusModal.Description />
      {children}
    </FocusModal>
  )
}

const { Close } = FocusModal
Close.displayName = "StackedFocusModal.Close"

const { Header } = FocusModal
Header.displayName = "StackedFocusModal.Header"

const { Body } = FocusModal
Body.displayName = "StackedFocusModal.Body"

const { Trigger } = FocusModal
Trigger.displayName = "StackedFocusModal.Trigger"

const { Footer } = FocusModal
Footer.displayName = "StackedFocusModal.Footer"

const { Title } = FocusModal
Title.displayName = "StackedFocusModal.Title"

const { Description } = FocusModal
Description.displayName = "StackedFocusModal.Description"

type ContentProps = ComponentPropsWithoutRef<typeof FocusModal.Content> & {
  ref?: Ref<HTMLDivElement>
}

const Content = ({ className, ref, ...props }: ContentProps) => (
  <FocusModal.Content
    className={clx("!top-6", className)}
    overlayProps={{
      className: "bg-transparent",
    }}
    ref={ref}
    {...props}
  />
)
Content.displayName = "StackedFocusModal.Content"

interface StackedFocusModalComponent {
  (props: StackedFocusModalProps): ReactNode
  Body: typeof FocusModal.Body
  Close: typeof FocusModal.Close
  Content: typeof Content
  Description: typeof FocusModal.Description
  Footer: typeof FocusModal.Footer
  Header: typeof FocusModal.Header
  Title: typeof FocusModal.Title
  Trigger: typeof FocusModal.Trigger
}

export const StackedFocusModal: StackedFocusModalComponent = Object.assign(
  Root,
  {
    Body,
    Close,
    Content,
    Description,
    Footer,
    Header,
    Title,
    Trigger,
  },
)
