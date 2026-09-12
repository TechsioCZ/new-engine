import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Image } from "../../src/atoms/image"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { FormInput } from "../../src/molecules/form-input"
import { PhoneInput } from "../../src/molecules/phone-input"
import { RadioCard } from "../../src/molecules/radio-card"
import { SearchForm } from "../../src/molecules/search-form"
import { Steps } from "../../src/molecules/steps"
import { Toaster, useToast } from "../../src/molecules/toast"
import { SelectTemplate } from "../../src/templates/select"
import { storefrontProducts } from "./data"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  title: "Pages/Storefront/Checkout",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "A focused-task layout with a persistent order summary: the steps carry the",
          "flow, the summary never leaves the screen.",
          "",
          "**Pattern rules**",
          "- No site navigation. Every link that is not “continue”, “back” or “edit” is a",
          "  way to lose the order.",
          "- The summary is sticky on desktop and collapses above the form on narrow",
          "  screens — the total must be visible at the moment the shopper commits.",
          "- One step = one decision set. Address, delivery, payment, review, in that",
          "  order, because each one narrows the next.",
          "- Completed steps stay clickable so a shopper can correct an address without",
          "  restarting; `linear` keeps them from skipping ahead of validation.",
          "- The final action names the outcome (“Pay 157 €”), never “Submit”.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const checkoutSteps = [
  { title: "Address", description: "Where it ships" },
  { title: "Delivery", description: "How fast" },
  { title: "Payment", description: "How you pay" },
  { title: "Review", description: "Confirm" },
]

const countryItems = [
  { label: "Czechia", value: "CZ" },
  { label: "Slovakia", value: "SK" },
  { label: "Germany", value: "DE" },
  { label: "Austria", value: "AT" },
]

const cartLines = storefrontProducts.slice(0, 3)

function OrderSummary() {
  return (
    <aside
      aria-label="Order summary"
      className="flex flex-col gap-200 rounded-lg border border-border-primary bg-surface p-250 lg:sticky lg:top-250"
    >
      <div className="flex items-center justify-between gap-150">
        <h2 className="font-semibold text-md">Order summary</h2>
        <Badge size="sm" variant="outline">
          {`${cartLines.length} items`}
        </Badge>
      </div>

      <ul className="flex flex-col gap-150">
        {cartLines.map((line) => (
          <li className="flex items-center gap-150" key={line.id}>
            <Image
              alt={line.name}
              className="size-icon-control-lg rounded-md object-cover"
              size="custom"
              src={line.image}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-50">
              <span className="truncate text-sm">{line.name}</span>
              <span className="text-fg-secondary text-xs">
                {line.brand} · 1 pc
              </span>
            </span>
            <span className="text-sm">{line.price}</span>
          </li>
        ))}
      </ul>

      <SearchForm size="sm">
        <SearchForm.Control>
          <SearchForm.Input aria-label="Discount code" placeholder="Discount code" />
          <SearchForm.Button>Apply</SearchForm.Button>
        </SearchForm.Control>
      </SearchForm>

      <dl className="flex flex-col gap-100">
        <div className="flex items-center justify-between gap-150">
          <dt className="text-fg-secondary text-sm">Subtotal</dt>
          <dd className="text-sm">357 €</dd>
        </div>
        <div className="flex items-center justify-between gap-150">
          <dt className="text-fg-secondary text-sm">Delivery</dt>
          <dd className="text-sm">Free</dd>
        </div>
        <div className="flex items-center justify-between gap-150">
          <dt className="text-fg-secondary text-sm">Discount</dt>
          <dd className="text-sm">−200 €</dd>
        </div>
        <div className="flex items-center justify-between gap-150 border-border-primary border-t pt-100">
          <dt className="font-semibold text-sm">Total</dt>
          <dd className="font-semibold text-md">157 €</dd>
        </div>
      </dl>

      <p className="flex items-center gap-100 text-fg-secondary text-xs">
        <Icon icon="icon-[mdi--lock-outline]" size="sm" />
        Payment is encrypted end to end.
      </p>
    </aside>
  )
}

