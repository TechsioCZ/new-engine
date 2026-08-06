import type { Meta, StoryObj } from "@storybook/react"
import { isRecord } from "@techsio/std/object"
import { useState } from "react"

import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import type { IconType } from "../../src/atoms/icon"
import { Image } from "../../src/atoms/image"
import { Select } from "../../src/molecules/select"
import type { SelectItem } from "../../src/molecules/select"

type LanguageWithIcon = SelectItem & { icon: IconType }
type TeamMember = SelectItem & { avatar: string; label: string; role: string }
type Plan = SelectItem & { features: string; label: string; price: string }

const formatItemLabels = (items: SelectItem[], fallback = ""): string => {
  const labels: string[] = []
  for (const item of items) {
    if (typeof item.label === "string") {
      labels.push(item.label)
    }
  }
  return labels.length > 0 ? labels.join(", ") : fallback
}

const findItemLabel = (
  items: SelectItem[],
  value: string | undefined,
): string | undefined => {
  const label = items.find((item) => item.value === value)?.label
  return typeof label === "string" ? label : undefined
}

// Mock data
const countries: SelectItem[] = [
  { label: "United States", value: "us" },
  { label: "Canada", value: "ca" },
  { label: "Mexico", value: "mx" },
  { label: "Brazil", value: "br" },
  { label: "Argentina", value: "ar" },
  { label: "Chile", value: "cl" },
  { label: "Germany", value: "de" },
  { label: "France", value: "fr" },
  { label: "United Kingdom", value: "gb" },
  { label: "Italy", value: "it" },
  { label: "Spain", value: "es" },
  { label: "Japan", value: "jp" },
  { label: "China", value: "cn" },
  { disabled: true, label: "India", value: "in" },
  { label: "Australia", value: "au" },
]

const languages: SelectItem[] = [
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Portuguese", value: "pt" },
  { label: "Italian", value: "it" },
  { label: "Dutch", value: "nl" },
  { label: "Russian", value: "ru" },
  { label: "Japanese", value: "ja" },
  { label: "Chinese", value: "zh" },
]

const teamMembers: TeamMember[] = [
  {
    avatar: "https://i.pravatar.cc/150?u=jessica",
    label: "Jessica Jones",
    role: "Designer",
    value: "jessica",
  },
  {
    avatar: "https://i.pravatar.cc/150?u=kenneth",
    label: "Kenneth Johnson",
    role: "Developer",
    value: "kenneth",
  },
  {
    avatar: "https://i.pravatar.cc/150?u=kate",
    label: "Kate Wilson",
    role: "Product Manager",
    value: "kate",
  },
  {
    avatar: "https://i.pravatar.cc/150?u=michael",
    label: "Michael Brown",
    role: "Developer",
    value: "michael",
  },
]

