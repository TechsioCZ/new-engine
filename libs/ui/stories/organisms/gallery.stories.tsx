import type { Meta, StoryObj } from '@storybook/react'
import { type ReactNode } from 'react'
import { Badge } from '../../src/atoms/badge'
import { StatusText } from '../../src/atoms/status-text'
import { Gallery, type GalleryItem } from '../../src/organisms/gallery'
import { GalleryTemplate } from '../../src/templates/gallery'

const shoes1 = new URL('../../assets/gallery/shoes-1.avif', import.meta.url).href
const shoes2 = new URL('../../assets/gallery/shoes-2.avif', import.meta.url).href
const shoes3 = new URL('../../assets/gallery/shoes-3.avif', import.meta.url).href
const shoes4 = new URL('../../assets/gallery/shoes-4.avif', import.meta.url).href
const watch1 = new URL('../../assets/gallery/watch-1.avif', import.meta.url).href
const watch2 = new URL('../../assets/gallery/watch-2.avif', import.meta.url).href
const watch3 = new URL('../../assets/gallery/watch-3.avif', import.meta.url).href
const watch4 = new URL('../../assets/gallery/watch-4.avif', import.meta.url).href

const sneakerItems: GalleryItem[] = [
  {
    id: 'sneaker-1',
    src: shoes1,
    alt: 'Pastel sneaker hero shot',
  },
  {
    id: 'sneaker-2',
    src: shoes2,
    alt: 'Sneaker detail side profile',
  },
  {
    id: 'sneaker-3',
    src: shoes3,
    alt: 'Red sneaker product variant',
  },
  {
    id: 'sneaker-4',
    src: shoes4,
    alt: 'Sneaker lifestyle frame',
  },
]

const watchItems: GalleryItem[] = [
  {
    id: 'watch-1',
    src: watch1,
    alt: 'Watch front product shot',
  },
  {
    id: 'watch-2',
    src: watch2,
    alt: 'Watch on wrist',
  },
  {
    id: 'watch-3',
    src: watch3,
    alt: 'Macro watch close-up',
  },
  {
    id: 'watch-4',
    src: watch4,
    alt: 'Watch flatlay',
  },
]

const chakraItems: GalleryItem[] = [
  ...sneakerItems,
  ...watchItems,
  {
    id: 'chakra-9',
    src: shoes2,
    alt: 'Sneaker sole detail',
  },
  {
    id: 'chakra-10',
    src: shoes3,
    alt: 'Sneaker side detail',
  },
]

const overlayControlsClassName =
  'pointer-events-none absolute inset-x-100 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between bg-transparent p-0'
const overlayArrowClassName =
  'pointer-events-auto rounded-full border border-border-primary bg-base text-fg-primary shadow-sm hover:bg-overlay'

type StoryFrameProps = {
  children: ReactNode
  mobile?: boolean
}

function StoryFrame({ children, mobile = false }: StoryFrameProps) {
  return (
    <div className="w-full bg-base p-400">
      <div
        className={
          mobile
            ? 'mx-auto w-full max-w-sm'
            : 'mx-auto w-full max-w-lg'
        }
      >
        <div className="rounded-lg border border-border-primary bg-surface p-250">
          {children}
        </div>
      </div>
    </div>
  )
}

type StoryHeaderProps = {
  label: string
  title: string
  note: string
}

function StoryHeader({ label, title, note }: StoryHeaderProps) {
  return (
    <div className="mb-250 flex flex-col gap-100">
      <div className="flex flex-wrap items-center gap-100">
        <Badge variant="outline">{label}</Badge>
        <StatusText size="sm" status="default">
          {note}
        </StatusText>
      </div>
      <div className="text-md font-semibold text-fg-primary">{title}</div>
    </div>
  )
}

const meta = {
  title: 'Organisms/Gallery',
  component: GalleryTemplate,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    aspectRatio: {
      control: 'select',
      options: ['square', 'portrait', 'landscape', 'wide', 'none'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'full'],
    },
    objectFit: {
      control: 'select',
      options: ['cover', 'contain', 'fill', 'none'],
    },
    carouselWidth: {
      control: 'number',
    },
    carouselHeight: {
      control: 'number',
    },
    fitParent: {
      control: 'boolean',
    },
    thumbnailSize: {
      control: 'number',
    },
    showThumbnails: {
      control: 'boolean',
    },
    showControls: {
      control: 'boolean',
    },
    showIndicators: {
      control: 'boolean',
    },
    showAutoplay: {
      control: 'boolean',
    },
  },
  args: {
    items: sneakerItems,
    orientation: 'horizontal',
    aspectRatio: 'square',
    size: 'full',
    objectFit: 'cover',
    fitParent: true,
    thumbnailSize: 72,
    showThumbnails: true,
  },
} satisfies Meta<typeof GalleryTemplate>

export default meta

type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <StoryFrame>
      <GalleryTemplate
        {...args}
        mainClassName="overflow-hidden rounded-md border border-border-primary bg-base"
        thumbnailsClassName="rounded-md border border-border-primary bg-base px-100"
        thumbnailsListClassName="gap-100 py-100"
      />
    </StoryFrame>
  ),
}

