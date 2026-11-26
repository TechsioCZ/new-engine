<!-- Source: libs/ui/src/molecules/video-player.tsx and the supported VideoPlayer API in PR #622. -->

# VideoPlayer: UX guidelines

Use `VideoPlayer` for a single video with an overlaid control bar. Use its
content slots for local layout changes, or `Player` for a custom composition.

- Set `title` to describe the video. The poster is decorative by default.
- `controlsList` supports `play`, `time`, `volume`, `captions` and `fullscreen`.
  The captions button appears only when a caption/subtitle track is available.
  Keep the controls needed to complete the task; their order follows the layout.
- The toolbar wraps inside narrow containers. When the player is narrower
  than 40rem (its own width, not the viewport), skip buttons and the volume
  slider are hidden; the timeline and mute remain usable.
- Clicking or tapping the media surface toggles playback; retain keyboard and
  button alternatives. `playsInline` defaults to true, with false available
  for apps that need native platform fullscreen behavior.
- Localize controls with `UiMessagesProvider.messages.player`. Names describe
  the action available in the current playback or mute state.
- `width`, `height` and `style` size the player itself. Verify fixed heights
  with the full control set at the narrowest supported width.
- Supply accurate captions through `tracks` with stable `id` values, `kind`,
  `language`, and `src` or inline `content`. Give tracks meaningful labels and
  preserve a transcript or other alternative when needed.
- `slots.controls` replaces the entire toolbar and retains media context;
  `slots.overlay` adds in-player content. Custom controls own their responsive
  layout and must keep playback, seeking and captions reachable.
- Loading/error slots replace content inside the state-aware feedback parts;
  `null` suppresses a default. Custom error functions receive `{ error, retry }`.
  Keep an accessible error description and a clear retry action.
- Handle playback errors through `onError` alongside the default localized
  retry feedback; do not leave a failed video as the only way to obtain
  essential information.

Retry restarts the media provider and resets playback to its initial state. Keep recovery copy concise; audio error feedback grows with its content instead of clipping it.
