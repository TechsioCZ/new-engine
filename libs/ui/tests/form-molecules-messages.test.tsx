// @vitest-environment happy-dom
import { CalendarDate } from "@internationalized/date"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"
import { UiMessagesProvider } from "../src/messages/ui-messages-provider"
import { CascadeSelect } from "../src/molecules/cascade-select"
import { ColorSelect } from "../src/molecules/color-select"
import { Combobox } from "../src/molecules/combobox"
import { DatePicker } from "../src/molecules/date-picker"
import { PhoneInput } from "../src/molecules/phone-input"
import { SearchForm } from "../src/molecules/search-form"
import { Select } from "../src/molecules/select"

const messages = {
  locale: "cs-CZ",
  combobox: {
    placeholder: "Vyberte možnost",
    clear: "Vymazat hodnotu",
    noResults: 'Nenalezeno pro "{inputValue}"',
    selectedValues: "Vybrané hodnoty",
    removeValue: (value: string) => `Odebrat ${value}`,
  },
  select: {
    placeholder: "Vyberte položku",
    clear: "Vymazat výběr",
    readOnly: "Výběr jen pro čtení",
  },
  cascadeSelect: {
    placeholder: "Vyberte cestu",
    clear: "Vymazat výběr",
    rootLabel: "Možnosti",
  },
  searchForm: {
    placeholder: "Hledat…",
    search: "Hledat",
    clear: (query: string) => `Vymazat hledání: ${query}`,
  },
  phoneInput: {
    placeholder: "Telefonní číslo",
    invalid: "Zadejte platné telefonní číslo.",
    countries: { CZ: "Česko" },
  },
  colorSelect: {
    label: "Barva",
    selectColor: (color: string) => `Vybrat barvu ${color}`,
  },
  datePicker: {
    segments: { day: "Den" },
    start: "Začátek",
    end: "Konec",
    startTime: "Čas začátku",
    endTime: "Čas konce",
    time: "Čas",
  },
} as const

const items = [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
]

const mounted: { container: HTMLElement; root: Root }[] = []

function render(node: ReactNode) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  mounted.push({ container, root })
  act(() => root.render(node))
  return { container }
}

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
})

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)

