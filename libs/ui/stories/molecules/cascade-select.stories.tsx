import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentProps, type FormEvent, useId, useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
  CascadeSelect,
  type CascadeSelectItem,
} from "../../src/molecules/cascade-select"

const productCategories = [
  {
    label: "Electronics",
    value: "electronics",
    children: [
      { label: "Computers", value: "computers" },
      { label: "Phones", value: "phones" },
      { label: "Cameras", value: "cameras", disabled: true },
    ],
  },
  {
    label: "Home & garden",
    value: "home",
    children: [
      { label: "Furniture", value: "furniture" },
      { label: "Lighting", value: "lighting" },
      { label: "Garden", value: "garden" },
    ],
  },
  {
    label: "Fashion",
    value: "fashion",
    children: [
      { label: "Women", value: "women" },
      { label: "Men", value: "men" },
      { label: "Children", value: "children" },
    ],
  },
] satisfies CascadeSelectItem[]

type CascadeSelectFieldProps = Omit<
  ComponentProps<typeof CascadeSelect>,
  "children"
> & {
  label: string
  placeholder?: string
  statusText?: string
  statusTextId?: string
  describedBy?: string
}

function CascadeSelectField({
  label,
  placeholder = "Choose an option",
  statusText,
  statusTextId,
  describedBy,
  ...props
}: CascadeSelectFieldProps) {
  return (
    <div className="w-xs">
      <CascadeSelect {...props}>
        <CascadeSelect.Label>{label}</CascadeSelect.Label>
        <CascadeSelect.Control>
          <CascadeSelect.Trigger aria-describedby={describedBy}>
            <CascadeSelect.ValueText placeholder={placeholder} />
            <CascadeSelect.Indicator />
          </CascadeSelect.Trigger>
          <CascadeSelect.ClearTrigger />
        </CascadeSelect.Control>
        <CascadeSelect.Positioner>
          <CascadeSelect.Content>
            <CascadeSelect.Node rootLabel="Categories" />
          </CascadeSelect.Content>
        </CascadeSelect.Positioner>
        {statusText && (
          <CascadeSelect.StatusText id={statusTextId} showIcon>
            {statusText}
          </CascadeSelect.StatusText>
        )}
      </CascadeSelect>
    </div>
  )
}

function ControlledCascadeSelect() {
  const [value, setValue] = useState<string[][]>([["home", "furniture"]])

  return (
    <div className="flex w-xs flex-col gap-200">
      <CascadeSelectField
        items={productCategories}
        label="Product category"
        onValueChange={(details) => setValue(details.value)}
        placeholder="Choose a category"
        value={value}
      />
      <p className="text-sm">
        Selected path: {value[0]?.join(" / ") ?? "None"}
      </p>
      <div className="flex gap-100">
        <Button
          onClick={() => setValue([["electronics", "phones"]])}
          size="sm"
        >
          Set phones
        </Button>
        <Button onClick={() => setValue([])} size="sm" variant="secondary">
          Clear
        </Button>
      </div>
    </div>
  )
}

function CascadeSelectWithinForm() {
  const [submittedValue, setSubmittedValue] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setSubmittedValue(String(formData.get("category") ?? ""))
  }

  return (
    <form
      className="flex w-xs flex-col gap-200"
      noValidate
      onSubmit={handleSubmit}
    >
      <CascadeSelectField
        items={productCategories}
        label="Product category"
        name="category"
        onValueChange={() => setSubmittedValue(null)}
        placeholder="Choose a category"
        required
        statusText={
          submittedValue === ""
            ? "Choose a category before saving."
            : "Select a department, then a category."
        }
        validateStatus={submittedValue === "" ? "error" : "default"}
      />
      <Button type="submit">Save category</Button>
      {submittedValue && (
        <output aria-live="polite" className="text-sm">
          Submitted value: {submittedValue}
        </output>
      )}
    </form>
  )
}

