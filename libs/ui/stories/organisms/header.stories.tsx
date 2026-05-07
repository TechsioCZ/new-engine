import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '../../src/atoms/button'
import { Icon, type IconType } from '../../src/atoms/icon'
import { Link } from '../../src/atoms/link'
import { Accordion } from '../../src/molecules/accordion'
import { Dialog } from '../../src/molecules/dialog'
import { Popover } from '../../src/molecules/popover'
import { Header } from '../../src/organisms/header'

const meta: Meta<typeof Header> = {
  title: 'Organisms/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Header Component

Flexible header component with responsive subcomponents for building navigation bars.

## Key Concepts

### Desktop vs Mobile vs Always Visible
- **No wrapper**: Content is always visible across all viewports
- **Header.Desktop**: Hidden below desktop breakpoint - use for desktop-specific UI
- **Header.Mobile**: Hidden above desktop breakpoint + controlled by hamburger menu - use for mobile-specific UI

### Why Wrappers Instead of Props?
The Desktop/Mobile wrapper approach provides flexibility for:
- Different UI patterns per platform (Popover on desktop, Accordion on mobile)
- Conditional elements (some features only on desktop)
- Selective visibility (Actions outside Desktop/Mobile = always visible)

### Subcomponents
- **Header.Nav**: Navigation wrapper (use inside Desktop/Mobile or standalone)
- **Header.NavItem**: Presentation wrapper for Link/Button
- **Header.Actions**: Action buttons area (typically always visible)
- **Header.Container**: Flex wrapper with positioning (start/center/end)
- **Header.Hamburger**: Auto-toggles mobile menu (zero-config)
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Header>

export const SimpleHeader: Story = {
  parameters: {
    docs: {
      description: {
        story: `
**Simple header example**: Basic navigation with actions

**Pattern**:
- Nav with Home (active), About, Contact
- Actions inside Desktop/Mobile (not always visible)
- Shows active state on NavItem

**Key concepts demonstrated**:
- Desktop/Mobile wrappers for responsive behavior
- Active state styling with \`active\` prop
- Actions can be inside responsive wrappers (not always visible)
        `,
      },
    },
  },
  render: () => {
    return (
      <div className="flex flex-col gap-950">
        <Header>
          <Header.Desktop>
            <Header.Nav>
              <Header.NavItem active>
                <Link href="/">Home</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/about">About</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/contact">Contact</Link>
              </Header.NavItem>
            </Header.Nav>
            <Header.Container position="end">
              <Header.Actions>
                <Header.ActionItem>
                  <Button
                    icon="icon-[mdi--account]"
                    theme="unstyled"
                    size="current"
                  >
                    Account
                  </Button>
                </Header.ActionItem>
                <Header.ActionItem>
                  <Button
                    icon="icon-[mdi--cart]"
                    theme="unstyled"
                    size="current"
                  >
                    Cart
                  </Button>
                </Header.ActionItem>
              </Header.Actions>
            </Header.Container>
          </Header.Desktop>
          <Header.Mobile position="right">
            <Accordion variant="child">
              <Header.NavItem active>
                <Link href="/">Home</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/about">About</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/contact">Contact</Link>
              </Header.NavItem>
              <Header.ActionItem>
                <Button theme="unstyled" size="current">
                  Account
                </Button>
              </Header.ActionItem>
              <Header.ActionItem>
                <Button theme="unstyled" size="current">
                  Cart
                </Button>
              </Header.ActionItem>
            </Accordion>
          </Header.Mobile>
          <Header.Hamburger className="relative left-11/12" />
        </Header>

        <div className="w-2xl">
          <Header>
            <Header.Desktop>
              <Header.Nav>
                <Header.NavItem active>
                  <Link href="/">Home</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/about">About</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/contact">Contact</Link>
                </Header.NavItem>
              </Header.Nav>
              <Header.Container position="end">
                <Header.Actions>
                  <Header.ActionItem>
                    <Button
                      icon="icon-[mdi--account]"
                      theme="unstyled"
                      size="current"
                    >
                      Account
                    </Button>
                  </Header.ActionItem>
                  <Header.ActionItem>
                    <Button
                      icon="icon-[mdi--cart]"
                      theme="unstyled"
                      size="current"
                    >
                      Cart
                    </Button>
                  </Header.ActionItem>
                </Header.Actions>
              </Header.Container>
            </Header.Desktop>
            <Header.Mobile position="right">
              <Accordion variant="child">
                <Header.NavItem active>
                  <Link href="/">Home</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/about">About</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/contact">Contact</Link>
                </Header.NavItem>
                <Header.ActionItem>
                  <Button theme="unstyled" size="current">
                    Account
                  </Button>
                </Header.ActionItem>
                <Header.ActionItem>
                  <Button theme="unstyled" size="current">
                    Cart
                  </Button>
                </Header.ActionItem>
              </Accordion>
            </Header.Mobile>
            <Header.Hamburger className="relative left-11/12" />
          </Header>
        </div>
      </div>
    )
  },
}

export const SizeVariants: Story = {
  parameters: {
    docs: {
      description: {
        story: `
**Size variants**: \`sm\`, \`md\` (default), \`lg\`
Sizes are inherited via Context, but can be overridden per subcomponent.
        `,
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-400">
      <div>
        <p className="mb-100 ">Small</p>
        <Header size="sm">
          <Header.Nav>
            <Header.NavItem>
              <Link href="/">Home</Link>
            </Header.NavItem>
          </Header.Nav>
          <Header.Actions>
            <Header.ActionItem>
              <Button theme="unstyled" size="current">
                Sign In
              </Button>
            </Header.ActionItem>
          </Header.Actions>
        </Header>
      </div>
      <div>
        <p className="mb-100">Medium (Default)</p>
        <Header size="md">
          <Header.Nav>
            <Header.NavItem>
              <Link href="/">Home</Link>
            </Header.NavItem>
          </Header.Nav>
          <Header.Actions>
            <Header.ActionItem>
              <Button theme="unstyled" size="current">
                Sign In
              </Button>
            </Header.ActionItem>
          </Header.Actions>
        </Header>
      </div>
      <div>
        <p className="mb-100">Large</p>
        <Header size="lg">
          <Header.Nav>
            <Header.NavItem>
              <Link href="/">Home</Link>
            </Header.NavItem>
          </Header.Nav>
          <Header.Actions>
            <Header.ActionItem>
              <Button theme="unstyled" size="current">
                Sign In
              </Button>
            </Header.ActionItem>
          </Header.Actions>
        </Header>
      </div>
    </div>
  ),
}

export const MobilePositioning: Story = {
  parameters: {
    docs: {
      description: {
        story: `
**Header.Mobile position prop**:
- \`left\`: Mobile menu slides from left
- \`right\`: Mobile menu slides from right (default)

**Note**: This only affects the mobile menu position, not the hamburger button.
        `,
      },
    },
  },
  render: () => (
    <div className="flex w-2xl flex-col gap-400">
      <div className="mb-900">
        <p className="mb-100 ">position="left"</p>
        <Header>
          <Header.Hamburger />
          <Header.Mobile position="left">
            <Header.Nav className="gap-y-0">
              <Header.NavItem>
                <Link href="/">Home</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/products">Products</Link>
              </Header.NavItem>
            </Header.Nav>
          </Header.Mobile>
        </Header>
      </div>

      <div>
        <p className="mb-100 ">position="right" (default)</p>
        <Header className="justify-end">
          <Header.Hamburger />
          <Header.Mobile position="right">
            <Header.Nav className="gap-y-0">
              <Header.NavItem>
                <Link href="/">Home</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/products">Products</Link>
              </Header.NavItem>
            </Header.Nav>
          </Header.Mobile>
        </Header>
      </div>
    </div>
  ),
}

export const NestedSubmenu: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-950">
        <Header>
          <Header.Desktop>
            <Header.Nav>
              <Header.NavItem>
                <Link href="/">Home</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/about">About</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/contact">Contact</Link>
              </Header.NavItem>
              <Popover.Root id="shop-popover-1" placement="bottom">
                <Popover.Trigger className="hover:bg-transparent">
                  <Header.NavItem>
                    <span>Shop</span>
                    <Icon icon="icon-[mdi--chevron-down]" />
                  </Header.NavItem>
                </Popover.Trigger>
                <Popover.Positioner>
                  <Popover.Content>
                    <Popover.Arrow />
                    <Header.NavItem>
                      <Link href="/shop/new">New Arrivals</Link>
                    </Header.NavItem>

                    <Popover.Root
                      id="categories-popover-1"
                      placement="right-start"
                    >
                      <Popover.Trigger className="text-fg-primary px-0 py-0 hover:bg-transparent">
                        <Header.NavItem>
                          <span>Categories</span>
                          <Icon icon="icon-[mdi--chevron-down]" />
                        </Header.NavItem>
                      </Popover.Trigger>
                      <Popover.Positioner>
                        <Popover.Content>
                          <Popover.Arrow />
                          <Header.NavItem>
                            <Link href="/shop/electronics">Electronics</Link>
                          </Header.NavItem>
                          <Header.NavItem>
                            <Link href="/shop/clothing">Clothing</Link>
                          </Header.NavItem>
                          <Header.NavItem>
                            <Link href="/shop/home">Home & Garden</Link>
                          </Header.NavItem>
                        </Popover.Content>
                      </Popover.Positioner>
                    </Popover.Root>
                    <Header.NavItem>
                      <Link href="/shop/sale">Sale</Link>
                    </Header.NavItem>
                  </Popover.Content>
                </Popover.Positioner>
              </Popover.Root>
            </Header.Nav>
          </Header.Desktop>
          <Header.Mobile position="right">
            <Accordion variant="child">
              <Accordion.Item value="home">
                <Header.NavItem>
                  <Link href="/">Home</Link>
                </Header.NavItem>
              </Accordion.Item>
              <Accordion.Item value="about">
                <Header.NavItem>
                  <Link href="/about">About</Link>
                </Header.NavItem>
              </Accordion.Item>
              <Accordion.Item value="contact">
                <Header.NavItem>
                  <Link href="/contact">Contact</Link>
                </Header.NavItem>
              </Accordion.Item>
              <Accordion.Item value="shop">
                <Accordion.Header>
                  <Header.NavItem>Shop</Header.NavItem>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content className="px-0">
                  <Header.NavItem>
                    <Link href="/shop/new">New Arrivals</Link>
                  </Header.NavItem>
                  <Accordion variant="child">
                    <Accordion.Item value="categories">
                      <Accordion.Header>
                        <Header.NavItem>Categories</Header.NavItem>
                        <Accordion.Indicator />
                      </Accordion.Header>
                      <Accordion.Content className="px-0 pl-200">
                        <Header.NavItem>
                          <Link href="/shop/electronics">Electronics</Link>
                        </Header.NavItem>
                        <Header.NavItem>
                          <Link href="/shop/clothing">Clothing</Link>
                        </Header.NavItem>
                        <Header.NavItem>
                          <Link href="/shop/home">Home & Garden</Link>
                        </Header.NavItem>
                      </Accordion.Content>
                    </Accordion.Item>
                  </Accordion>
                  <Header.NavItem>
                    <Link href="/shop/sale">Sale</Link>
                  </Header.NavItem>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </Header.Mobile>
          <Header.Container position="end">
            <Header.Actions>
              <Header.ActionItem>
                <Button
                  icon="icon-[mdi--account]"
                  theme="unstyled"
                  size="current"
                >
                  Account
                </Button>
              </Header.ActionItem>
              <Header.ActionItem>
                <Button icon="icon-[mdi--cart]" theme="unstyled" size="current">
                  Cart
                </Button>
              </Header.ActionItem>
            </Header.Actions>
          </Header.Container>
          <Header.Hamburger />
        </Header>
        <div className="w-2xl">
          <Header>
            <Header.Desktop>
              <Header.Nav>
                <Header.NavItem>
                  <Link href="/">Home</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/about">About</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/contact">Contact</Link>
                </Header.NavItem>
                <Popover.Root id="shop-popover-2" placement="bottom">
                  <Popover.Trigger className="hover:bg-transparent">
                    <Header.NavItem>
                      <span>Shop</span>
                      <Icon icon="icon-[mdi--chevron-down]" />
                    </Header.NavItem>
                  </Popover.Trigger>
                  <Popover.Positioner>
                    <Popover.Content>
                      <Popover.Arrow />
                      <Header.NavItem>
                        <Link href="/shop/new">New Arrivals</Link>
                      </Header.NavItem>

                      <Popover.Root
                        id="categories-popover-2"
                        placement="right-start"
                      >
                        <Popover.Trigger className="text-fg-primary px-0 py-0 hover:bg-transparent">
                          <Header.NavItem>
                            <span>Categories</span>
                            <Icon icon="icon-[mdi--chevron-down]" />
                          </Header.NavItem>
                        </Popover.Trigger>
                        <Popover.Positioner>
                          <Popover.Content>
                            <Popover.Arrow />
                            <Header.NavItem>
                              <Link href="/shop/electronics">Electronics</Link>
                            </Header.NavItem>
                            <Header.NavItem>
                              <Link href="/shop/clothing">Clothing</Link>
                            </Header.NavItem>
                            <Header.NavItem>
                              <Link href="/shop/home">Home & Garden</Link>
                            </Header.NavItem>
                          </Popover.Content>
                        </Popover.Positioner>
                      </Popover.Root>
                      <Header.NavItem>
                        <Link href="/shop/sale">Sale</Link>
                      </Header.NavItem>
                    </Popover.Content>
                  </Popover.Positioner>
                </Popover.Root>
              </Header.Nav>
            </Header.Desktop>
            <Header.Mobile position="right">
              <Accordion variant="child">
                <Accordion.Item value="home">
                  <Header.NavItem>
                    <Link href="/">Home</Link>
                  </Header.NavItem>
                </Accordion.Item>
                <Accordion.Item value="about">
                  <Header.NavItem>
                    <Link href="/about">About</Link>
                  </Header.NavItem>
                </Accordion.Item>
                <Accordion.Item value="contact">
                  <Header.NavItem>
                    <Link href="/contact">Contact</Link>
                  </Header.NavItem>
                </Accordion.Item>
                <Accordion.Item value="shop">
                  <Accordion.Header>
                    <Header.NavItem>Shop</Header.NavItem>
                    <Accordion.Indicator />
                  </Accordion.Header>
                  <Accordion.Content className="px-0">
                    <Header.NavItem>
                      <Link href="/shop/new">New Arrivals</Link>
                    </Header.NavItem>
                    <Accordion variant="child">
                      <Accordion.Item value="categories">
                        <Accordion.Header>
                          <Header.NavItem>Categories</Header.NavItem>
                          <Accordion.Indicator />
                        </Accordion.Header>
                        <Accordion.Content className="px-0 pl-200">
                          <Header.NavItem>
                            <Link href="/shop/electronics">Electronics</Link>
                          </Header.NavItem>
                          <Header.NavItem>
                            <Link href="/shop/clothing">Clothing</Link>
                          </Header.NavItem>
                          <Header.NavItem>
                            <Link href="/shop/home">Home & Garden</Link>
                          </Header.NavItem>
                        </Accordion.Content>
                      </Accordion.Item>
                    </Accordion>
                    <Header.NavItem>
                      <Link href="/shop/sale">Sale</Link>
                    </Header.NavItem>
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion>
            </Header.Mobile>
            <Header.Container position="end">
              <Header.Actions>
                <Header.ActionItem>
                  <Button
                    icon="icon-[mdi--account]"
                    theme="unstyled"
                    size="current"
                  >
                    Account
                  </Button>
                </Header.ActionItem>
                <Header.ActionItem>
                  <Button
                    icon="icon-[mdi--cart]"
                    theme="unstyled"
                    size="current"
                  >
                    Cart
                  </Button>
                </Header.ActionItem>
              </Header.Actions>
            </Header.Container>
            <Header.Hamburger />
          </Header>
        </div>
      </div>
    )
  },
}

