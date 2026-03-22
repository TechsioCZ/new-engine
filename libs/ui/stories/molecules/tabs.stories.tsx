import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { VariantContainer } from '../../.storybook/decorator'
import { Tabs } from '../../src/molecules/tabs'
import { Icon } from '../../src/atoms/icon'
import { Badge } from '../../src/atoms/badge'

const meta: Meta<typeof Tabs> = {
  title: 'Molecules/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A flexible tabs component using compound pattern. Allows full control over tab structure and content with composition.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'line', 'solid', 'outline'],
      description: 'Visual style variant',
      table: { defaultValue: { summary: 'default' }, category: 'Appearance' },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the tabs',
      table: { defaultValue: { summary: 'md' }, category: 'Appearance' },
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Tabs orientation',
      table: { defaultValue: { summary: 'horizontal' }, category: 'Layout' },
    },
    fitted: {
      control: 'boolean',
      description: 'Tabs fill full width',
      table: { defaultValue: { summary: 'false' }, category: 'Layout' },
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end'],
      description: 'Tab list justification',
      table: { defaultValue: { summary: 'start' }, category: 'Layout' },
    },
    dir: {
      control: 'radio',
      options: ['ltr', 'rtl'],
      description: 'Text direction',
      table: { defaultValue: { summary: 'ltr' }, category: 'Behavior' },
    },
    activationMode: {
      control: 'radio',
      options: ['automatic', 'manual'],
      description: 'Tab activation behavior',
      table: { defaultValue: { summary: 'automatic' }, category: 'Behavior' },
    },
    loopFocus: {
      control: 'boolean',
      description: 'Loop keyboard focus',
      table: { defaultValue: { summary: 'true' }, category: 'Behavior' },
    },
  },
}

export default meta
type Story = StoryObj<typeof Tabs>

// Playground with interactive controls
export const Playground: Story = {
  args: {
    variant: 'line',
    size: 'md',
    orientation: 'horizontal',
    fitted: false,
    justify: 'start',
    dir: 'ltr',
    activationMode: 'automatic',
    loopFocus: true,
    defaultValue: 'tab1',
  },
  render: (args) => (
    <Tabs {...args} className="w-md">
      <Tabs.List>
        <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
        <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
        <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Content value="tab1">
        <p className="text-fg-secondary">
          Overview tab content. Try changing the controls to see different variants and sizes.
        </p>
      </Tabs.Content>
      <Tabs.Content value="tab2">
        <p className="text-fg-secondary">
          Details tab content with more information.
        </p>
      </Tabs.Content>
      <Tabs.Content value="tab3">
        <p className="text-fg-secondary">
          Settings tab for configuration options.
        </p>
      </Tabs.Content>
    </Tabs>
  ),
}

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <VariantContainer>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-400'>
      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Default</h3>
        <Tabs defaultValue="tab1" variant="default" fitted>
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Default variant content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Line</h3>
        <Tabs defaultValue="tab1" variant="line" fitted>
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Line variant content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Solid</h3>
        <Tabs defaultValue="tab1" variant="solid" fitted>
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Solid variant content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Outline</h3>
        <Tabs defaultValue="tab1" variant="outline" fitted>
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Outline variant content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>
      </div>
    </VariantContainer>
  ),
}

// Sizes showcase
export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Small</h3>
        <Tabs defaultValue="tab1" variant="line" size="sm">
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-150">Small size content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-150">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-150">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Medium (Default)</h3>
        <Tabs defaultValue="tab1" variant="line" size="md">
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Medium size content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Large</h3>
        <Tabs defaultValue="tab1" variant="line" size="lg">
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-300">Large size content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-300">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-300">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>
    </VariantContainer>
  ),
}

