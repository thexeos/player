import * as React from 'react';
import { isString } from 'maverick.js/std';
import {
  isTrackCaptionKind,
  type DefaultLayoutTranslations,
  type TooltipPlacement,
} from 'vidstack/local';
import { useAudioOptions } from '../../../hooks/options/use-audio-options';
import { useCaptionOptions } from '../../../hooks/options/use-caption-options';
import { useChapterOptions } from '../../../hooks/options/use-chapter-options';
import { usePlaybackRateOptions } from '../../../hooks/options/use-playback-rate-options';
import { useVideoQualityOptions } from '../../../hooks/options/use-video-quality-options';
import { useActiveTextCues } from '../../../hooks/use-active-text-cues';
import { useActiveTextTrack } from '../../../hooks/use-active-text-track';
import { useMediaRemote } from '../../../hooks/use-media-remote';
import { useMediaState } from '../../../hooks/use-media-state';
import { usePlayerQuery } from '../../../hooks/use-player-query';
import type { PrimitivePropsWithRef } from '../../primitives/nodes';
import { CaptionButton } from '../../ui/buttons/caption-button';
import { FullscreenButton } from '../../ui/buttons/fullscreen-button';
import { MuteButton } from '../../ui/buttons/mute-button';
import { PIPButton } from '../../ui/buttons/pip-button';
import { PlayButton } from '../../ui/buttons/play-button';
import { SeekButton } from '../../ui/buttons/seek-button';
import * as MenuBase from '../../ui/menu';
import * as TimeSliderBase from '../../ui/sliders/time-slider';
import * as VolumeSliderBase from '../../ui/sliders/volume-slider';
import * as ThumbnailBase from '../../ui/thumbnail';
import { Time } from '../../ui/time';
import * as TooltipBase from '../../ui/tooltip';
import { DefaultLayoutContext, useDefaultLayoutLang } from './context';
import type { DefaultLayoutIcon, DefaultLayoutIcons } from './icons';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface DefaultMediaButtonProps {
  tooltip: TooltipBase.ContentProps['placement'];
}

interface DefaultMediaMenuProps {
  tooltip: TooltipBase.ContentProps['placement'];
  placement: MenuBase.ContentProps['placement'];
  portalClass?: string;
}

/* -------------------------------------------------------------------------------------------------
 * DefaultMediaLayout
 * -----------------------------------------------------------------------------------------------*/

export interface DefaultMediaLayoutProps extends PrimitivePropsWithRef<'div'> {
  icons: DefaultLayoutIcons;
  thumbnails?: string;
  translations?: DefaultLayoutTranslations | null;
  showTooltipDelay?: number;
  showMenuDelay?: number;
  smallLayoutWhen?: string | boolean;
  children?: React.ReactNode;
}

export interface CreateDefaultMediaLayout {
  type: 'audio' | 'video';
  smLayoutWhen: string;
  SmallLayout: React.FC;
  LargeLayout: React.FC;
}

export const createDefaultMediaLayout = ({
  type,
  smLayoutWhen,
  SmallLayout,
  LargeLayout,
}: CreateDefaultMediaLayout) =>
  React.forwardRef<HTMLDivElement, DefaultMediaLayoutProps>(
    (
      {
        className,
        icons,
        thumbnails,
        translations,
        showMenuDelay,
        showTooltipDelay = type === 'video' ? 500 : 700,
        smallLayoutWhen = smLayoutWhen,
        children,
        ...props
      },
      forwardRef,
    ) => {
      const $canLoad = useMediaState('canLoad'),
        $viewType = useMediaState('viewType'),
        isMatch = $viewType === type,
        isForcedLayout = typeof smallLayoutWhen === 'boolean',
        isSmallLayoutMatch = usePlayerQuery(isString(smallLayoutWhen) ? smallLayoutWhen : ''),
        isSmallLayout = isForcedLayout ? smallLayoutWhen : isSmallLayoutMatch;

      return (
        <div
          {...props}
          className={`vds-${type}-layout` + (className ? ` ${className}` : '')}
          data-match={isMatch ? '' : null}
          data-size={isSmallLayout ? 'sm' : null}
          ref={forwardRef}
        >
          {($canLoad || isForcedLayout) && isMatch ? (
            <DefaultLayoutContext.Provider
              value={{
                thumbnails,
                translations,
                isSmallLayout,
                showMenuDelay,
                showTooltipDelay,
                Icons: icons,
              }}
            >
              {isSmallLayout ? <SmallLayout /> : <LargeLayout />}
              {children}
            </DefaultLayoutContext.Provider>
          ) : null}
        </div>
      );
    },
  );