const meta: Meta<typeof Select> = {
  argTypes: {
    closeOnSelect: {
      control: "boolean",
      description: "Whether the dropdown closes on selection",
      table: { defaultValue: { summary: "true" } },
    },
    disabled: {
      control: "boolean",
      description: "Whether the select is disabled",
      table: { defaultValue: { summary: "false" } },
    },
    loopFocus: {
      control: "boolean",
      description: "Whether keyboard navigation should loop",
      table: { defaultValue: { summary: "true" } },
    },
    multiple: {
      control: "boolean",
      description: "Whether multiple options can be selected",
      table: { defaultValue: { summary: "false" } },
    },
    readOnly: {
      control: "boolean",
      description: "Whether the select is read-only",
      table: { defaultValue: { summary: "false" } },
    },
    size: {
      control: { type: "select" },
      description: "Size of the select",
      options: ["xs", "sm", "md", "lg"],
      table: { defaultValue: { summary: "md" } },
    },
    validateStatus: {
      control: { type: "select" },
      description: "Validation status of the select",
      options: ["default", "error", "success", "warning"],
      table: { defaultValue: { summary: "default" } },
    },
  },
  component: Select,
  decorators: [
    (Story, context) => {
      const parameters: unknown = context.parameters
      const { description, title } = isRecord(parameters) ? parameters : {}

      return (
        <div className="flex w-80 flex-col gap-6 p-4">
          {typeof title === "string" && title.length > 0 ? (
            <h3 className="font-medium text-lg">{title}</h3>
          ) : null}
          {typeof description === "string" && description.length > 0 ? (
            <p className="mb-2 text-gray-600 text-sm">{description}</p>
          ) : null}
          <div className="space-y-4">
            <Story />
          </div>
        </div>
      )
    },
  ],
  parameters: {
    docs: {
      description: {
        component: `
A compound pattern Select component built with Zag.js that provides maximum flexibility and customization.

## Features
- **Compound Pattern**: Full control over rendering each part
- **Custom Content**: Add avatars, icons, badges to items
- **Item Groups**: Organize items into labeled groups
- **Render Props**: Custom value display with render function
- **Accessible**: Full keyboard navigation and screen reader support

## Sub-components
- \`Select\` / \`Select.Root\` - Main wrapper
- \`Select.Label\` - Label text
- \`Select.Control\` - Trigger container
- \`Select.Trigger\` - Button that opens dropdown
- \`Select.ValueText\` - Displays selected value
- \`Select.ClearTrigger\` - Clear selection button
- \`Select.Positioner\` - Dropdown positioning (auto Portal)
- \`Select.Content\` - Dropdown content
- \`Select.ItemGroup\` - Group container
- \`Select.ItemGroupLabel\` - Group label
- \`Select.Item\` - Selectable item
- \`Select.ItemText\` - Item text
- \`Select.ItemIndicator\` - Checkmark indicator
- \`Select.StatusText\` - Status/helper text with auto error detection
				`,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Molecules/Select",
}

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {
    closeOnSelect: true,
    disabled: false,
    items: countries,
    loopFocus: true,
    multiple: false,
    readOnly: false,
    size: "md",
    validateStatus: "default",
  },
  render: (args) => (
    <Select {...args}>
      <Select.Label>Select a country</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Choose a country" />
        </Select.Trigger>
        <Select.ClearTrigger />
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {args.items?.map((item) => (
            <Select.Item key={item.value} item={item}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
      <Select.StatusText>Helper text goes here</Select.StatusText>
    </Select>
  ),
}

export const WithDefaultValue: Story = {
  render: () => (
    <Select items={countries} defaultValue={["us"]}>
      <Select.Label>Select a country</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Choose a country" />
        </Select.Trigger>
        <Select.ClearTrigger />
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {countries.map((item) => (
            <Select.Item key={item.value} item={item}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select>
  ),
}

export const Sizes: Story = {
  render: () => (
    <>
      <Select items={countries} size="xs">
        <Select.Label>Extra Small</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.slice(0, 5).map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>

      <Select items={countries} size="sm">
        <Select.Label>Small</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.slice(0, 5).map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>

      <Select items={countries} size="md">
        <Select.Label>Medium (default)</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.slice(0, 5).map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>

      <Select items={countries} size="lg">
        <Select.Label>Large</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.slice(0, 5).map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>
    </>
  ),
}

export const States: Story = {
  render: () => (
    <>
      <Select items={countries} disabled>
        <Select.Label>Disabled</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>

      <Select items={countries} validateStatus="error">
        <Select.Label>Invalid</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
        <Select.StatusText>Please select a valid country</Select.StatusText>
      </Select>

      <Select items={countries} required>
        <Select.Label>Required</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
        <Select.StatusText>This field is required</Select.StatusText>
      </Select>

      <Select items={countries} readOnly defaultValue={["us"]}>
        <Select.Label>Read-only</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>
    </>
  ),
}

export const ValidationStates: Story = {
  name: "Validation States (error, success, warning)",
  render: () => (
    <>
      <Select items={countries} validateStatus="error">
        <Select.Label>Error State</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.slice(0, 5).map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
        <Select.StatusText showIcon>Please fix the error</Select.StatusText>
      </Select>

      <Select items={countries} validateStatus="success">
        <Select.Label>Success State</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.slice(0, 5).map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
        <Select.StatusText showIcon>
          Selection saved successfully
        </Select.StatusText>
      </Select>

      <Select items={countries} validateStatus="warning">
        <Select.Label>Warning State</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.slice(0, 5).map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
        <Select.StatusText showIcon>
          This option is deprecated
        </Select.StatusText>
      </Select>

      <Select items={countries} validateStatus="default">
        <Select.Label>Default State</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.slice(0, 5).map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
        <Select.StatusText>Helper text for this field</Select.StatusText>
      </Select>
    </>
  ),
}

export const WithIcons: Story = {
  name: "With Icons (Compound Benefit)",
  render: () => {
    const languagesWithIcons: LanguageWithIcon[] = [
      { icon: "icon-[cif--gb]", label: "English", value: "en" },
      { icon: "icon-[cif--es]", label: "Spanish", value: "es" },
      { icon: "icon-[cif--fr]", label: "French", value: "fr" },
      { icon: "icon-[cif--de]", label: "German", value: "de" },
    ]

    return (
      <Select items={languagesWithIcons}>
        <Select.Label>Select a language</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Choose a language">
              {(items) => {
                const language = languagesWithIcons.find(
                  (item) => item.value === items[0]?.value,
                )
                return (
                  <span className="flex items-center gap-2">
                    {language ? <Icon icon={language.icon} size="sm" /> : null}
                    {items[0]?.label}
                  </span>
                )
              }}
            </Select.ValueText>
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {languagesWithIcons.map((item) => (
              <Select.Item key={item.value} item={item}>
                <span className="flex items-center gap-2">
                  <Icon icon={item.icon} size="sm" />
                  <Select.ItemText />
                </span>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>
    )
  },
}

export const WithAvatars: Story = {
  name: "With Avatars (Compound Benefit)",
  render: () => (
    <Select items={teamMembers} defaultValue={["jessica"]}>
      <Select.Label>Select team member</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Choose a member">
            {(items) => {
              const teamMember = teamMembers.find(
                (item) => item.value === items[0]?.value,
              )
              return (
                <span className="flex items-center gap-2">
                  {teamMember ? (
                    <Image
                      src={teamMember.avatar}
                      alt={teamMember.label}
                      className="rounded-full object-cover size-6"
                    />
                  ) : null}
                  <span>{items[0]?.label}</span>
                </span>
              )
            }}
          </Select.ValueText>
        </Select.Trigger>
        <Select.ClearTrigger />
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {teamMembers.map((item) => (
            <Select.Item key={item.value} item={item}>
              <span className="flex items-center gap-2">
                <Image
                  src={item.avatar}
                  alt={item.label}
                  className="rounded-full object-cover size-6"
                />
                <span className="flex flex-col">
                  <Select.ItemText />
                  <span className="text-xs text-gray-500">{item.role}</span>
                </span>
              </span>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select>
  ),
}

export const WithItemGroups: Story = {
  name: "With Item Groups (Compound Benefit)",
  render: () => {
    const europeCountries = countries.filter((c) =>
      ["de", "fr", "gb", "it", "es"].includes(c.value),
    )
    const americaCountries = countries.filter((c) =>
      ["us", "ca", "mx", "br", "ar"].includes(c.value),
    )
    const asiaCountries = countries.filter((c) =>
      ["jp", "cn", "in"].includes(c.value),
    )

    return (
      <Select items={countries}>
        <Select.Label>Select a country</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Choose a country" />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            <Select.ItemGroup id="europe">
              <Select.ItemGroupLabel htmlFor="europe">
                Europe
              </Select.ItemGroupLabel>
              {europeCountries.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.ItemGroup>

            <Select.ItemGroup id="americas">
              <Select.ItemGroupLabel htmlFor="americas">
                Americas
              </Select.ItemGroupLabel>
              {americaCountries.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.ItemGroup>

            <Select.ItemGroup id="asia">
              <Select.ItemGroupLabel htmlFor="asia">Asia</Select.ItemGroupLabel>
              {asiaCountries.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.ItemGroup>
          </Select.Content>
        </Select.Positioner>
      </Select>
    )
  },
}

export const CustomItemContent: Story = {
  name: "Custom Item Content (Compound Benefit)",
  render: () => {
    const plans: Plan[] = [
      {
        features: "5 projects, 1GB storage",
        label: "Free",
        price: "$0",
        value: "free",
      },
      {
        features: "Unlimited projects, 100GB storage",
        label: "Pro",
        price: "$19/mo",
        value: "pro",
      },
      {
        features: "Custom limits, priority support",
        label: "Enterprise",
        price: "$99/mo",
        value: "enterprise",
      },
    ]

    return (
      <Select items={plans}>
        <Select.Label>Select a plan</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Choose a plan">
              {(items) => {
                const plan = plans.find(
                  (item) => item.value === items[0]?.value,
                )
                return (
                  <span className="flex items-center justify-between w-full">
                    <span>{items[0]?.label}</span>
                    <span className="text-sm text-gray-500">{plan?.price}</span>
                  </span>
                )
              }}
            </Select.ValueText>
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {plans.map((item) => (
              <Select.Item key={item.value} item={item}>
                <span className="flex flex-col flex-1">
                  <span className="flex items-center gap-2">
                    <Select.ItemText />
                  </span>
                  <span className="text-xs text-gray-500">{item.features}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.price}</span>
                  <Select.ItemIndicator />
                </span>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>
    )
  },
}

const ControlledRender: NonNullable<Story["render"]> = () => {
  const [value, setValue] = useState<string[]>(["fr"])

  return (
    <>
      <Select
        items={languages}
        value={value}
        onValueChange={(details) => {
          setValue(details.value)
        }}
      >
        <Select.Label>Select a language</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Choose a language" />
          </Select.Trigger>
          <Select.ClearTrigger />
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {languages.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select>

      <div className="text-sm">
        <strong>Selected:</strong> {value.join(", ") || "None"}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            setValue(["en"])
          }}
        >
          Set to English
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setValue([])
          }}
        >
          Clear
        </Button>
      </div>
    </>
  )
}

export const Controlled: Story = {
  render: ControlledRender,
}

export const Multiple: Story = {
  render: () => (
    <Select items={languages} multiple closeOnSelect={false}>
      <Select.Label>Select languages</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Choose languages">
            {(items) =>
              items.length > 0 ? (
                <span>{formatItemLabels(items)}</span>
              ) : (
                "Choose languages"
              )
            }
          </Select.ValueText>
        </Select.Trigger>
        <Select.ClearTrigger />
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {languages.map((item) => (
            <Select.Item key={item.value} item={item}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select>
  ),
}

const WithinFormRender: NonNullable<Story["render"]> = () => {
  const [formState, setFormState] = useState<{
    country: string[]
    language: string[]
  }>({
    country: [],
    language: [],
  })
  const [submittedData, setSubmittedData] = useState<null | typeof formState>(
    null,
  )

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmittedData(formState)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        items={countries}
        required
        validateStatus={formState.country.length === 0 ? "error" : "default"}
        value={formState.country}
        onValueChange={(details) => {
          setFormState((prev) => ({ ...prev, country: details.value }))
        }}
      >
        <Select.Label>Country</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select a country" />
          </Select.Trigger>
          <Select.ClearTrigger />
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {countries.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
        {formState.country.length === 0 && (
          <Select.StatusText>Please select a country</Select.StatusText>
        )}
      </Select>

      <Select
        items={languages}
        multiple
        closeOnSelect={false}
        value={formState.language}
        onValueChange={(details) => {
          setFormState((prev) => ({ ...prev, language: details.value }))
        }}
      >
        <Select.Label>Languages</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select languages">
              {(items) =>
                items.length > 0 ? formatItemLabels(items) : "Select languages"
              }
            </Select.ValueText>
          </Select.Trigger>
          <Select.ClearTrigger />
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {languages.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
        <Select.StatusText>You can select multiple languages</Select.StatusText>
      </Select>

      <Button type="submit" variant="primary">
        Submit Form
      </Button>

      {submittedData === null ? null : (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50/10 p-4">
          <h4 className="mb-2 font-medium">Form Submitted:</h4>
          <p>
            <strong>Country:</strong>{" "}
            {findItemLabel(countries, submittedData.country[0]) ?? "None"}
          </p>
          <p>
            <strong>Languages:</strong>{" "}
            {formatItemLabels(
              languages.filter((language) =>
                submittedData.language.includes(language.value),
              ),
              "None",
            )}
          </p>
        </div>
      )}
    </form>
  )
}

export const WithinForm: Story = {
  render: WithinFormRender,
}

const ConditionalRenderingRender: NonNullable<Story["render"]> = () => {
  const [showPremium, setShowPremium] = useState(false)

  const basicItems: SelectItem[] = [
    { label: "Free Plan", value: "free" },
    { label: "Basic Plan", value: "basic" },
  ]

  const premiumItems: SelectItem[] = [
    { label: "Pro Plan", value: "pro" },
    { label: "Enterprise Plan", value: "enterprise" },
  ]

  const allItems = [...basicItems, ...(showPremium ? premiumItems : [])]

  return (
    <>
      <div className="mb-4">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setShowPremium(!showPremium)
          }}
        >
          {showPremium ? "Hide" : "Show"} Premium Plans
        </Button>
      </div>

      <Select items={allItems}>
        <Select.Label>Select a plan</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Choose a plan" />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            <Select.ItemGroup id="basic-plans">
              <Select.ItemGroupLabel htmlFor="basic-plans">
                Basic Plans
              </Select.ItemGroupLabel>
              {basicItems.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.ItemGroup>

            {showPremium && (
              <Select.ItemGroup id="premium-plans">
                <Select.ItemGroupLabel htmlFor="premium-plans">
                  Premium Plans
                </Select.ItemGroupLabel>
                {premiumItems.map((item) => (
                  <Select.Item key={item.value} item={item}>
                    <span className="flex items-center gap-2">
                      <Select.ItemText />
                      <Badge variant="warning">Premium</Badge>
                    </span>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.ItemGroup>
            )}
          </Select.Content>
        </Select.Positioner>
      </Select>
    </>
  )
}

export const ConditionalRendering: Story = {
  name: "Conditional Rendering (Compound Benefit)",
  render: ConditionalRenderingRender,
}
