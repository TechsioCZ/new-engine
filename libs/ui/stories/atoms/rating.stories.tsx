import { useId, useState } from "react"
import { Button } from "../../src/atoms/button"
import type { Meta, StoryObj } from "@storybook/react"
import { useArgs } from "storybook/preview-api"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Rating } from "../../src/atoms/rating"
const describe = (story: string) => ({ docs: { description: { story } } })

const meta: Meta<typeof Rating> = {
  title: "Atoms/Rating",
  component: Rating,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A star rating for collecting review scores or displaying an average. Interactive ratings use keyboard-accessible radios; read-only ratings expose one named image and a visible numeric value. Use text or a progress indicator for non-rating scores.",
      },
    },
  },
  argTypes: {
    value: { control: { type: "number", min: 0, max: 5, step: 0.5 } },
    count: { control: { type: "number", min: 1, max: 10 } },
    size: { control: "select", options: ["sm", "md", "lg"] },
    labelText: { control: "text" },
    readOnly: { control: "boolean" },
    disabled: { control: "boolean" },
    allowHalf: { control: "boolean" },
    helpText: { control: "text" },
    validateStatus: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    defaultValue: { control: false },
    onChange: { control: false },
    onHoverChange: { control: false },
  },
  args: {
    labelText: "Rate your delivery",
    value: 3,
    count: 5,
    size: "md",
    allowHalf: false,
    readOnly: false,
    disabled: false,
    helpText: "Choose a score from one to five stars.",
    onChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof Rating>
export const Playground: Story = {
  parameters: describe(
    "Choose a score with pointer or arrow keys; the controls change size, half-star precision and feedback."
  ),
  render: function Playground(args) {
    const [, updateArgs] = useArgs()
    return (
      <Rating
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value })
        }}
      />
    )
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("radiogroup")
    ).toHaveAccessibleName("Rate your delivery")
  },
}
export const Sizes: Story = {
  parameters: describe(
    "Small, medium and large keep the same rating and at least 32-pixel interaction targets."
  ),
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          key={size}
          title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
        >
          <Rating
            size={size}
            labelText="Rate your delivery"
            defaultValue={3}
            allowHalf={false}
          />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const States: Story = {
  parameters: describe(
    "Error, warning and success feedback is described by the rating group and each keyboard focus target."
  ),
  render: () => (
    <div className="flex flex-col gap-250">
      <Rating
        labelText="Rate your delivery"
        validateStatus="error"
        helpText="Choose a score before sending your review."
      />
      <Rating
        labelText="Rate your delivery"
        defaultValue={3}
        validateStatus="warning"
        helpText="Your review has not been sent yet."
      />
      <Rating
        labelText="Rate your delivery"
        defaultValue={4}
        validateStatus="success"
        helpText="Your rating is saved."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getAllByRole("radio")[0]
    if (!input) throw new Error("Missing rating regression target")
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input.getAttribute("aria-errormessage")).toBeTruthy()
  },
}
export const Disabled: Story = {
  parameters: describe(
    "Unavailable ratings preserve the score without any focusable stars."
  ),
  render: () => (
    <Rating
      labelText="Rate your delivery"
      disabled
      defaultValue={3}
      helpText="Reviews open after your order arrives."
    />
  ),
  play: async ({ canvasElement }) => {
    const inputs = within(canvasElement).getAllByRole("radio")
    const emptyGlyph = inputs.at(-1)?.firstElementChild
    if (!emptyGlyph) throw new Error("Missing disabled star")
    for (const input of inputs) {
      await expect(input).not.toHaveAttribute("tabindex", "0")
      await expect(
        getComputedStyle(input.firstElementChild as Element).color
      ).toBe(getComputedStyle(emptyGlyph).color)
    }
    await expect(canvasElement.querySelector("label")).toHaveAttribute(
      "data-disabled"
    )
  },
}
export const ReadOnly: Story = {
  name: "Read-only",
  parameters: describe(
    "A read-only score is one focusable named image, not editable radios, and still submits its form value."
  ),
  render: () => (
    <div className="flex flex-col gap-250">
      <Rating
        name="average-score"
        labelText="Average delivery rating"
        readOnly
        value={4.5}
        helpText="Based on 128 verified reviews."
      />
      <Rating
        name="saved-score"
        labelText="Your delivery rating"
        readOnly
        defaultValue={4}
        helpText="Your review is already published."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("radio")).not.toBeInTheDocument()
    const image = canvas.getByRole("img", {
      name: "Average delivery rating: 4.5 out of 5",
    })
    image.focus()
    await expect(image).toHaveFocus()
    await userEvent.keyboard("{ArrowRight} ")
    await userEvent.click(image)
    await expect(image).toHaveAccessibleName(
      "Average delivery rating: 4.5 out of 5"
    )
  },
}
export const HalfStars: Story = {
  parameters: describe(
    "Half-star display uses a half-filled outline and a numeric value so precision never depends on color alone."
  ),
  render: () => (
    <Rating
      labelText="Average product rating"
      readOnly
      value={4.5}
      allowHalf
      helpText="Based on 128 verified reviews."
    />
  ),
}

