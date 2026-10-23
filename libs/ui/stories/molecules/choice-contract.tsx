import { type ReactNode, useId, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { RadioCard } from "../../src/molecules/radio-card"
import { RadioGroup } from "../../src/molecules/radio-group"
import { Switch } from "../../src/molecules/switch"

type ChoiceKind = "checkbox" | "switch" | "radio-group" | "radio-card"

function RadioChoiceContent({
  kind,
  children,
}: {
  kind: "radio-group" | "radio-card"
  children: ReactNode
}) {
  if (kind === "radio-card") {
    return (
      <RadioCard.ItemControl>
        <RadioCard.ItemContent>
          <RadioCard.ItemText>{children}</RadioCard.ItemText>
        </RadioCard.ItemContent>
        <RadioCard.ItemIndicator />
      </RadioCard.ItemControl>
    )
  }
  return (
    <>
      <RadioGroup.ItemControl />
      <RadioGroup.ItemContent>
        <RadioGroup.ItemText>{children}</RadioGroup.ItemText>
      </RadioGroup.ItemContent>
    </>
  )
}

function RadioChoices({
  kind,
  children,
  ...props
}: {
  kind: "radio-group" | "radio-card"
  children?: ReactNode
  name: string
  value?: string | null
  defaultValue?: string
  form?: string
  onValueChange?: (value: string | null) => void
}) {
  const C = kind === "radio-card" ? RadioCard : RadioGroup
  const items = ["a", "b", "c"].map((value) => (
    <C.Item key={value} value={value}>
      <C.ItemHiddenInput />
      <RadioChoiceContent kind={kind}>
        Delivery {value.toUpperCase()}
      </RadioChoiceContent>
    </C.Item>
  ))
  return (
    <C {...props}>
      <C.Label>Delivery method</C.Label>
      {kind === "radio-group" ? (
        <RadioGroup.ItemGroup>{items}</RadioGroup.ItemGroup>
      ) : (
        items
      )}
      {children}
    </C>
  )
}

export function ChoiceContract({ kind }: { kind: ChoiceKind }) {
  const owner = useId()
  const [accepted, setAccepted] = useState(false)
  const [revision, setRevision] = useState(0)
  const [proposals, setProposals] = useState(0)
  const radio = kind === "radio-group" || kind === "radio-card"
  const BooleanChoice = kind === "switch" ? Switch : FormCheckbox
  return (
    <div className="flex w-full max-w-md flex-col gap-250">
      <form
        aria-label="Controlled choice"
        onSubmit={(event) => event.preventDefault()}
      >
        {radio ? (
          <RadioChoices
            kind={kind}
            name="choice"
            onValueChange={() => setProposals((value) => value + 1)}
            value={accepted ? "c" : "a"}
          />
        ) : (
          <BooleanChoice
            checked={accepted}
            name="choice"
            onCheckedChange={() => setProposals((value) => value + 1)}
            required
          >
            Send delivery updates
          </BooleanChoice>
        )}
        <p className="text-fg-secondary text-sm">
          Proposals: {proposals}; refresh: {revision}
        </p>
        <div className="flex flex-wrap gap-150">
          <Button
            onClick={() => setRevision((value) => value + 1)}
            variant="secondary"
          >
            Refresh without accepting
          </Button>
          <Button
            onClick={() => setAccepted((value) => !value)}
            variant="secondary"
          >
            Update saved value
          </Button>
        </div>
      </form>
      <form
        aria-label="Reset choice"
        id={owner}
        onSubmit={(event) => event.preventDefault()}
      >
        {!radio && (
          <>
            <BooleanChoice defaultChecked name="initially-on">
              Receive order updates
            </BooleanChoice>
            <BooleanChoice name="initially-off">
              Receive product updates
            </BooleanChoice>
          </>
        )}
        <Button type="reset" variant="secondary">
          Restore defaults
        </Button>
      </form>
      {radio && (
        <RadioChoices defaultValue="a" form={owner} kind={kind} name="choice" />
      )}
    </div>
  )
}

export async function checkChoiceContract(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const form = canvas.getByRole("form", {
    name: "Controlled choice",
  }) as HTMLFormElement
  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("input"))
  const radio = inputs[0]?.type === "radio"
  const target = inputs[radio ? 1 : 0]
  if (!target) {
    throw new Error("Missing choice contract target")
  }
  const initial = radio ? "a" : null
  const check = (value: FormDataEntryValue | null) => {
    expect(new FormData(form).get("choice")).toBe(value)
    expect(inputs[0]?.checked).toBe(value === initial ? radio : !radio)
    if (radio) {
      expect(inputs[1]?.checked).toBe(false)
    } else {
      expect(inputs[0]?.validity.valueMissing).toBe(value === null)
    }
  }
  await userEvent.click(target)
  check(initial)
  target.focus()
  await userEvent.keyboard(" ")
  check(initial)
  if (radio) {
    inputs[0]?.focus()
    await userEvent.keyboard("{ArrowDown}")
    check(initial)
  }
  await userEvent.click(
    canvas.getByRole("button", { name: "Refresh without accepting" })
  )
  check(initial)
  await userEvent.click(
    canvas.getByRole("button", { name: "Update saved value" })
  )
  await waitFor(() =>
    expect(new FormData(form).get("choice")).toBe(radio ? "c" : "on")
  )
  await userEvent.click(radio ? target : (inputs[0] as HTMLInputElement))
  await expect(new FormData(form).get("choice")).toBe(radio ? "c" : "on")

  const resetForm = canvas.getByRole("form", {
    name: "Reset choice",
  }) as HTMLFormElement
  const resetInputs = Array.from(resetForm.elements).filter(
    (el): el is HTMLInputElement => el instanceof HTMLInputElement
  )
  const changeResetValues = async () => {
    if (radio) {
      await userEvent.click(resetInputs[2] as HTMLInputElement)
    } else {
      for (const input of resetInputs) {
        await userEvent.click(input)
      }
    }
  }
  const checkReset = () => {
    expect(new FormData(resetForm).get(radio ? "choice" : "initially-on")).toBe(
      radio ? "a" : "on"
    )
    expect(new FormData(resetForm).has("initially-off")).toBe(false)
    expect(resetInputs[0]?.checked).toBe(true)
  }
  await changeResetValues()
  // An imperative reset outside a React handler exercises Zag's former timing bug.
  await new Promise<void>((resolve) =>
    setTimeout(() => {
      resetForm.reset()
      resolve()
    }, 0)
  )
  await waitFor(checkReset)
  await changeResetValues()
  await userEvent.click(
    canvas.getByRole("button", { name: "Restore defaults" })
  )
  await waitFor(checkReset)
  await changeResetValues()
  const beforeCanceledReset = new FormData(resetForm).get(
    radio ? "choice" : "initially-on"
  )
  resetForm.addEventListener("reset", (event) => event.preventDefault(), {
    once: true,
  })
  resetForm.reset()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await expect(
    new FormData(resetForm).get(radio ? "choice" : "initially-on")
  ).toBe(beforeCanceledReset)
}