export const SimpleHorizontal: Story = {
  render: () => (
    <StoryFrame>
      <StoryHeader
        label="Simple"
        note="Desktop default"
        title="Horizontal thumbnail rail under main image"
      />
      <GalleryTemplate
        items={sneakerItems}
        orientation="horizontal"
        aspectRatio="square"
        objectFit="cover"
        fitParent
        thumbnailSize={72}
        mainClassName="overflow-hidden rounded-md border border-border-primary bg-base"
        thumbnailsClassName="rounded-md border border-border-primary bg-base px-100"
        thumbnailsListClassName="gap-100 py-100"
      />
    </StoryFrame>
  ),
}

export const SimpleVertical: Story = {
  render: () => (
    <StoryFrame>
      <StoryHeader
        label="Simple"
        note="Thumb rail on side"
        title="Vertical rail for fast image scanning"
      />
      <Gallery
        items={watchItems}
        orientation="vertical"
        thumbnailSize={68}
        carouselProps={{
          aspectRatio: 'square',
          objectFit: 'cover',
          size: 'full',
          width: 384,
          height: 384,
        }}
      >
        <Gallery.Thumbnails
          className="rounded-md border border-border-primary bg-base p-100"
          listClassName="gap-100"
        />
        <Gallery.Main className="overflow-hidden rounded-md border border-border-primary bg-base">
          <Gallery.Carousel className="flex flex-row overflow-visible" orientation="vertical">
            <Gallery.Slides />
          </Gallery.Carousel>
        </Gallery.Main>
      </Gallery>
    </StoryFrame>
  ),
}

export const CompoundPattern: Story = {
  render: () => (
    <StoryFrame>
      <StoryHeader
        label="Compound"
        note="Custom thumbnail renderer"
        title="Custom active thumbnail chrome with unchanged gallery behavior"
      />
      <Gallery
        className="rounded-md bg-base"
        items={sneakerItems}
        orientation="vertical"
        thumbnailSize={74}
        carouselProps={{
          aspectRatio: 'square',
          objectFit: 'cover',
          size: 'full', 
        }}
      >
        <Gallery.Thumbnails
          listClassName="gap-100"
          renderThumbnail={({ defaultThumbnail, isActive, index }) => (
            <div
              className={
                isActive
                  ? 'relative rounded-sm border border-info p-50'
                  : 'relative rounded-sm border border-border-primary p-50'
              }
            >
              {defaultThumbnail}
              <Badge
                className="pointer-events-none absolute right-50 bottom-50"
                variant={isActive ? 'info' : 'outline'}
              >
                {String(index + 1)}
              </Badge>
            </div>
          )}
        />
        <Gallery.Main className="overflow-hidden rounded-md border border-border-primary bg-base">
          <Gallery.Carousel>
            <Gallery.Slides />
          </Gallery.Carousel>
        </Gallery.Main>
      </Gallery>
    </StoryFrame>
  ),
}

export const MobileSimple: Story = {
  render: () => (
    <StoryFrame mobile>
      <StoryHeader
        label="Mobile"
        note="Compact layout"
        title="Vertical gallery tuned for mobile product card"
      />
      <GalleryTemplate
        items={sneakerItems}
        orientation="vertical"
        aspectRatio="square"
        objectFit="cover"
        fitParent
        thumbnailSize={60}
        mainClassName="overflow-hidden rounded-md border border-border-primary bg-base"
        thumbnailsClassName="rounded-md border border-border-primary bg-base p-100"
        thumbnailsListClassName="gap-100"
      />
    </StoryFrame>
  ),
}

export const VerticalWithArrows: Story = {
  render: () => (
    <StoryFrame>
      <StoryHeader
        label="Chakra style"
        note="Vertical rail"
        title="Classic product gallery with side thumbnails"
      />
      <GalleryTemplate
        items={chakraItems}
        orientation="vertical"
        aspectRatio="square"
        objectFit="cover"
        fitParent
        thumbnailSize={64}
        showControls
        controlsClassName={overlayControlsClassName}
        previousTriggerClassName={overlayArrowClassName}
        nextTriggerClassName={overlayArrowClassName}
        mainClassName="overflow-hidden rounded-md border border-border-primary bg-base"
        thumbnailsClassName="rounded-md border border-border-primary bg-base p-100"
        thumbnailsListClassName="gap-100"
      />
    </StoryFrame>
  ),
}

export const HorizontalWithArrows: Story = {
  render: () => (
    <StoryFrame>
      <StoryHeader
        label="Chakra style"
        note="Horizontal rail"
        title="Focus-first gallery with highlighted active thumbnail"
      />
      <GalleryTemplate
        items={chakraItems}
        orientation="horizontal"
        aspectRatio="square"
        objectFit="cover"
        fitParent
        thumbnailSize={72}
        showControls
        controlsClassName={overlayControlsClassName}
        previousTriggerClassName={overlayArrowClassName}
        nextTriggerClassName={overlayArrowClassName}
        thumbnailsClassName="rounded-md border border-border-primary bg-base px-100"
        thumbnailsListClassName="gap-100 py-100"
        renderThumbnail={({ defaultThumbnail, isActive, index }) => (
          <div
            className={
              isActive
                ? 'rounded-sm border border-info bg-info-light p-50'
                : 'rounded-sm border border-border-primary bg-base p-50'
            }
          >
            {defaultThumbnail}
            <div className="mt-50 text-center text-xs text-fg-secondary">
              {index + 1}
            </div>
          </div>
        )}
      />
    </StoryFrame>
  ),
}