// Vertical orientation
export const VerticalOrientation: Story = {
  render: () => (
    <div className="flex h-96">
      <Tabs defaultValue="tab1" orientation="vertical" variant="line" className="w-md">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
          <Tabs.Trigger value="tab2">Analytics</Tabs.Trigger>
          <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
          <Tabs.Trigger value="tab4">Team</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Overview</h3>
            <p className="text-fg-secondary">
              Dashboard overview with key metrics and statistics.
            </p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Analytics</h3>
            <p className="text-fg-secondary">
              Detailed analytics and performance data.
            </p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Settings</h3>
            <p className="text-fg-secondary">
              Configure your application settings.
            </p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab4">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Team</h3>
            <p className="text-fg-secondary">Manage your team members.</p>
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// Controlled state
export const Controlled: Story = {
  render: () => {
    const [selectedTab, setSelectedTab] = useState('tab2')

    return (
      <div className="w-full max-w-2xl flex flex-col gap-200">
        <div className="flex items-center gap-200 bg-surface-secondary p-200 rounded-md">
          <span className="text-sm font-medium">Current tab: {selectedTab}</span>
        </div>
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          variant="line"
        >
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Tab 3</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">First tab content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Second tab content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Third tab content</div>
          </Tabs.Content>
        </Tabs>
      </div>
    )
  },
}

// Fitted tabs
export const FittedTabs: Story = {
  render: () => (
    <VariantContainer>
      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Fitted - Line variant</h3>
        <Tabs defaultValue="tab1" variant="line" fitted className="w-md">
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Fitted tabs fill the entire width</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Fitted - Solid variant</h3>
        <Tabs defaultValue="tab1" variant="solid" fitted>
          <Tabs.List>
            <Tabs.Trigger value="tab1">Overview</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Details</Tabs.Trigger>
            <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Fitted solid tabs</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Details content</div>
          </Tabs.Content>
          <Tabs.Content value="tab3">
            <div className="p-200">Settings content</div>
          </Tabs.Content>
        </Tabs>
      </div>
    </VariantContainer>
  ),
}

// Justify options
export const JustifyOptions: Story = {
  render: () => (
    <VariantContainer>
      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Justify Start</h3>
        <Tabs defaultValue="tab1" variant="line" justify="start" className="w-md">
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Start aligned content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Tab 2 content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Justify Center</h3>
        <Tabs defaultValue="tab1" variant="line" justify="center" className="w-md">
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">Center aligned content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Tab 2 content</div>
          </Tabs.Content>
        </Tabs>
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-150">Justify End</h3>
        <Tabs defaultValue="tab1" variant="line" justify="end" className="w-md">
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tab1">
            <div className="p-200">End aligned content</div>
          </Tabs.Content>
          <Tabs.Content value="tab2">
            <div className="p-200">Tab 2 content</div>
          </Tabs.Content>
        </Tabs>
      </div>
    </VariantContainer>
  ),
}

// Disabled tabs
export const DisabledTabs: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs defaultValue="tab1" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Active Tab</Tabs.Trigger>
          <Tabs.Trigger value="tab2" disabled>
            Disabled Tab
          </Tabs.Trigger>
          <Tabs.Trigger value="tab3">Another Active Tab</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">
            <p className="text-fg-secondary">
              The second tab is disabled and cannot be activated.
            </p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">Disabled content</div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">Third tab content</div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// With icons
export const WithIcons: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs defaultValue="tab1" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="tab1">
            <Icon icon="icon-[mdi--home]" className="mr-50" />
            Home
          </Tabs.Trigger>
          <Tabs.Trigger value="tab2">
            <Icon icon="icon-[mdi--account]" className="mr-50" />
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger value="tab3">
            <Icon icon="icon-[mdi--cog]" className="mr-50" />
            Settings
          </Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Home</h3>
            <p className="text-fg-secondary">Welcome to your dashboard</p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Profile</h3>
            <p className="text-fg-secondary">Manage your profile settings</p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Settings</h3>
            <p className="text-fg-secondary">Configure application settings</p>
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// With badges
export const WithBadges: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Tabs defaultValue="tab1" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="tab1">
            Overview
            <Badge variant="primary" className="ml-50">
              New
            </Badge>
          </Tabs.Trigger>
          <Tabs.Trigger value="tab2">
            Messages
            <Badge variant="primary" className="ml-50">
              12
            </Badge>
          </Tabs.Trigger>
          <Tabs.Trigger value="tab3">Settings</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Overview</h3>
            <p className="text-fg-secondary">New features available</p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Messages</h3>
            <p className="text-fg-secondary">You have 12 unread messages</p>
          </div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-50">Settings</h3>
            <p className="text-fg-secondary">Configure your preferences</p>
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// RTL support
export const RTLSupport: Story = {
  render: () => (
    <div className="w-full max-w-2xl" dir="rtl">
      <Tabs defaultValue="tab1" dir="rtl" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="tab1">علامة التبويب الأولى</Tabs.Trigger>
          <Tabs.Trigger value="tab2">علامة التبويب الثانية</Tabs.Trigger>
          <Tabs.Trigger value="tab3">علامة التبويب الثالثة</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="tab1">
          <div className="p-200">محتوى علامة التبويب الأولى</div>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <div className="p-200">محتوى علامة التبويب الثانية</div>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <div className="p-200">محتوى علامة التبويب الثالثة</div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}

// Nested tabs - tabs within tabs
export const NestedTabs: Story = {
  render: () => (
    <div className="w-full max-w-4xl">
      <div className="bg-surface-secondary p-200 rounded-md mb-200">
        <p className="text-sm text-fg-secondary">
          Demonstrates nested tabs structure - useful for complex hierarchical content.
        </p>
      </div>
      <Tabs defaultValue="account" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="account">Account</Tabs.Trigger>
          <Tabs.Trigger value="privacy">Privacy</Tabs.Trigger>
          <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Content value="account">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-150">Account Settings</h3>
            <Tabs defaultValue="profile" variant="solid" size="sm">
              <Tabs.List>
                <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
                <Tabs.Trigger value="security">Security</Tabs.Trigger>
                <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="profile">
                <div className="p-150 bg-surface-secondary rounded-md mt-150">
                  <h4 className="font-medium mb-100">Profile Information</h4>
                  <p className="text-sm text-fg-secondary">
                    Update your personal information and profile picture.
                  </p>
                </div>
              </Tabs.Content>
              <Tabs.Content value="security">
                <div className="p-150 bg-surface-secondary rounded-md mt-150">
                  <h4 className="font-medium mb-100">Security Settings</h4>
                  <p className="text-sm text-fg-secondary">
                    Manage your password, 2FA, and security preferences.
                  </p>
                </div>
              </Tabs.Content>
              <Tabs.Content value="billing">
                <div className="p-150 bg-surface-secondary rounded-md mt-150">
                  <h4 className="font-medium mb-100">Billing Information</h4>
                  <p className="text-sm text-fg-secondary">
                    View and update your billing details and payment methods.
                  </p>
                </div>
              </Tabs.Content>
            </Tabs>
          </div>
        </Tabs.Content>

        <Tabs.Content value="privacy">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-150">Privacy Settings</h3>
            <Tabs defaultValue="data" variant="outline" size="sm">
              <Tabs.List>
                <Tabs.Trigger value="data">Data & Privacy</Tabs.Trigger>
                <Tabs.Trigger value="sharing">Sharing</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="data">
                <div className="p-150 bg-surface-secondary rounded-md mt-150">
                  <h4 className="font-medium mb-100">Data & Privacy</h4>
                  <p className="text-sm text-fg-secondary">
                    Control how your data is collected and used.
                  </p>
                </div>
              </Tabs.Content>
              <Tabs.Content value="sharing">
                <div className="p-150 bg-surface-secondary rounded-md mt-150">
                  <h4 className="font-medium mb-100">Sharing Preferences</h4>
                  <p className="text-sm text-fg-secondary">
                    Manage who can see your information and activity.
                  </p>
                </div>
              </Tabs.Content>
            </Tabs>
          </div>
        </Tabs.Content>

        <Tabs.Content value="notifications">
          <div className="p-200">
            <h3 className="text-lg font-semibold mb-100">Notification Settings</h3>
            <p className="text-fg-secondary">
              Configure how and when you receive notifications.
            </p>
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  ),
}
