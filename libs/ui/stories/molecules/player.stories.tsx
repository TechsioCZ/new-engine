import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentProps, useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { Player } from "../../src/molecules/player"

const AUDIO_SRC = "https://files.vidstack.io/sprite-fight/audio.mp3"

const meta: Meta<typeof Player> = {
  title: "Molecules/Player",
  component: Player,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    muted: { control: "boolean" },
    volume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
  },
  args: {
    src: AUDIO_SRC,
    title: "Sample audio",
    viewType: "audio",
    onPlay: fn(),
    onPause: fn(),
  },
}

export default meta
type Story = StoryObj<typeof Player>

export const Playground: Story = {
  render: (args) => (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-200">
      <p>
        Press Play to listen. Drag the timeline to seek, or focus it and use the
        arrow keys. Click the player surface, then press K to toggle playback or
        M to toggle mute. Mute and volume are independent controls.
      </p>
      <Player
        {...args}
        className="rounded-player border-(length:--border-width-player) border-player-border bg-player-bg"
      >
        <Player.Provider />
        <Player.Controls>
          <Player.ControlGroup>
            <Player.PlayButton />
            <Player.TimeSlider />
            <Player.Time type="current" />
            <span aria-hidden="true">/</span>
            <Player.Time type="duration" />
            <Player.Control>
              <Player.MuteButton />
              <Player.VolumeSlider />
            </Player.Control>
          </Player.ControlGroup>
        </Player.Controls>
      </Player>
    </div>
  ),
}

function FormExample(args: ComponentProps<typeof Player>) {
  const [submissions, setSubmissions] = useState(0)
  return (
    <form
      className="mx-auto flex w-full max-w-xl flex-col gap-200"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmissions((count) => count + 1)
      }}
    >
      <p>
        Play the audio, then skip 10 seconds forward or back. The elapsed time
        changes. Player controls must leave the form submission count at zero.
      </p>
      <Player {...args}>
        <Player.Provider />
        <Player.Controls>
          <Player.ControlGroup>
            <Player.PlayButton />
            <Player.SeekButton direction="backward" />
            <Player.SeekButton direction="forward" />
            <Player.TimeSlider />
            <Player.Time type="current" />
            <Player.MuteButton />
          </Player.ControlGroup>
        </Player.Controls>
      </Player>
      <output>Form submissions: {submissions}</output>
    </form>
  )
}

export const InForm: Story = {
  render: (args) => <FormExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const mute = await canvas.findByRole("button", { name: "Mute" })
    await userEvent.click(mute)
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Form submissions: 0",
    )
    await userEvent.click(mute)
  },
}
