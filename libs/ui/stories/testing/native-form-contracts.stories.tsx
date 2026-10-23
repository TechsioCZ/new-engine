import { CalendarDate } from "@internationalized/date"
import type { Meta, StoryObj } from "@storybook/react"
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Button } from "../../src/atoms/button"
import { Checkbox } from "../../src/atoms/checkbox"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { NumericInput } from "../../src/atoms/numeric-input"
import { Rating } from "../../src/atoms/rating"
import { Textarea } from "../../src/atoms/textarea"
import { CascadeSelect } from "../../src/molecules/cascade-select"
import { Combobox } from "../../src/molecules/combobox"
import { DatePicker } from "../../src/molecules/date-picker"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { PhoneInput } from "../../src/molecules/phone-input"
import { RadioCard } from "../../src/molecules/radio-card"
import { RadioGroup } from "../../src/molecules/radio-group"
import { Select } from "../../src/molecules/select"
import { Slider } from "../../src/molecules/slider"
import { Switch } from "../../src/molecules/switch"

const choices = [
  { id: "alpha", value: "alpha", label: "Alpha" },
  { id: "beta", value: "beta", label: "Beta" },
]

const renamedChoices = choices.map((item) => ({
  ...item,
  label: `Renamed ${item.label}`,
}))

const initialValues = {
  checkbox: false,
  "form-checkbox": false,
  switch: false,
  "radio-group": "alpha",
  "radio-card": "alpha",
  rating: 2,
  slider: [20],
  input: "Alpha",
  textarea: "Alpha",
  "numeric-input": 20,
  "phone-input": "+421900123456",
  select: ["alpha"],
  combobox: ["alpha"],
  "cascade-select": [["alpha"]],
  "date-picker": new CalendarDate(2026, 8, 20),
}

const changedValues = {
  checkbox: true,
  "form-checkbox": true,
  switch: true,
  "radio-group": "beta",
  "radio-card": "beta",
  rating: 3,
  slider: [21],
  input: "Beta",
  textarea: "Beta",
  "numeric-input": 21,
  "phone-input": "+421901123456",
  select: ["beta"],
  combobox: ["beta"],
  "cascade-select": [["beta"]],
  "date-picker": new CalendarDate(2026, 8, 21),
}

type Control = keyof typeof initialValues
type Value = (typeof initialValues)[Control]
type Authority = "uncontrolled" | "accept" | "refuse"
type Cancellation =
  | "none"
  | "early-native"
  | "late-native"
  | "early-react"
  | "late-react"
type Placement =
  | "body"
  | "first-legend"
  | "second-legend"
  | "nested-first-legend"
type AdapterProps = {
  control: Control
  authority: Authority
  value: Value
  form?: string
  onChange: (value: Value) => void
  onQueryChange: () => void
  renamedChoices: boolean
}

