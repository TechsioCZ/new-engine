import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { Dialog } from "../../src/molecules/dialog"
import { Menu } from "../../src/molecules/menu"

const DemoActionContext = createContext<
  ((details: { value: string }) => void) | undefined
>(undefined)

/** An application menu whose unimplemented commands open scoped preview feedback. */
export function DemoMenu(props: ComponentProps<typeof Menu>) {
  const preview = useContext(DemoActionContext)
  return <Menu {...props} onSelect={props.onSelect ?? preview} />
}

/** Keep application destinations inside the documentation sandbox. */
export function DemoBoundary({ children }: { children: ReactNode }) {
  const [destination, setDestination] = useState<{
    label: string
    href: string
  } | null>(null)

  const boundary = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previewNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        !(event.target instanceof Element) ||
        !boundary.current?.contains(event.target)
      ) {
        return
      }
      const link = event.target.closest<HTMLAnchorElement>("a[href]")
      if (!link || link.hasAttribute("download")) {
        return
      }
      event.preventDefault()
      const href = link.getAttribute("href") ?? "#"
      const target =
        href.startsWith("#") && href.length > 1
          ? document.getElementById(href.slice(1))
          : null
      if (target) {
        target.scrollIntoView({ block: "nearest" })
        target.focus()
        return
      }
      setDestination({
        label:
          link.getAttribute("aria-label") ||
          link.textContent?.trim() ||
          "Destination",
        href,
      })
    }

    const preventSubmit = (event: Event) => {
      if (
        event.target instanceof Node &&
        boundary.current?.contains(event.target)
      ) {
        event.preventDefault()
      }
    }
    document.addEventListener("click", previewNavigation)
    document.addEventListener("auxclick", previewNavigation)
    document.addEventListener("submit", preventSubmit)
    return () => {
      document.removeEventListener("click", previewNavigation)
      document.removeEventListener("auxclick", previewNavigation)
      document.removeEventListener("submit", preventSubmit)
    }
  }, [])

  return (
    <DemoActionContext.Provider
      value={({ value }) =>
        setDestination({ label: "Application action preview", href: value })
      }
    >
      <div ref={boundary}>
        {children}
        <Dialog
          actions={
            <Button onClick={() => setDestination(null)} variant="secondary">
              Back to example
            </Button>
          }
          customTrigger
          description="This command belongs to the example application. This local preview never opens another page or contacts a live service."
          onOpenChange={({ open }) => {
            if (!open) {
              setDestination(null)
            }
          }}
          open={destination !== null}
          title={destination?.label ?? "Navigation preview"}
        >
          <StatusText>
            Application command or destination:{" "}
            {destination?.href === "#" ? destination.label : destination?.href}
          </StatusText>
        </Dialog>
      </div>
    </DemoActionContext.Provider>
  )
}
