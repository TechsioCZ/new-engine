import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"

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

const separatorId = "separator-1"

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
  { id: separatorId, type: "separator" },
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
  { id: separatorId, type: "separator" },
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
      <button
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        type="button"
      >
        Custom Trigger
      </button>
    ),
    items: basicItems,
  },
}

export const WithSelectHandler: Story = {
  args: {
    items: basicItems,
    onSelect: fn<(details: { value: string }) => void>(),
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
  { id: separatorId, type: "separator" },
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
    onCheckedChange: fn<(item: MenuItem, checked: boolean) => void>(),
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
const settingsIcon = "token-icon-settings"

const mixedContentItems: MenuItem[] = [
  {
    icon: "token-icon-user",
    label: "My Profile",
    type: "action",
    value: "profile",
  },
  {
    icon: settingsIcon,
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
      { label: "project-config.json", type: "action", value: "recent-1" },
      { label: "README.md", type: "action", value: "recent-2" },
      { label: "package.json", type: "action", value: "recent-3" },
      { id: "sep-recent", type: "separator" },
      { label: "Clear Recent Files", type: "action", value: "clear-recent" },
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
        icon: "token-icon-email",
        label: "Email",
        type: "action",
        value: "email",
      },
      {
        icon: "token-icon-link",
        label: "Copy Link",
        type: "action",
        value: "link",
      },
      { id: "sep-share", type: "separator" },
      {
        icon: "token-icon-share",
        items: [
          { label: "Twitter", type: "action", value: "twitter" },
          { label: "Facebook", type: "action", value: "facebook" },
          { label: "LinkedIn", type: "action", value: "linkedin" },
        ],
        label: "Social Media",
        type: "submenu",
        value: "social",
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
    onSelect: fn<(details: { value: string }) => void>(),
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
        items: [
          { label: "Laptops", type: "action", value: "laptops" },
          { label: "Desktop Computers", type: "action", value: "desktops" },
          { label: "Tablets", type: "action", value: "tablets" },
          {
            items: [
              { label: "Keyboards", type: "action", value: "keyboards" },
              { label: "Mice & Trackpads", type: "action", value: "mice" },
              { label: "Monitors", type: "action", value: "monitors" },
              { label: "Webcams", type: "action", value: "webcams" },
            ],
            label: "Computer Accessories",
            type: "submenu",
            value: "accessories",
          },
        ],
        label: "Computers & Tablets",
        type: "submenu",
        value: "computers",
      },
      {
        items: [
          { label: "Smartphones", type: "action", value: "smartphones" },
          { label: "Phone Cases", type: "action", value: "cases" },
          { label: "Chargers & Cables", type: "action", value: "chargers" },
          { label: "Headphones", type: "action", value: "headphones" },
        ],
        label: "Phones & Accessories",
        type: "submenu",
        value: "phones",
      },
      { label: "Cameras & Photo", type: "action", value: "cameras" },
      { label: "TV & Home Theater", type: "action", value: "tv" },
    ],
    label: "Electronics",
    type: "submenu",
    value: "electronics",
  },
  {
    items: [
      {
        items: [
          { label: "Shirts", type: "action", value: "mens-shirts" },
          { label: "Pants", type: "action", value: "mens-pants" },
          { label: "Shoes", type: "action", value: "mens-shoes" },
          { label: "Accessories", type: "action", value: "mens-accessories" },
        ],
        label: "Men's Clothing",
        type: "submenu",
        value: "mens",
      },
      {
        items: [
          { label: "Dresses", type: "action", value: "womens-dresses" },
          { label: "Tops", type: "action", value: "womens-tops" },
          { label: "Shoes", type: "action", value: "womens-shoes" },
          { label: "Bags & Purses", type: "action", value: "womens-bags" },
        ],
        label: "Women's Clothing",
        type: "submenu",
        value: "womens",
      },
      { label: "Kids' Clothing", type: "action", value: "kids" },
      { label: "Sportswear", type: "action", value: "sports" },
    ],
    label: "Clothing & Fashion",
    type: "submenu",
    value: "clothing",
  },
  {
    items: [
      { label: "Furniture", type: "action", value: "furniture" },
      { label: "Kitchen & Dining", type: "action", value: "kitchen" },
      { label: "Bedding & Bath", type: "action", value: "bedding" },
      { label: "Home Decor", type: "action", value: "decor" },
      { label: "Garden & Outdoor", type: "action", value: "garden" },
    ],
    label: "Home & Garden",
    type: "submenu",
    value: "home",
  },
]

export const CategoryMenu: Story = {
  args: {
    items: categoryMenuItems,
    onSelect: fn<(details: { value: string }) => void>(),
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
      { id: "sep-view", type: "separator" },
      {
        items: [
          {
            checked: true,
            label: "Light",
            name: "theme",
            type: "radio",
            value: "light",
          },
          {
            checked: false,
            label: "Dark",
            name: "theme",
            type: "radio",
            value: "dark",
          },
          {
            checked: false,
            label: "System",
            name: "theme",
            type: "radio",
            value: "system",
          },
        ],
        label: "Theme",
        type: "submenu",
        value: "theme",
      },
      {
        items: [
          {
            checked: true,
            label: "Comfortable",
            name: "layout",
            type: "radio",
            value: "comfortable",
          },
          {
            checked: false,
            label: "Compact",
            name: "layout",
            type: "radio",
            value: "compact",
          },
          {
            checked: false,
            label: "Spacious",
            name: "layout",
            type: "radio",
            value: "spacious",
          },
        ],
        label: "Layout",
        type: "submenu",
        value: "layout",
      },
    ],
    label: "View",
    type: "submenu",
    value: "view",
  },
  {
    icon: settingsIcon,
    items: [
      {
        icon: "token-icon-download",
        label: "Import Data...",
        type: "action",
        value: "import",
      },
      {
        icon: "token-icon-upload",
        label: "Export Data...",
        type: "action",
        value: "export",
      },
      { id: "sep-tools", type: "separator" },
      {
        icon: settingsIcon,
        label: "Preferences...",
        type: "action",
        value: "preferences",
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
    onCheckedChange: fn<(item: MenuItem, checked: boolean) => void>(),
    onSelect: fn<(details: { value: string }) => void>(),
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
