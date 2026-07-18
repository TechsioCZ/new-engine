import type { Meta, StoryObj } from "@storybook/react"

import { Menu, type MenuItem } from "../../src/molecules/menu"

const meta: Meta<typeof Menu> = {
  title: "Molecules/Menu",
  component: Menu,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    triggerText: {
      control: { type: "text" },
    },
    customTrigger: {
      control: { type: "boolean" },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const basicItems: MenuItem[] = [
  {
    type: "action",
    value: "new-file",
    label: "New File",
    icon: "token-icon-plus",
  },
  {
    type: "action",
    value: "open",
    label: "Open...",
    icon: "token-icon-folder",
  },
  { type: "separator", id: "separator-1" },
  { type: "action", value: "save", label: "Save", icon: "token-icon-save" },
  {
    type: "action",
    value: "save-as",
    label: "Save As...",
    icon: "token-icon-save",
  },
  { type: "separator", id: "separator-2" },
  { type: "action", value: "exit", label: "Exit", icon: "token-icon-close" },
]

export const Default: Story = {
  args: {
    items: basicItems,
    triggerText: "File",
  },
}

export const Small: Story = {
  args: {
    items: basicItems,
    triggerText: "File",
    size: "sm",
  },
}

export const Large: Story = {
  args: {
    items: basicItems,
    triggerText: "File",
    size: "lg",
  },
}

export const WithCustomPositioning: Story = {
  args: {
    items: basicItems,
    triggerText: "File",
    positioning: {
      placement: "top",
    },
  },
}

const itemsWithDisabled: MenuItem[] = [
  {
    type: "action",
    value: "cut",
    label: "Cut",
    icon: "icon-[mdi--content-cut]",
  },
  { type: "action", value: "copy", label: "Copy", icon: "token-icon-copy" },
  {
    type: "action",
    value: "paste",
    label: "Paste",
    icon: "token-icon-clipboard",
    disabled: true,
  },
  { type: "separator", id: "separator" },
  {
    type: "action",
    value: "delete",
    label: "Delete",
    icon: "token-icon-trash",
  },
]

export const WithDisabledItems: Story = {
  args: {
    items: itemsWithDisabled,
    triggerText: "Edit",
  },
}

const contextMenuItems: MenuItem[] = [
  { type: "action", value: "undo", label: "Undo", icon: "token-icon-undo" },
  { type: "action", value: "redo", label: "Redo", icon: "token-icon-redo" },
  { type: "separator", id: "separator-1" },
  { type: "action", value: "cut", label: "Cut", icon: "token-icon-scissors" },
  { type: "action", value: "copy", label: "Copy", icon: "token-icon-copy" },
  {
    type: "action",
    value: "paste",
    label: "Paste",
    icon: "token-icon-clipboard",
  },
  { type: "separator", id: "separator-2" },
  { type: "action", value: "select-all", label: "Select All" },
]

export const ContextMenu: Story = {
  args: {
    items: contextMenuItems,
    triggerText: "Right Click",
  },
}

export const CustomTrigger: Story = {
  args: {
    items: basicItems,
    customTrigger: (
      <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
        Custom Trigger
      </button>
    ),
  },
}

export const WithSelectHandler: Story = {
  args: {
    items: basicItems,
    triggerText: "Actions",
    onSelect: (details: { value: string }) => {
      alert(`You selected: ${details.value}`)
    },
  },
}

const viewMenuItems: MenuItem[] = [
  {
    type: "checkbox",
    value: "show-sidebar",
    label: "Show Sidebar",
    checked: true,
  },
  {
    type: "checkbox",
    value: "show-toolbar",
    label: "Show Toolbar",
    checked: true,
  },
  {
    type: "checkbox",
    value: "show-statusbar",
    label: "Show Status Bar",
    checked: false,
  },
  { type: "separator", id: "separator-1" },
  {
    type: "radio",
    value: "list-view",
    label: "List View",
    name: "view-mode",
    checked: true,
  },
  {
    type: "radio",
    value: "grid-view",
    label: "Grid View",
    name: "view-mode",
    checked: false,
  },
  {
    type: "radio",
    value: "detail-view",
    label: "Detail View",
    name: "view-mode",
    checked: false,
  },
]

export const WithOptionsMenu: Story = {
  args: {
    items: viewMenuItems,
    triggerText: "View",
    onCheckedChange: (_item: MenuItem, _checked: boolean) => {},
  },
}

// Story pro keyboard navigation
export const KeyboardNavigation: Story = {
  args: {
    items: basicItems,
    triggerText: "Press Arrow Keys",
    typeahead: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Use arrow keys to navigate, Enter to select, and type to search",
      },
    },
  },
}

// Story pro positioning
const positioningItems: MenuItem[] = [
  { type: "action", value: "top", label: "Top placement" },
  { type: "action", value: "right", label: "Right placement" },
  { type: "action", value: "bottom", label: "Bottom placement" },
  { type: "action", value: "left", label: "Left placement" },
]