export const Unselected: Story = {
  parameters: describe(
    "An untouched rating starts at zero, with no selected option; its score never exposes the internal unselected sentinel."
  ),
  render: () => <Rating labelText="Rate your delivery" allowHalf={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("0 / 5")).toBeVisible()
    await expect(
      canvas.queryByRole("radio", { checked: true })
    ).not.toBeInTheDocument()
  },
}
export const InteractiveHalfScore: Story = {
  parameters: describe(
    "The selected radio announces the exact saved half-star value, not the next whole star; arrow keys keep half-star precision."
  ),
  render: () => (
    <Rating labelText="Rate your delivery" defaultValue={4.5} allowHalf />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const selected = canvas.getByRole("radio", { checked: true })
    await expect(selected).toHaveAccessibleName("4.5 stars")
    await expect(selected).toHaveAccessibleDescription("4.5 / 5")
    selected.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await expect(
      canvas.getByRole("radio", { checked: true })
    ).toHaveAccessibleName("4 stars")
  },
}
export const TenPointScale: Story = {
  parameters: describe(
    "A ten-point scale wraps within narrow containers without shrinking its interaction targets or clipping later scores."
  ),
  render: () => (
    <div className="w-full max-w-xs">
      <Rating
        labelText="Rate your delivery"
        defaultValue={7}
        count={10}
        size="lg"
        allowHalf={false}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const inputs = within(canvasElement).getAllByRole("radio")
    const control = inputs[0]?.parentElement
    if (!control) throw new Error("Missing rating control")
    await expect(inputs).toHaveLength(10)
    await expect(control.scrollWidth).toBeLessThanOrEqual(control.clientWidth)
    for (const input of inputs) {
      const bounds = input.getBoundingClientRect()
      await expect(bounds.width).toBeGreaterThanOrEqual(24)
      await expect(bounds.height).toBeGreaterThanOrEqual(24)
    }
  },
}

export const ExternalLabel: Story = {
  parameters: describe("An external label names the actual radiogroup instead of only its generic wrapper."),
  render: function ExternalLabel() {
    const id = useId()
    return <div className="flex flex-col gap-150"><span id={id}>Rate delivery speed</span><Rating aria-labelledby={id} name="delivery-score" defaultValue={3} /></div>
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("radiogroup")).toHaveAccessibleName("Rate delivery speed")
  },
}

export const ChangingScale: Story = {
  parameters: describe("Changing the scale clamps scores and recovers removed-star focus; reset restores the original default using the current precision."),
  render: function ChangingScale() {
    const [count, setCount] = useState(5)
    const [allowHalf, setAllowHalf] = useState(true)
    const [changes, setChanges] = useState(0)
    return <form aria-label="Delivery review" className="flex w-full max-w-md flex-col gap-200" onSubmit={(event) => event.preventDefault()}>
      <Rating name="score" labelText="Rate your delivery" defaultValue={4.5} count={count} allowHalf={allowHalf} onChange={() => setChanges((value) => value + 1)} />
      <p className="text-sm text-fg-secondary">Score changes: {changes}</p>
      <div className="flex flex-wrap gap-150">
        <Button variant="secondary" onClick={() => setTimeout(() => setCount(3), 100)}>Use three stars after focus moves</Button>
        <Button variant="secondary" onClick={() => setAllowHalf(false)}>Use whole stars</Button>
        <Button variant="secondary" type="reset">Restore original score</Button>
      </div>
    </form>
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Delivery review" }) as HTMLFormElement
    await userEvent.click(canvas.getByRole("button", { name: "Use three stars after focus moves" }))
    canvas.getAllByRole("radio")[4]?.focus()
    await waitFor(() => expect(canvas.getAllByRole("radio")).toHaveLength(3))
    await waitFor(() => expect(new FormData(form).get("score")).toBe("3"))
    await expect(canvas.getByRole("radio", { checked: true })).toHaveFocus()
    await expect(canvas.getByText("Score changes: 1")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Use whole stars" }))
    const selected = canvas.getByRole("radio", { checked: true })
    selected.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await expect(new FormData(form).get("score")).toBe("2")
    await userEvent.click(canvas.getByRole("button", { name: "Restore original score" }))
    await waitFor(() => expect(new FormData(form).get("score")).toBe("3"))
    canvas.getByRole("radio", { checked: true }).focus()
    await userEvent.keyboard("{ArrowLeft}")
    form.reset()
    await waitFor(() => expect(new FormData(form).get("score")).toBe("3"))
    await expect(canvas.getByRole("radio", { checked: true })).toHaveAttribute("tabindex", "0")
    await expect(canvas.getByText("Score changes: 5")).toBeVisible()
  },
}