/* -------------------------------------------------------------------------------------------------
 * DefaultTooltip
 * -----------------------------------------------------------------------------------------------*/

export interface DefaultTooltipProps {
  content: string;
  placement?: TooltipPlacement;
  children: React.ReactNode;
}

function DefaultTooltip({ content, placement, children }: DefaultTooltipProps) {
  const { showTooltipDelay } = React.useContext(DefaultLayoutContext);
  return (
    <TooltipBase.Root showDelay={showTooltipDelay}>
      <TooltipBase.Trigger asChild>{children}</TooltipBase.Trigger>
      <TooltipBase.Content className="vds-tooltip-content" placement={placement}>
        {content}
      </TooltipBase.Content>
    </TooltipBase.Root>
  );
}

DefaultTooltip.displayName = 'DefaultTooltip';
export { DefaultTooltip };

/* -------------------------------------------------------------------------------------------------
 * DefaultPlayButton
 * -----------------------------------------------------------------------------------------------*/

function DefaultPlayButton({ tooltip }: DefaultMediaButtonProps) {
  const { Icons } = React.useContext(DefaultLayoutContext),
    playText = useDefaultLayoutLang('Play'),
    pauseText = useDefaultLayoutLang('Pause'),
    paused = useMediaState('paused'),
    ended = useMediaState('ended');
  return (
    <DefaultTooltip content={paused ? playText : pauseText} placement={tooltip}>
      <PlayButton className="vds-play-button vds-button">
        {ended ? (
          <Icons.PlayButton.Replay className="vds-icon" />
        ) : paused ? (
          <Icons.PlayButton.Play className="vds-icon" />
        ) : (
          <Icons.PlayButton.Pause className="vds-icon" />
        )}
      </PlayButton>
    </DefaultTooltip>
  );
}

DefaultPlayButton.displayName = 'DefaultPlayButton';
export { DefaultPlayButton };

/* -------------------------------------------------------------------------------------------------
 * DefaultMuteButton
 * -----------------------------------------------------------------------------------------------*/

function DefaultMuteButton({ tooltip }: DefaultMediaButtonProps) {
  const { Icons } = React.useContext(DefaultLayoutContext),
    muteText = useDefaultLayoutLang('Mute'),
    unmuteText = useDefaultLayoutLang('Unmute'),
    muted = useMediaState('muted'),
    volume = useMediaState('volume');
  return (
    <DefaultTooltip content={muted ? unmuteText : muteText} placement={tooltip}>
      <MuteButton className="vds-mute-button vds-button">
        {muted || volume == 0 ? (
          <Icons.MuteButton.Mute className="vds-icon" />
        ) : volume < 0.5 ? (
          <Icons.MuteButton.VolumeLow className="vds-icon" />
        ) : (
          <Icons.MuteButton.VolumeHigh className="vds-icon" />
        )}
      </MuteButton>
    </DefaultTooltip>
  );
}

DefaultMuteButton.displayName = 'DefaultMuteButton';
export { DefaultMuteButton };

/* -------------------------------------------------------------------------------------------------
 * DefaultCaptionButton
 * -----------------------------------------------------------------------------------------------*/

function DefaultCaptionButton({ tooltip }: DefaultMediaButtonProps) {
  const { Icons } = React.useContext(DefaultLayoutContext),
    onText = useDefaultLayoutLang('Closed-Captions On'),
    offText = useDefaultLayoutLang('Closed-Captions Off'),
    track = useMediaState('textTrack'),
    isOn = track && isTrackCaptionKind(track);
  return (
    <DefaultTooltip content={isOn ? onText : offText} placement={tooltip}>
      <CaptionButton className="vds-caption-button vds-button">
        {isOn ? (
          <Icons.CaptionButton.On className="vds-icon" />
        ) : (
          <Icons.CaptionButton.Off className="vds-icon" />
        )}
      </CaptionButton>
    </DefaultTooltip>
  );
}

DefaultCaptionButton.displayName = 'DefaultCaptionButton';
export { DefaultCaptionButton };

/* -------------------------------------------------------------------------------------------------
 * DefaultPIPButton
 * -----------------------------------------------------------------------------------------------*/

