/**
 * AudioPlayer — @techsio/ui-kit molecule.
 *
 * @component AudioPlayer
 * @componentVersion v1.2.0
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
    layout:
      "audio-player-layout grid w-full items-center gap-audio-player-control",
    transport: "audio-player-transport shrink-0 gap-audio-player-control",
    timeline:
      "audio-player-timeline flex min-w-0 flex-col gap-audio-player-timeline",
    timePair:
      "flex w-full items-center justify-between gap-audio-player-control",
    auxiliary: "audio-player-auxiliary shrink-0 gap-audio-player-control",
    play: "audio-player-play",
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
      <Player.ControlGroup
        className={styles.layout()}
        data-auxiliary={hasAuxiliary || undefined}
        data-seek={hasSeek || undefined}
        data-timeline={hasTime || undefined}
        data-transport={hasTransport || undefined}
        padding="none"
      >
        {hasTransport ? (
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
            {hasPlay ? <Player.PlayButton className={styles.play()} /> : null}
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
        ) : null}
        {hasTime ? (
          <div className={styles.timeline()}>
            <Player.TimeSlider />
            <div className={styles.timePair()}>
              <Player.Time type="current" />
              <Player.Time type="duration" />
            </div>
          </div>
        ) : null}
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
