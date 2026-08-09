// @vitest-environment jsdom

import { act, useState } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCombobox } from "../src/molecules/combobox"
import { SearchForm } from "../src/molecules/search-form"

const ITEMS = [
  {
    data: { href: "/guides/safe-html" },
    label: "Safe HTML",
    value: "safe-html",
  },
  {
    data: { href: "/products/search" },
    label: "Search product",
    value: "search-product",
  },
]

const HeadlessComboboxHarness = ({
  navigate,
}: {
  navigate: (href: string) => void
}) => {
  const { api, options } = useCombobox({
    items: ITEMS,
    navigate: ({ href }) => {
      navigate(href)
    },
    openOnChange: true,
  })

  return (
    <div {...api.getRootProps()}>
      <button
        onClick={() => {
          api.setInputValue("s")
          api.setOpen(true)
        }}
        type="button"
      >
        Open
      </button>
      <input {...api.getInputProps()} />
      {api.open ? (
        <div {...api.getContentProps()}>
          <div {...api.getListProps()}>
            {options.map((item) => (
              <a
                key={item.value}
                {...api.getItemProps({ item })}
                href={item.data?.href ?? "#"}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const SearchFormComboboxHarness = () => {
  const [inputValue, setInputValue] = useState("")
  const { api } = useCombobox({
    inputValue,
    items: ITEMS,
    onInputValueChange: setInputValue,
  })

  return (
    <SearchForm onValueChange={setInputValue} value={inputValue}>
      <SearchForm.Label {...api.getLabelProps()}>Search</SearchForm.Label>
      <SearchForm.Control>
        <SearchForm.Input {...api.getInputProps()} />
        <SearchForm.ClearButton {...api.getClearTriggerProps()} />
      </SearchForm.Control>
    </SearchForm>
  )
}

describe(useCombobox, () => {
  let container: HTMLDivElement

  beforeEach(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
      writable: true,
    })
    container = document.createElement("div")
    document.body.append(container)
  })

  afterEach(() => {
    container.remove()
    vi.restoreAllMocks()
  })

  it("links real Zag combobox, listbox, options, and keyboard navigation", async () => {
    const navigate = vi.fn<(href: string) => void>()
    const root = createRoot(container)

    act((): void => {
      root.render(<HeadlessComboboxHarness navigate={navigate} />)
    })

    const input = container.querySelector("input")
    if (!(input instanceof HTMLInputElement)) {
      throw new TypeError("Expected the combobox input")
    }

    const openButton = container.querySelector("button")
    if (!(openButton instanceof HTMLButtonElement)) {
      throw new TypeError("Expected the open test button")
    }

    await act(async () => {
      openButton.click()
      await Promise.resolve()
    })

    const controlledPopup = container.querySelector('[data-part="content"]')
    expect({
      controls: input.getAttribute("aria-controls"),
      optionCount: container.querySelectorAll('[role="option"]').length,
      role: input.getAttribute("role"),
    }).toStrictEqual({
      controls: controlledPopup?.id,
      optionCount: 2,
      role: "combobox",
    })

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }),
      )
      await Promise.resolve()
    })
    expect(input.getAttribute("aria-activedescendant")).not.toBeNull()

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }),
      )
      await Promise.resolve()
    })
    expect(navigate).toHaveBeenCalledWith(
      "http://localhost:3000/guides/safe-html",
    )

    act(() => {
      root.unmount()
    })
  })

  it("composes SearchForm machine handlers with one value and linked ids", async () => {
    const root = createRoot(container)
    await act(async () => {
      root.render(<SearchFormComboboxHarness />)
      await Promise.resolve()
    })

    const input = container.querySelector("input")
    const label = container.querySelector("label")
    if (
      !(input instanceof HTMLInputElement) ||
      !(label instanceof HTMLLabelElement)
    ) {
      throw new TypeError("Expected the linked search label and input")
    }
    const valueDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )
    if (valueDescriptor?.set === undefined) {
      throw new TypeError("Expected the native input value setter")
    }
    const setInputValue = valueDescriptor.set.bind(input)

    await act(async () => {
      setInputValue("safe")
      input.dispatchEvent(new InputEvent("input", { bubbles: true }))
      await Promise.resolve()
    })
    expect(label.htmlFor).toBe(input.id)
    expect(input.value).toBe("safe")

    const clearButton = container.querySelector("button")
    if (!(clearButton instanceof HTMLButtonElement)) {
      throw new TypeError("Expected the composed clear trigger")
    }
    await act(async () => {
      clearButton.click()
      await Promise.resolve()
    })
    expect(input.value).toBe("")

    act(() => {
      root.unmount()
    })
  })
})
