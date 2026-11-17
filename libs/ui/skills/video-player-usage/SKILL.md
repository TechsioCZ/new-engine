---
name: video-player-usage
description: >
  Use after component-usage-ux when an app needs a ready-made video player.
  VideoPlayer is an opinionated preset over Player with a Semi Design-shaped
  src/poster/controlsList API; controls overlay the video on a dark scrim.
metadata:
  component_version: "1.2.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - player-usage
  - app-token-overrides
resources:
  - "references/ux.md"
sources:
  - "libs/ui/src/molecules/video-player.tsx"
  - "libs/ui/stories/molecules/video-player.stories.tsx"
  - "https://semi.design/en-US/plus/videoPlayer"
---

# @techsio/ui-kit VideoPlayer Usage

`VideoPlayer` is the pre-assembled video player. It renders a poster, captions,
feedback and an overlaid control bar over `Player`. Use `slots` for local
customization, or `Player` for an app-owned composition.

## Setup

```tsx
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

<VideoPlayer
  src="https://example.com/media.mp4"
  poster="https://example.com/poster.jpg"
/>
```

## Props

- `src` — media source.
- `poster` — poster image.
- `autoPlay`, `loop`, `muted`, `volume` — engine playback props.
- `seekTime` — seconds for the forward/backward seek buttons (default `10`).
- `controlsList` — which controls to render; defaults to
  `["play", "time", "volume", "captions", "fullscreen"]`. Supported values:
  `play`, `time`, `volume`, `captions`, `fullscreen`, `settings`. The captions
  button is shown only when caption/subtitle tracks are available. Settings
  is opt-in and is not added to the default list.
- `width`, `height`, `style` — sizing on the media player itself.
- `className` — classes on the media player root.
- `title` — accessible media title.
- `onPlay`, `onPause`, `onEnded`, `onError` — Vidstack events.
- `onVolumeChange` — callback receiving the numeric volume (0–1).
- `ref` — the underlying Vidstack player instance.
- `playsInline` — defaults to `true`; explicitly set `false` when the
  application needs the platform's native fullscreen playback behavior.
- `tracks` — optional text tracks with a required stable `id` and `kind`;
  supply `language`, `label` and either `src` or inline `content`.
- `storage` — optional Vidstack preference storage; a string names an
  application-owned preference key. Omitted by default.
- Other Vidstack `MediaPlayer` props, including `preload`, `playbackRate`,
  `currentTime`, `crossOrigin` and events, are forwarded. `children` stays
  internal to the preset; use named slots instead.

## Captions

```tsx
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

<VideoPlayer
  src="https://example.com/media.mp4"
  title="Product film"
  tracks={[{
    id: "english",
    kind: "subtitles",
    language: "en",
    label: "English",
    default: true,
    content: "WEBVTT\n\n00:00.000 --> 00:30.000\nProduct film subtitles.\n",
  }]}
/>
```

Use accurate captions for spoken content and meaningful sound. `default`
requests the initial track; user preferences may choose another. Cross-origin
track URLs must permit CORS; inline content needs no caption asset request.

## Settings, languages and preference storage

Add `"settings"` to `controlsList` for `Player.SettingsMenu`. Its speed submenu
uses the SDK's fixed playback-rate options. Its captions submenu appears only
when caption/subtitle tracks exist and offers the supplied track labels plus
an off choice. The separate captions button toggles the selected language.
Provide a unique stable ID for every language and mark only the intended
initial language as `default`; saved preferences may choose another.

```tsx
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

<VideoPlayer
  src="https://example.com/media.mp4"
  title="Product film"
  controlsList={["play", "time", "volume", "captions", "fullscreen", "settings"]}
  tracks={[
    {
      id: "english",
      kind: "subtitles",
      language: "en",
      label: "English",
      default: true,
      content: "WEBVTT\n\n00:00.000 --> 00:30.000\nProduct film subtitles.\n",
    },
    {
      id: "czech",
      kind: "subtitles",
      language: "cs",
      label: "Čeština",
      content: "WEBVTT\n\n00:00.000 --> 00:30.000\nTitulky produktového filmu.\n",
    },
  ]}
/>
```

Persistence is independent of showing Settings. Opt in with an
application-owned key, for example `storage="my-store-player-preferences-v1"`.
Vidstack shares volume, mute, playback speed and caption preferences among
players using that key; playback position is stored separately per media
source. Select an app/account-specific key rather than recommending one
global fixed key for every consumer. Omitting `storage` disables persistence.

The RememberPreferences story uses the demo-only key
`ui-kit-player-preferences-demo-v1`. Choose a speed or subtitle language, then
select Reload player to remount the same player. It uses the SDK's storage
without copying preference state into React or supplying initial speed,
volume and mute values that compete with restoration. See MultipleLanguages
for the same tracks without persistence and Settings for speed-only media.
An audio composition can use `Player.SettingsMenu` inside its own controls.

## Slots, gestures and feedback

`slots` accepts `loading`, `error`, `controls` and `overlay` React nodes.
Omit a slot to retain its default, or set it to `null` to suppress it.
Loading/error content is wrapped by the state-aware `Player.Loading` and
`Player.Error` parts. The default error alert is localized and includes retry,
which reloads the provider.

For custom retry UI, `slots.error` accepts
`({ error, retry }) => ReactNode`; call `retry()` from a UI-kit Button.
`slots.controls` replaces the entire toolbar node: compose `Player.Controls`
and its children inside the slot. For a bottom overlay toolbar, pass
`reserveCaptionSpace` to `Player.Controls` so captions stay above its measured
height. The default toolbar already does this. `slots.overlay` adds content inside the media
root. Both retain media context for `Player.*` parts.

Clicking or tapping the media surface toggles playback. Keyboard playback and
mute shortcuts remain available. Below `sm`, the preset hides backward/forward
skip buttons and the volume slider; seeking stays available on the timeline,
and mute remains visible. Custom control slots own their responsive layout.

## Common Mistakes

### HIGH Asking for unsupported controls

Wrong:

```tsx
<VideoPlayer controlsList={["playbackRate", "quality", "pictureInPicture"]} />
```

Correct: the preset supports `play`, `time`, `volume`, `captions`, `fullscreen`
and opt-in `settings`. Use Settings for playback-speed choices and caption
languages, or set the engine's `playbackRate` directly. Other control UI belongs
in `slots.controls` or a custom `Player` composition.

Source: libs/ui/src/molecules/video-player.tsx

Control labels follow `UiMessagesProvider.messages.player`; explicit control `aria-label` props take precedence.
