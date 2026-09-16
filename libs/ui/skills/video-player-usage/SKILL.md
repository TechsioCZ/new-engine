---
component_version: "1.0.0"
name: video-player-usage
description: >
  Use after component-usage-ux when an app needs a ready-made video player.
  VideoPlayer is an opinionated preset over Player with a Semi Design-shaped
  src/poster/controlsList API; controls overlay the video on a dark scrim.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - player-usage
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/video-player.tsx"
  - "libs/ui/stories/molecules/video-player.stories.tsx"
  - "https://semi.design/en-US/plus/videoPlayer"
---

# @techsio/ui-kit VideoPlayer Usage

`VideoPlayer` is the pre-assembled video player. It renders a poster + overlaid
control bar over `Player`.

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
  `["play", "time", "volume", "fullscreen"]`. Supported values for v1:
  `play`, `time`, `volume`, `fullscreen`.
- `width`, `height`, `style` — sizing on the media player itself.
- `className` — classes on the media player root.
- `title` — accessible media title.
- `onPlay`, `onPause`, `onEnded`, `onError` — Vidstack events.
- `onVolumeChange` — callback receiving the numeric volume (0–1).
- `ref` — the underlying Vidstack player instance.

## Common Mistakes

### HIGH Asking for unsupported controls

Wrong:

```tsx
<VideoPlayer controlsList={["playbackRate", "quality", "pictureInPicture"]} />
```

Correct: v1 supports `play`, `time`, `volume` and `fullscreen` only. The rest
are future versions.

Source: libs/ui/src/molecules/video-player.tsx
