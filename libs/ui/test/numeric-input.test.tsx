// @vitest-environment jsdom

import { act } from "react"
import type { ComponentProps, ReactNode } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { NumericInput } from "../src/atoms/numeric-input"

const getSpinbutton = (container: HTMLDivElement): HTMLInputElement => {
  const input = container.querySelector(
    'input[role="spinbutton"][aria-label="Amount"]',
  )
  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError("Expected the accessible numeric input spinbutton")
  }
  return input
}

const NumericInputFixture = ({
  inputProps,
  ...props
}: ComponentProps<typeof NumericInput> & {
  inputProps?: ComponentProps<typeof NumericInput.Input>
}) => (
  <NumericInput {...props}>
    <NumericInput.Control>
      <NumericInput.Input aria-label="Amount" {...inputProps} />
    </NumericInput.Control>
  </NumericInput>
)

describe("NumericInput value formatting", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
      writable: true,
    })
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  const render = async (node: ReactNode) => {
    await act(async () => {
      root.render(node)
      await Promise.resolve()
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it("formats a controlled value for the accessible spinbutton", async () => {
    await render(
      <NumericInputFixture
        formatOptions={{ maximumFractionDigits: 1, useGrouping: false }}
        locale="de-DE"
        value={1234.5}
      />,
    )

    expect(getSpinbutton(container).value).toBe("1234,5")
  })

  it("formats a default value for the accessible spinbutton", async () => {
    await render(
      <NumericInputFixture
        defaultValue={9876.5}
        formatOptions={{ maximumFractionDigits: 1, useGrouping: false }}
        locale="de-DE"
      />,
    )

    expect(getSpinbutton(container).value).toBe("9876,5")
  })

  it("updates a controlled value", async () => {
    await render(
      <NumericInputFixture
        formatOptions={{ maximumFractionDigits: 2, useGrouping: false }}
        locale="en-US"
        value={1234.5}
      />,
    )
    expect(getSpinbutton(container).value).toBe("1234.5")

    await render(
      <NumericInputFixture
        formatOptions={{ maximumFractionDigits: 2, useGrouping: false }}
        locale="en-US"
        value={9876.54}
      />,
    )

    expect(getSpinbutton(container).value).toBe("9876.54")
  })

  it("updates formatting when locale and options change", async () => {
    await render(
      <NumericInputFixture
        formatOptions={{ maximumFractionDigits: 2, useGrouping: false }}
        locale="en-US"
        value={1234.5}
      />,
    )
    expect(getSpinbutton(container).value).toBe("1234.5")

    await render(
      <NumericInputFixture
        formatOptions={{ maximumFractionDigits: 1, useGrouping: true }}
        locale="de-DE"
        value={1234.5}
      />,
    )

    expect(getSpinbutton(container).value).toBe("1.234,5")
  })

  it("lets precision override maximumFractionDigits", async () => {
    await render(
      <NumericInputFixture
        formatOptions={{ maximumFractionDigits: 3, useGrouping: false }}
        locale="en-US"
        precision={1}
        value={12.345}
      />,
    )

    expect(getSpinbutton(container).value).toBe("12.3")
  })

  it.each([0, Number.NaN])(
    "keeps caller formatOptions when precision is %s",
    async (precision) => {
      await render(
        <NumericInputFixture
          formatOptions={{ maximumFractionDigits: 1, useGrouping: false }}
          locale="en-US"
          precision={precision}
          value={12.34}
        />,
      )

      expect(getSpinbutton(container).value).toBe("12.3")
    },
  )

  it("keeps values raw when formatOptions are absent", async () => {
    await render(<NumericInputFixture locale="de-DE" value={1234.5} />)

    expect(getSpinbutton(container).value).toBe("1234.5")
  })

  it("prefers Input defaultValue over Root defaultValue when uncontrolled", async () => {
    await render(
      <NumericInputFixture
        defaultValue={12.3}
        formatOptions={{ maximumFractionDigits: 1, useGrouping: false }}
        inputProps={{ defaultValue: "98.7" }}
        locale="en-US"
      />,
    )

    expect(getSpinbutton(container).value).toBe("98.7")
  })

  it("suppresses Input defaultValue when controlled", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await render(
      <NumericInputFixture
        formatOptions={{ maximumFractionDigits: 1, useGrouping: false }}
        inputProps={{ defaultValue: "98.7" }}
        locale="en-US"
        value={12.3}
      />,
    )

    expect(getSpinbutton(container).value).toBe("12.3")
    expect(consoleError).not.toHaveBeenCalled()
  })

  it("reflects mutations to a reused formatOptions object", async () => {
    const formatOptions = {
      maximumFractionDigits: 1,
      useGrouping: false,
    }

    await render(
      <NumericInputFixture
        formatOptions={formatOptions}
        locale="en-US"
        value={12.34}
      />,
    )
    expect(getSpinbutton(container).value).toBe("12.3")

    formatOptions.maximumFractionDigits = 2
    await render(
      <NumericInputFixture
        formatOptions={formatOptions}
        locale="en-US"
        value={12.34}
      />,
    )

    expect(getSpinbutton(container).value).toBe("12.34")
  })
})
