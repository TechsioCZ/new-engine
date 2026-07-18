import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { Switch } from "../../src/molecules/switch"

const meta: Meta<typeof Switch> = {
  title: "Molecules/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "boolean",
      description: "Checked state of the switch",
    },
    defaultChecked: {
      control: "boolean",
      description: "Default checked state (uncontrolled component)",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state of the switch",
    },
    readOnly: {
      control: "boolean",
      description: "Read-only state",
    },
    required: {
      control: "boolean",
      description: "Marks switch as required",
    },
    validateStatus: {
      control: { type: "select" },
      options: ["default", "error", "success", "warning"],
      description: "Validation status of the switch",
    },
    helpText: {
      control: "text",
      description: "Help text displayed below the switch",
    },
    showHelpTextIcon: {
      control: "boolean",
      description: "Whether to show an icon with the help text",
    },
    children: {
      control: "text",
      description: "Label text for the switch",
    },
    onCheckedChange: { action: "changed" },
  },
  args: {
    defaultChecked: false,
    disabled: false,
    readOnly: false,
    required: false,
  },
}

export default meta
type Story = StoryObj<typeof Switch>

// Basic stories
export const Default: Story = {
  args: {
    children: "Default switch",
  },
}

// With help text
export const WithHelpText: Story = {
  args: {
    children: "Marketing emails",
    helpText: "Receive updates about new products and promotions",
  },
}

// With validation states
export const WithValidation: Story = {
  render: () => (
    <div className="space-y-6">
      <Switch
        validateStatus="error"
        helpText="This setting is required for security reasons"
      >
        Error state
      </Switch>
      <Switch
        validateStatus="success"
        helpText="Two-factor authentication is enabled"
        defaultChecked
      >
        Success state
      </Switch>
      <Switch
        validateStatus="warning"
        helpText="Consider enabling this for better security"
      >
        Warning state
      </Switch>
      <Switch helpText="This is a default help text">Default state</Switch>
    </div>
  ),
}

// All states showcase
export const AllStates: Story = {
  render: () => {
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          <Switch>Default switch</Switch>

          <Switch defaultChecked>Checked switch</Switch>

          <Switch disabled>Disabled switch</Switch>

          <Switch disabled defaultChecked>
            Disabled checked
          </Switch>

          <Switch validateStatus="error" helpText="Error state">
            Error switch
          </Switch>

          <Switch required>Required switch</Switch>

          <Switch readOnly defaultChecked>
            Read-only switch
          </Switch>
        </div>
      </div>
    )
  },
}

// With descriptions
export const WithDescriptions: Story = {
  render: () => {
    return (
      <div className="space-y-6">
        <Switch helpText="Get notified when someone mentions you">
          Push notifications
        </Switch>

        <Switch
          defaultChecked
          helpText="Automatically save your work every 5 minutes"
        >
          Auto-save
        </Switch>

        <Switch
          disabled
          helpText="Contact your administrator to enable this feature"
        >
          Advanced settings
        </Switch>

        <Switch
          validateStatus="error"
          helpText="You must enable this for compliance"
        >
          Data encryption
        </Switch>
      </div>
    )
  },
}

// Controlled switch example
export const ControlledSwitch: Story = {
  render: () => {
    const [isChecked, setIsChecked] = useState(false)

    const handleChange = (checked: boolean) => {
      setIsChecked(checked)
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Switch checked={isChecked} onCheckedChange={handleChange}>
            Controlled switch
          </Switch>
          <span className="text-sm">Status: {isChecked ? "ON" : "OFF"}</span>
        </div>
        <button
          onClick={() => setIsChecked((prev) => !prev)}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100/20"
        >
          Toggle switch
        </button>
      </div>
    )
  },
}

// Settings panel example
export const SettingsPanel: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      notifications: true,
      marketing: false,
      analytics: true,
      security: true,
    })

    const handleSettingChange =
      (key: keyof typeof settings) => (checked: boolean) => {
        setSettings((prev) => ({ ...prev, [key]: checked }))
      }

    return (
      <div className="w-96 rounded-lg border p-6">
        <h3 className="mb-6 font-semibold text-lg">Privacy Settings</h3>

        <div className="space-y-6">
          <Switch
            checked={settings.notifications}
            onCheckedChange={handleSettingChange("notifications")}
            helpText="Receive important updates about your account"
          >
            Email notifications
          </Switch>

          <Switch
            checked={settings.marketing}
            onCheckedChange={handleSettingChange("marketing")}
            helpText="Get tips and updates about new features"
          >
            Marketing communications
          </Switch>

          <Switch
            checked={settings.analytics}
            onCheckedChange={handleSettingChange("analytics")}
            helpText="Help us improve by sharing anonymous usage data"
          >
            Usage analytics
          </Switch>

          <Switch
            checked={settings.security}
            onCheckedChange={handleSettingChange("security")}
            validateStatus={settings.security ? "success" : "error"}
            helpText={
              !settings.security
                ? "Required for account security"
                : "Enhanced security is enabled"
            }
          >
            Two-factor authentication
          </Switch>
        </div>

        <div className="mt-6 rounded bg-gray-100/30 p-3 text-sm">
          Current settings: {JSON.stringify(settings, null, 2)}
        </div>
      </div>
    )
  },
}