export const EcommerceLayout: Story = {
  parameters: {
    docs: {
      description: {
        story: `
**Classic e-commerce header layout**: Logo + Nav + Actions

**Pattern**:
- Logo/Brand: Left aligned (Header.Container position="start")
- Navigation: Desktop shows full nav, mobile shows in hamburger menu
- Actions: Right aligned, always visible (Search, Cart, Account)

**Use case**: Most common e-commerce header pattern.
        `,
      },
    },
  },
  render: () => {
    return (
      <div className="flex flex-col gap-950">
        <Header>
          <Header.Container className="items-center" position="start">
            <div className="font-bold text-lg">StoreBrand</div>
          </Header.Container>
          <Header.Desktop>
            <Header.Nav>
              <Header.NavItem>
                <Link href="/">Home</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/products">Products</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/about">About</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/contact">Contact</Link>
              </Header.NavItem>
            </Header.Nav>
          </Header.Desktop>
          <Header.Mobile position="right">
            <Accordion variant="child">
              <Accordion.Item value="home">
                <Header.NavItem>
                  <Link href="/">Home</Link>
                </Header.NavItem>
              </Accordion.Item>
              <Accordion.Item value="products">
                <Header.NavItem>
                  <Link href="/products">Products</Link>
                </Header.NavItem>
              </Accordion.Item>
              <Accordion.Item value="about">
                <Header.NavItem>
                  <Link href="/about">About</Link>
                </Header.NavItem>
              </Accordion.Item>
              <Accordion.Item value="contact">
                <Header.NavItem>
                  <Link href="/contact">Contact</Link>
                </Header.NavItem>
              </Accordion.Item>
            </Accordion>
          </Header.Mobile>
          <Header.Container position="end">
            <Header.Actions>
              <Header.ActionItem>
                <Button
                  icon="icon-[mdi--magnify]"
                  theme="unstyled"
                  size="current"
                >
                  Search
                </Button>
              </Header.ActionItem>
              <Header.ActionItem>
                <Button icon="icon-[mdi--cart]" theme="unstyled" size="current">
                  Cart
                </Button>
              </Header.ActionItem>
              <Header.ActionItem>
                <Button
                  icon="icon-[mdi--account]"
                  theme="unstyled"
                  size="current"
                >
                  Account
                </Button>
              </Header.ActionItem>
            </Header.Actions>
          </Header.Container>
          <Header.Hamburger />
        </Header>

        <div className="w-2xl">
          <Header>
            <Header.Container className="items-center" position="start">
              <div className="font-bold text-lg">StoreBrand</div>
            </Header.Container>

            <Header.Desktop>
              <Header.Nav>
                <Header.NavItem>
                  <Link href="/">Home</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/products">Products</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/about">About</Link>
                </Header.NavItem>
                <Header.NavItem>
                  <Link href="/contact">Contact</Link>
                </Header.NavItem>
              </Header.Nav>
            </Header.Desktop>

            <Header.Mobile position="right">
              <Accordion variant="child">
                <Accordion.Item value="home">
                  <Header.NavItem>
                    <Link href="/">Home</Link>
                  </Header.NavItem>
                </Accordion.Item>
                <Accordion.Item value="products">
                  <Header.NavItem>
                    <Link href="/products">Products</Link>
                  </Header.NavItem>
                </Accordion.Item>
                <Accordion.Item value="about">
                  <Header.NavItem>
                    <Link href="/about">About</Link>
                  </Header.NavItem>
                </Accordion.Item>
                <Accordion.Item value="contact">
                  <Header.NavItem>
                    <Link href="/contact">Contact</Link>
                  </Header.NavItem>
                </Accordion.Item>
              </Accordion>
            </Header.Mobile>

            <Header.Container position="end">
              <Header.Actions>
                <Header.ActionItem>
                  <Button
                    icon="icon-[mdi--magnify]"
                    theme="unstyled"
                    size="current"
                  >
                    Search
                  </Button>
                </Header.ActionItem>
                <Header.ActionItem>
                  <Button
                    icon="icon-[mdi--cart]"
                    theme="unstyled"
                    size="current"
                  >
                    Cart
                  </Button>
                </Header.ActionItem>
                <Header.ActionItem>
                  <Button
                    icon="icon-[mdi--account]"
                    theme="unstyled"
                    size="current"
                  >
                    Account
                  </Button>
                </Header.ActionItem>
              </Header.Actions>
            </Header.Container>
            <Header.Hamburger />
          </Header>
        </div>
      </div>
    )
  },
}

