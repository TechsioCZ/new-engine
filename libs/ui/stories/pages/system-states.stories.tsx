import { DemoBoundary } from "./demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import type { ReactNode } from "react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Input } from "../../src/atoms/input"
import { Dialog } from "../../src/molecules/dialog"
import { Icon, type IconType } from "../../src/atoms/icon"
import { Skeleton } from "../../src/atoms/skeleton"
import { StatusText } from "../../src/atoms/status-text"
import { adminNav } from "./data"
import {
  Brand,
  Frame,
  GlobalSearch,
  NavDrawer,
  NavList,
  Panel,
  TopBar,
} from "./frame"
import { PageHeader, SectionCard, StatCard, StatRow } from "./shell"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],
  tags: ["autodocs"],
  title: "Pages/System/States",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "The screens a product shows when things are missing, forbidden or broken.",
          "They get designed last and seen most, so they are collected here as one set.",
          "",
          "**Pattern rules**",
          "- Say what happened, why, and the one thing the user can do next. A state",
          "  screen with no action is a dead end.",
          "- Keep the navigation. Removing the chrome on a 404 strands the user in a",
          "  product they were already inside.",
          "- Permission errors name who can grant access — “ask an admin” is not an",
          "  action, “request access from Nora Kessler” is.",
          "- Server errors carry a reference the user can quote to support; never show a",
          "  stack trace.",
          "- Skeletons mirror the shape of the content that is coming, so the page does",
          "  not jump when it arrives.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

/* Navigation clicks are reported to the Actions panel and still drive state. */
const reportNav = fn().mockName("onNavSelect")
const selectNav = (setNav: (value: string) => void) => (value: string) => {
  reportNav(value)
  setNav(value)
}

function StateShell({ children }: { children: ReactNode }) {
  const [nav, setNav] = useState("content-pages")
  return (
    <Frame
      left={
        <Panel label="Main navigation" side="start">
          <Brand />
          <NavList nav={adminNav} onSelect={selectNav(setNav)} selected={nav} />
        </Panel>
      }
      top={
        <TopBar
          center={<GlobalSearch />}
          start={<NavDrawer nav={adminNav} onSelect={setNav} selected={nav} />}
        />
      }
    >
      {children}
    </Frame>
  )
}

function RecoveryAction({
  label,
  kind,
}: {
  label: string
  kind: "dashboard" | "retry" | "support" | "request" | "notify"
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState("")
  return (
    <>
      <Button
        variant={
          kind === "dashboard" || kind === "support" ? "secondary" : "primary"
        }
        theme={
          kind === "dashboard" || kind === "support" ? "outlined" : "solid"
        }
        onClick={() => {
          setDone(false)
          setOpen(true)
        }}
      >
        {label}
      </Button>
      <Dialog
        customTrigger
        open={open}
        onOpenChange={({ open: next }) => setOpen(next)}
        title={kind === "dashboard" ? "Demo dashboard" : label}
        description="This recovery flow runs locally in Storybook. No request, email or notification is sent."
      >
        {kind === "retry" ? (
          <>
            <StatusText status="success">
              Local sample data is available again. The failed request was
              replaced with a local preview.
            </StatusText>
            <p>Orders: 24 · Products: 120 · Last local update: just now</p>
          </>
        ) : kind === "dashboard" ? (
          <>
            <h2 className="font-semibold">Northwind workspace</h2>
            <p>
              Use the navigation menu to explore the application layout. This
              preview intentionally stays in Storybook.
            </p>
          </>
        ) : kind === "support" ? (
          <>
            <StatusText>
              Support reference: 9f2c-41ab-7e10. Include this reference and
              describe what you were doing before the error.
            </StatusText>
            <p>No support ticket has been sent from this prototype.</p>
          </>
        ) : (
          <form
            className="flex flex-col gap-150"
            onSubmit={(event) => {
              event.preventDefault()
              setDone(true)
            }}
          >
            <label htmlFor={`recovery-${kind}`}>Contact email</label>
            <Input
              id={`recovery-${kind}`}
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setDone(false)
              }}
            />
            <Button type="submit" disabled={done}>
              {done ? "Saved locally" : "Save demo request"}
            </Button>
            {done && (
              <StatusText role="status">
                Demo request saved for {email}. Nothing was sent; closing this
                example clears it.
              </StatusText>
            )}
          </form>
        )}
      </Dialog>
    </>
  )
}

function StatePanel({
  icon,
  tone = "neutral",
  title,
  description,
  detail,
  actions,
}: {
  icon: IconType
  tone?: "neutral" | "warning" | "danger"
  title: string
  description: string
  detail?: ReactNode
  actions: ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "text-fg-accent-danger"
      : tone === "warning"
        ? "text-fg-accent-warning"
        : "text-fg-secondary"

  return (
    <div className="flex flex-1 items-center justify-center p-350">
      <div className="flex max-w-xl flex-col items-center gap-200 text-center">
        <Icon className={toneClass} icon={icon} size="2xl" />
        <div className="flex flex-col gap-100">
          <h1 className="font-semibold text-xl">{title}</h1>
          <p className="max-w-prose text-fg-secondary text-sm">{description}</p>
        </div>
        {detail}
        <div className="flex flex-wrap items-center justify-center gap-150">
          {actions}
        </div>
      </div>
    </div>
  )
}

export const NotFound: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare not found in system states to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "404 · Not found",
  render: () => (
    <StateShell>
      <StatePanel
        actions={
          <>
            <RecoveryAction label={"Go back"} kind="dashboard" />
            <RecoveryAction label={"Open dashboard"} kind="dashboard" />
          </>
        }
        description="The page you followed does not exist, or it was deleted. If you reached this from a link inside the admin, the record was probably removed by someone else."
        icon="icon-[mdi--compass-off-outline]"
        title="We can't find that page"
      />
    </StateShell>
  ),
}

