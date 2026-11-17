---
name: player-usage
description: >
  Use after component-usage-ux when an app needs a token-driven media player.
  Player is a headless compound molecule over Vidstack (@vidstack/react); apps
  compose Player.Provider, Player.Poster, Player.Controls and the control parts
  to build their own audio/video UI, themed through --color-player-* tokens.
metadata:
  component_version: "1.2.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: "https://vidstack.io/docs/player/getting-started/installation/react"
  contributor_sources: "libs/ui/src/molecules/player.tsx libs/ui/src/tokens/components/molecules/_player.css libs/ui/stories/molecules/player.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit Player Usage

`Player` is the low-level media player compound. It wraps Vidstack's engine
headlessly and exposes control parts; apps decide the layout. Use `AudioPlayer`
or `VideoPlayer` for a pre-assembled preset.

## Setup

```tsx
import { Player } from "@techsio/ui-kit/molecules/player"

<Player src="https://example.com/media.mp4" poster="https://example.com/poster.jpg">
  <Player.Provider />
  <Player.Poster />
  <Player.Gestures />
  <Player.Captions />
  <Player.Loading />
  <Player.Error />
  <Player.Announcer />
  <Player.Controls className="player-overlay absolute inset-x-0 bottom-0 z-player-controls">
    <Player.ControlGroup>
      <Player.PlayButton />
      <Player.TimeSlider />
      <Player.Time type="current" />
      <Player.Time type="duration" />
      <Player.MuteButton />
      <Player.VolumeSlider />
      <Player.CaptionButton />
      <Player.FullscreenButton />
    </Player.ControlGroup>
  </Player.Controls>
</Player>
```

The engine handles loading, keyboard shortcuts and state. `Player.Controls`
and `Player.ControlGroup` wrap Vidstack's controls primitives, while buttons
reuse the UI kit's `ActionIcon` through `asChild`.
Toggle buttons expose aria-pressed and accept aria-label for localization.
`Player.Poster` is treated as decorative by default (`aria-hidden="true"`);
pass a non-empty `alt` when the poster conveys information that is not already
covered by the player title.
The sliders are horizontal and own their track and thumb markup.

## Media props and text tracks

The root accepts Vidstack `MediaPlayer` props, including `preload`,
`crossOrigin`, `playbackRate`, `currentTime`, playback events and `ref`. The ref
targets the media player instance. Set a meaningful `title` or `aria-label`.

`Player.Provider` accepts `tracks?: readonly PlayerTextTrack[]`. Every track
requires a stable, unique `id` and `kind`; use `language` for its language tag
(`lang` is also supported). Pass a track URL with `src`, or inline text with
`content`. Only one track of a kind should be the default.

```tsx
import { Player } from "@techsio/ui-kit/molecules/player"

<Player src="https://example.com/media.mp4" title="Product film">
  <Player.Provider
    tracks={[{
      id: "english",
      kind: "subtitles",
      language: "en",
      label: "English",
      default: true,
      content: "WEBVTT\n\n00:00.000 --> 00:30.000\nProduct film subtitles.\n",
    }]}
  />
  <Player.Captions />
  <Player.Controls>
    <Player.ControlGroup>
      <Player.PlayButton />
      <Player.CaptionButton />
    </Player.ControlGroup>
  </Player.Controls>
</Player>
```

`Player.Captions` renders the active subtitle/caption cues.
`Player.CaptionButton` toggles captions and is available only when the media
has caption/subtitle tracks. Keep it with the other controls so it remains
keyboard accessible.

## Compound reference

All parts belong inside the same `Player` root. Provider and control props
follow the corresponding Vidstack primitive; each control owns its localized
accessible label, with explicit `aria-label` taking precedence.

| Part | Responsibility |
| --- | --- |
| `Player.Provider` | Creates the native media/provider and registers the optional `tracks` array. |
| `Player.Poster` | Decorative poster by default; a meaningful `alt` exposes informative content. |
| `Player.Controls`, `Player.ControlGroup`, `Player.Control` | Own control visibility and group custom layouts. |
| `Player.PlayButton`, `Player.MuteButton`, `Player.SeekButton`, `Player.FullscreenButton` | Keyboard-accessible actions; buttons never submit their enclosing form. |
| `Player.TimeSlider`, `Player.VolumeSlider`, `Player.Time` | Horizontal seeking/volume controls and readable time. |
| `Player.Captions`, `Player.CaptionButton` | Render active cues and toggle available captions. |
| `Player.SettingsMenu` | A settings button with fixed SDK playback-speed options and a captions-language submenu when tracks are available. |
| `Player.Loading` | Shows localized loading feedback while the provider waits; custom children replace its content. |
| `Player.Error` | Shows a localized error alert with retry; custom children or `({ error, retry }) => ReactNode` replace its content. |
| `Player.Gestures` | Adds pointer playback behavior on the media surface. |
| `Player.Announcer` | Announces relevant media state changes using the app's player translations. |

