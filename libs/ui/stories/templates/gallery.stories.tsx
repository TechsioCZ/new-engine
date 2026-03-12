import type { Meta, StoryObj } from '@storybook/react'
import { type ReactNode } from 'react'
import { GalleryTemplate } from '../../src/templates/gallery'

const baseItems = [
  {
    id: 'gallery-1',
    src: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1200',
    alt: 'Product hero image',
  },
  {
    id: 'gallery-2',
    src: 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=1200',
    alt: 'Product detail image',
  },
  {
    id: 'gallery-3',
    src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200',
    alt: 'Product color variant',
  },
  {
    id: 'gallery-4',
    src: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1200',
    alt: 'Product lifestyle image',
  },
]

type StoryFrameProps = {
  children: ReactNode
}

function StoryFrame({
  children,
}: StoryFrameProps) {
  return (
    <div className="w-full bg-base p-300">
      <div
        className="mx-auto max-w-md w-full rounded-md border border-border-primary bg-surface p-200"
      >
        {children}
      </div>
    </div>
  )
}

const meta: Meta<typeof GalleryTemplate> = {
  title: 'Templates/GalleryTemplate',
  component: GalleryTemplate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
A ready-to-use ecommerce image gallery template built on top of the Gallery compound component.
Supports fixed dimensions and parent-fill layout via \`fitParent\`.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Thumbnail orientation',
      table: { category: 'Layout' },
    },
    aspectRatio: {
      control: 'select',
      options: ['square', 'portrait', 'landscape', 'wide', 'none'],
      description: 'Main image aspect ratio',
      table: { category: 'Appearance' },
    },
    objectFit: {
      control: 'select',
      options: ['cover', 'contain', 'fill', 'none'],
      description: 'How images fit in the frame',
      table: { category: 'Appearance' },
    },
    carouselWidth: {
      control: 'number',
      description:
        'Main image width in px. For full parent width use fitParent.',
      table: { category: 'Layout' },
    },
    carouselHeight: {
      control: 'number',
      description:
        'Main image height in px. Keep empty with fitParent to rely on aspect ratio.',
      table: { category: 'Layout' },
    },
    fitParent: {
      control: 'boolean',
      description:
        'When enabled, carousel width defaults to 100% of parent container.',
      table: { category: 'Layout' },
    },
    thumbnailSize: {
      control: 'number',
      description: 'Thumbnail edge size',
      table: { category: 'Layout' },
    },
    showThumbnails: {
      control: 'boolean',
      description: 'Toggle thumbnail rail',
      table: { category: 'Behavior' },
    },
    showControls: {
      control: 'boolean',
      description: 'Show carousel previous/next arrows',
      table: { category: 'Behavior' },
    },
    showIndicators: {
      control: 'boolean',
      description: 'Show carousel indicators',
      table: { category: 'Behavior' },
    },
    showAutoplay: {
      control: 'boolean',
      description: 'Show autoplay toggle',
      table: { category: 'Behavior' },
    },
  },
  args: {
    items: baseItems,
    orientation: 'horizontal',
    aspectRatio: 'square',
    objectFit: 'cover',
    thumbnailSize: 72,
    showThumbnails: true,
    mainClassName: 'overflow-hidden rounded-md border border-border-primary bg-base',
    thumbnailsClassName: 'rounded-md border border-border-primary bg-base px-100',
    thumbnailsListClassName: 'gap-100 py-100',
    fitParent: true,
  },
}

export default meta

type Story = StoryObj<typeof GalleryTemplate>

export const Playground: Story = {
  render: (args) => (
    <StoryFrame>
      <GalleryTemplate {...args} />
    </StoryFrame>
  ),
  args: {
    orientation: 'vertical',
    thumbnailSize: 64,
  },
}
