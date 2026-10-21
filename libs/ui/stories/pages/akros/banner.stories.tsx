import { expect, userEvent, waitFor, within } from "storybook/test"
import { DemoBoundary } from "../demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Icon } from "../../../src/atoms/icon"
import { StatusText } from "../../../src/atoms/status-text"
import { Image } from "../../../src/atoms/image"
import { FileUpload } from "../../../src/molecules/file-upload"
import { FormInput } from "../../../src/molecules/form-input"
import { Switch } from "../../../src/molecules/switch"
import { Toaster, useToast } from "../../../src/molecules/toast"
import { PageHeader, SectionCard } from "../shell"
import { type BannerSlide, bannerSlides } from "./data"
import { AkrosShell, akrosDocs } from "./shared"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],

  tags: ["autodocs"],
  title: "Pages/Akros admin/Main banner",
  parameters: {
    brandLock: "akros",
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Marketing / banners**: Akros uses the marketing module",
          "practically only for the main banner, so the admin offers simple management",
          "of that one banner — nothing more.",
          "",
          "**How it is built** — a responsive image preview, `Image`,",
          "`FormInput`, `FileUpload`, `Switch`, `Button`, `Toast`.",
          "",
          "**Pattern rules**",
          "- One screen, one job: the slides on the left in their display order, the",
          "  selected slide's fields on the right, the storefront preview on top.",
          "- A slide is live only inside its date range *and* with the switch on; the",
          "  badge states which of the two keeps it off.",
          "- Order is changed with explicit up / down buttons — keyboard-accessible,",
          "  no drag-and-drop required.",
          "- Desktop and mobile images are separate uploads, because a wide banner",
          "  cropped to a phone loses its text.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const today = "2026-09-14"

function slideStatus(
  slide: BannerSlide
): ["success" | "warning" | "outline", string] {
  if (!slide.live) {
    return ["outline", "Off"]
  }
  if (slide.from > today) {
    return ["warning", `Starts ${slide.from}`]
  }
  if (slide.to < today) {
    return ["outline", "Ended"]
  }
  return ["success", "Live"]
}

type DraftSlide = BannerSlide & { mobileImage?: string }

// A banner stores the committed image, not a queue of upload files.
function ResetImageSelection({
  files,
  clearFiles,
}: {
  files: File[]
  clearFiles: () => void
}) {
  useEffect(() => {
    if (files.length > 0) clearFiles()
  }, [files, clearFiles])
  return null
}

function ImageDrop({
  label,
  hint,
  onImage,
}: {
  label: string
  hint: string
  onImage: (image: string) => void
}) {
  const [error, setError] = useState("")
  const [imageName, setImageName] = useState("")
  return (
    <FileUpload
      accept="image/*"
      maxFiles={1}
      invalid={Boolean(error)}
      maxFileSize={5 * 1024 * 1024}
      onFileChange={({ acceptedFiles }) => {
        const file = acceptedFiles[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === "string") {
            onImage(reader.result)
            setImageName(file.name)
            setError("")
          }
        }
        reader.onerror = () =>
          setError("The image could not be read. Choose another file.")
        reader.readAsDataURL(file)
      }}
      onFileReject={({ files }) => {
        if (files.length > 0) setError("Choose an image smaller than 5 MB.")
      }}
    >
      <FileUpload.Context>
        {(api) => (
          <ResetImageSelection
            files={api.acceptedFiles}
            clearFiles={api.clearFiles}
          />
        )}
      </FileUpload.Context>
      <FileUpload.Label>{label}</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone>
        <span className="flex flex-col items-center gap-100 text-center">
          <Icon icon="icon-[mdi--image-plus-outline]" size="lg" />
          <span className="text-fg-secondary text-xs">{hint}</span>
        </span>
      </FileUpload.Dropzone>
      {imageName && (
        <StatusText role="status">
          {imageName} selected for this local preview.
        </StatusText>
      )}
      {error && (
        <FileUpload.StatusText status="error" role="alert">
          {error}
        </FileUpload.StatusText>
      )}
    </FileUpload>
  )
}

