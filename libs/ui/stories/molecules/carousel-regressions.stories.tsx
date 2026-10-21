import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { Input } from "../../src/atoms/input"
import { Textarea } from "../../src/atoms/textarea"
import { StatusText } from "../../src/atoms/status-text"
import { Carousel } from "../../src/molecules/carousel"

function CollectionExample({
  dir = "ltr",
  slidesPerPage = 1,
  showControls = true,
}: {
  dir?: "ltr" | "rtl"
  slidesPerPage?: number
  showControls?: boolean
}) {
  const [generation, setGeneration] = useState(0)
  const [count, setCount] = useState(4)
  const [page, setPage] = useState(0)
  const [message, setMessage] = useState(
    "Slide actions update this local preview only."
  )
  const slides = Array.from({ length: count }, (_, index) => ({
    id: `${generation}-${index}`,
    content: (
      <div className="flex w-full min-w-0 flex-col gap-200 p-200">
        <Button
          variant="secondary"
          onClick={() => setMessage(`Opened slide ${index + 1} locally.`)}
        >
          Open slide {index + 1}
        </Button>
        <Input
          aria-label={`Caption ${index + 1}`}
          defaultValue="Editable caption"
          size="sm"
        />
        <Textarea
          aria-label={`Notes ${index + 1}`}
          defaultValue="Editable notes"
          size="sm"
        />
        <div
          role="textbox"
          tabIndex={0}
          contentEditable
          suppressContentEditableWarning
          aria-label={`Rich caption ${index + 1}`}
        >
          <span>Editable rich caption</span>
        </div>
        <Input
          aria-label={`Rating ${index + 1}`}
          type="number"
          defaultValue="2"
          min={1}
          max={5}
          size="sm"
        />
      </div>
    ),
  }))
  return (
    <div
      className="flex w-full max-w-lg flex-col gap-200"
      data-testid="collection-example"
      data-page={page}
    >
      <div className="flex flex-wrap gap-200">
        <Button
          variant="secondary"
          onClick={() => setGeneration(generation + 1)}
        >
          Replace all slide IDs
        </Button>
        <Button variant="secondary" onClick={() => setPage(3)}>
          Select last page
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setGeneration(generation + 1)
            setCount(2)
          }}
        >
          Replace with two slides
        </Button>
        <Button variant="secondary" onClick={() => setPage(page === 0 ? 1 : 0)}>
          Change page externally
        </Button>
      </div>
      <StatusText role="status">{message}</StatusText>
      <Carousel
        aria-label="Editable collection"
        objectFit="none"
        size="full"
        aspectRatio="none"
        dir={dir}
        page={page}
        onPageChange={(details) => setPage(details.page)}
        slideCount={count}
        slidesPerPage={slidesPerPage}
        loop={false}
      >
        <Carousel.Slides slides={slides} />
        {showControls && (
          <Carousel.Control controlPosition="unset">
            <Carousel.Previous />
            <Carousel.Indicators />
            <Carousel.Next />
          </Carousel.Control>
        )}
      </Carousel>
    </div>
  )
}

const meta: Meta<typeof Carousel> = {
  title: "Molecules/Carousel/Interaction contracts",
  component: Carousel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Interactive carousel compositions for editable captions, collection replacement and focus continuity. Use Carousel for optional slide content and Gallery for a product photo viewer.",
      },
    },
  },
}
export default meta
type Story = StoryObj<typeof Carousel>

export const Playground: Story = {
  render: () => <CollectionExample />,
  parameters: {
    docs: {
      description: {
        story:
          "Edit slide content without navigation keys escaping into the carousel, replace keyed content, and keep focus in the viewport when a focused slide leaves view.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const example = canvas.getByTestId("collection-example")
    const caption = await canvas.findByRole("textbox", { name: "Caption 1" })
    await userEvent.click(caption)
    await userEvent.keyboard("{Home}{ArrowRight}")
    await expect(caption).toHaveFocus()
    await expect((caption as HTMLInputElement).selectionStart).toBe(1)
    await expect(example).toHaveAttribute("data-page", "0")
    const notes = canvas.getByRole("textbox", { name: "Notes 1" })
    await userEvent.click(notes)
    await userEvent.keyboard("{End}{Home}{ArrowRight}")
    await expect(notes).toHaveFocus()
    await expect(example).toHaveAttribute("data-page", "0")
    const rich = canvas.getByRole("textbox", { name: "Rich caption 1" })
    await userEvent.click(rich)
    // user-event cannot model contenteditable Home/End; dispatch checks cancellation here,
    // while shared-browser native keyboard checks verify the actual caret behavior.
    for (const key of ["Home", "ArrowRight"]) {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      })
      rich.dispatchEvent(event)
      await expect(event.defaultPrevented).toBe(false)
    }
    await expect(rich).toHaveFocus()
    await expect(example).toHaveAttribute("data-page", "0")
    const rating = canvas.getByRole("spinbutton", { name: "Rating 1" })
    await userEvent.click(rating)
    await userEvent.keyboard("{ArrowUp}")
    await expect(rating).toHaveFocus()
    await expect(example).toHaveAttribute("data-page", "0")
    canvas.getByRole("button", { name: "Open slide 1" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    const group = canvasElement.querySelector('[data-part="item-group"]')
    await waitFor(() => expect(group).toHaveFocus())
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(example).toHaveAttribute("data-page", "2"))
    await userEvent.click(
      canvas.getByRole("button", { name: "Replace all slide IDs" })
    )
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Caption 3" })).toBeVisible()
    )
    const replacement = canvas.getByRole("textbox", { name: "Caption 3" })
    replacement.focus()
    await expect(replacement).toHaveFocus()
    await userEvent.click(
      canvas.getByRole("button", { name: "Select last page" })
    )
    await waitFor(() => expect(example).toHaveAttribute("data-page", "3"))
    await userEvent.click(
      canvas.getByRole("button", { name: "Replace with two slides" })
    )
    await waitFor(() => expect(example).toHaveAttribute("data-page", "1"))
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Caption 2" })).toBeVisible()
    )
    await expect(
      canvas.queryByRole("textbox", { name: "Caption 1" })
    ).not.toBeInTheDocument()
    canvas.getByRole("textbox", { name: "Caption 2" }).focus()
    await expect(
      canvas.getByRole("textbox", { name: "Caption 2" })
    ).toHaveFocus()
  },
}

export const MultipleVisibleSlides: Story = {
  render: () => <CollectionExample slidesPerPage={2} />,
  parameters: {
    docs: {
      description: {
        story:
          "Two visible slides remain available to assistive technology after same-count ID replacement; hidden pages keep their editing controls inert.",
      },
    },
  },
}
export const ControlFreeRtl: Story = {
  render: () => <CollectionExample dir="rtl" showControls={false} />,
  parameters: {
    docs: {
      description: {
        story:
          "Without navigation controls, the stable viewport receives focus from an outgoing slide and keeps RTL arrow navigation available; external page changes follow the same policy.",
      },
    },
  },
}

export const IndependentCollections: Story = {
  render: () => (
    <div className="flex flex-col gap-400">
      <CollectionExample />
      <CollectionExample />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Each carousel owns only the keyboard events in its own viewport, so editing or navigating one collection does not move the other.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const examples = within(canvasElement).getAllByTestId("collection-example")
    const first = within(examples[0]!)
    await waitFor(() =>
      expect(first.getByRole("button", { name: "Open slide 1" })).toBeVisible()
    )
    first.getByRole("button", { name: "Open slide 1" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(examples[0]).toHaveAttribute("data-page", "1"))
    await expect(examples[1]).toHaveAttribute("data-page", "0")
  },
}