Default retry reloads the provider. A custom error action should call the
provided `retry` callback rather than reloading the page. These parts react to
real media state; do not fake loading or error state with CSS.

## Settings and saved preferences

`Player.SettingsMenu` belongs inside the same `Player` and its controls. It
offers the SDK's fixed playback-speed choices. When caption/subtitle tracks
are available, its captions submenu lists their labels and an off option;
`Player.CaptionButton` remains the shortcut for toggling captions. Labels
come from `UiMessagesProvider.messages.player`.

The menu is opt-in. For video, add `"settings"` to `VideoPlayer.controlsList`;
its default controls are unchanged. For audio, compose it in `Player` or in
`AudioPlayer.slots.controls` rather than expecting a preset settings button:

```tsx
import { Player } from "@techsio/ui-kit/molecules/player"

<Player src="https://example.com/audio.mp3" title="Episode preview" viewType="audio">
  <Player.Provider />
  <Player.Controls>
    <Player.ControlGroup>
      <Player.PlayButton />
      <Player.TimeSlider />
      <Player.SettingsMenu />
    </Player.ControlGroup>
  </Player.Controls>
</Player>
```

Preference persistence is separately opt-in through the forwarded Vidstack
`storage` prop. Pass an application-owned string such as
`storage="my-store-player-preferences-v1"` to share volume, mute, speed and
caption preferences between players using that key. Choose the key for the
intended application/account scope; do not copy a universal fixed key into
unrelated apps. Playback position is stored separately for each media source,
not as one position shared by every player.

Let Vidstack own saving and restoring these values. Avoid forcing initial
`playbackRate`, `volume` or `muted` props in a preference-restoration example.
The VideoPlayer RememberPreferences story demonstrates an ordinary React key
remount using a Reload player button; it does not reload the page or implement
its own storage layer. Omitting `storage` keeps persistence disabled.

## Core Patterns

### Keep controls inside Player.Root

Every control part reads media state from the surrounding `Player`, so it must
be rendered inside `Player.Root` (`<Player>…</Player>`).

### Group controls through Player.Controls

`Player.ControlGroup` is a single flex row with token-based padding and gaps.
Nest it in `Player.Controls` so Vidstack owns control visibility. For video,
overlay `Player.Controls` with `player-overlay`; for audio, leave it inline.
For a bottom video toolbar, set `reserveCaptionSpace` on `Player.Controls`.
Its measured height reserves space above the toolbar for captions, including
when controls wrap or the viewport changes. Top overlays should omit it.
Padding defaults to the component token; pass `padding="none"` when the surrounding
layout already provides the spacing (as `AudioPlayer` does).

### Reuse the preset tokens

Visual overrides belong in `--color-player-*` / `--*-player-*` tokens, not in
inline styles. The slider internals are bridged to Vidstack's `--media-*`
variables in `_player.css`.

Spoken timeline values use `UiMessagesProvider.locale` for duration units and
`player.timeValueText({ currentTime, duration })` for their surrounding words.
The arguments are already formatted strings. Translate `player.live` for
unbounded live streams. Explicit control `aria-valuetext` still takes precedence.

## Common Mistakes

### HIGH Control part outside Player.Root

Wrong:

```tsx
<Player.ControlGroup>…</Player.ControlGroup>
```

Correct:

```tsx
<Player src="…">
  <Player.Controls>
    <Player.ControlGroup>…</Player.ControlGroup>
  </Player.Controls>
</Player>
```

Source: libs/ui/src/molecules/player.tsx

### HIGH Hardcoding control colors

Wrong:

```tsx
<Player.Controls className="bg-black/60 text-white">…</Player.Controls>
```

Correct:

```tsx
<Player.Controls className="player-overlay z-player-controls">…</Player.Controls>
```

Source: libs/ui/src/tokens/components/molecules/_player.css

Control labels follow `UiMessagesProvider.messages.player`; explicit control `aria-label` props take precedence.