function CascadeSelectWithStatusText() {
  const descriptionId = useId()
  const [value, setValue] = useState<string[][]>([])
  const [attemptedSave, setAttemptedSave] = useState(false)
  const [saved, setSaved] = useState(false)
  const hasError = attemptedSave && value.length === 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttemptedSave(true)
    setSaved(value.length > 0)
  }

  return (
    <form
      className="flex w-xs flex-col gap-200"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-100">
        <h2 className="font-semibold text-fg-primary text-lg">
          Categorize a product
        </h2>
        <p className="text-fg-secondary text-sm" id={descriptionId}>
          Choose where customers will find this product in the catalog.
        </p>
        <p className="text-fg-secondary text-sm">
          Try saving without a category to see the validation error, then
          choose a category and save again.
        </p>
      </div>
      <CascadeSelect
        items={productCategories}
        name="category"
        onValueChange={(details) => {
          setValue(details.value)
          setSaved(false)
        }}
        required
        validateStatus={hasError ? "error" : "default"}
        value={value}
      >
        <CascadeSelect.Label>Product category</CascadeSelect.Label>
        <CascadeSelect.Control>
          <CascadeSelect.Trigger aria-describedby={descriptionId}>
            <CascadeSelect.ValueText placeholder="Choose a category" />
            <CascadeSelect.Indicator />
          </CascadeSelect.Trigger>
          <CascadeSelect.ClearTrigger />
        </CascadeSelect.Control>
        <CascadeSelect.Positioner>
          <CascadeSelect.Content>
            <CascadeSelect.Node rootLabel="Categories" />
          </CascadeSelect.Content>
        </CascadeSelect.Positioner>
        <CascadeSelect.StatusText status="default">
          Select a department, then choose its most specific category.
        </CascadeSelect.StatusText>
        {hasError && (
          <CascadeSelect.StatusText id={`${descriptionId}-error`} showIcon>
            Choose a category before saving the product.
          </CascadeSelect.StatusText>
        )}
      </CascadeSelect>
      <Button type="submit">Save product</Button>
      {saved && (
        <output aria-live="polite" className="text-fg-primary text-sm">
          Product category saved.
        </output>
      )}
    </form>
  )
}

const hiddenControl = {
  control: false,
  table: { disable: true },
} as const

const meta = {
  title: "Molecules/CascadeSelect",
  component: CascadeSelect,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Choose a form value from a hierarchy using connected, labeled columns. Use Select for flat options, Combobox for searchable flat options, and TreeView for hierarchical navigation; CascadeSelect stores each selection as its complete path.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
      description: "Size of the cascade select.",
      table: { defaultValue: { summary: "md" } },
    },
    validateStatus: {
      control: "select",
      options: ["default", "error", "success", "warning"],
      description: "Validation status of the cascade select.",
      table: { defaultValue: { summary: "default" } },
    },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    required: { control: "boolean" },
    multiple: { control: "boolean" },
    highlightTrigger: {
      control: "inline-radio",
      options: ["click", "hover"],
    },
    closeOnSelect: { control: "boolean" },
    allowParentSelection: { control: "boolean" },
    loopFocus: { control: "boolean" },
    dir: { control: "inline-radio", options: ["ltr", "rtl"] },
    children: hiddenControl,
    className: hiddenControl,
    id: hiddenControl,
    ref: hiddenControl,
    items: hiddenControl,
    value: hiddenControl,
    defaultValue: hiddenControl,
    open: hiddenControl,
    defaultOpen: hiddenControl,
    highlightedValue: hiddenControl,
    defaultHighlightedValue: hiddenControl,
    positioning: hiddenControl,
    formatValue: hiddenControl,
    name: hiddenControl,
    form: hiddenControl,
    ids: hiddenControl,
    getRootNode: hiddenControl,
    scrollToIndexFn: hiddenControl,
    onFocusOutside: hiddenControl,
    onInteractOutside: hiddenControl,
    onPointerDownOutside: hiddenControl,
    onValueChange: hiddenControl,
    onOpenChange: hiddenControl,
    onHighlightChange: hiddenControl,
  },
  args: {
    children: null,
    items: productCategories,
    size: "md",
    validateStatus: "default",
    disabled: false,
    readOnly: false,
    required: false,
    multiple: false,
    highlightTrigger: "click",
    closeOnSelect: true,
    allowParentSelection: false,
    loopFocus: false,
    dir: "ltr",
    onValueChange: fn(),
    onOpenChange: fn(),
    onHighlightChange: fn(),
  },
} satisfies Meta<typeof CascadeSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Explore sizes, validation and selection behavior for a product category using the live controls.",
      },
    },
  },
  render: (args) => (
    <CascadeSelectField
      {...args}
      label="Product category"
      placeholder="Choose a category"
      statusText="Select the most specific category that applies."
    />
  ),
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare the four control sizes to choose a density that fits the surrounding form.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Extra small">
        <CascadeSelectField
          items={productCategories}
          label="Product category"
          placeholder="Choose a category"
          size="xs"
        />
      </VariantGroup>
      <VariantGroup title="Small">
        <CascadeSelectField
          items={productCategories}
          label="Product category"
          placeholder="Choose a category"
          size="sm"
        />
      </VariantGroup>
      <VariantGroup title="Medium">
        <CascadeSelectField
          items={productCategories}
          label="Product category"
          placeholder="Choose a category"
          size="md"
        />
      </VariantGroup>
      <VariantGroup title="Large">
        <CascadeSelectField
          items={productCategories}
          label="Product category"
          placeholder="Choose a category"
          size="lg"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const States: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare helper text, disabled and read-only fields, and icon-backed validation feedback without relying on color alone.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Default">
        <CascadeSelectField
          items={productCategories}
          label="Product category"
          statusText="Choose a leaf category."
        />
      </VariantGroup>
      <VariantGroup title="Disabled">
        <CascadeSelectField
          disabled
          items={productCategories}
          label="Product category"
          placeholder="Selection unavailable"
          statusText="Category selection is unavailable while the catalog is syncing."
        />
      </VariantGroup>
      <VariantGroup title="Read-only">
        <CascadeSelectField
          defaultValue={[["electronics", "phones"]]}
          items={productCategories}
          label="Product category"
          readOnly
          statusText="This saved value cannot be changed."
        />
      </VariantGroup>
      <VariantGroup title="Error">
        <CascadeSelectField
          items={productCategories}
          label="Product category"
          required
          statusText="Choose a category before continuing."
          validateStatus="error"
        />
      </VariantGroup>
      <VariantGroup title="Success">
        <CascadeSelectField
          defaultValue={[["home", "furniture"]]}
          items={productCategories}
          label="Product category"
          statusText="Category is available."
          validateStatus="success"
        />
      </VariantGroup>
      <VariantGroup title="Warning">
        <CascadeSelectField
          defaultValue={[["fashion", "children"]]}
          items={productCategories}
          label="Product category"
          statusText="This category requires manual review."
          validateStatus="warning"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const OpenHierarchy: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Connected columns have numbered level headers, dividers and an active-path marker so the expanded branch remains easy to follow.",
      },
    },
  },
  render: () => (
    <CascadeSelectField
      defaultHighlightedValue={["electronics"]}
      defaultOpen
      items={productCategories}
      label="Product category"
      placeholder="Choose a category"
    />
  ),
}

