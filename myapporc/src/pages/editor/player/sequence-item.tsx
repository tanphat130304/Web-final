/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence } from "remotion";
import TextLayer from "./editable-text";
import {
  IAudio,
  ICaption,
  IImage,
  IItem,
  IText,
  IVideo,
} from "@designcombo/types";
import useStore from "../store/use-store";
import { useCurrentPlayerFrame } from "@/hooks/use-current-frame";
import { calculateFrames } from "../utils/frames";
import { Animated } from "./animated";
import {
  calculateContainerStyles,
  calculateMediaStyles,
  calculateTextStyles,
} from "./styles";
import { getAnimations } from "../utils/get-animations";
import useVideoStore from "@/store/use-video-store";
import { useFetchVideo } from "@/hooks/use-fetch-video";
import { useAuthenticatedVideo } from "@/hooks/use-authenticated-video";
import useAuthStore from "@/store/use-auth-store";
import { useMemo, useCallback, memo } from "react";

interface SequenceItemOptions {
  handleTextChange?: (id: string, text: string) => void;
  fps: number;
  editableTextId?: string | null;
  currentTime?: number;
  zIndex?: number;
  active?: boolean;
  onTextBlur?: (id: string, text: string) => void;
}

interface WordSpanProps {
  isActive: boolean;
  activeBackgroundColor: string;
  activeColor: string;
}

const WordSpan = styled.span<WordSpanProps>`
  position: relative;
  display: inline-block;
  padding: 0 0.2em;
  color: #fff;
  border-radius: 16px;

  z-index: 99;
  &::before {
    content: "";
    position: absolute;
    z-index: -1;
    // background-color: transparent;
    border-radius: 0.1em;
    left: -0.2em;
    right: -0.2em;
    top: 0;
    bottom: 0;
    transition: background-color 0.2s ease;
    border-radius: 16px;
  }

  ${(props) =>
    props.isActive &&
    css`
      color: ${props.activeColor};
      &::before {
        background-color: ${props.activeBackgroundColor};
      }
    `}
`;

const CaptionWord = ({
  word,
  offsetFrom,
}: {
  word: any;
  offsetFrom: number;
}) => {
  const { playerRef } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef!);
  const { start, end } = word;
  const startAtFrame = ((start + offsetFrom) / 1000) * 30;
  const endAtFrame = ((end + offsetFrom) / 1000) * 30;
  const isActive = currentFrame > startAtFrame && currentFrame < endAtFrame;

  return (
    <WordSpan
      isActive={isActive}
      activeColor={"#50FF12"}
      activeBackgroundColor="#7E12FF" // You can make this dynamic by passing it as a prop or from a theme
    >
      {word.word}
    </WordSpan>
  );
};