function DefaultPIPButton({ tooltip }: DefaultMediaButtonProps) {
  const { Icons } = React.useContext(DefaultLayoutContext),
    enterText = useDefaultLayoutLang('Enter PiP'),
    exitText = useDefaultLayoutLang('Exit PiP'),
    pip = useMediaState('pictureInPicture');
  return (
    <DefaultTooltip content={pip ? exitText : enterText} placement={tooltip}>
      <PIPButton className="vds-pip-button vds-button">
        {pip ? (
          <Icons.PIPButton.Exit className="vds-icon" />
        ) : (
          <Icons.PIPButton.Enter className="vds-icon" />
        )}
      </PIPButton>
    </DefaultTooltip>
  );
}

DefaultPIPButton.displayName = 'DefaultPIPButton';
export { DefaultPIPButton };

/* -------------------------------------------------------------------------------------------------
 * DefaultFullscreenButton
 * -----------------------------------------------------------------------------------------------*/

function DefaultFullscreenButton({ tooltip }: DefaultMediaButtonProps) {
  const { Icons } = React.useContext(DefaultLayoutContext),
    enterText = useDefaultLayoutLang('Enter Fullscreen'),
    exitText = useDefaultLayoutLang('Exit Fullscreen'),
    fullscreen = useMediaState('fullscreen');
  return (
    <DefaultTooltip content={fullscreen ? exitText : enterText} placement={tooltip}>
      <FullscreenButton className="vds-fullscreen-button vds-button">
        {fullscreen ? (
          <Icons.FullscreenButton.Exit className="vds-icon" />
        ) : (
          <Icons.FullscreenButton.Enter className="vds-icon" />
        )}
      </FullscreenButton>
    </DefaultTooltip>
  );
}

DefaultFullscreenButton.displayName = 'DefaultFullscreenButton';
export { DefaultFullscreenButton };

/* -------------------------------------------------------------------------------------------------
 * DefaultSeekButton
 * -----------------------------------------------------------------------------------------------*/

function DefaultSeekButton({ seconds, tooltip }: DefaultMediaButtonProps & { seconds: number }) {
  const { Icons } = React.useContext(DefaultLayoutContext),
    seekForwardText = useDefaultLayoutLang('Seek Forward'),
    seekBackwardText = useDefaultLayoutLang('Seek Backward');
  return (
    <DefaultTooltip content={seconds >= 0 ? seekForwardText : seekBackwardText} placement={tooltip}>
      <SeekButton className="vds-seek-button vds-button" seconds={seconds}>
        {seconds >= 0 ? (
          <Icons.SeekButton.Forward className="vds-icon" />
        ) : (
          <Icons.SeekButton.Backward className="vds-icon" />
        )}
      </SeekButton>
    </DefaultTooltip>
  );
}

DefaultSeekButton.displayName = 'DefaultSeekButton';
export { DefaultSeekButton };

/* -------------------------------------------------------------------------------------------------
 * DefaultVolumeSlider
 * -----------------------------------------------------------------------------------------------*/

function DefaultVolumeSlider() {
  return (
    <VolumeSliderBase.Root className="vds-volume-slider vds-slider">
      <VolumeSliderBase.Track className="vds-slider-track" />
      <VolumeSliderBase.TrackFill className="vds-slider-track-fill vds-slider-track" />
      <VolumeSliderBase.Thumb className="vds-slider-thumb" />
      <VolumeSliderBase.Preview className="vds-slider-preview" noClamp>
        <VolumeSliderBase.Value className="vds-slider-value" />
      </VolumeSliderBase.Preview>
    </VolumeSliderBase.Root>
  );
}

DefaultVolumeSlider.displayName = 'DefaultVolumeSlider';
export { DefaultVolumeSlider };

/* -------------------------------------------------------------------------------------------------
 * DefaultTimeSlider
 * -----------------------------------------------------------------------------------------------*/

function DefaultTimeSlider() {
  const { thumbnails, isSmallLayout } = React.useContext(DefaultLayoutContext);
  return (
    <TimeSliderBase.Root className="vds-time-slider vds-slider">
      <TimeSliderBase.Chapters className="vds-slider-chapters" disabled={isSmallLayout}>
        {(cues, forwardRef) =>
          cues.map((cue) => (
            <div className="vds-slider-chapter" key={cue.startTime} ref={forwardRef}>
              <TimeSliderBase.Track className="vds-slider-track" />
              <TimeSliderBase.TrackFill className="vds-slider-track-fill vds-slider-track" />
              <TimeSliderBase.Progress className="vds-slider-progress vds-slider-track" />
            </div>
          ))
        }
      </TimeSliderBase.Chapters>
      <TimeSliderBase.Thumb className="vds-slider-thumb" />
      <TimeSliderBase.Preview className="vds-slider-preview">
        <TimeSliderBase.Thumbnail.Root
          src={thumbnails}
          className="vds-slider-thumbnail vds-thumbnail"
        >
          <TimeSliderBase.Thumbnail.Img />
        </TimeSliderBase.Thumbnail.Root>
        <TimeSliderBase.ChapterTitle className="vds-slider-chapter-title" />
        <TimeSliderBase.Value className="vds-slider-value" />
      </TimeSliderBase.Preview>
    </TimeSliderBase.Root>
  );
}