function requireElement<T extends Element>(
  container: ParentNode,
  selector: string
): T {
  const element = container.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Missing ${selector}`)
  }
  return element
}

describe("form molecules read the UiMessagesProvider catalog", () => {
  it("Combobox uses the catalog placeholder and clear label, and an explicit placeholder wins", () => {
    const { container } = render(
      <UiMessagesProvider messages={messages}>
        <Combobox clearable defaultValue="alpha" items={items} label="Fruit" />
        <Combobox items={items} placeholder="Vlastní" />
      </UiMessagesProvider>
    )
    const [first, second] = container.querySelectorAll("input")
    expect(first?.getAttribute("placeholder")).toBe("Vyberte možnost")
    expect(second?.getAttribute("placeholder")).toBe("Vlastní")
    expect(
      container.querySelector('[aria-label="Vymazat hodnotu"]')
    ).not.toBeNull()
  })

  it("Combobox keeps its English text without a provider", () => {
    const { container } = render(<Combobox items={items} />)
    expect(
      requireElement<HTMLInputElement>(container, "input").getAttribute(
        "placeholder"
      )
    ).toBe("Select option")
  })

  it("Select uses the catalog placeholder and clear label, and an explicit placeholder wins", () => {
    const { container } = render(
      <UiMessagesProvider messages={messages}>
        <Select defaultValue={["alpha"]} items={items}>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText />
            </Select.Trigger>
            <Select.ClearTrigger />
          </Select.Control>
        </Select>
        <Select items={items}>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Vlastní" />
            </Select.Trigger>
          </Select.Control>
        </Select>
      </UiMessagesProvider>
    )
    expect(
      container.querySelector('[aria-label="Vymazat výběr"]')
    ).not.toBeNull()
    expect(container.textContent).toContain("Vlastní")
    expect(container.textContent).not.toContain("Vyberte položku")
  })

  it("Select shows the catalog placeholder when nothing is selected", () => {
    const { container } = render(
      <UiMessagesProvider messages={messages}>
        <Select items={items}>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText />
            </Select.Trigger>
          </Select.Control>
        </Select>
      </UiMessagesProvider>
    )
    expect(container.textContent).toContain("Vyberte položku")
  })

  it("CascadeSelect uses the catalog placeholder, and an explicit placeholder wins", () => {
    const tree = [{ label: "Land", value: "land", children: [] }]
    const { container } = render(
      <UiMessagesProvider messages={messages}>
        <CascadeSelect items={tree}>
          <CascadeSelect.ValueText />
        </CascadeSelect>
        <CascadeSelect items={tree}>
          <CascadeSelect.ValueText placeholder="Vlastní" />
        </CascadeSelect>
      </UiMessagesProvider>
    )
    expect(container.textContent).toContain("Vyberte cestu")
    expect(container.textContent).toContain("Vlastní")
  })

  it("SearchForm uses the catalog placeholder, search name and clear label", () => {
    const { container } = render(
      <UiMessagesProvider messages={messages}>
        <SearchForm defaultValue="kniha">
          <SearchForm.Control>
            <SearchForm.Input />
            <SearchForm.ClearButton />
            <SearchForm.Button />
          </SearchForm.Control>
        </SearchForm>
        <SearchForm>
          <SearchForm.Control>
            <SearchForm.Input placeholder="Vlastní" />
          </SearchForm.Control>
        </SearchForm>
      </UiMessagesProvider>
    )
    const [first, second] = container.querySelectorAll("input")
    expect(first?.getAttribute("placeholder")).toBe("Hledat…")
    expect(first?.getAttribute("aria-label")).toBe("Hledat")
    expect(second?.getAttribute("placeholder")).toBe("Vlastní")
    expect(
      container.querySelector('[aria-label="Vymazat hledání: kniha"]')
    ).not.toBeNull()
    expect(
      container.querySelector('button[aria-label="Hledat"]')
    ).not.toBeNull()
  })

  it("PhoneInput uses the catalog placeholder and localized country name", () => {
    const { container } = render(
      <UiMessagesProvider messages={messages}>
        <PhoneInput>
          <PhoneInput.CountryPicker />
          <PhoneInput.Control>
            <PhoneInput.Input />
          </PhoneInput.Control>
        </PhoneInput>
        <PhoneInput>
          <PhoneInput.Control>
            <PhoneInput.Input placeholder="Vlastní" />
          </PhoneInput.Control>
        </PhoneInput>
      </UiMessagesProvider>
    )
    const [first, second] = container.querySelectorAll("input[type='tel']")
    expect(first?.getAttribute("placeholder")).toBe("Telefonní číslo")
    expect(second?.getAttribute("placeholder")).toBe("Vlastní")
    expect(
      container.querySelector('[aria-label="Česko (+420)"]')
    ).not.toBeNull()
  })

  it("PhoneInput keeps the English country name without a provider", () => {
    const { container } = render(
      <PhoneInput>
        <PhoneInput.CountryPicker />
      </PhoneInput>
    )
    expect(
      container.querySelector('[aria-label="Czechia (+420)"]')
    ).not.toBeNull()
  })

  it("ColorSelect uses the catalog label and swatch name, and an explicit label wins", () => {
    const colors = [{ color: "#f00", label: "Červená" }]
    const { container } = render(
      <UiMessagesProvider messages={messages}>
        <ColorSelect colors={colors} />
        <ColorSelect colors={colors} label="Odstín" />
      </UiMessagesProvider>
    )
    const labels = [...container.querySelectorAll("label")].map(
      (label) => label.textContent
    )
    expect(labels).toEqual(["Barva", "Odstín"])
    expect(
      container.querySelector('[aria-label="Vybrat barvu Červená"]')
    ).not.toBeNull()
  })

  it("DatePicker names day segments and range groups from the catalog, and an explicit label wins", () => {
    const { container } = render(
      <UiMessagesProvider messages={messages}>
        <DatePicker defaultValue={new CalendarDate(2026, 11, 12)}>
          <DatePicker.Control>
            <DatePicker.Segments />
          </DatePicker.Control>
        </DatePicker>
        <DatePicker selectionMode="range">
          <DatePicker.Control>
            <DatePicker.Segments />
          </DatePicker.Control>
        </DatePicker>
        <DatePicker selectionMode="range">
          <DatePicker.Control>
            <DatePicker.Segments startLabel="Od" />
          </DatePicker.Control>
        </DatePicker>
      </UiMessagesProvider>
    )
    const names = [...container.querySelectorAll('[role="spinbutton"]')].map(
      (segment) => segment.getAttribute("aria-label")
    )
    expect(names).toContain("Den")
    expect(container.textContent).toContain("Začátek")
    expect(container.textContent).toContain("Konec")
    expect(container.textContent).toContain("Od")
  })
})
