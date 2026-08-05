import type { Meta, StoryObj } from "@storybook/react"

import { Menu } from "../../src/molecules/menu"
import type { MenuItem } from "../../src/molecules/menu"

const meta: Meta<typeof Menu> = {
  argTypes: {
    customTrigger: {
      control: { type: "boolean" },
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    triggerText: {
      control: { type: "text" },
    },
  },
  component: Menu,
  parameters: {
    layout: "centered",
  },
  title: "Molecules/Menu",
}

export default meta
type Story = StoryObj<typeof meta>

const basicItems: MenuItem[] = [
  {
    icon: "token-icon-plus",
    label: "New File",
    type: "action",
    value: "new-file",
  },
  {
    icon: "token-icon-folder",
    label: "Open...",
    type: "action",
    value: "open",
  },
  { id: "separator-1", type: "separator" },
  { icon: "token-icon-save", label: "Save", type: "action", value: "save" },
  {
    icon: "token-icon-save",
    label: "Save As...",
    type: "action",
    value: "save-as",
  },
  { id: "separator-2", type: "separator" },
  { icon: "token-icon-close", label: "Exit", type: "action", value: "exit" },
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
    size: "sm",
    triggerText: "File",
  },
}

export const Large: Story = {
  args: {
    items: basicItems,
    size: "lg",
    triggerText: "File",
  },
}

export const WithCustomPositioning: Story = {
  args: {
    items: basicItems,
    positioning: {
      placement: "top",
    },
    triggerText: "File",
  },
}

const itemsWithDisabled: MenuItem[] = [
  {
    icon: "icon-[mdi--content-cut]",
    label: "Cut",
    type: "action",
    value: "cut",
  },
  { icon: "token-icon-copy", label: "Copy", type: "action", value: "copy" },
  {
    disabled: true,
    icon: "token-icon-clipboard",
    label: "Paste",
    type: "action",
    value: "paste",
  },
  { id: "separator", type: "separator" },
  {
    icon: "token-icon-trash",
    label: "Delete",
    type: "action",
    value: "delete",
  },
]

export const WithDisabledItems: Story = {
  args: {
    items: itemsWithDisabled,
    triggerText: "Edit",
  },
}

const contextMenuItems: MenuItem[] = [
  { icon: "token-icon-undo", label: "Undo", type: "action", value: "undo" },
  { icon: "token-icon-redo", label: "Redo", type: "action", value: "redo" },
  { id: "separator-1", type: "separator" },
  { icon: "token-icon-scissors", label: "Cut", type: "action", value: "cut" },
  { icon: "token-icon-copy", label: "Copy", type: "action", value: "copy" },
  {
    icon: "token-icon-clipboard",
    label: "Paste",
    type: "action",
    value: "paste",
  },
  { id: "separator-2", type: "separator" },
  { label: "Select All", type: "action", value: "select-all" },
]

export const ContextMenu: Story = {
  args: {
    items: contextMenuItems,
    triggerText: "Right Click",
  },
}

export const CustomTrigger: Story = {
  args: {
    customTrigger: (
      <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
        Custom Trigger
      </button>
    ),
    items: basicItems,
  },
}

export const WithSelectHandler: Story = {
  args: {
    items: basicItems,
    onSelect: (details: { value: string }) => {
      alert(`You selected: ${details.value}`)
    },
    triggerText: "Actions",
  },
}

const viewMenuItems: MenuItem[] = [
  {
    checked: true,
    label: "Show Sidebar",
    type: "checkbox",
    value: "show-sidebar",
  },
  {
    checked: true,
    label: "Show Toolbar",
    type: "checkbox",
    value: "show-toolbar",
  },
  {
    checked: false,
    label: "Show Status Bar",
    type: "checkbox",
    value: "show-statusbar",
  },
  { id: "separator-1", type: "separator" },
  {
    checked: true,
    label: "List View",
    name: "view-mode",
    type: "radio",
    value: "list-view",
  },
  {
    checked: false,
    label: "Grid View",
    name: "view-mode",
    type: "radio",
    value: "grid-view",
  },
  {
    checked: false,
    label: "Detail View",
    name: "view-mode",
    type: "radio",
    value: "detail-view",
  },
]