DefaultTimeSlider.displayName = 'DefaultTimeSlider';
export { DefaultTimeSlider };

/* -------------------------------------------------------------------------------------------------
 * MainTitle
 * -----------------------------------------------------------------------------------------------*/

function DefaultMainTitle() {
  const $title = useMediaState('title');
  return <span className="vds-media-title">{$title}</span>;
}

DefaultMainTitle.displayName = 'DefaultMainTitle';
export { DefaultMainTitle };

/* -------------------------------------------------------------------------------------------------
 * DefaultChapterTitle
 * -----------------------------------------------------------------------------------------------*/

function DefaultChapterTitle() {
  const $started = useMediaState('started'),
    $title = useMediaState('title'),
    track = useActiveTextTrack('chapters'),
    cues = useActiveTextCues(track);
  return <span className="vds-media-title">{$started ? cues[0]?.text || $title : $title}</span>;
}

DefaultChapterTitle.displayName = 'DefaultChapterTitle';
export { DefaultChapterTitle };

/* -------------------------------------------------------------------------------------------------
 * DefaultTimeGroup
 * -----------------------------------------------------------------------------------------------*/

function DefaultTimeGroup() {
  return (
    <div className="vds-time-group">
      <Time className="vds-time" type="current" />
      <div className="vds-time-divider">/</div>
      <Time className="vds-time" type="duration" />
    </div>
  );
}

DefaultTimeGroup.displayName = 'DefaultTimeGroup';
export { DefaultTimeGroup };

/* -------------------------------------------------------------------------------------------------
 * DefaultChaptersMenu
 * -----------------------------------------------------------------------------------------------*/

function DefaultChaptersMenu({ tooltip, placement, portalClass }: DefaultMediaMenuProps) {
  const { showMenuDelay, Icons } = React.useContext(DefaultLayoutContext),
    chaptersText = useDefaultLayoutLang('Chapters'),
    options = useChapterOptions(),
    disabled = !options.length,
    { thumbnails } = React.useContext(DefaultLayoutContext);
  return (
    <MenuBase.Root className="vds-chapters-menu vds-menu" showDelay={showMenuDelay}>
      <DefaultTooltip content={chaptersText} placement={tooltip}>
        <MenuBase.Button className="vds-menu-button vds-button" disabled={disabled}>
          <Icons.Menu.Chapters className="vds-icon" />
        </MenuBase.Button>
      </DefaultTooltip>
      <MenuBase.Portal className={portalClass} disabled="fullscreen">
        <MenuBase.Content className="vds-chapters-menu-items vds-menu-items" placement={placement}>
          <MenuBase.RadioGroup
            className="vds-chapters-radio-group vds-radio-group"
            value={options.selectedValue}
            data-thumbnails={!!thumbnails}
          >
            {options.map(
              ({ cue, label, value, startTimeText, durationText, select, setProgressVar }) => (
                <MenuBase.Radio
                  className="vds-chapter-radio vds-radio"
                  value={value}
                  key={value}
                  onSelect={select}
                  ref={setProgressVar}
                >
                  <ThumbnailBase.Root
                    src={thumbnails}
                    className="vds-thumbnail"
                    time={cue.startTime}
                  >
                    <ThumbnailBase.Img />
                  </ThumbnailBase.Root>
                  <div className="vds-chapter-radio-content">
                    <span className="vds-chapter-radio-label">{label}</span>
                    <span className="vds-chapter-radio-start-time">{startTimeText}</span>
                    <span className="vds-chapter-radio-duration">{durationText}</span>
                  </div>
                </MenuBase.Radio>
              ),
            )}
          </MenuBase.RadioGroup>
        </MenuBase.Content>
      </MenuBase.Portal>
    </MenuBase.Root>
  );
}

DefaultChaptersMenu.displayName = 'DefaultChaptersMenu';
export { DefaultChaptersMenu };

