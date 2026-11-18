<!-- Source: libs/ui/src/molecules/player.tsx and the supported Player API in PR #622. -->

# Player: UX guidelines

Use `Player` when an app needs a custom arrangement of audio or video controls.
Use `AudioPlayer` or `VideoPlayer` for the ready-made layout.

- Keep every control inside the same `Player` root as its media provider.
- Give the media a meaningful `title`; the poster is decorative unless its `alt`
  explains information the title does not already convey.
- Keep playback, seeking and mute available by keyboard and pointer. Focus the
  root for K (play/pause) and M (mute); sliders support arrow keys.
- Localize control names through `UiMessagesProvider.messages.player`. An
  explicit `aria-label` on a control wins over the catalog. The play, mute and
  fullscreen names follow their current state; `Player.Announcer` uses the
  same catalog for media announcements.
- Keep controls inside the player at narrow widths. Video toolbars can wrap;
  the preset volume slider is hidden below the `sm` viewport breakpoint, while
  mute remains available. The video preset also hides skip buttons on mobile,
  keeping the timeline available for seeking.
- Do not autoplay audible content without the user's intent. Handle `onError`
  in the consuming app when it needs a retry or alternate source.
- Supply caption/subtitle tracks through `Player.Provider tracks`. Every track
  needs a stable `id`; use `language` for the language tag and `src` or inline
  `content` for the WebVTT data. Render `Player.Captions` and keep
  `Player.CaptionButton` with the other controls.
- Include `Player.Loading` and `Player.Error` so waiting and failures are
  understandable. Default error feedback includes retry; custom error content
  receives `{ error, retry }`. A retry reloads the provider, not the page.
- `Player.Gestures` adds surface playback interaction; preserve keyboard and
  visible button alternatives. Do not cover active controls with an overlay.
- Supply a transcript or other accessible alternative where the content
  requires it. Playlist navigation is outside this version's scope.

The current engine is `@vidstack/react` 1.15.7. Upstream has deprecated Vidstack
in favor of Video.js 10; a future engine migration is separate from this API.

Retry restarts the media provider and resets playback to its initial state. Keep recovery copy concise; audio error feedback grows with its content instead of clipping it.
