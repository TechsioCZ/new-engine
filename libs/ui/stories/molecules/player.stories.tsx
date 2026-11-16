import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentProps, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { UiMessagesProvider } from "../../src/messages/ui-messages-provider"
import { Player } from "../../src/molecules/player"
import {
  PlayerStates,
  playerStatesPlay,
  playerStatesSource,
} from "../helpers/player-states"

const AUDIO_SRC = "https://files.vidstack.io/sprite-fight/audio.mp3"

// SDK events expose state proxies; record calls without serializing the event.
const playSpy = fn().mockName("onPlay")
const pauseSpy = fn().mockName("onPause")
const controls = ["title", "muted", "volume", "playbackRate", "loop", "preload"]
const publicProps = [
  ...controls,
  "src",
  "viewType",
  "onPlay",
  "onPause",
  "onEnded",
  "onError",
  "onVolumeChange",
]

const meta: Meta<typeof Player> = {
  title: "Molecules/Player",
  component: Player,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    controls: { include: publicProps },
    docs: {
      controls: { include: publicProps },
      argTypes: { include: publicProps },
      description: {
        component:
          "A compound media player with provider, captions, feedback, gestures and accessible controls. Choose AudioPlayer or VideoPlayer when their assembled layout fits the task.",
      },
    },
  },
  argTypes: {
    src: {
      control: false,
      description:
        "Media URL or typed sources. The compound example uses audio; choose VideoPlayer for an assembled video layout.",
    },
    viewType: { control: false },
    title: { control: "text" },
    playbackRate: { control: { type: "range", min: 0.5, max: 2, step: 0.25 } },
    loop: { control: "boolean" },
    preload: { control: "select", options: ["none", "metadata", "auto"] },
    muted: { control: "boolean" },
    volume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
  },
  args: {
    src: AUDIO_SRC,
    title: "Sample audio",
    viewType: "audio",
    muted: false,
    volume: 1,
    playbackRate: 1,
    loop: false,
    preload: "metadata",
    onPlay: () => playSpy(),
    onPause: () => pauseSpy(),
  },
}

export default meta
type Story = StoryObj<typeof Player>

export const Playground: Story = {
  parameters: {
    docs: {
      source: {
        code: `import { Player } from "@techsio/ui-kit/molecules/player"

export function AudioControls() {
  return (
    <Player src="https://files.vidstack.io/sprite-fight/audio.mp3" title="Sample audio" viewType="audio"
      className="rounded-player border-(length:--border-width-player) border-player-border bg-player-bg">
      <Player.Provider />
      <Player.Announcer />
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
  )
}`,
      },
      description: {
        story:
          "Compose the provider and controls under one Player root so keyboard shortcuts, media state and localized control names stay connected.",
      },
    },
  },
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
        <Player.Announcer />
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

export const States: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compose Loading and Error explicitly, compare ready media with a real decoding error, and recover through the public retry callback.",
      },
      source: { code: playerStatesSource("compound") },
    },
  },
  render: () => <PlayerStates kind="compound" />,
  play: playerStatesPlay,
}

export const Localized: Story = {
  ...Playground,
  parameters: {
    docs: {
      source: {
        code: `import { UiMessagesProvider } from "@techsio/ui-kit/messages/ui-messages-provider"
import { Player } from "@techsio/ui-kit/molecules/player"

export function LocalizedAudio() {
  return (
    <UiMessagesProvider locale="cs" messages={{ player: {
      label: "Prehravac", play: "Spustit", pause: "Pozastavit",
      mute: "Ztlumit", unmute: "Zapnout zvuk", seek: "Pozice", volume: "Hlasitost",
      seekForwardAnnouncement: "Posun vpřed", seekBackwardAnnouncement: "Posun vzad",
      timeValueText: ({ currentTime, duration }) => currentTime + " z " + duration,
      live: "Živě",
    } }}>
      <Player src="https://files.vidstack.io/sprite-fight/audio.mp3" viewType="audio">
        <Player.Provider />
        <Player.Announcer />
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
    </UiMessagesProvider>
  )
}`,
      },
      description: {
        story:
          "The Czech locale and app message catalog supply control names, spoken timeline values and seek announcements without changing the compound composition.",
      },
    },
  },
  args: { title: undefined },
  decorators: [
    (Story) => (
      <UiMessagesProvider
        locale="cs"
        messages={{
          player: {
            label: "Prehravac",
            play: "Spustit",
            pause: "Pozastavit",
            mute: "Ztlumit",
            unmute: "Zapnout zvuk",
            seek: "Pozice",
            volume: "Hlasitost",
            seekForwardAnnouncement: "Posun vpřed",
            seekBackwardAnnouncement: "Posun vzad",
            timeValueText: ({ currentTime, duration }) =>
              `${currentTime} z ${duration}`,
            live: "Živě",
          },
        }}
      >
        <Story />
      </UiMessagesProvider>
    ),
  ],
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
  parameters: {
    docs: {
      source: {
        code: `import { useState } from "react"
import { Player } from "@techsio/ui-kit/molecules/player"

export function AudioInsideForm() {
  const [submissions, setSubmissions] = useState(0)
  return (
    <form onSubmit={(event) => {
      event.preventDefault()
      setSubmissions((count) => count + 1)
    }}>
      <Player src="https://files.vidstack.io/sprite-fight/audio.mp3" title="Sample audio" viewType="audio">
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
}`,
      },
      description: {
        story:
          "Media controls remain ordinary buttons inside a form, changing playback state without incrementing its submission count.",
      },
    },
  },
  render: (args) => <FormExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(
      () =>
        expect(
          canvasElement.querySelector("[data-media-player]"),
        ).toHaveAttribute("data-can-play", ""),
      { timeout: 10_000 },
    )
    const mute = await canvas.findByRole("button", { name: "Mute" })
    await userEvent.click(mute)
    await waitFor(() => expect(mute).toHaveAccessibleName("Unmute"))
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Form submissions: 0",
    )
    await userEvent.click(mute)
    await waitFor(() => expect(mute).toHaveAccessibleName("Mute"))
  },
}