function BannerPage() {
  const toaster = useToast()
  const [slides, setSlides] = useState<DraftSlide[]>(bannerSlides)
  const [savedSlides, setSavedSlides] = useState<DraftSlide[]>(bannerSlides)
  const [savedRevision, setSavedRevision] = useState(0)
  const [attemptedSave, setAttemptedSave] = useState(false)
  const [selectedId, setSelectedId] = useState(bannerSlides[0]?.id ?? "")
  const selected = slides.find((slide) => slide.id === selectedId)
  const liveSlides = slides.filter((slide) => slideStatus(slide)[1] === "Live")

  const update = (patch: Partial<DraftSlide>) =>
    setSlides((current) =>
      current.map((slide) =>
        slide.id === selectedId ? { ...slide, ...patch } : slide
      )
    )

  const move = (index: number, direction: -1 | 1) =>
    setSlides((current) => {
      const next = [...current]
      const target = index + direction
      const [item] = next.splice(index, 1)
      if (item) {
        next.splice(target, 0, item)
      }
      return next
    })

  return (
    <AkrosShell expanded={["marketing"]} selected="banner">
      <Toaster />

      <PageHeader
        actions={
          <>
            <Button
              icon="icon-[mdi--plus]"
              onClick={() => {
                const id = crypto.randomUUID()
                const template = slides[0]
                if (!template) return
                setSlides((current) => [
                  ...current,
                  {
                    ...template,
                    id,
                    title: "New campaign",
                    subtitle: "Introduce your next collection.",
                    cta: "Explore collection",
                    live: false,
                  },
                ])
                setSelectedId(id)
              }}
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Add slide
            </Button>
            <Button
              icon="icon-[mdi--content-save-outline]"
              onClick={() => {
                setAttemptedSave(true)
                const invalid = slides.find((slide) => !slide.title.trim())
                if (invalid) {
                  setSelectedId(invalid.id)
                  requestAnimationFrame(() =>
                    document.getElementById("slide-title")?.focus()
                  )
                  return
                }
                setSavedSlides(slides.map((slide) => ({ ...slide })))
                setSavedRevision((revision) => revision + 1)
                toaster.create({
                  type: "success",
                  title: "Demo banner saved",
                  description: `${liveSlides.length} slides enabled in this local preview. No storefront was changed.`,
                })
              }}
              size="sm"
              variant="primary"
            >
              Save demo banner
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Marketing", href: "#" },
          { label: "Main banner" },
        ]}
        description="The rotating banner at the top of the home page."
        title="Main banner"
      />

      {savedRevision > 0 && (
        <StatusText role="status" status="success">
          Local banner revision {savedRevision}: {savedSlides.length} slides
          saved in this session. No storefront was changed.
        </StatusText>
      )}
      <SectionCard
        description={`Preview the selected draft, including scheduled and disabled slides. ${liveSlides.length} of ${slides.length} slides are live today.`}
        title="Selected slide preview"
      >
        {selected ? (
          <div className="overflow-hidden rounded-md border border-border-primary bg-surface">
            <picture className="block">
              {selected.mobileImage && (
                <source
                  media="(max-width: 639px)"
                  srcSet={selected.mobileImage}
                />
              )}
              <Image
                src={selected.image}
                alt=""
                className="aspect-video w-full object-cover"
              />
            </picture>
            <div className="flex flex-col items-start gap-150 p-250 text-fg-primary">
              <h2 className="font-semibold text-xl">{selected.title}</h2>
              <p>{selected.subtitle}</p>
              {selected.cta && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    toaster.create({
                      type: "info",
                      title: "Preview destination",
                      description: selected.link,
                    })
                  }
                >
                  {selected.cta}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="p-350 text-center text-fg-secondary text-sm">
            No slide is live today — the home page shows no banner.
          </p>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-2"
          description="Display order, top to bottom."
          title="Slides"
        >
          <ol className="flex flex-col gap-150">
            {slides.map((slide, index) => {
              const [variant, label] = slideStatus(slide)
              return (
                <li
                  className="flex items-center gap-150 rounded-md border border-border-primary p-100"
                  key={slide.id}
                >
                  <Button
                    aria-pressed={slide.id === selectedId}
                    className="flex min-w-0 flex-1 items-center gap-150 text-start"
                    onClick={() => setSelectedId(slide.id)}
                    size="current"
                    theme="unstyled"
                    variant="secondary"
                  >
                    <Image
                      alt=""
                      className="aspect-video w-3xs max-w-1/3 shrink-0 rounded-sm object-cover"
                      src={slide.image}
                    />
                    <span className="flex min-w-0 flex-col gap-50">
                      <span className="truncate font-medium text-sm">
                        {slide.title}
                      </span>
                      <span className="text-fg-secondary text-xs">
                        {slide.from} – {slide.to}
                      </span>
                    </span>
                  </Button>
                  <Badge size="sm" variant={variant}>
                    {label}
                  </Badge>
                  <span className="flex flex-col">
                    <Button
                      aria-label={`Move ${slide.title} up`}
                      disabled={index === 0}
                      icon="icon-[mdi--chevron-up]"
                      onClick={() => move(index, -1)}
                      size="sm"
                      theme="borderless"
                      variant="secondary"
                    />
                    <Button
                      aria-label={`Move ${slide.title} down`}
                      disabled={index === slides.length - 1}
                      icon="icon-[mdi--chevron-down]"
                      onClick={() => move(index, 1)}
                      size="sm"
                      theme="borderless"
                      variant="secondary"
                    />
                  </span>
                </li>
              )
            })}
          </ol>
        </SectionCard>

        {selected && (
          <SectionCard
            className="xl:col-span-3"
            description="Text sits on top of the image; keep the headline short."
            title="Edit slide"
          >
            <Switch
              checked={selected.live}
              helpText="Off keeps the slide saved but never shows it, whatever the dates."
              onCheckedChange={(checked) => update({ live: checked })}
            >
              Show this slide
            </Switch>
            <FormInput
              id="slide-title"
              label="Headline"
              validateStatus={
                attemptedSave && !selected.title.trim() ? "error" : "default"
              }
              helpText={
                attemptedSave && !selected.title.trim()
                  ? "Enter a headline before saving this banner."
                  : undefined
              }
              onChange={(event) => update({ title: event.target.value })}
              required
              value={selected.title}
            />
            <FormInput
              id="slide-subtitle"
              label="Subtitle"
              onChange={(event) => update({ subtitle: event.target.value })}
              value={selected.subtitle}
            />
            <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
              <FormInput
                id="slide-cta"
                label="Button text"
                onChange={(event) => update({ cta: event.target.value })}
                value={selected.cta}
              />
              <FormInput
                helpText="A page of the shop, e.g. /kategorie/…"
                id="slide-link"
                label="Link"
                onChange={(event) => update({ link: event.target.value })}
                value={selected.link}
              />
              <FormInput
                id="slide-from"
                label="Show from"
                onChange={(event) => update({ from: event.target.value })}
                type="date"
                value={selected.from}
              />
              <FormInput
                id="slide-to"
                label="Show until"
                onChange={(event) => update({ to: event.target.value })}
                type="date"
                value={selected.to}
              />
            </div>
            <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
              <ImageDrop
                key={`${selected.id}-desktop`}
                onImage={(image) => update({ image })}
                hint="1920 × 640 px, JPG or WebP"
                label="Desktop image"
              />
              <ImageDrop
                key={`${selected.id}-mobile`}
                onImage={(mobileImage) => update({ mobileImage })}
                hint="800 × 800 px, JPG or WebP"
                label="Mobile image"
              />
            </div>
          </SectionCard>
        )}
      </div>
    </AkrosShell>
  )
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const headline = canvas.getByLabelText("Headline", { exact: false })
    await userEvent.clear(headline)
    await userEvent.type(headline, "Winter workshop essentials")
    await expect(
      canvas.getByRole("heading", { name: "Winter workshop essentials" })
    ).toBeVisible()
    const count = canvasElement.querySelectorAll("ol > li").length
    await userEvent.click(canvas.getByRole("button", { name: "Add slide" }))
    await expect(canvasElement.querySelectorAll("ol > li")).toHaveLength(
      count + 1
    )
    await expect(headline).toHaveValue("New campaign")
    await userEvent.clear(headline)
    await userEvent.click(
      canvas.getByRole("button", { name: "Save demo banner" })
    )
    await expect(headline).toHaveAttribute("aria-invalid", "true")
    await expect(headline).toHaveAccessibleDescription(
      "Enter a headline before saving this banner."
    )
    await userEvent.type(headline, "New campaign")
    const upload =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!
    // Use the native FileList setter: userEvent.upload installs a synthetic
    // files getter that prevents subsequent real browser selections in the demo.
    const transfer = new DataTransfer()
    transfer.items.add(
      new File(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="currentColor"/></svg>',
        ],
        "campaign.svg",
        { type: "image/svg+xml" }
      )
    )
    upload.files = transfer.files
    upload.dispatchEvent(new Event("change", { bubbles: true }))
    await waitFor(() =>
      expect(
        canvasElement.querySelector("picture img")?.getAttribute("src")
      ).toMatch(/^data:image\/svg\+xml/)
    )
    await waitFor(() => expect(upload.files).toHaveLength(0))
    const replacement = new DataTransfer()
    const image =
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="currentColor"/></svg>'
    replacement.items.add(
      new File([image], "replacement.svg", { type: "image/svg+xml" })
    )
    upload.files = replacement.files
    upload.dispatchEvent(new Event("change", { bubbles: true }))
    await waitFor(() =>
      expect(
        canvasElement.querySelector("picture img")?.getAttribute("src")
      ).toBe(`data:image/svg+xml;base64,${btoa(image)}`)
    )
  },

  parameters: {
    docs: {
      description: {
        story:
          "Edit banner copy, add and reorder slides, and inspect the live local preview before saving.",
      },
    },
  },

  name: "Main banner",
  render: () => <BannerPage />,
}