export const Forbidden: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare forbidden in system states to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "403 · No permission",
  render: () => (
    <StateShell>
      <StatePanel
        actions={
          <>
            <RecoveryAction label={"Go back"} kind="dashboard" />
            <RecoveryAction
              label={"Request access from Nora Kessler"}
              kind="request"
            />
          </>
        }
        description="Billing is limited to workspace owners. Your role is Editor, which can read and publish content but not see financial data."
        detail={
          <Badge size="sm" variant="outline">
            Required role · Owner
          </Badge>
        }
        icon="icon-[mdi--lock-outline]"
        title="You don't have access to billing"
        tone="warning"
      />
    </StateShell>
  ),
}

export const ServerError: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare server error in system states to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "500 · Something broke",
  render: () => (
    <StateShell>
      <StatePanel
        actions={
          <>
            <RecoveryAction label={"Try again"} kind="retry" />
            <RecoveryAction label={"Contact support"} kind="support" />
          </>
        }
        description="The request failed on our side, not yours. Nothing you entered was saved. Quote the reference below if you contact support."
        detail={
          <StatusText showIcon size="sm" status="error">
            Reference 9f2c-41ab-7e10
          </StatusText>
        }
        icon="icon-[mdi--alert-octagon-outline]"
        title="Something went wrong"
        tone="danger"
      />
    </StateShell>
  ),
}

export const Offline: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare offline in system states to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Offline",
  render: () => (
    <StateShell>
      <StatePanel
        actions={<RecoveryAction label={"Retry now"} kind="retry" />}
        description="Your changes are held locally and will be sent as soon as the connection returns. Do not close the tab."
        detail={
          <Badge size="sm" variant="warning">
            3 changes queued
          </Badge>
        }
        icon="icon-[mdi--wifi-off]"
        title="You're offline"
        tone="warning"
      />
    </StateShell>
  ),
}

export const Maintenance: Story = {
  name: "Maintenance",
  parameters: {
    docs: {
      description: {
        story:
          "A planned outage is the one state that drops the navigation: there is nothing behind it to navigate to. It names a return time, because “soon” is not information.",
      },
    },
  },
  render: () => (
    <div className="flex min-h-screen flex-col bg-base text-fg-primary">
      <TopBar start={<Brand environment="Maintenance" />} />
      <StatePanel
        actions={
          <RecoveryAction label={"Notify me when it's back"} kind="notify" />
        }
        description="We are migrating the order database. The admin is read-only until 03:00 CET; the storefront and checkout are unaffected."
        detail={
          <Badge size="sm" variant="info">
            Back at 03:00 CET
          </Badge>
        }
        icon="icon-[mdi--wrench-outline]"
        title="Scheduled maintenance"
      />
    </div>
  ),
}

export const LoadingPage: Story = {
  name: "Loading",
  parameters: {
    docs: {
      description: {
        story:
          "The skeleton mirrors the real page: the same header block, the same four KPI tiles, the same card. A generic spinner would tell the user nothing about what is coming.",
      },
    },
  },
  render: () => (
    <StateShell>
      <Skeleton isLoaded={false}>
        <Skeleton.Text lastLineWidth="40%" noOfLines={2} />
      </Skeleton>
      <StatRow>
        <StatCard label="Revenue" value="—" />
        <StatCard label="Orders" value="—" />
        <StatCard label="Average order" value="—" />
        <StatCard label="Conversion" value="—" />
      </StatRow>
      <SectionCard title="Revenue trend">
        <Skeleton isLoaded={false}>
          <Skeleton.Rectangle />
        </Skeleton>
      </SectionCard>
      <SectionCard title="Latest orders">
        <Skeleton isLoaded={false}>
          <Skeleton.Text noOfLines={6} />
        </Skeleton>
      </SectionCard>
    </StateShell>
  ),
}

export const FirstRun: Story = {
  name: "First run · empty product",
  parameters: {
    docs: {
      description: {
        story:
          "An empty product is not an error — it is the best onboarding moment there is. State the first three things worth doing and make one of them the primary action.",
      },
    },
  },
  render: () => (
    <StateShell>
      <PageHeader
        description="Nothing has been imported yet. Three steps and the storefront is live."
        title="Welcome to Northwind Commerce"
      />
      <div className="grid grid-cols-1 gap-250 lg:grid-cols-3">
        <SectionCard
          actions={undefined}
          description="Bring a CSV or connect an existing catalogue. Nothing is published until you say so."
          title="1 · Add products"
        />
        <SectionCard
          actions={undefined}
          description="Pick a brand theme and upload a logo. You can change both later."
          title="2 · Set up the storefront"
        />
        <SectionCard
          actions={undefined}
          description="Connect a payment provider so checkout can take real orders."
          title="3 · Take payments"
        />
      </div>
    </StateShell>
  ),
}