export function DynamicRadioChoices({
  kind,
}: {
  kind: "radio-group" | "radio-card"
}) {
  const [options, setOptions] = useState(["a", "b", "c"])
  const [removeOnFocus, setRemoveOnFocus] = useState(false)
  const C = kind === "radio-card" ? RadioCard : RadioGroup
  const items = options.map((value) => (
    <C.Item key={value} value={value}>
      <C.ItemHiddenInput
        onFocus={() => {
          // Remove B once it actually has focus. A timer can expire before
          // the play focuses B when the browser is under CPU load.
          if (removeOnFocus && value === "b") {
            setOptions(["a", "c"])
          }
        }}
      />
      <RadioChoiceContent kind={kind}>
        Delivery {value.toUpperCase()}
      </RadioChoiceContent>
    </C.Item>
  ))
  return (
    <div className="flex flex-col gap-200">
      <C name="dynamic-choice" value="a">
        <C.Label>Available delivery methods</C.Label>
        {kind === "radio-group" ? (
          <RadioGroup.ItemGroup>{items}</RadioGroup.ItemGroup>
        ) : (
          items
        )}
      </C>
      <Button onClick={() => setRemoveOnFocus(true)} variant="secondary">
        Remove delivery B after focus moves
      </Button>
      <Button variant="secondary">Continue</Button>
    </div>
  )
}

export async function checkDynamicRadioChoices(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  await userEvent.click(
    canvas.getByRole("button", { name: "Remove delivery B after focus moves" })
  )
  const b = canvas.getByRole("radio", { name: "Delivery B" })
  b.focus()
  await waitFor(() =>
    expect(
      canvas.queryByRole("radio", { name: "Delivery B" })
    ).not.toBeInTheDocument()
  )
  await expect(canvas.getByRole("radio", { name: "Delivery C" })).toHaveFocus()
  await expect(canvas.getByRole("radio", { name: "Delivery A" })).toBeChecked()
  await userEvent.tab()
  await expect(
    canvas.getByRole("button", { name: "Remove delivery B after focus moves" })
  ).toHaveFocus()
}