export const NavigationModes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare click and hover branch expansion while retaining keyboard navigation in both modes.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Click">
        <CascadeSelectField
          highlightTrigger="click"
          items={productCategories}
          label="Product category"
          statusText="Open the next level by clicking a branch."
        />
      </VariantGroup>
      <VariantGroup title="Hover">
        <CascadeSelectField
          highlightTrigger="hover"
          items={productCategories}
          label="Product category"
          statusText="Open the next level by hovering over a branch."
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const MultipleSelection: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Select several complete category paths while keeping the hierarchy open for additional choices.",
      },
    },
  },
  render: () => (
    <CascadeSelectField
      closeOnSelect={false}
      defaultValue={[
        ["electronics", "computers"],
        ["home", "lighting"],
      ]}
      items={productCategories}
      label="Product categories"
      multiple
      placeholder="Choose categories"
      statusText="Choose any number of complete category paths."
    />
  ),
}

export const ParentSelection: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Allow a whole department to be selected when a branch is a valid catalog scope.",
      },
    },
  },
  render: () => (
    <CascadeSelectField
      allowParentSelection
      defaultValue={[["electronics"]]}
      items={productCategories}
      label="Catalog scope"
      placeholder="Choose a branch or leaf"
      statusText="Selecting a parent applies to its complete branch."
    />
  ),
}

export const Controlled: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Use external actions to replace or clear the selected path in a controlled form field.",
      },
    },
  },
  render: () => <ControlledCascadeSelect />,
}

export const WithinForm: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Save a category using a native form to inspect how the complete selected path is serialized.",
      },
    },
  },
  render: () => <CascadeSelectWithinForm />,
}

export const AccessibleStatusText: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Save without choosing a category to reveal an icon-backed validation error; the trigger references both persistent helper text and the temporary error through aria-describedby, preserving its additional description as the error is resolved.",
      },
    },
  },
  render: () => <CascadeSelectWithStatusText />,
}

export const CustomValueFormatting: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Display only the final category in the trigger when the full path is not needed in a compact form.",
      },
    },
  },
  render: () => (
    <CascadeSelectField
      defaultValue={[["home", "furniture"]]}
      formatValue={(selectedItems) =>
        selectedItems
          .map((path) => path.at(-1)?.label)
          .filter(Boolean)
          .join(", ")
      }
      items={productCategories}
      label="Product category"
      placeholder="Choose a category"
      statusText="The trigger displays only the final category."
    />
  ),
}