export const DifferentPlacements: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-16 p-20">
      <Menu
        items={positioningItems}
        triggerText="Top"
        positioning={{ placement: "top" }}
      />
      <Menu
        items={positioningItems}
        triggerText="Right"
        positioning={{ placement: "right" }}
      />
      <Menu
        items={positioningItems}
        triggerText="Bottom"
        positioning={{ placement: "bottom" }}
      />
      <Menu
        items={positioningItems}
        triggerText="Left"
        positioning={{ placement: "left" }}
      />
    </div>
  ),
}

// Story pro mixed content
const mixedContentItems: MenuItem[] = [
  {
    type: "action",
    value: "profile",
    label: "My Profile",
    icon: "token-icon-user",
  },
  {
    type: "action",
    value: "settings",
    label: "Settings",
    icon: "token-icon-settings",
  },
  { type: "separator", id: "sep-1" },
  {
    type: "checkbox",
    value: "notifications",
    label: "Enable Notifications",
    checked: true,
  },
  { type: "checkbox", value: "sounds", label: "Enable Sounds", checked: false },
  { type: "separator", id: "sep-2" },
  {
    type: "radio",
    value: "light",
    label: "Light Theme",
    name: "theme",
    checked: true,
  },
  {
    type: "radio",
    value: "dark",
    label: "Dark Theme",
    name: "theme",
    checked: false,
  },
  {
    type: "radio",
    value: "system",
    label: "System Theme",
    name: "theme",
    checked: false,
  },
  { type: "separator", id: "sep-3" },
  {
    type: "action",
    value: "logout",
    label: "Logout",
    icon: "token-icon-logout",
  },
]

export const ComplexMenu: Story = {
  args: {
    items: mixedContentItems,
    triggerText: "Account",
    triggerIcon: "token-icon-user",
  },
}

// Story pro long menu with scroll
const longMenuItems: MenuItem[] = Array.from({ length: 20 }, (_, i) => ({
  type: "action" as const,
  value: `item-${i}`,
  label: `Menu Item ${i + 1}`,
  ...(i % 3 === 0 ? { icon: "token-icon-star" as const } : {}),
}))

export const ScrollableMenu: Story = {
  args: {
    items: longMenuItems,
    triggerText: "Long Menu",
  },
  parameters: {
    docs: {
      description: {
        story: "Menu with many items shows scrollbar when exceeding max height",
      },
    },
  },
}

// Story pro nested menu
const nestedMenuItems: MenuItem[] = [
  {
    type: "action",
    value: "new-file",
    label: "New File",
    icon: "token-icon-plus",
  },
  {
    type: "action",
    value: "open",
    label: "Open...",
    icon: "token-icon-folder",
  },
  { type: "separator", id: "sep-1" },
  {
    type: "submenu",
    value: "recent",
    label: "Recent Files",
    icon: "token-icon-clock",
    items: [
      { type: "action", value: "recent-1", label: "project-config.json" },
      { type: "action", value: "recent-2", label: "README.md" },
      { type: "action", value: "recent-3", label: "package.json" },
      { type: "separator", id: "sep-recent" },
      { type: "action", value: "clear-recent", label: "Clear Recent Files" },
    ],
  },
  { type: "separator", id: "sep-2" },
  {
    type: "submenu",
    value: "share",
    label: "Share",
    icon: "token-icon-share",
    items: [
      {
        type: "action",
        value: "email",
        label: "Email",
        icon: "token-icon-email",
      },
      {
        type: "action",
        value: "link",
        label: "Copy Link",
        icon: "token-icon-link",
      },
      { type: "separator", id: "sep-share" },
      {
        type: "submenu",
        value: "social",
        label: "Social Media",
        icon: "token-icon-share",
        items: [
          { type: "action", value: "twitter", label: "Twitter" },
          { type: "action", value: "facebook", label: "Facebook" },
          { type: "action", value: "linkedin", label: "LinkedIn" },
        ],
      },
    ],
  },
  {
    type: "action",
    value: "print",
    label: "Print...",
    icon: "token-icon-print",
  },
  { type: "separator", id: "sep-3" },
  { type: "action", value: "exit", label: "Exit", icon: "token-icon-close" },
]

export const NestedMenu: Story = {
  args: {
    items: nestedMenuItems,
    triggerText: "File",
    onSelect: (_details: { value: string }) => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          "Menu with nested submenus. Supports multiple levels of nesting.",
      },
    },
  },
}

