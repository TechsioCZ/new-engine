import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  RadioGroup,
  type RadioGroupProps,
  radioGroupVariants,
} from "../src/molecules/radio-group"

const sizes = ["sm", "md", "lg"] as const
const variants = ["outline", "subtle", "solid"] as const
const statuses = ["error", "warning", "success"] as const

function Choices({
  wrapped = false,
  ...props
}: Omit<RadioGroupProps, "children"> & { wrapped?: boolean }) {
  const content = (
    <>
      <RadioGroup.ItemText>Standard delivery</RadioGroup.ItemText>
      <RadioGroup.ItemDescription>
        Arrives in 3–5 business days, after your order is confirmed.
      </RadioGroup.ItemDescription>
    </>
  )

  return (
    <RadioGroup defaultValue="standard" {...props}>
      <RadioGroup.Label>Delivery method</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        <RadioGroup.Item value="standard">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          {wrapped ? (
            <RadioGroup.ItemContent>{content}</RadioGroup.ItemContent>
          ) : (
            content
          )}
        </RadioGroup.Item>
      </RadioGroup.ItemGroup>
    </RadioGroup>
  )
}

describe("RadioGroup remaining council regressions", () => {
  it.each(sizes)(
    "gives direct and wrapped %s descriptions the same spacing token",
    (size) => {
      const styles = radioGroupVariants({ size })
      expect(styles.item().split(" ")).toContain(
        `gap-y-radio-group-item-content-${size}`
      )
      expect(styles.itemContent().split(" ")).toContain(
        `gap-radio-group-item-content-${size}`
      )
      expect(styles.itemControl().split(" ")).toContain(
        `radio-group-control-align-${size}`
      )
      expect(styles.itemControl().split(" ")).toContain(
        `size-radio-group-control-${size}`
      )
      expect(styles.itemText().split(" ")).toContain(
        `text-radio-group-item-${size}`
      )

      for (const wrapped of [false, true]) {
        const html = renderToStaticMarkup(
          <Choices size={size} wrapped={wrapped} />
        )
        expect(html).toContain("Standard delivery")
        expect(html).toContain(
          "Arrives in 3–5 business days, after your order is confirmed."
        )
        expect(html).toContain('type="radio"')
        expect(html).toContain('value="standard"')
      }
    }
  )

  it("keeps logical first-line alignment for every size", () => {
    const css = readFileSync(
      new URL(
        "../src/tokens/components/molecules/_radio-group.css",
        import.meta.url
      ),
      "utf8"
    )
    for (const size of sizes) {
      const utility = css
        .split(`@utility radio-group-control-align-${size} {`)[1]
        ?.split("}")[0]
      expect(utility).toContain("margin-block-start: max(")
      expect(utility).toContain(`var(--text-radio-group-item-${size})`)
      expect(utility).toContain(`var(--size-radio-group-control-${size})`)
    }
  })

  it.each(variants)(
    "gates every %s hover paint on editable, enabled controls",
    (variant) => {
      const classes = radioGroupVariants({ variant }).itemControl().split(" ")
      const hoverClasses = classes.filter((name) =>
        name.includes("data-hover:")
      )
      expect(hoverClasses).toHaveLength(4)
      for (const name of hoverClasses) {
        expect(name).toContain("not-data-disabled:")
        expect(name).toContain("not-data-readonly:")
      }
      // State protection must not remove the existing keyboard focus ring.
      expect(classes).toContain("data-focus-visible:outline-radio-group-ring")
    }
  )

  it.each(statuses)(
    "honors an explicit hidden %s icon without dropping status semantics or size",
    (status) => {
      const renderStatus = (showIcon?: boolean) =>
        renderToStaticMarkup(
          <RadioGroup size="sm" validateStatus={status}>
            <RadioGroup.StatusText showIcon={showIcon}>
              Select a delivery method before continuing.
            </RadioGroup.StatusText>
          </RadioGroup>
        )
      expect(renderStatus()).toContain(`token-icon-status-text-${status}`)
      const hidden = renderStatus(false)
      expect(hidden).not.toContain(`token-icon-status-text-${status}`)
      expect(hidden).toContain(`data-status="${status}"`)
      expect(hidden).toContain(
        `role="${status === "error" ? "alert" : "status"}"`
      )
      expect(hidden).toContain("text-status-text-sm")
      expect(hidden).toContain("Select a delivery method before continuing.")
    }
  )

  it("preserves explicit status and size overrides", () => {
    const html = renderToStaticMarkup(
      <RadioGroup size="sm" validateStatus="error">
        <RadioGroup.StatusText showIcon={false} size="lg" status="success">
          Your delivery preference is saved.
        </RadioGroup.StatusText>
      </RadioGroup>
    )
    expect(html).toContain('data-status="success"')
    expect(html).toContain('role="status"')
    expect(html).toContain("text-status-text-lg")
    expect(html).not.toContain("token-icon-status-text-success")
  })
})
