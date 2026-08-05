import type { Meta, StoryObj } from "@storybook/react"

import { Image } from "../../src/atoms/image"
import type { ImageProps } from "../../src/atoms/image"

const NativeImage = (props: ImageProps) => <Image {...props} />

const meta = {
  argTypes: {
    alt: {
      control: "text",
      description: "Alternative text for accessibility",
      type: { name: "string", required: true },
    },
    className: {
      control: "text",
      description: "Tailwind classes for styling (size, rounded, object-fit)",
    },
    size: {
      control: "radio",
      description: "Image size",
      options: ["sm", "md", "lg", "custom"],
    },
    src: {
      control: "text",
      description: "Image source URL",
      type: { name: "string", required: true },
    },
  },
  args: {
    alt: "Mountain landscape",
    className: "max-w-md rounded-lg",
    src: "https://images.unsplash.com/photo-1540206395-68808572332f?w=600&h=600&fit=crop",
  },
  component: NativeImage,
  parameters: {
    docs: {
      description: {
        component:
          "Framework-agnostic image component that accepts any image component via the `as` prop",
      },
    },
  },
  title: "Atoms/Image",
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
        className="rounded-xl object-cover size-96"
      />
    </div>
  ),
}