function CheckoutPage({ initialStep = 0 }: { initialStep?: number }) {
  const toaster = useToast()
  const [step, setStep] = useState(initialStep)

  return (
    <div className="flex min-h-screen flex-col bg-base text-fg-primary">
      <Toaster />

      <header className="flex items-center gap-200 border-border-primary border-b bg-base p-150">
        <span className="flex items-center gap-150 font-semibold">
          <Icon icon="icon-[mdi--hexagon-multiple-outline]" size="md" />
          Northwind
        </span>
        <span className="ms-auto flex items-center gap-100 text-fg-secondary text-sm">
          <Icon icon="icon-[mdi--lock-outline]" size="sm" />
          Secure checkout
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-350 p-250 lg:grid-cols-3">
        <div className="flex flex-col gap-250 lg:col-span-2">
          <Steps
            count={checkoutSteps.length}
            linear
            onStepChange={(details) => setStep(details.step)}
            step={step}
            variant="solid"
          >
            <Steps.List>
              {checkoutSteps.map((entry, index) => (
                <Steps.Item index={index} key={entry.title}>
                  <Steps.Trigger>
                    <Steps.Indicator />
                    <Steps.ItemText>
                      <Steps.Title>{entry.title}</Steps.Title>
                      <Steps.Description>{entry.description}</Steps.Description>
                    </Steps.ItemText>
                  </Steps.Trigger>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>

            <Steps.Panels>
              <Steps.Content index={0}>
                <div className="flex flex-col gap-200 py-250">
                  <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
                    <FormInput id="co-first" label="First name" required />
                    <FormInput id="co-last" label="Surname" required />
                  </div>
                  <FormInput id="co-street" label="Street and number" required />
                  <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
                    <FormInput id="co-city" label="City" required />
                    <FormInput id="co-zip" label="Postcode" required />
                  </div>
                  <SelectTemplate
                    defaultValue={["CZ"]}
                    items={countryItems}
                    label="Country"
                  />
                  <PhoneInput defaultCountry="CZ" id="co-phone" name="phone">
                    <PhoneInput.Label>Phone</PhoneInput.Label>
                    <PhoneInput.Control>
                      <PhoneInput.CountryPicker />
                      <PhoneInput.Input placeholder="900 123 456" />
                    </PhoneInput.Control>
                    <PhoneInput.StatusText>
                      Used only for delivery notifications.
                    </PhoneInput.StatusText>
                  </PhoneInput>
                  <FormCheckbox
                    defaultChecked
                    label="Billing address is the same"
                  />
                </div>
              </Steps.Content>

              <Steps.Content index={1}>
                <div className="py-250">
                  <RadioCard defaultValue="standard" name="shipping" variant="outline">
                    <RadioCard.Label>Delivery method</RadioCard.Label>
                    <RadioCard.Item value="standard">
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl>
                        <RadioCard.ItemContent>
                          <RadioCard.ItemText>Standard — free</RadioCard.ItemText>
                          <RadioCard.ItemDescription>
                            Tue 16 – Thu 18 September
                          </RadioCard.ItemDescription>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                    <RadioCard.Item value="express">
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl>
                        <RadioCard.ItemContent>
                          <RadioCard.ItemText>Express — 9 €</RadioCard.ItemText>
                          <RadioCard.ItemDescription>
                            Tomorrow before 12:00
                          </RadioCard.ItemDescription>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                    <RadioCard.Item value="pickup">
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl>
                        <RadioCard.ItemContent>
                          <RadioCard.ItemText>Collect in store — free</RadioCard.ItemText>
                          <RadioCard.ItemDescription>
                            Prague · Wenceslas Square · ready in 2 hours
                          </RadioCard.ItemDescription>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                  </RadioCard>
                </div>
              </Steps.Content>

              <Steps.Content index={2}>
                <div className="flex flex-col gap-200 py-250">
                  <RadioCard defaultValue="card" name="payment" variant="outline">
                    <RadioCard.Label>Payment method</RadioCard.Label>
                    <RadioCard.Item value="card">
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl>
                        <RadioCard.ItemContent>
                          <RadioCard.ItemText>Card</RadioCard.ItemText>
                          <RadioCard.ItemDescription>
                            Visa, Mastercard, Apple Pay
                          </RadioCard.ItemDescription>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                    <RadioCard.Item value="transfer">
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl>
                        <RadioCard.ItemContent>
                          <RadioCard.ItemText>Bank transfer</RadioCard.ItemText>
                          <RadioCard.ItemDescription>
                            Ships once the payment clears
                          </RadioCard.ItemDescription>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                  </RadioCard>
                  <FormInput
                    helpText="16 digits, no spaces."
                    id="co-card"
                    label="Card number"
                    required
                  />
                  <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
                    <FormInput id="co-exp" label="Expiry" placeholder="MM/YY" required />
                    <FormInput id="co-cvc" label="CVC" required />
                  </div>
                </div>
              </Steps.Content>

              <Steps.Content index={3}>
                <div className="flex flex-col gap-200 py-250">
                  <div className="flex flex-col gap-150 rounded-md border border-border-primary p-200">
                    <div className="flex items-start justify-between gap-150">
                      <div className="flex flex-col gap-50">
                        <span className="font-medium text-sm">Delivery address</span>
                        <span className="text-fg-secondary text-sm">
                          Marta Nováková · Vinohradská 12, 120 00 Praha, CZ
                        </span>
                      </div>
                      <Button
                        onClick={() => setStep(0)}
                        size="sm"
                        theme="borderless"
                        variant="secondary"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-start justify-between gap-150">
                      <div className="flex flex-col gap-50">
                        <span className="font-medium text-sm">Delivery</span>
                        <span className="text-fg-secondary text-sm">
                          Standard — free · Tue 16 – Thu 18 September
                        </span>
                      </div>
                      <Button
                        onClick={() => setStep(1)}
                        size="sm"
                        theme="borderless"
                        variant="secondary"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-start justify-between gap-150">
                      <div className="flex flex-col gap-50">
                        <span className="font-medium text-sm">Payment</span>
                        <span className="text-fg-secondary text-sm">
                          Card ending 4242
                        </span>
                      </div>
                      <Button
                        onClick={() => setStep(2)}
                        size="sm"
                        theme="borderless"
                        variant="secondary"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                  <FormCheckbox
                    label="I agree to the terms of sale and the returns policy"
                    required
                  />
                </div>
              </Steps.Content>
            </Steps.Panels>

            <div className="flex items-center justify-between gap-150">
              <Button
                disabled={step === 0}
                icon="icon-[mdi--arrow-left]"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                theme="borderless"
                variant="secondary"
              >
                Back
              </Button>
              {step === checkoutSteps.length - 1 ? (
                <Button
                  icon="icon-[mdi--lock-outline]"
                  onClick={() =>
                    toaster.create({
                      type: "success",
                      title: "Order placed",
                      description: "Confirmation sent to marta.n@example.com",
                    })
                  }
                  variant="primary"
                >
                  Pay 157 €
                </Button>
              ) : (
                <Button
                  icon="icon-[mdi--arrow-right]"
                  iconPosition="right"
                  onClick={() =>
                    setStep((current) =>
                      Math.min(checkoutSteps.length - 1, current + 1)
                    )
                  }
                  variant="primary"
                >
                  Continue
                </Button>
              )}
            </div>
          </Steps>
        </div>

        <OrderSummary />
      </main>
    </div>
  )
}

export const AddressStep: Story = {
  name: "Step 1 · Address",
  render: () => <CheckoutPage />,
}

export const ReviewStep: Story = {
  name: "Step 4 · Review",
  parameters: {
    docs: {
      description: {
        story:
          "The last step restates every decision with an `Edit` link back to its own step, and the action names the amount being charged.",
      },
    },
  },
  render: () => <CheckoutPage initialStep={3} />,
}