/* -------------------------------------------------------------------------------------------------
 * DefaultSettingsMenu
 * -----------------------------------------------------------------------------------------------*/

function DefaultSettingsMenu({ tooltip, placement, portalClass }: DefaultMediaMenuProps) {
  const { showMenuDelay, Icons } = React.useContext(DefaultLayoutContext),
    settingsText = useDefaultLayoutLang('Settings');
  return (
    <MenuBase.Root className="vds-settings-menu vds-menu" showDelay={showMenuDelay}>
      <DefaultTooltip content={settingsText} placement={tooltip}>
        <MenuBase.Button className="vds-menu-button vds-button">
          <Icons.Menu.Settings className="vds-icon vds-rotate-icon" />
        </MenuBase.Button>
      </DefaultTooltip>
      <MenuBase.Portal className={portalClass} disabled="fullscreen">
        <MenuBase.Content className="vds-settings-menu-items vds-menu-items" placement={placement}>
          <DefaultAudioSubmenu />
          <DefaultSpeedSubmenu />
          <DefaultQualitySubmenu />
          <DefaultCaptionSubmenu />
        </MenuBase.Content>
      </MenuBase.Portal>
    </MenuBase.Root>
  );
}

DefaultSettingsMenu.displayName = 'DefaultSettingsMenu';
export { DefaultSettingsMenu };

/* -------------------------------------------------------------------------------------------------
 * DefaultSubmenuButton
 * -----------------------------------------------------------------------------------------------*/

export interface DefaultSubmenuButtonProps {
  label: string;
  hint: string;
  disabled: boolean;
  Icon: DefaultLayoutIcon;
}

function DefaultSubmenuButton({ label, hint, Icon, disabled }: DefaultSubmenuButtonProps) {
  const { Icons } = React.useContext(DefaultLayoutContext);
  return (
    <MenuBase.Button className="vds-menu-button" disabled={disabled}>
      <Icons.Menu.ArrowLeft className="vds-menu-button-close-icon vds-icon" />
      <Icon className="vds-menu-button-icon" />
      <span className="vds-menu-button-label">{label}</span>
      <span className="vds-menu-button-hint">{hint}</span>
      <Icons.Menu.ArrowRight className="vds-menu-button-open-icon vds-icon" />
    </MenuBase.Button>
  );
}

DefaultSubmenuButton.displayName = 'DefaultSubmenuButton';
export { DefaultSubmenuButton };

/* -------------------------------------------------------------------------------------------------
 * DefaultAudioSubmenu
 * -----------------------------------------------------------------------------------------------*/

function DefaultAudioSubmenu() {
  const { Icons } = React.useContext(DefaultLayoutContext),
    label = useDefaultLayoutLang('Audio'),
    defaultText = useDefaultLayoutLang('Default'),
    track = useMediaState('audioTrack'),
    options = useAudioOptions();
  return (
    <MenuBase.Root className="vds-audio-menu vds-menu">
      <DefaultSubmenuButton
        label={label}
        hint={track?.label ?? defaultText}
        disabled={!options.length}
        Icon={Icons.Menu.Audio}
      />
      <MenuBase.Content className="vds-menu-items">
        <MenuBase.RadioGroup
          className="vds-audio-radio-group vds-radio-group"
          value={options.selectedValue}
        >
          {options.map(({ label, value, select }) => (
            <MenuBase.Radio
              className="vds-audio-radio vds-radio"
              value={value}
              onSelect={select}
              key={value}
            >
              <div className="vds-radio-check" />
              <span className="vds-radio-label">{label}</span>
            </MenuBase.Radio>
          ))}
        </MenuBase.RadioGroup>
      </MenuBase.Content>
    </MenuBase.Root>
  );
}

DefaultAudioSubmenu.displayName = 'DefaultAudioSubmenu';

/* -------------------------------------------------------------------------------------------------
 * DefaultSpeedSubmenu
 * -----------------------------------------------------------------------------------------------*/

