import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Version and digest pin the encoder, libraries and container filesystem.
const image =
  "jrottenberg/ffmpeg@sha256:8ec1ee1f6a0fcd37c97725827b6b7832795c9596e3439b8da56d7700d61ae778"
const directory = dirname(fileURLToPath(import.meta.url))

function ffmpeg(args) {
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--mount",
      `type=bind,source=${directory},target=/media`,
      "--workdir",
      "/media",
      image,
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...args,
    ],
    { stdio: "inherit" }
  )
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

// The input is generated locally; no downloaded footage or audio is used.
ffmpeg([
  "-f",
  "lavfi",
  "-i",
  "testsrc2=size=640x360:rate=12:duration=30",
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "32",
  "-profile:v",
  "main",
  "-level:v",
  "3.0",
  "-pix_fmt",
  "yuv420p",
  "-threads",
  "1",
  "-g",
  "60",
  "-keyint_min",
  "60",
  "-sc_threshold",
  "0",
  "-bf",
  "0",
  "-map_metadata",
  "-1",
  "-fflags",
  "+bitexact",
  "-flags:v",
  "+bitexact",
  "-movflags",
  "+faststart",
  "sample.mp4",
])

// Both adaptive protocols reference the same two sets of fMP4 segments.
ffmpeg([
  "-i",
  "sample.mp4",
  "-filter_complex",
  "[0:v]split=2[low][high];[low]scale=320:180[v180];[high]scale=640:360[v360]",
  "-map",
  "[v180]",
  "-map",
  "[v360]",
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-profile:v",
  "main",
  "-level:v",
  "3.0",
  "-pix_fmt",
  "yuv420p",
  "-threads",
  "1",
  "-g",
  "60",
  "-keyint_min",
  "60",
  "-sc_threshold",
  "0",
  "-bf",
  "0",
  "-b:v:0",
  "100k",
  "-maxrate:v:0",
  "140k",
  "-bufsize:v:0",
  "280k",
  "-b:v:1",
  "260k",
  "-maxrate:v:1",
  "340k",
  "-bufsize:v:1",
  "680k",
  "-map_metadata",
  "-1",
  "-fflags",
  "+bitexact",
  "-flags:v",
  "+bitexact",
  "-f",
  "dash",
  "-seg_duration",
  "5",
  "-use_template",
  "1",
  "-use_timeline",
  "1",
  "-adaptation_sets",
  "id=0,streams=v",
  "-init_seg_name",
  "init-$RepresentationID$.m4s",
  "-media_seg_name",
  "segment-$RepresentationID$-$Number%03d$.m4s",
  "-hls_playlist",
  "1",
  "-hls_master_name",
  "master.m3u8",
  "stream.mpd",
])

// These are VOD playlists. Wall-clock tags are unnecessary and would make
// otherwise identical generations differ according to the time of the run.
for (const name of ["master.m3u8", "media_0.m3u8", "media_1.m3u8"]) {
  const file = new URL(name, import.meta.url)
  writeFileSync(
    file,
    `${readFileSync(file, "utf8")
      .replace(/^#EXT-X-PROGRAM-DATE-TIME:.*\r?\n/gm, "")
      .trimEnd()}\n`
  )
}

ffmpeg([
  "-ss",
  "0",
  "-i",
  "sample.mp4",
  "-frames:v",
  "1",
  "-vf",
  "scale=320:180",
  "-threads",
  "1",
  "poster.png",
])
for (const seconds of [0, 10, 20]) {
  ffmpeg([
    "-ss",
    String(seconds),
    "-i",
    "sample.mp4",
    "-frames:v",
    "1",
    "-vf",
    "scale=160:90",
    "-threads",
    "1",
    `thumbnail-${seconds}.png`,
  ])
}
