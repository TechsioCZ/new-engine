# Original player demo media

These fixtures are generated from FFmpeg's synthetic `testsrc2` filter. They
contain no downloaded footage, music, speech or other third-party content.
The generated assets and reproduction script use this repository's MIT license.
FFmpeg itself is run from a container and is not distributed with the assets.

Storybook serves this directory at `/player-media`.

| URL | Contents |
| --- | --- |
| `/player-media/sample.mp4` | H.264 Main, 640 × 360, 12 fps, exactly 30 seconds, video only. |
| `/player-media/master.m3u8` | Static HLS master with 180p and 360p variants. |
| `/player-media/stream.mpd` | Static MPEG-DASH manifest with the same two variants. |
| `/player-media/poster.png` | 320 × 180 poster sampled at zero seconds. |
| `/player-media/thumbnail-0.png` | 160 × 90 preview for the 0–10 second interval. |
| `/player-media/thumbnail-10.png` | 160 × 90 preview for the 10–20 second interval. |
| `/player-media/thumbnail-20.png` | 160 × 90 preview for the 20–30 second interval. |

HLS and DASH share `init-0.m4s` / `init-1.m4s` and twelve five-second fMP4
segments. Representation 0 is 320 × 180 at a target 100 kbit/s; representation
1 is 640 × 360 at a target 260 kbit/s. Each rendition has six segments and
aligned keyframes, enabling switching between distinct 180p/360p qualities.
The MP4 plus shared adaptive segments and PNGs occupy approximately 2 MB.

## Reproduce

From the repository root, with Node.js and Docker available:

```sh
node libs/ui/stories/assets/player-media/generate.mjs
```

The script overwrites only its generated fixture filenames in this directory.
It uses FFmpeg 7.1 from
`jrottenberg/ffmpeg@sha256:8ec1ee1f6a0fcd37c97725827b6b7832795c9596e3439b8da56d7700d61ae778`.
Docker may download this digest on its first run; encoding containers have
networking disabled. The encoder uses one thread and fixed settings. Generated
HLS wall-clock tags are removed because these are VOD fixtures, so regeneration
does not depend on the date or time. No host FFmpeg installation is needed.

Both protocols point to the same local segments; no streaming CDN, live service,
encrypted media or quality fixture download is required. The media intentionally
has no audio track. Use the existing audio examples to demonstrate audio playback.

The Storybook streaming helpers bundle `hls.js` 1.7.4 and `dashjs` 4.7.4 as dev
dependencies. The DASH major is deliberate: Vidstack 1.15's provider uses the
dash.js 4 API, which differs from the dash.js 5 API.

Upstream references:

- [FFmpeg DASH muxer](https://ffmpeg.org/ffmpeg-formats.html#dash-2)
- [Vidstack DASH provider](https://vidstack.io/docs/player/api/providers/dash/)
- [FFmpeg container source](https://github.com/jrottenberg/ffmpeg)
