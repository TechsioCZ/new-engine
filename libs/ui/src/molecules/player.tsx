/**
 * Player — @techsio/ui-kit molecule.
 *
 * @component Player
 * @componentVersion v1.0.1
 * @skill player-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the player-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  Controls as MediaControls,
  FullscreenButton as MediaFullscreenButton,
  MuteButton as MediaMuteButton,
  PlayButton as MediaPlayButton,
  MediaPlayer,
  MediaProvider,
  SeekButton as MediaSeekButton,
  Poster,
  Time,
  TimeSlider,
  useMediaState,
  VolumeSlider,
} from "@vidstack/react"
import { type ComponentProps, createContext, useContext } from "react"
import { ActionIcon } from "../atoms/action-icon"
import type { IconType } from "../atoms/icon"
import { useUiMessages } from "../messages/ui-messages-provider"
import { tv } from "../utils"

const playerStyles = tv({
  slots: {
    root: "player-base player-focus-ring relative overflow-hidden rounded-player text-player-fg",
    poster: "vds-poster",
    controls: "w-full",
    control: "flex min-w-0 items-center gap-player-control",
    controlGroup: "flex w-full min-w-0 items-center gap-player-control",
    iconButton:
      "bg-player-control-bg text-player-control-fg not-disabled:hover:bg-player-control-bg-hover focus-visible:outline-player-focus-ring not-disabled:active:bg-player-control-bg-active aria-hidden:hidden",
    timeSlider: "vds-time-slider vds-slider min-w-0 flex-1",
    volumeSlider: "vds-volume-slider vds-slider player-volume-slider shrink-0",
    track: "vds-slider-track",
    trackFill: "vds-slider-track vds-slider-track-fill",
    progress: "vds-slider-track vds-slider-progress",
    thumb: "vds-slider-thumb",
    time: "shrink-0 font-player-time text-player-time tabular-nums",
  },
  variants: {
    padding: {
      default: { controlGroup: "p-player-control" },
      none: { controlGroup: "p-0" },
    },
  },
  defaultVariants: {
    padding: "default",
  },
})

const PlayerContext = createContext(false)

function usePlayerContext() {
  if (!useContext(PlayerContext)) {
    throw new Error("Player components must be used within Player.Root")
  }
}

export type PlayerProps = ComponentProps<typeof MediaPlayer>
export type PlayerControlsProps = ComponentProps<typeof MediaControls.Root>
export type PlayerControlProps = ComponentProps<"div">
export type PlayerControlGroupProps = ComponentProps<
  typeof MediaControls.Group
> & {
  padding?: "default" | "none"
}
export type PlayerPlayButtonProps = Omit<
  ComponentProps<typeof MediaPlayButton>,
  "asChild" | "children"
> & {
  icon?: IconType
  pauseIcon?: IconType
}
export type PlayerMuteButtonProps = Omit<
  ComponentProps<typeof MediaMuteButton>,
  "asChild" | "children"
> & {
  icon?: IconType
  mutedIcon?: IconType
  lowVolumeIcon?: IconType
}
export type PlayerFullscreenButtonProps = Omit<
  ComponentProps<typeof MediaFullscreenButton>,
  "asChild" | "children"
> & {
  icon?: IconType
  exitIcon?: IconType
}
export type PlayerSeekButtonProps = Omit<
  ComponentProps<typeof MediaSeekButton>,
  "asChild" | "children" | "seconds"
> & {
  direction: "forward" | "backward"
  seconds?: number
}
export type PlayerTimeSliderProps = Omit<
  ComponentProps<typeof TimeSlider.Root>,
  "asChild" | "children" | "orientation"
>
export type PlayerVolumeSliderProps = Omit<
  ComponentProps<typeof VolumeSlider.Root>,
  "asChild" | "children" | "orientation"
>

export function Player({
  className,
  "aria-label": ariaLabel,
  ariaLabel: mediaLabel,
  ...props
}: PlayerProps) {
  const messages = useUiMessages().player
  const label = ariaLabel ?? mediaLabel ?? props.title ?? messages.label
  return (
    <PlayerContext.Provider value={true}>
      <MediaPlayer
        {...props}
        aria-label={label}
        ariaLabel={label}
        className={playerStyles().root({ className })}
      />
    </PlayerContext.Provider>
  )
}

Player.Provider = function PlayerProvider(
  props: ComponentProps<typeof MediaProvider>
) {
  usePlayerContext()
  return <MediaProvider {...props} />
}

Player.Controls = function PlayerControls({
  className,
  ...props
}: PlayerControlsProps) {
  usePlayerContext()
  return (
    <MediaControls.Root
      {...props}
      className={playerStyles().controls({ className })}
    />
  )
}

Player.Poster = function PlayerPoster({
  alt = "",
  className,
  "aria-hidden": ariaHidden,
  ...props
}: ComponentProps<typeof Poster>) {
  usePlayerContext()
  return (
    <Poster
      {...props}
      alt={alt}
      aria-hidden={ariaHidden ?? (alt === "" ? true : undefined)}
      className={playerStyles().poster({ className })}
    />
  )
}

Player.PlayButton = function PlayerPlayButton({
  icon = "token-icon-player-play",
  pauseIcon = "token-icon-player-pause",
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerPlayButtonProps) {
  usePlayerContext()
  const paused = useMediaState("paused")
  const messages = useUiMessages().player
  const label = ariaLabel ?? (paused ? messages.play : messages.pause)
  return (
    <MediaPlayButton
      {...props}
      aria-label={label}
      asChild
      className={playerStyles().iconButton({ className })}
    >
      <ActionIcon
        aria-label={label}
        icon={paused ? icon : pauseIcon}
        size="lg"
        type="button"
      />
    </MediaPlayButton>
  )
}

Player.MuteButton = function PlayerMuteButton({
  icon = "token-icon-player-volume-high",
  mutedIcon = "token-icon-player-mute",
  lowVolumeIcon = "token-icon-player-volume-low",
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerMuteButtonProps) {
  usePlayerContext()
  const muted = useMediaState("muted")
  const volume = useMediaState("volume")
  const messages = useUiMessages().player
  const label =
    ariaLabel ?? (muted || volume === 0 ? messages.unmute : messages.mute)
  const volumeIcon = volume >= 0.5 ? icon : lowVolumeIcon
  const resolvedIcon = muted || volume === 0 ? mutedIcon : volumeIcon
  return (
    <MediaMuteButton
      {...props}
      aria-label={label}
      asChild
      className={playerStyles().iconButton({ className })}
    >
      <ActionIcon
        aria-label={label}
        icon={resolvedIcon}
        size="lg"
        type="button"
      />
    </MediaMuteButton>
  )
}

Player.TimeSlider = function PlayerTimeSlider({
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerTimeSliderProps) {
  usePlayerContext()
  const styles = playerStyles()
  const messages = useUiMessages().player
  return (
    <TimeSlider.Root
      {...props}
      aria-label={ariaLabel ?? messages.seek}
      className={styles.timeSlider({ className })}
    >
      <TimeSlider.Track className={styles.track()}>
        <TimeSlider.TrackFill className={styles.trackFill()} />
        <TimeSlider.Progress className={styles.progress()} />
      </TimeSlider.Track>
      <TimeSlider.Thumb className={styles.thumb()} />
    </TimeSlider.Root>
  )
}

Player.VolumeSlider = function PlayerVolumeSlider({
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerVolumeSliderProps) {
  usePlayerContext()
  const styles = playerStyles()
  const messages = useUiMessages().player
  return (
    <VolumeSlider.Root
      {...props}
      aria-label={ariaLabel ?? messages.volume}
      className={styles.volumeSlider({ className })}
    >
      <VolumeSlider.Track className={styles.track()}>
        <VolumeSlider.TrackFill className={styles.trackFill()} />
      </VolumeSlider.Track>
      <VolumeSlider.Thumb className={styles.thumb()} />
    </VolumeSlider.Root>
  )
}

Player.Time = function PlayerTime({
  className,
  ...props
}: ComponentProps<typeof Time>) {
  usePlayerContext()
  return <Time {...props} className={playerStyles().time({ className })} />
}

Player.FullscreenButton = function PlayerFullscreenButton({
  icon = "token-icon-player-fullscreen",
  exitIcon = "token-icon-player-fullscreen-exit",
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerFullscreenButtonProps) {
  usePlayerContext()
  const fullscreen = useMediaState("fullscreen")
  const messages = useUiMessages().player
  const label =
    ariaLabel ??
    (fullscreen ? messages.exitFullscreen : messages.enterFullscreen)
  return (
    <MediaFullscreenButton
      {...props}
      aria-label={label}
      asChild
      className={playerStyles().iconButton({ className })}
    >
      <ActionIcon
        aria-label={label}
        icon={fullscreen ? exitIcon : icon}
        size="lg"
        type="button"
      />
    </MediaFullscreenButton>
  )
}

Player.SeekButton = function PlayerSeekButton({
  direction,
  seconds = 10,
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerSeekButtonProps) {
  usePlayerContext()
  const messages = useUiMessages().player
  const label =
    ariaLabel ??
    (direction === "forward"
      ? messages.seekForward(seconds)
      : messages.seekBackward(seconds))
  return (
    <MediaSeekButton
      {...props}
      aria-label={label}
      asChild
      className={playerStyles().iconButton({ className })}
      seconds={direction === "forward" ? seconds : -seconds}
    >
      <ActionIcon
        aria-label={label}
        icon={
          direction === "forward"
            ? "token-icon-player-seek-forward"
            : "token-icon-player-seek-backward"
        }
        size="lg"
        type="button"
      />
    </MediaSeekButton>
  )
}

Player.Control = function PlayerControl({
  className,
  ...props
}: PlayerControlProps) {
  usePlayerContext()
  return <div {...props} className={playerStyles().control({ className })} />
}

Player.ControlGroup = function PlayerControlGroup({
  className,
  padding = "default",
  ...props
}: PlayerControlGroupProps) {
  usePlayerContext()
  return (
    <MediaControls.Group
      {...props}
      className={playerStyles({ padding }).controlGroup({ className })}
    />
  )
}

Player.Root = Player
Player.displayName = "Player"
