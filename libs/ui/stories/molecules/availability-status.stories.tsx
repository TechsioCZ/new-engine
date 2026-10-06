import type { Meta, StoryObj } from "@storybook/react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  AvailabilityStatus,
  type AvailabilityStatusProps,
} from "../../src/molecules/availability-status"
import { iconLabels, iconOptions } from "../helpers/icon-options"

const meta: Meta<typeof AvailabilityStatus> = {
  title: "Molecules/AvailabilityStatus",
  component: AvailabilityStatus,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = Omit<StoryObj<typeof meta>, "args"> & {
  args?: Partial<AvailabilityStatusProps>
}
type PlaygroundStory = StoryObj<
  Extract<AvailabilityStatusProps, { label: string }>
>

export const Playground: PlaygroundStory = {
  args: {
    status: "available",
    label: "Skladem",
    detail: "Doručíme v pondělí 29. září.",
    icon: undefined,
    showIcon: true,
  },
  argTypes: {
    status: { control: false },
    label: { control: "text" },
    detail: { control: "text" },
    icon: {
      control: {
        type: "select",
        labels: { ...iconLabels, undefined: "Default" },
      },
      options: iconOptions,
    },
    showIcon: { control: "boolean" },
  },
}

export const States: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Availability states" fullWidth>
        <AvailabilityStatus
          status="available"
          label="Skladem"
          detail="Doručíme v pondělí 29. září."
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
        <AvailabilityStatus
          status="unknown"
          label="Dostupnost neznámá"
        />
        <AvailabilityStatus
          status="pending"
          pendingLabel="Načítání dostupnosti"
        />
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
  render: () => (
    <VariantContainer>
      <VariantGroup title="Narrow layout" fullWidth>
        <div className="w-3xs">
          <AvailabilityStatus
            status="available"
            label="Skladem v centrálním distribučním skladu"
            detail="Předpokládané doručení na zvolenou adresu je ve středu 30. září mezi osmou a osmnáctou hodinou."
          />
        </div>
        <div className="w-3xs">
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