export const DrawerSubmenu: Story = {
  parameters: {
    docs: {
      description: {
        story: `
**Drawer submenu pattern**: Dialog as mega menu triggered by nav button

**Pattern**:
- Button in nav opens Dialog positioned below header
- Dialog contains custom layout (e.g., category grid with icons)
- No onOpenChange to avoid state conflicts
- Works on both desktop and mobile

**Use case**: Category browsing, mega menus, custom overlays.
        `,
      },
    },
  },
  render: () => {
    const [drawerOpen, setDrawerOpen] = useState(false)

    const categories = [
      { name: 'Electronics', icon: 'icon-[mdi--laptop]', href: '/electronics' },
      {
        name: 'Clothing',
        icon: 'icon-[mdi--t-shirt-crew]',
        href: '/clothing',
      },
      { name: 'Home & Garden', icon: 'icon-[mdi--home]', href: '/home' },
      { name: 'Sports', icon: 'icon-[mdi--basketball]', href: '/sports' },
    ]

    const HeaderContent = () => (
      <>
        <Header.Desktop>
          <Header.Nav className="z-50">
            <Header.NavItem>
              <Link href="/">Home</Link>
            </Header.NavItem>
            <Header.NavItem>
              <Button
                theme="unstyled"
                size="current"
                onClick={() => setDrawerOpen((prev) => !prev)}
                icon="icon-[mdi--chevron-down]"
                iconPosition="right"
                block
              >
                Categories
              </Button>
            </Header.NavItem>
            <Header.NavItem>
              <Link href="/about">About</Link>
            </Header.NavItem>
          </Header.Nav>
        </Header.Desktop>

        <Header.Mobile position="right">
          <Accordion variant="child">
            <Accordion.Item value="home">
              <Header.NavItem>
                <Link href="/">Home</Link>
              </Header.NavItem>
            </Accordion.Item>
            <Accordion.Item value="categories">
              <Accordion.Header>
                <Header.NavItem>Categories</Header.NavItem>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                {categories.map((cat) => (
                  <Header.NavItem key={cat.name}>
                    <Link href={cat.href}>{cat.name}</Link>
                  </Header.NavItem>
                ))}
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="about">
              <Header.NavItem>
                <Link href="/about">About</Link>
              </Header.NavItem>
            </Accordion.Item>
          </Accordion>
        </Header.Mobile>

        <Header.Container position="end">
          <Header.Actions>
            <Header.ActionItem>
              <Button
                icon="icon-[mdi--account]"
                theme="unstyled"
                size="current"
              >
                Account
              </Button>
            </Header.ActionItem>
            <Header.ActionItem>
              <Button icon="icon-[mdi--cart]" theme="unstyled" size="current">
                Cart
              </Button>
            </Header.ActionItem>
          </Header.Actions>
        </Header.Container>
        <Header.Hamburger />

        <Dialog
          open={drawerOpen}
          customTrigger
          placement="top"
          position="absolute"
          size="xs"
          hideCloseButton
          behavior="modeless"
          className="-z-1 top-full @max-header-desktop:hidden shadow-none"
          modal={false}
          portal={false}
        >
          <div className="flex items-center justify-evenly">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="flex cursor-pointer flex-col items-center gap-100 hover:opacity-75"
                onClick={() => setDrawerOpen(false)}
              >
                <span className="text-sm">{cat.name}</span>
                <Icon icon={cat.icon as IconType} className="text-2xl" />
              </Link>
            ))}
          </div>
        </Dialog>
      </>
    )

    return (
      <div className="flex flex-col gap-950">
        <Header>
          <HeaderContent />
        </Header>

        <div className="w-2xl">
          <Header>
            <HeaderContent />
          </Header>
        </div>
      </div>
    )
  },
}