export const WithOptionsMenu: Story = {
  args: {
    items: viewMenuItems,
    onCheckedChange: (_item: MenuItem, _checked: boolean) => {},
    triggerText: "View",
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
  { label: "Top placement", type: "action", value: "top" },
  { label: "Right placement", type: "action", value: "right" },
  { label: "Bottom placement", type: "action", value: "bottom" },
  { label: "Left placement", type: "action", value: "left" },
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
    icon: "token-icon-user",
    label: "My Profile",
    type: "action",
    value: "profile",
  },
  {
    icon: "token-icon-settings",
    label: "Settings",
    type: "action",
    value: "settings",
  },
  { id: "sep-1", type: "separator" },
  {
    checked: true,
    label: "Enable Notifications",
    type: "checkbox",
    value: "notifications",
  },
  { checked: false, label: "Enable Sounds", type: "checkbox", value: "sounds" },
  { id: "sep-2", type: "separator" },
  {
    checked: true,
    label: "Light Theme",
    name: "theme",
    type: "radio",
    value: "light",
  },
  {
    checked: false,
    label: "Dark Theme",
    name: "theme",
    type: "radio",
    value: "dark",
  },
  {
    checked: false,
    label: "System Theme",
    name: "theme",
    type: "radio",
    value: "system",
  },
  { id: "sep-3", type: "separator" },
  {
    icon: "token-icon-logout",
    label: "Logout",
    type: "action",
    value: "logout",
  },
]

export const ComplexMenu: Story = {
  args: {
    items: mixedContentItems,
    triggerIcon: "token-icon-user",
    triggerText: "Account",
  },
}

// Story pro long menu with scroll
const longMenuItems: MenuItem[] = Array.from({ length: 20 }, (_, i) => ({
  label: `Menu Item ${i + 1}`,
  type: "action" as const,
  value: `item-${i}`,
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
    icon: "token-icon-plus",
    label: "New File",
    type: "action",
    value: "new-file",
  },
  {
    icon: "token-icon-folder",
    label: "Open...",
    type: "action",
    value: "open",
  },
  { id: "sep-1", type: "separator" },
  {
    icon: "token-icon-clock",
    items: [
      { type: "action", value: "recent-1", label: "project-config.json" },
      { type: "action", value: "recent-2", label: "README.md" },
      { type: "action", value: "recent-3", label: "package.json" },
      { type: "separator", id: "sep-recent" },
      { type: "action", value: "clear-recent", label: "Clear Recent Files" },
    ],
    label: "Recent Files",
    type: "submenu",
    value: "recent",
  },
  { id: "sep-2", type: "separator" },
  {
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
    label: "Share",
    type: "submenu",
    value: "share",
  },
  {
    icon: "token-icon-print",
    label: "Print...",
    type: "action",
    value: "print",
  },
  { id: "sep-3", type: "separator" },
  { icon: "token-icon-close", label: "Exit", type: "action", value: "exit" },
]

export const NestedMenu: Story = {
  args: {
    items: nestedMenuItems,
    onSelect: (_details: { value: string }) => {},
    triggerText: "File",
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
  { label: "All Products", type: "action", value: "all" },
  { id: "sep-categories", type: "separator" },
  {
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
    label: "Electronics",
    type: "submenu",
    value: "electronics",
  },
  {
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
    label: "Clothing & Fashion",
    type: "submenu",
    value: "clothing",
  },
  {
    items: [
      { type: "action", value: "furniture", label: "Furniture" },
      { type: "action", value: "kitchen", label: "Kitchen & Dining" },
      { type: "action", value: "bedding", label: "Bedding & Bath" },
      { type: "action", value: "decor", label: "Home Decor" },
      { type: "action", value: "garden", label: "Garden & Outdoor" },
    ],
    label: "Home & Garden",
    type: "submenu",
    value: "home",
  },
]

export const CategoryMenu: Story = {
  args: {
    items: categoryMenuItems,
    onSelect: (details: { value: string }) => {
      alert(`Navigate to category: ${details.value}`)
    },
    triggerIcon: "token-icon-grid",
    triggerText: "Shop by Category",
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
    icon: "token-icon-home",
    label: "Dashboard",
    type: "action",
    value: "dashboard",
  },
  { id: "sep-1", type: "separator" },
  {
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
    label: "View",
    type: "submenu",
    value: "view",
  },
  {
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
    label: "Tools",
    type: "submenu",
    value: "tools",
  },
  { id: "sep-2", type: "separator" },
  { icon: "token-icon-help", label: "Help", type: "action", value: "help" },
]

export const MixedNestedMenu: Story = {
  args: {
    items: mixedNestedItems,
    onCheckedChange: (_item: MenuItem, _checked: boolean) => {},
    onSelect: (_details: { value: string }) => {},
    triggerText: "Application",
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