// Memoized video component to prevent unnecessary re-renders
const VideoSequenceItem = memo(({ item, options }: { item: IVideo, options: SequenceItemOptions }) => {
  const { fps, zIndex } = options;
  const { details, animations } = item;
  const { animationIn, animationOut } = getAnimations(animations!, item);
  const playbackRate = item.playbackRate || 1;
  const { isMuted } = useStore();
  const { from, durationInFrames } = calculateFrames(
    {
      from: item.display.from / playbackRate,
      to: item.display.to / playbackRate,
    },
    fps,
  );
  const crop = details.crop || {
    x: 0,
    y: 0,
    width: item.details.width,
    height: item.details.height,
  };

  // Determine if we should load authenticated video
  const shouldLoadAuthVideo = details.src && !details.src.startsWith('blob:') && !details.src.startsWith('http');
  
  // Get the selected video ID from the store
  const { selectedVideoId } = useVideoStore();
  
  // Use authenticated video hook only when needed
  const { blobUrl, loading: isLoadingVideo } = shouldLoadAuthVideo && selectedVideoId ? 
    useAuthenticatedVideo(selectedVideoId) : 
    { blobUrl: null, loading: false };
  
  // Determine final video source
  const videoSrc = useMemo(() => {
    if (shouldLoadAuthVideo && blobUrl) {
      return blobUrl;
    }
    return details.src;
  }, [shouldLoadAuthVideo, blobUrl, details.src]);

  // Memoize the container and media styles to prevent recalculation
  const containerStyles = useMemo(
    () => calculateContainerStyles(details, crop),
    [details, crop]
  );

  const animationContainerStyles = useMemo(
    () => calculateContainerStyles(details, crop, { overflow: "hidden" }),
    [details, crop]
  );

  const mediaStyles = useMemo(
    () => calculateMediaStyles(details, crop, { preserveAspectRatio: true }),
    [details, crop]
  );

  // Stable key that includes essential video properties
  const stableKey = useMemo(
    () => `${item.id}-${videoSrc || 'no-src'}-${playbackRate}-${isMuted}`,
    [item.id, videoSrc, playbackRate, isMuted]
  );

  return (
    <Sequence
      key={stableKey}
      from={from}
      durationInFrames={durationInFrames}
      style={{ pointerEvents: "none", zIndex }}
    >
      <AbsoluteFill
        data-track-item="transition-element"
        className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}`}
        style={containerStyles}
      >
        {/* animation layer */}
        <Animated
          style={animationContainerStyles}
          animationIn={animationIn}
          animationOut={animationOut}
          durationInFrames={durationInFrames}
        >
          <div style={mediaStyles}>
            {!isLoadingVideo && videoSrc ? (
              <OffthreadVideo
                startFrom={(item.trim?.from! / 1000) * fps}
                endAt={(item.trim?.to! / 1000) * fps}
                playbackRate={playbackRate}
                src={videoSrc}
                volume={isMuted ? 0 : (details.volume || 0) / 100}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#1a1a1a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                {isLoadingVideo ? "Loading..." : "Video"}
              </div>
            )}
          </div>
        </Animated>
      </AbsoluteFill>
    </Sequence>
  );
});

VideoSequenceItem.displayName = 'VideoSequenceItem';

export const SequenceItem: Record<
  string,
  (item: IItem, options: SequenceItemOptions) => JSX.Element
> = {
  text: (item, options: SequenceItemOptions) => {
    const { handleTextChange, onTextBlur, fps, editableTextId, zIndex } =
      options;
    const { id, details, animations } = item as IText;
    const { from, durationInFrames } = calculateFrames(item.display, fps);
    const { animationIn, animationOut } = getAnimations(animations!, item);
    return (
      <Sequence
        key={item.id}
        from={from}
        durationInFrames={durationInFrames}
        style={{ pointerEvents: "none", zIndex }}
      >
        {/* positioning layer */}
        <AbsoluteFill
          data-track-item="transition-element"
          className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}`}
          style={calculateContainerStyles(details)}
        >
          {/* animation layer */}
          <Animated
            style={calculateContainerStyles(details)}
            animationIn={editableTextId === id ? null : animationIn}
            animationOut={editableTextId === id ? null : animationOut}
            durationInFrames={durationInFrames}
          >
            {/* text layer */}
            <TextLayer
              key={id}
              id={id}
              content={details.text}
              editable={editableTextId === id}
              onChange={handleTextChange}
              onBlur={onTextBlur}
              style={calculateTextStyles(details)}
            />
          </Animated>
        </AbsoluteFill>
      </Sequence>
    );
  },
  caption: (item, options: SequenceItemOptions) => {
    const { fps, zIndex } = options;
    const { details, metadata, display } = item as ICaption;
    const { from, durationInFrames } = calculateFrames(item.display, fps);
    const [firstWord] = metadata.words;
    const offsetFrom = display.from - firstWord.start;
    return (
      <Sequence
        key={item.id}
        from={from}
        durationInFrames={durationInFrames}
        data-track-item="transition-element"
        style={{ pointerEvents: "none", zIndex }}
      >
        {/* positioning layer */}
        <AbsoluteFill
          data-track-item="transition-element"
          className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}`}
          style={calculateContainerStyles(details)}
        >
          <Animated
            style={calculateContainerStyles(details)}
            animationIn={null}
            animationOut={null}
            durationInFrames={durationInFrames}
          >
            <div
              style={{
                ...calculateTextStyles(details),
                WebkitTextStroke: "10px #000000",
                paintOrder: "stroke fill",
              }}
            >
              {item.metadata.words.map((word: any, index: number) => (
                <CaptionWord offsetFrom={offsetFrom} word={word} key={index} />
              ))}
            </div>
          </Animated>
        </AbsoluteFill>
      </Sequence>
    );
  },
  image: (item, options: SequenceItemOptions) => {
    const { fps, zIndex } = options;
    const { details, animations } = item as IImage;
    const { from, durationInFrames } = calculateFrames(item.display, fps);
    const { animationIn, animationOut } = getAnimations(animations!, item);
    const crop = details.crop || {
      x: 0,
      y: 0,
      width: item.details.width,
      height: item.details.height,
    };
    return (
      <Sequence
        key={item.id}
        from={from}
        durationInFrames={durationInFrames}
        style={{ pointerEvents: "none", zIndex }}
      >
        {/* position layer */}
        <AbsoluteFill
          data-track-item="transition-element"
          className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}`}
          style={calculateContainerStyles(details, crop)}
        >
          {/* animation layer */}
          <Animated
            style={calculateContainerStyles(details, crop, {
              overflow: "hidden",
            })}
            animationIn={animationIn!}
            animationOut={animationOut!}
            durationInFrames={durationInFrames}
          >
            <div style={calculateMediaStyles(details, crop)}>
              <Img data-id={item.id} src={details.src} />
            </div>
          </Animated>
        </AbsoluteFill>
      </Sequence>
    );
  },
  video: (item, options: SequenceItemOptions) => {
    return <VideoSequenceItem item={item as IVideo} options={options} />;
  },
  audio: (item, options: SequenceItemOptions) => {
    const { fps, zIndex } = options;
    const { details } = item as IAudio;
    const playbackRate = item.playbackRate || 1;
    const { isMuted } = useStore();
    const { from, durationInFrames } = calculateFrames(
      {
        from: item.display.from / playbackRate,
        to: item.display.to / playbackRate,
      },
      fps,
    );
    return (
      <Sequence
        key={item.id}
        from={from}
        durationInFrames={durationInFrames}
        style={{
          userSelect: "none",
          pointerEvents: "none",
          zIndex,
        }}
      >
        <AbsoluteFill>
          <Audio
            startFrom={(item.trim?.from! / 1000) * fps}
            endAt={(item.trim?.to! / 1000) * fps}
            playbackRate={playbackRate}
            src={details.src}
            volume={isMuted ? 0 : details.volume! / 100}
          />
        </AbsoluteFill>
      </Sequence>
    );
  },
};
