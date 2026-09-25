import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Icon } from "../../../src/atoms/icon"
import { Image } from "../../../src/atoms/image"
import { FileUpload } from "../../../src/molecules/file-upload"
import { FormInput } from "../../../src/molecules/form-input"
import { Switch } from "../../../src/molecules/switch"
import { Toaster, useToast } from "../../../src/molecules/toast"
import { CarouselTemplate } from "../../../src/templates/carousel"
import { PageHeader, SectionCard } from "../shell"
import { type BannerSlide, bannerSlides } from "./data"
import { AkrosShell, akrosDocs } from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Main banner",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Marketing / banners**: Akros uses the marketing module",
          "practically only for the main banner, so the admin offers simple management",
          "of that one banner — nothing more.",
          "",
          "**How it is built** — `CarouselTemplate` (live preview), `Image`,",
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

function ImageDrop({ label, hint }: { label: string; hint: string }) {
  return (
    <FileUpload accept="image/*" maxFiles={1}>
      <FileUpload.Label>{label}</FileUpload.Label>
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone>
        <span className="flex flex-col items-center gap-100 text-center">
          <Icon icon="icon-[mdi--image-plus-outline]" size="lg" />
          <span className="text-fg-secondary text-xs">{hint}</span>
        </span>
      </FileUpload.Dropzone>
    </FileUpload>
  )
}

function BannerPage() {
  const toaster = useToast()
  const [slides, setSlides] = useState(bannerSlides)
  const [selectedId, setSelectedId] = useState(bannerSlides[0]?.id ?? "")
  const selected = slides.find((slide) => slide.id === selectedId)
  const liveSlides = slides.filter((slide) => slideStatus(slide)[1] === "Live")

  const update = (patch: Partial<BannerSlide>) =>
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
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Add slide
            </Button>
            <Button
              icon="icon-[mdi--content-save-outline]"
              onClick={() =>
                toaster.create({
                  type: "success",
                  title: "Banner published",
                  description: `${liveSlides.length} slides live on the home page.`,
                })
              }
              size="sm"
              variant="primary"
            >
              Publish
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

      <SectionCard
        description={`What shoppers see today — ${liveSlides.length} of ${slides.length} slides are live.`}
        title="Preview"
      >
        {liveSlides.length > 0 ? (
          <CarouselTemplate
            aspectRatio="wide"
            objectFit="cover"
            showAutoplay
            size="full"
            slides={liveSlides.map((slide) => ({
              id: slide.id,
              src: slide.image,
              alt: slide.title,
            }))}
          />
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
                hint="1920 × 640 px, JPG or WebP"
                label="Desktop image"
              />
              <ImageDrop
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
  name: "Main banner",
  render: () => <BannerPage />,
}
