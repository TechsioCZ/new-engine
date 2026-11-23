/**
 * AudioPlayer — @techsio/ui-kit molecule.
 *
 * @component AudioPlayer
 * @componentVersion v1.2.2
 * @skill audio-player-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the audio-player-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { CSSProperties } from "react"
import { Image } from "../atoms/image"
import { tv } from "../utils"
import {
  Player,
  type PlayerPresetSlots,
  type PlayerProps,
  type PlayerTextTrack,
} from "./player"

const audioPlayerStyles = tv({
  slots: {
    root: "audio-player-card border-(length:--border-width-audio-player) flex w-full flex-col gap-audio-player-control rounded-audio-player border-audio-player-border bg-audio-player-bg p-audio-player-root text-audio-player-fg",
    header: "flex min-w-0 items-center gap-audio-player-control",
    cover:
      "size-audio-player-cover shrink-0 rounded-audio-player-cover object-cover",
    title: "min-w-0 truncate font-player-title text-player-title",
    player: "w-full overflow-visible",
    controls: "flex-col items-stretch gap-audio-player-row",
    toolbar:
      "audio-player-toolbar grid w-full min-w-0 items-center gap-audio-player-control",
    transport: "audio-player-transport shrink-0 gap-audio-player-control",
    timeline: "audio-player-timeline w-full min-w-0",
    timeGroup: "audio-player-time-group",
    auxiliary: "audio-player-auxiliary shrink-0 gap-audio-player-control",
    seek: "audio-player-seek shrink-0",
    volumeSlider: "audio-player-volume",
  },
})

export type AudioInfo = {
  src: string
  title?: string
  cover?: string
}

export type AudioPlayerControls =
  | "play"
  | "seek"
  | "time"
  | "volume"
  | "settings"

const DEFAULT_CONTROLS: readonly AudioPlayerControls[] = [
  "play",
  "time",
  "volume",
]

function DefaultTransportControls({
  hasPlay,
  hasSeek,
  skipDuration,
}: {
  hasPlay: boolean
  hasSeek: boolean
  skipDuration: number
}) {
  const styles = audioPlayerStyles()
  return (
    <Player.Control className={styles.transport()}>
      {hasSeek ? (
        <Player.SeekButton
          className={styles.seek()}
          direction="backward"
          seconds={skipDuration}
        >
          −{skipDuration}
        </Player.SeekButton>
      ) : null}
      {hasPlay ? <Player.PlayButton /> : null}
      {hasSeek ? (
        <Player.SeekButton
          className={styles.seek()}
          direction="forward"
          seconds={skipDuration}
        >
          +{skipDuration}
        </Player.SeekButton>
      ) : null}
    </Player.Control>
  )
}
function DefaultControls({
  controlsList,
  skipDuration,
}: {
  controlsList: readonly AudioPlayerControls[]
  skipDuration: number
}) {
  const styles = audioPlayerStyles()
  const hasPlay = controlsList.includes("play")
  const hasSeek = controlsList.includes("seek")
  const hasTime = controlsList.includes("time")
  const hasVolume = controlsList.includes("volume")
  const hasSettings = controlsList.includes("settings")
  const hasTransport = hasPlay || hasSeek
  const hasAuxiliary = hasVolume || hasSettings

  if (controlsList.length === 0) {
    return null
  }

  return (
    <Player.Controls>
      <Player.ControlGroup className={styles.controls()} padding="none">
        {hasTime ? (
          <div className={styles.timeline()}>
            <Player.TimeSlider />
          </div>
        ) : null}
        <div
          className={styles.toolbar()}
          data-auxiliary={hasAuxiliary || undefined}
          data-seek={hasSeek || undefined}
          data-time={hasTime || undefined}
          data-transport={hasTransport || undefined}
        >
          {hasTransport ? (
            <DefaultTransportControls
              hasPlay={hasPlay}
              hasSeek={hasSeek}
              skipDuration={skipDuration}
            />
          ) : null}
          {hasTime ? <Player.TimeRange className={styles.timeGroup()} /> : null}
          {hasAuxiliary ? (
            <Player.Control className={styles.auxiliary()}>
              {hasVolume ? (
                <>
                  <Player.MuteButton />
                  <Player.VolumeSlider className={styles.volumeSlider()} />
                </>
              ) : null}
              {hasSettings ? <Player.SettingsMenu /> : null}
            </Player.Control>
          ) : null}
        </div>
      </Player.ControlGroup>
    </Player.Controls>
  )
}

export type AudioPlayerProps = Omit<
  PlayerProps,
  "children" | "src" | "onVolumeChange" | "viewType" | "className" | "style"
> & {
  tracks?: readonly PlayerTextTrack[]
  slots?: PlayerPresetSlots
  audioUrl: string | AudioInfo
  skipDuration?: number
  controlsList?: readonly AudioPlayerControls[]
  className?: string
  style?: CSSProperties
  onVolumeChange?: (volume: number) => void
}

export function AudioPlayer({
  audioUrl,
  title: playerTitle,
  skipDuration = 10,
  controlsList = DEFAULT_CONTROLS,
  className,
  style,
  onVolumeChange,
  tracks,
  slots,
  ...props
}: AudioPlayerProps) {
  const {
    src,
    title: audioTitle,
    cover,
  } = typeof audioUrl === "string" ? { src: audioUrl } : audioUrl
  const title = playerTitle ?? audioTitle
  const styles = audioPlayerStyles()

  return (
    <div className={styles.root({ className })} style={style}>
      {cover || title ? (
        <div className={styles.header()}>
          {cover ? (
            <Image
              alt=""
              className={styles.cover()}
              size="custom"
              src={cover}
            />
          ) : null}
          {title ? <p className={styles.title()}>{title}</p> : null}
        </div>
      ) : null}
      <Player
        {...props}
        className={styles.player()}
        onVolumeChange={
          onVolumeChange ? (detail) => onVolumeChange(detail.volume) : undefined
        }
        src={src}
        title={title}
        viewType="audio"
      >
        <Player.Provider tracks={tracks} />
        <Player.Announcer />
        {slots?.loading === null ? null : (
          <Player.Loading>{slots?.loading}</Player.Loading>
        )}
        {slots?.error === null ? null : (
          <Player.Error>{slots?.error}</Player.Error>
        )}
        {slots?.overlay}
        {slots?.controls === undefined ? (
          <DefaultControls
            controlsList={controlsList}
            skipDuration={skipDuration}
          />
        ) : (
          slots.controls
        )}
      </Player>
    </div>
  )
}
