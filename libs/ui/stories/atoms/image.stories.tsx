import type { Meta, StoryObj } from "@storybook/react"

import { Image, type ImageProps } from "../../src/atoms/image"

const NativeImage = (props: ImageProps) => <Image {...props} />

const meta = {
  title: "Atoms/Image",
  component: NativeImage,
  parameters: {
    docs: {
      description: {
        component:
          "Framework-agnostic image component that accepts any image component via the `as` prop",
      },
    },
  },
  argTypes: {
    size: {
      control: "radio",
      options: ["sm", "md", "lg", "custom"],
      description: "Image size",
    },
    src: {
      control: "text",
      description: "Image source URL",
      type: { name: "string", required: true },
    },
    alt: {
      control: "text",
      description: "Alternative text for accessibility",
      type: { name: "string", required: true },
    },
    className: {
      control: "text",
      description: "Tailwind classes for styling (size, rounded, object-fit)",
    },
  },
  args: {
    src: "https://images.unsplash.com/photo-1540206395-68808572332f?w=600&h=600&fit=crop",
    alt: "Mountain landscape",
    className: "max-w-md rounded-lg",
  },
} satisfies Meta<ImageProps>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => <NativeImage {...args} />,
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Image
        src="https://images.unsplash.com/photo-1540206395-68808572332f?w=600&h=600&fit=crop"
        alt="Small"
        size="sm"
        className="rounded object-cover"
      />
      <Image
        src="https://images.unsplash.com/photo-1540206395-68808572332f?w=600&h=600&fit=crop"
        alt="Medium"
        size="md"
        className="rounded-lg object-cover"
      />
      <Image
        src="https://images.unsplash.com/photo-1540206395-68808572332f?w=600&h=600&fit=crop"
        alt="Large"
        size="lg"
        className="rounded-xl object-cover"
      />
      <Image
        src="https://images.unsplash.com/photo-1540206395-68808572332f?w=600&h=600&fit=crop"
        alt="Custom"
        size="custom"
        className="w-96 h-96 rounded-xl object-cover"
      />
    </div>
  ),
}
