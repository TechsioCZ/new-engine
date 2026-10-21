import type { Meta, StoryObj } from "@storybook/react"
import { expect, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  AvailabilityStatus,
  type AvailabilityStatusProps,
} from "../../src/molecules/availability-status"
import { iconLabels, iconOptions } from "../helpers/icon-options"

const meta = {
  title: "Molecules/AvailabilityStatus",
  component: AvailabilityStatus,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Displays application-resolved product availability with a text label and a distinct decorative icon. Use it for stock or delivery information; use StatusText for generic feedback and a Button for purchase actions. For available, limited, preorder, unavailable or unknown, label is the visible summary and detail is optional supporting copy. Pending replaces both with a decorative loading skeleton: pendingLabel is its screen-reader-only description, not a second visible label. The application owns all localized copy and delivery promises; changing status changes the presentation, not the supplied text. No live region is added automatically.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    ref: { control: false, table: { disable: true } },
    status: {
      control: "select",
      options: [
        "available",
        "limited",
        "preorder",
        "unavailable",
        "unknown",
        "pending",
      ],
      description:
        "Resolved inventory state, or pending while availability is loading. Changes the icon and emphasis, not the localized label or detail you supply.",
    },
    label: {
      control: "text",
      description:
        "Visible summary for every settled status, for example ‘In stock’ or ‘Availability unknown’. Required except when status is pending, which renders no visible label.",
      if: { arg: "status", neq: "pending" },
    },
    detail: {
      control: "text",
      description:
        "Optional visible supporting copy for a settled status, such as a delivery estimate from your application. Not used while pending.",
      if: { arg: "status", neq: "pending" },
    },
    pendingLabel: {
      control: "text",
      description:
        "Required only for pending: localized screen-reader-only description of the loading skeleton, for example ‘Checking availability’. It is not shown visually and does not create a live announcement. This Playground uses ‘Checking availability’ when left unset.",
      if: { arg: "status", eq: "pending" },
    },
    icon: {
      control: {
        type: "select",
        labels: { ...iconLabels, undefined: "Status default" },
      },
      options: iconOptions,
      description:
        "Optional decorative icon override for settled statuses; unset uses the status-specific icon.",
      if: { arg: "status", neq: "pending" },
    },
    showIcon: {
      control: "boolean",
      description:
        "Shows the decorative status icon; the visible label always carries the meaning. Not used while pending.",
      if: { arg: "status", neq: "pending" },
    },
  },
  render: ({
    status,
    label,
    detail,
    icon,
    showIcon,
    pendingLabel,
    ...props
  }) =>
    status === "pending" ? (
      <AvailabilityStatus
        {...props}
        status="pending"
        pendingLabel={pendingLabel ?? "Checking availability"}
      />
    ) : (
      <AvailabilityStatus
        {...props}
        status={status}
        label={label ?? "In stock"}
        detail={detail}
        icon={icon}
        showIcon={showIcon}
      />
    ),
} satisfies Meta<typeof AvailabilityStatus>

export default meta
// Controls keep copy for both branches while the component API stays discriminated.
type Story = Omit<StoryObj<typeof meta>, "args"> & {
  args?: Partial<Omit<AvailabilityStatusProps, "status">> & {
    status?: AvailabilityStatusProps["status"]
  }
}

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Change status to explore all six presentations, edit label and detail for settled states, or select pending to edit its screen-reader-only pendingLabel; changing status deliberately preserves your copy.",
      },
    },
  },
  args: {
    status: "available",
    label: "In stock",
    detail: "Ready to dispatch within one business day.",
    pendingLabel: "Checking availability",
    icon: undefined,
    showIcon: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const root = canvasElement.querySelector("[data-status]")
    await expect(root).toHaveAttribute("data-status", args.status)
    if (args.status === "pending") {
      await expect(
        canvas.getByText(args.pendingLabel ?? "Checking availability")
      ).toHaveClass("sr-only")
      await expect(root?.querySelector('[aria-busy="true"]')).toHaveAttribute(
        "aria-hidden",
        "true"
      )
      await expect(
        root?.querySelector(".text-availability-status-label-size")
      ).toBeNull()
      await expect(
        root?.querySelector(".text-availability-status-detail-size")
      ).toBeNull()
    } else {
      await expect(canvas.getByText(args.label ?? "In stock")).toBeVisible()
      if (args.detail) {
        await expect(canvas.getByText(args.detail)).toBeVisible()
      }
      await expect(root?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(
        args.showIcon === false ? 0 : 1
      )
      if (args.icon && args.showIcon !== false) {
        await expect(root?.querySelector('[aria-hidden="true"]')).toHaveClass(
          args.icon,
          { exact: false }
        )
      }
    }
  },
}

export const States: Story = {
  name: "All states",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare the five resolved inventory states and the loading skeleton side by side, with distinct text and icons so availability never relies on color alone.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Resolved availability" fullWidth>
        <AvailabilityStatus
          status="available"
          label="Skladem"
          detail="Připraveno k odeslání do jednoho pracovního dne."
        />
        <AvailabilityStatus
          status="limited"
          label="Poslední kusy"
          detail="Objednejte do vyprodání zásob."
        />
        <AvailabilityStatus
          status="preorder"
          label="Na objednávku"
          detail="Obvykle odesíláme do dvou týdnů."
        />
        <AvailabilityStatus
          status="unavailable"
          label="Nedostupné"
          detail="Termín naskladnění zatím není známý."
        />
        <AvailabilityStatus status="unknown" label="Dostupnost neznámá" />
      </VariantGroup>
      <VariantGroup title="Checking availability" fullWidth>
        <p className="text-fg-secondary text-sm">
          Loading skeleton with a screen-reader-only description.
        </p>
        <AvailabilityStatus
          status="pending"
          pendingLabel="Načítání dostupnosti"
        />
      </VariantGroup>
      <VariantGroup title="Icon options" fullWidth>
        <AvailabilityStatus
          status="available"
          label="Skladem s vlastní ikonou"
          icon="token-icon-info"
        />
        <AvailabilityStatus
          status="limited"
          label="Omezená dostupnost bez ikony"
          showIcon={false}
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const LongContent: Story = {
  name: "Long content",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Long localized labels and delivery information wrap in a narrow product-card layout without hiding essential availability details.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Narrow layout" fullWidth>
        <div className="w-3xs max-w-full">
          <AvailabilityStatus
            status="available"
            label="Skladem v centrálním distribučním skladu"
            detail="Předpokládaný čas doručení na zvolenou adresu najdete při výběru dopravy v košíku."
          />
        </div>
        <div className="w-3xs max-w-full">
          <AvailabilityStatus
            status="unknown"
            label="Dostupnost tohoto produktu se momentálně ověřuje"
            detail="Pro aktuální informace o možnosti objednání kontaktujte zákaznickou podporu."
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