function DefaultSpeedSubmenu() {
  const { Icons } = React.useContext(DefaultLayoutContext),
    label = useDefaultLayoutLang('Speed'),
    normalText = useDefaultLayoutLang('Normal'),
    options = usePlaybackRateOptions(),
    hint = options.selectedValue === '1' ? normalText : options.selectedValue + 'x';
  return (
    <MenuBase.Root className="vds-speed-menu vds-menu">
      <DefaultSubmenuButton
        label={label}
        hint={hint}
        disabled={!options.length}
        Icon={Icons.Menu.Speed}
      />
      <MenuBase.Content className="vds-menu-items">
        <MenuBase.RadioGroup
          className="vds-speed-radio-group vds-radio-group"
          value={options.selectedValue}
        >
          {options.map(({ label, value, select }) => (
            <MenuBase.Radio
              className="vds-speed-radio vds-radio"
              value={value}
              onSelect={select}
              key={value}
            >
              <div className="vds-radio-check" />
              <span className="vds-radio-label">{label}</span>
            </MenuBase.Radio>
          ))}
        </MenuBase.RadioGroup>
      </MenuBase.Content>
    </MenuBase.Root>
  );
}

DefaultSpeedSubmenu.displayName = 'DefaultSpeedSubmenu';

/* -------------------------------------------------------------------------------------------------
 * DefaultQualitySubmenu
 * -----------------------------------------------------------------------------------------------*/

function DefaultQualitySubmenu() {
  const { Icons } = React.useContext(DefaultLayoutContext),
    label = useDefaultLayoutLang('Quality'),
    autoText = useDefaultLayoutLang('Auto'),
    autoQuality = useMediaState('autoQuality'),
    options = useVideoQualityOptions({ sort: 'descending' }),
    remote = useMediaRemote(),
    currentQualityText = options.selectedQuality?.height + 'p' ?? '',
    hint = !autoQuality ? currentQualityText : `${autoText} (${currentQualityText})`;
  return (
    <MenuBase.Root className="vds-quality-menu vds-menu">
      <DefaultSubmenuButton
        label={label}
        hint={hint}
        disabled={!options.length}
        Icon={Icons.Menu.Quality}
      />
      <MenuBase.Content className="vds-menu-items">
        <MenuBase.RadioGroup
          className="vds-quality-radio-group vds-radio-group"
          value={autoQuality ? 'auto' : options.selectedValue}
        >
          <MenuBase.Radio
            className="vds-quality-radio vds-radio"
            value="auto"
            onSelect={(event) => remote.requestAutoQuality(event)}
          >
            <div className="vds-radio-check" />
            {autoText}
          </MenuBase.Radio>
          {options.map(({ label, value, bitrateText, select }) => (
            <MenuBase.Radio
              className="vds-quality-radio vds-radio"
              value={value}
              onSelect={select}
              key={value}
            >
              <div className="vds-radio-check" />
              <span className="vds-radio-label">{label}</span>
              <span className="vds-radio-hint">{bitrateText}</span>
            </MenuBase.Radio>
          ))}
        </MenuBase.RadioGroup>
      </MenuBase.Content>
    </MenuBase.Root>
  );
}

DefaultQualitySubmenu.displayName = 'DefaultQualitySubmenu';

/* -------------------------------------------------------------------------------------------------
 * DefaultCaptionSubmenu
 * -----------------------------------------------------------------------------------------------*/

function DefaultCaptionSubmenu() {
  const { Icons } = React.useContext(DefaultLayoutContext),
    label = useDefaultLayoutLang('Captions'),
    offText = useDefaultLayoutLang('Off'),
    track = useMediaState('textTrack'),
    options = useCaptionOptions(),
    remote = useMediaRemote(),
    hint = track && isTrackCaptionKind(track) && track.mode === 'showing' ? track.label : offText;
  return (
    <MenuBase.Root className="vds-captions-menu vds-menu">
      <DefaultSubmenuButton
        label={label}
        hint={hint}
        disabled={!options.length}
        Icon={Icons.Menu.Captions}
      />
      <MenuBase.Content className="vds-menu-items">
        <MenuBase.RadioGroup
          className="vds-captions-radio-group vds-radio-group"
          value={options.selectedValue}
        >
          <MenuBase.Radio
            className="vds-caption-radio vds-radio"
            value="off"
            onSelect={(event) => remote.toggleCaptions(event)}
          >
            <div className="vds-radio-check" />
            {offText}
          </MenuBase.Radio>
          {options.map(({ label, value, select }) => (
            <MenuBase.Radio
              className="vds-caption-radio vds-radio"
              value={value}
              onSelect={select}
              key={value}
            >
              <div className="vds-radio-check" />
              <span className="vds-radio-label">{label}</span>
            </MenuBase.Radio>
          ))}
        </MenuBase.RadioGroup>
      </MenuBase.Content>
    </MenuBase.Root>
  );
}

DefaultCaptionSubmenu.displayName = 'DefaultCaptionSubmenu';