// Story pro complex nested menu (like categories)
const categoryMenuItems: MenuItem[] = [
  { type: "action", value: "all", label: "All Products" },
  { type: "separator", id: "sep-categories" },
  {
    type: "submenu",
    value: "electronics",
    label: "Electronics",
    items: [
      {
        type: "submenu",
        value: "computers",
        label: "Computers & Tablets",
        items: [
          { type: "action", value: "laptops", label: "Laptops" },
          { type: "action", value: "desktops", label: "Desktop Computers" },
          { type: "action", value: "tablets", label: "Tablets" },
          {
            type: "submenu",
            value: "accessories",
            label: "Computer Accessories",
            items: [
              { type: "action", value: "keyboards", label: "Keyboards" },
              { type: "action", value: "mice", label: "Mice & Trackpads" },
              { type: "action", value: "monitors", label: "Monitors" },
              { type: "action", value: "webcams", label: "Webcams" },
            ],
          },
        ],
      },
      {
        type: "submenu",
        value: "phones",
        label: "Phones & Accessories",
        items: [
          { type: "action", value: "smartphones", label: "Smartphones" },
          { type: "action", value: "cases", label: "Phone Cases" },
          { type: "action", value: "chargers", label: "Chargers & Cables" },
          { type: "action", value: "headphones", label: "Headphones" },
        ],
      },
      { type: "action", value: "cameras", label: "Cameras & Photo" },
      { type: "action", value: "tv", label: "TV & Home Theater" },
    ],
  },
  {
    type: "submenu",
    value: "clothing",
    label: "Clothing & Fashion",
    items: [
      {
        type: "submenu",
        value: "mens",
        label: "Men's Clothing",
        items: [
          { type: "action", value: "mens-shirts", label: "Shirts" },
          { type: "action", value: "mens-pants", label: "Pants" },
          { type: "action", value: "mens-shoes", label: "Shoes" },
          { type: "action", value: "mens-accessories", label: "Accessories" },
        ],
      },
      {
        type: "submenu",
        value: "womens",
        label: "Women's Clothing",
        items: [
          { type: "action", value: "womens-dresses", label: "Dresses" },
          { type: "action", value: "womens-tops", label: "Tops" },
          { type: "action", value: "womens-shoes", label: "Shoes" },
          { type: "action", value: "womens-bags", label: "Bags & Purses" },
        ],
      },
      { type: "action", value: "kids", label: "Kids' Clothing" },
      { type: "action", value: "sports", label: "Sportswear" },
    ],
  },
  {
    type: "submenu",
    value: "home",
    label: "Home & Garden",
    items: [
      { type: "action", value: "furniture", label: "Furniture" },
      { type: "action", value: "kitchen", label: "Kitchen & Dining" },
      { type: "action", value: "bedding", label: "Bedding & Bath" },
      { type: "action", value: "decor", label: "Home Decor" },
      { type: "action", value: "garden", label: "Garden & Outdoor" },
    ],
  },
]

export const CategoryMenu: Story = {
  args: {
    items: categoryMenuItems,
    triggerText: "Shop by Category",
    triggerIcon: "token-icon-grid",
    onSelect: (details: { value: string }) => {
      alert(`Navigate to category: ${details.value}`)
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Complex nested menu structure suitable for e-commerce categories with multiple levels of hierarchy.",
      },
    },
  },
}

// Story pro mixed nested menu with options
const mixedNestedItems: MenuItem[] = [
  {
    type: "action",
    value: "dashboard",
    label: "Dashboard",
    icon: "token-icon-home",
  },
  { type: "separator", id: "sep-1" },
  {
    type: "submenu",
    value: "view",
    label: "View",
    icon: "token-icon-eye",
    items: [
      {
        type: "checkbox",
        value: "show-sidebar",
        label: "Show Sidebar",
        checked: true,
      },
      {
        type: "checkbox",
        value: "show-toolbar",
        label: "Show Toolbar",
        checked: true,
      },
      { type: "separator", id: "sep-view" },
      {
        type: "submenu",
        value: "theme",
        label: "Theme",
        items: [
          {
            type: "radio",
            value: "light",
            label: "Light",
            name: "theme",
            checked: true,
          },
          {
            type: "radio",
            value: "dark",
            label: "Dark",
            name: "theme",
            checked: false,
          },
          {
            type: "radio",
            value: "system",
            label: "System",
            name: "theme",
            checked: false,
          },
        ],
      },
      {
        type: "submenu",
        value: "layout",
        label: "Layout",
        items: [
          {
            type: "radio",
            value: "comfortable",
            label: "Comfortable",
            name: "layout",
            checked: true,
          },
          {
            type: "radio",
            value: "compact",
            label: "Compact",
            name: "layout",
            checked: false,
          },
          {
            type: "radio",
            value: "spacious",
            label: "Spacious",
            name: "layout",
            checked: false,
          },
        ],
      },
    ],
  },
  {
    type: "submenu",
    value: "tools",
    label: "Tools",
    icon: "token-icon-settings",
    items: [
      {
        type: "action",
        value: "import",
        label: "Import Data...",
        icon: "token-icon-download",
      },
      {
        type: "action",
        value: "export",
        label: "Export Data...",
        icon: "token-icon-upload",
      },
      { type: "separator", id: "sep-tools" },
      {
        type: "action",
        value: "preferences",
        label: "Preferences...",
        icon: "token-icon-settings",
      },
    ],
  },
  { type: "separator", id: "sep-2" },
  { type: "action", value: "help", label: "Help", icon: "token-icon-help" },
]

export const MixedNestedMenu: Story = {
  args: {
    items: mixedNestedItems,
    triggerText: "Application",
    onSelect: (_details: { value: string }) => {},
    onCheckedChange: (_item: MenuItem, _checked: boolean) => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          "Nested menu with mixed content types including checkboxes and radio buttons in submenus.",
      },
    },
  },
}
