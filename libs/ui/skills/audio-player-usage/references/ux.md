<!-- Source: libs/ui/src/molecules/audio-player.tsx and the supported AudioPlayer API in PR #622. -->

# AudioPlayer: UX guidelines

Use `AudioPlayer` for one audio source with a clear play action, a timeline,
readable time and mute. The optional title and decorative cover sit above the
controls, so identity does not compete with the timeline for horizontal space.
Use `slots.controls` for a local toolbar replacement, or `Player` when the
whole composition needs to be customized. Audio and video share `Player.*`
control parts; there is no separate audio compound API.

- Pass a string `audioUrl` or one `{ src, title?, cover? }` object. Arrays and
  playlist navigation are not supported.
- Prefer a meaningful title. The cover repeats the track identity and is
  decorative, so its image has empty alt text.
- Keep the default `controlsList={["play", "time", "volume"]}` for short
  previews. The timeline is part of the preset; `"time"` exposes current and
  total time below it.
- For podcasts or other spoken-word listening, add `"seek"` and `"settings"`.
  Skip amounts follow `skipDuration` in seconds, and settings exposes playback
  speed. Do not imply previous/next-track navigation with skip controls.
- The timeline stays available in narrow containers. The auxiliary volume
  slider hides when the audio card needs a compact layout; mute remains
  available. Check a narrow desktop sidebar as well as a mobile viewport.
- Use `slots.controls` when the order or grouping needs to change;
  `controlsList` selects groups in the existing preset layout.
- Localize controls with `UiMessagesProvider.messages.player`.
- Preset children are managed internally. Use `slots.loading`, `slots.error`,
  `slots.controls` and `slots.overlay` for custom content; `null` suppresses a
  default. Controls/overlay retain the player context.
- Keep the localized loading/error defaults unless the app supplies equivalent
  feedback. A custom error render function receives `{ error, retry }`; give
  retry a clear button label and keep failures understandable without color.
- Engine props such as `preload`, `playbackRate` and playback events pass through
  the preset. Make speed changes explicit to the listener.
- Let the user start playback. Browser autoplay policies may reject autoplay.
- Provide a transcript when the audio carries information needed for the task.
- Use `onError` for app-specific error handling in addition to the built-in
  retry feedback. Do not remove feedback without an accessible replacement.

Retry restarts the media provider and resets playback to its initial state. Keep recovery copy concise; audio error feedback grows with its content instead of clipping it.

## Research and accessibility references

- [WAI: Media Players](https://www.w3.org/WAI/media/av/player/) — preserve
  keyboard access, visible focus and clear control labels when composing a
  custom toolbar; playback speed can support different listening needs.
- [WAI: Planning Audio and Video Media](https://www.w3.org/WAI/media/av/planning/)
  — plan transcripts and other alternatives alongside the recording.
- [Understanding WCAG 1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html)
  — provide equivalent information for prerecorded audio-only content unless
  the recording is already a clearly identified alternative to text.
