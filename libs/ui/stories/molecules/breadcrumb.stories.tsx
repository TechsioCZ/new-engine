import type { Meta, StoryObj } from '@storybook/react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import {
  Breadcrumb,
  type BreadcrumbRootProps,
} from '../../src/molecules/breadcrumb'

const meta: Meta<typeof Breadcrumb> = {
  title: 'Molecules/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A compound breadcrumb navigation component for composing custom breadcrumb structures.
Use this molecule when a project needs control over individual breadcrumb slots.
Use BreadcrumbTemplate for the ready-to-use data-driven default.
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-container-md bg-surface p-400">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description:
        'Controls breadcrumb sizing across root, list, links and icons.',
      table: {
        category: 'Appearance',
        defaultValue: { summary: 'md' },
      },
    },
    variant: {
      control: 'select',
      options: ['plain', 'underline'],
      description: 'Controls the visual style of breadcrumb links.',
      table: {
        category: 'Appearance',
        defaultValue: { summary: 'plain' },
      },
    },
    'aria-label': {
      control: 'text',
      description: 'Accessible label for the breadcrumb navigation.',
      table: {
        category: 'Accessibility',
        defaultValue: { summary: 'breadcrumb' },
      },
    },
  },
  args: {
    size: 'md',
    variant: 'plain',
    'aria-label': 'breadcrumb',
  },
}

export default meta
type Story = StoryObj<typeof Breadcrumb>

function DemoBreadcrumb(props: BreadcrumbRootProps) {
  return (
    <Breadcrumb {...props}>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Docs</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Components</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>
            Breadcrumb
          </Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  )
}

export const Playground: Story = {
  render: (args) => <DemoBreadcrumb {...args} />,
}

export const Basic: Story = {
  render: () => <DemoBreadcrumb />,
}

export const Sizes: Story = {
  render: () => (
    <div className='flex flex-col gap-500'>
      <h2>Sizes</h2>
      <div className="flex flex-col gap-400">
        <DemoBreadcrumb size="sm" />
        <DemoBreadcrumb size="md" />
        <DemoBreadcrumb size="lg" />
      </div>
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Variants">
        <div className='flex flex-col'>
          <DemoBreadcrumb variant="plain" />
          <DemoBreadcrumb variant="underline" />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <Breadcrumb>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">
            <Breadcrumb.Icon icon="token-icon-home" />
            Home
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">
            <Breadcrumb.Icon icon="token-icon-shopping-bag" />
            Products
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>
            <Breadcrumb.Icon icon="token-icon-cpu" />
            Electronics
          </Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  ),
}

export const CustomSeparator: Story = {
  render: () => (
    <Breadcrumb>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Docs</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator>/</Breadcrumb.Separator>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Components</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator>/</Breadcrumb.Separator>
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>
            Breadcrumb
          </Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  ),
}

export const Ellipsis: Story = {
  render: () => (
    <Breadcrumb>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Catalog</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Ellipsis />
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>
            Current product
          </Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  ),
}

export const CustomCurrentLink: Story = {
  render: () => (
    <Breadcrumb>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Products</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink className="underline">
            Current product
          </Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  ),
}