/** Only component-specific composition lives here; the lifecycle harness is shared. */
function ValueControl({
  control,
  authority,
  value,
  form,
  onChange,
  onQueryChange,
  renamedChoices: useRenamedChoices,
}: AdapterProps) {
  const controlled = authority !== "uncontrolled"
  const common = { name: "value", form }
  switch (control) {
    case "checkbox":
      return (
        <Label>
          <Checkbox
            {...common}
            value="yes"
            aria-label="Contract value"
            checked={controlled ? (value as boolean) : undefined}
            defaultChecked={controlled ? undefined : false}
            onChange={(event) => onChange(event.currentTarget.checked)}
          />
          Contract value
        </Label>
      )
    case "form-checkbox":
      return (
        <FormCheckbox
          {...common}
          value="yes"
          label="Contract value"
          checked={controlled ? (value as boolean) : undefined}
          defaultChecked={controlled ? undefined : false}
          onCheckedChange={onChange}
        />
      )
    case "switch":
      return (
        <Switch
          {...common}
          value="yes"
          checked={controlled ? (value as boolean) : undefined}
          defaultChecked={controlled ? undefined : false}
          onCheckedChange={onChange}
        >
          Contract value
        </Switch>
      )
    case "input":
      return (
        <Label>
          Contract value
          <Input
            {...common}
            aria-label="Contract value"
            value={controlled ? (value as string) : undefined}
            defaultValue={controlled ? undefined : "Alpha"}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
        </Label>
      )
    case "textarea":
      return (
        <Label>
          Contract value
          <Textarea
            {...common}
            aria-label="Contract value"
            value={controlled ? (value as string) : undefined}
            defaultValue={controlled ? undefined : "Alpha"}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
        </Label>
      )
    case "numeric-input":
      return (
        <NumericInput
          {...common}
          value={controlled ? (value as number) : undefined}
          defaultValue={20}
          onChange={onChange}
        >
          <NumericInput.Control>
            <NumericInput.Input aria-label="Contract value" />
          </NumericInput.Control>
        </NumericInput>
      )
    case "rating":
      return (
        <Rating
          {...common}
          labelText="Contract value"
          allowHalf={false}
          value={controlled ? (value as number) : undefined}
          defaultValue={2}
          onChange={onChange}
        />
      )
    case "slider":
      return (
        <Slider
          {...common}
          label="Contract value"
          aria-label={["Contract value"]}
          value={controlled ? (value as number[]) : undefined}
          defaultValue={[20]}
          onChange={onChange}
        />
      )
    case "radio-group":
      return (
        <RadioGroup
          {...common}
          value={controlled ? (value as string) : undefined}
          defaultValue="alpha"
          onValueChange={(next) => onChange(next ?? "")}
        >
          <RadioGroup.Label>Contract value</RadioGroup.Label>
          <RadioGroup.ItemGroup>
            {choices.map((item) => (
              <RadioGroup.Item key={item.value} value={item.value}>
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl />
                <RadioGroup.ItemText>{item.label}</RadioGroup.ItemText>
              </RadioGroup.Item>
            ))}
          </RadioGroup.ItemGroup>
        </RadioGroup>
      )
    case "radio-card":
      return (
        <RadioCard
          {...common}
          value={controlled ? (value as string) : undefined}
          defaultValue="alpha"
          onValueChange={(next) => onChange(next ?? "")}
        >
          <RadioCard.Label>Contract value</RadioCard.Label>
          {choices.map((item) => (
            <RadioCard.Item key={item.value} value={item.value}>
              <RadioCard.ItemHiddenInput />
              <RadioCard.ItemControl>
                <RadioCard.ItemText>{item.label}</RadioCard.ItemText>
                <RadioCard.ItemIndicator />
              </RadioCard.ItemControl>
            </RadioCard.Item>
          ))}
        </RadioCard>
      )
    case "select":
      return (
        <Select
          {...common}
          items={choices}
          value={controlled ? (value as string[]) : undefined}
          defaultValue={["alpha"]}
          onValueChange={(details) => onChange(details.value)}
        >
          <Select.Label>Contract value</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {choices.map((item) => (
                <Select.Item item={item} key={item.value}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select>
      )
    case "combobox":
      return (
        <Combobox
          {...common}
          inputProps={{ form }}
          label="Contract value"
          items={useRenamedChoices ? renamedChoices : choices}
          value={controlled ? (value as string[]) : undefined}
          defaultValue={["alpha"]}
          onChange={onChange}
          onInputValueChange={onQueryChange}
        />
      )
    case "phone-input":
      return (
        <PhoneInput
          {...common}
          value={controlled ? (value as string) : undefined}
          defaultValue="+421900123456"
          defaultCountry="SK"
          onValueChange={(details) => onChange(details.e164)}
        >
          <PhoneInput.Label>Contract value</PhoneInput.Label>
          <PhoneInput.Control>
            <PhoneInput.Input />
          </PhoneInput.Control>
        </PhoneInput>
      )
    case "cascade-select":
      return (
        <CascadeSelect
          {...common}
          items={choices}
          value={controlled ? (value as string[][]) : undefined}
          defaultValue={[["alpha"]]}
          onValueChange={(details) => onChange(details.value)}
        >
          <CascadeSelect.Label>Contract value</CascadeSelect.Label>
          <CascadeSelect.Control>
            <CascadeSelect.Trigger>
              <CascadeSelect.ValueText />
            </CascadeSelect.Trigger>
          </CascadeSelect.Control>
          <CascadeSelect.Positioner>
            <CascadeSelect.Content>
              <CascadeSelect.Node rootLabel="Choices" />
            </CascadeSelect.Content>
          </CascadeSelect.Positioner>
        </CascadeSelect>
      )
    case "date-picker":
      return (
        <DatePicker.Root
          {...common}
          locale="en-US"
          value={controlled ? (value as CalendarDate) : undefined}
          defaultValue={new CalendarDate(2026, 8, 20)}
          onValueChange={(details) => {
            if (details.value) onChange(details.value)
          }}
        >
          <DatePicker.Label>Contract value</DatePicker.Label>
          <DatePicker.Control>
            <DatePicker.Segments />
            <DatePicker.Trigger />
          </DatePicker.Control>
          <DatePicker.Positioner>
            <DatePicker.Content>
              <DatePicker.Calendar />
            </DatePicker.Content>
          </DatePicker.Positioner>
        </DatePicker.Root>
      )
  }
}

type FixtureProps = {
  control: Control
  authority: Authority
  cancellation: Cancellation
  placement: Placement
}

export function NativeFormFixture({
  control,
  authority,
  cancellation,
  placement,
}: FixtureProps) {
  const [value, setValue] = useState<Value>(initialValues[control])
  const [changes, setChanges] = useState(0)
  const [queryChanges, setQueryChanges] = useState(0)
  const [useRenamedChoices, setUseRenamedChoices] = useState(false)
  const nativeEvents = useRef(0)
  const [resets, setResets] = useState(0)
  const [mounted, setMounted] = useState(true)
  const [generation, setGeneration] = useState(0)
  const [owner, setOwner] = useState<"a" | "b">("a")
  const [outerDisabled, setOuterDisabled] = useState(false)
  const [innerDisabled, setInnerDisabled] = useState(false)
  const fixture = useRef<HTMLDivElement>(null)
  const valueRoot = useRef<HTMLDivElement>(null)
  const recordNativeEvent = () => {
    nativeEvents.current += 1
    const output = fixture.current?.querySelector('[data-testid="native-event-count"]')
    if (output) output.textContent = String(nativeEvents.current)
  }

  useEffect(() => {
    const root = fixture.current
    if (!root || !cancellation.endsWith("native")) return
    // Capture precedes component listeners; document bubble follows all target
    // listeners and React's delegated handlers. Use real reset-button activation.
    const prevent = (event: Event) => {
      if (
        event.target instanceof HTMLFormElement &&
        root.contains(event.target)
      )
        event.preventDefault()
    }
    const capture = cancellation === "early-native"
    document.addEventListener("reset", prevent, capture)
    return () => document.removeEventListener("reset", prevent, capture)
  }, [cancellation])

  useLayoutEffect(() => {
    // Exercise the native form=id contract even for controls without a form prop.
    // No component is remounted when its actual native proxy is reassociated.
    for (const node of valueRoot.current?.querySelectorAll(
      "input, select, textarea"
    ) ?? []) {
      if (owner === "a") node.removeAttribute("form")
      else node.setAttribute("form", "native-contract-b")
    }
  }, [owner, mounted, generation])

  const field: ReactNode = (
    <div data-testid="value-control" ref={valueRoot}>
      {mounted && (
        <ValueControl
          key={`${control}-${generation}`}
          control={control}
          authority={authority}
          value={value}
          renamedChoices={useRenamedChoices}
          onQueryChange={() => setQueryChanges((count) => count + 1)}
          form={owner === "b" ? "native-contract-b" : undefined}
          onChange={(next) => {
            setChanges((count) => count + 1)
            if (authority === "accept") setValue(next)
          }}
        />
      )}
    </div>
  )

  return (
    <div
      ref={fixture}
      tabIndex={-1}
      className="flex w-full max-w-sm flex-col gap-200"
      data-testid="native-form-fixture"
      onInputCapture={recordNativeEvent}
      onChangeCapture={recordNativeEvent}
      onResetCapture={(event) => {
        if (cancellation === "early-react") event.preventDefault()
      }}
      onReset={(event) => {
        setResets((count) => count + 1)
        if (cancellation === "late-react") event.preventDefault()
      }}
    >
      <form
        id="native-contract-a"
        aria-label="Form A"
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset data-testid="outer-fieldset" disabled={outerDisabled}>
          <legend>
            {placement === "first-legend" ? field : "Outer fieldset"}
          </legend>
          {placement === "second-legend" && <legend>{field}</legend>}
          {placement === "body" && field}
          {placement === "nested-first-legend" && (
            <fieldset data-testid="inner-fieldset" disabled={innerDisabled}>
              <legend>{field}</legend>
            </fieldset>
          )}
        </fieldset>
        <Button theme="outlined" type="reset">
          Reset A
        </Button>
      </form>
      <form
        id="native-contract-b"
        aria-label="Form B"
        onSubmit={(event) => event.preventDefault()}
      >
        <Button theme="outlined" type="reset">
          Reset B
        </Button>
      </form>
      <div className="flex flex-wrap gap-100">
        {control === "combobox" && (
          <Button
            theme="outlined"
            onClick={() => setUseRenamedChoices((current) => !current)}
          >
            Toggle choice labels
          </Button>
        )}
        <Button
          theme="outlined"
          onClick={() => setValue(changedValues[control])}
        >
          Set parent value
        </Button>
        <Button
          theme="outlined"
          onClick={() => setValue(initialValues[control])}
        >
          Restore parent default
        </Button>
        <Button
          theme="outlined"
          onClick={() => setOwner((current) => (current === "a" ? "b" : "a"))}
        >
          Change form owner
        </Button>
        <Button
          theme="outlined"
          onClick={() => setOuterDisabled((current) => !current)}
        >
          Toggle outer fieldset
        </Button>
        <Button
          theme="outlined"
          onClick={() => setInnerDisabled((current) => !current)}
        >
          Toggle inner fieldset
        </Button>
        <Button
          theme="outlined"
          onClick={() => setMounted((current) => !current)}
        >
          Toggle control
        </Button>
        <Button
          theme="outlined"
          onClick={() => {
            setGeneration((current) => current + 1)
            setValue(initialValues[control])
          }}
        >
          Remount control
        </Button>
      </div>
      <output data-testid="change-count" aria-label="Value callback count">
        {changes}
      </output>
      <output data-testid="native-event-count" aria-label="Native value event count">
        {nativeEvents.current}
      </output>
      <output data-testid="query-count" aria-label="Query callback count">
        {queryChanges}
      </output>
      <output data-testid="reset-count" aria-label="Reset event count">
        {resets}
      </output>
      <output data-testid="form-owner" aria-label="Current form owner">
        {owner}
      </output>
    </div>
  )
}

const meta = {
  title: "Testing/Native form contracts",
  component: NativeFormFixture,
  includeStories: ["Playground"],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Maintained native-form lifecycle fixtures compare rendered values, accessibility state, native submission and callback counts through the same component adapters. Reset is silent: uncontrolled values restore their default; controlled values stay parent-owned. The next user edit must notify exactly once.",
      },
    },
  },
  args: {
    control: "checkbox",
    authority: "uncontrolled",
    cancellation: "none",
    placement: "body",
  },
  argTypes: {
    control: { control: "select", options: Object.keys(initialValues) },
    authority: {
      control: "select",
      options: ["uncontrolled", "accept", "refuse"],
    },
    cancellation: {
      control: "select",
      options: [
        "none",
        "early-native",
        "late-native",
        "early-react",
        "late-react",
      ],
    },
    placement: {
      control: "select",
      options: ["body", "first-legend", "second-legend", "nested-first-legend"],
    },
  },
} satisfies Meta<typeof NativeFormFixture>

export default meta

type Story = StoryObj<typeof meta>
export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Choose a value-control adapter to exercise reset cancellation, controlled authority, form reassociation and nested fieldset semantics with observable callback counts.",
      },
    },
  },
  render: (args) => (
    <NativeFormFixture
      key={`${args.control}-${args.authority}-${args.cancellation}-${args.placement}`}
      {...args}
    />
  ),
}
