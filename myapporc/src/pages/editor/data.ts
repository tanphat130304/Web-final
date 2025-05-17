import { getVideoMetadata } from "@remotion/media-utils";
import useVideoStore from "@/store/use-video-store";
import { useFetchVideo } from "@/hooks/use-fetch-video";
import { useAuthenticatedVideo } from "@/hooks/use-authenticated-video";

export const empty = {
  id: "CI2BpIUBlIy9zhf",
  duration: 53000,
  fps: 30,
  tracks: [],
  size: {
    width: 1080,
    height: 1920,
  },
  trackItemDetailsMap: {},
  trackItemIds: [],
  transitionsMap: {},
  trackItemsMap: {},
  transitionIds: [],
};

export const emptyDesignWidthMagneticTrack = {
  id: "dtpMWWHEkZLIpTa4",
  fps: 30,
  tracks: [
    {
      id: "M4mVODTbQZo4iTcI98Ysi",
      accepts: [],
      type: "customTrack",
      items: [],
      magnetic: true,
      static: true,
    },
  ],
  size: { width: 1080, height: 1920 },
  trackItemDetailsMap: {},
  trackItemIds: [],
  transitionsMap: {},
  trackItemsMap: {},
  transitionIds: [],
};

// Hàm tạo dữ liệu với video từ API
export const createData = async (videoUrl: string, videoMetadata: any = null) => {
  // Mặc định sử dụng video từ CDN nếu không có videoUrl
  const videoSrc = videoUrl || "https://cdn.designcombo.dev/videos/Happiness%20shouldn%E2%80%99t%20depend.mp4";
  const previewUrl = videoMetadata?.thumbnail || "https://cdn.designcombo.dev/thumbnails/Happiness-shouldnt-depend.png";
  
  console.log(`Creating data with video URL: ${videoSrc}`);
  
  // Tính toán duration của video từ API
  let videoDurationInMs = 9999999; // Giá trị mặc định
  
  try {
    if (videoUrl) {
      console.log("Calculating video duration...");
      const metadata = await getVideoMetadata(videoSrc);
      videoDurationInMs = metadata.durationInSeconds * 1000;
      console.log(`Video duration: ${videoDurationInMs}ms`);
    }
  } catch (error) {
    console.error("Failed to get video metadata:", error);
    // Giữ lại giá trị mặc định nếu không lấy được metadata
  }

  return {
    id: "j1LfwJAoR9G3IhjE",
    fps: 30,
    tracks: [
      /* Comment text track
      {
        id: "xZ5gKuKPPvq92Kc9X2SA2",
        accepts: [
          "text",
          "audio",
          "helper",
          "video",
          "image",
          "caption",
          "template",
        ],
        type: "text",
        items: ["rmf4bMElei2wRe8G"],
        magnetic: false,
        static: false,
      },
      */
      /* Comment caption track
      {
        id: "roS-7tU5esh5R_mUXlsgl",
        accepts: [
          "text",
          "audio",
          "helper",
          "video",
          "image",
          "caption",
          "template",
        ],
        type: "caption",
        items: [
          "W1tb2sauODqNRhI5",
          "N326snvPf9O1XWB",
          "cpamVHqGkxVnQ2qp",
          "dvsBAKrDF6U0zTIV",
          "YpZM0yJx04Zb03zH",
          "CvXTedixwGMqnpS",
          "M2Sv36YckryY0NAS",
          "jxMeoaVX8BxOPEmS",
          "lM6VetPlAiCMU5T",
          "mdwLiXiu7SSFxSSB",
          "JC9MDYMvoHZkiu2w",
          "BWMEdVr9uGdg2pmN",
          "uSEooSKedBQi9eV",
          "a5JowII5uEpk6OQP",
        ],
        magnetic: false,
        static: false,
      },
      */
      {
        id: "k5g9E_w1gSC-goCzJK9nB",
        accepts: [
          "text",
          "audio",
          "helper",
          "video",
          "image",
          "caption",
          "template",
        ],
        type: "video",
        items: ["RZUICjMxa7r3tM8K"],
        magnetic: false,
        static: false,
      },
      {
        id: "djmBmcR73Zpk1c1e",
        items: ["ic71GQgUoF393h2"],
        type: "audio",
        accepts: [
          "text",
          "audio",
          "helper",
          "video",
          "image",
          "caption",
          "template",
        ],
      },
    ],
    size: {
      width: 1080,
      height: 1920,
    },
    trackItemDetailsMap: {
      RZUICjMxa7r3tM8K: {
        type: "video",
        details: {
          width: 360,
          height: 640,
          opacity: 100,
          src: videoSrc,
          volume: 100,
          borderRadius: 0,
          borderWidth: 0,
          borderColor: "#000000",
          boxShadow: {
            color: "#000000",
            x: 0,
            y: 0,
            blur: 0,
          },
          top: "640px",
          left: "360px",
          transform: "scale(3)",
          blur: 0,
          brightness: 100,
          flipX: false,
          flipY: false,
          rotate: "0deg",
          visibility: "visible",
        },
        metadata: {
          previewUrl: previewUrl,
        },
      },
      /* Comment caption details
      W1tb2sauODqNRhI5: {
        type: "caption",
        details: {
          fontFamily: "theboldfont",
          fontSize: 60,
          fontWeight: "normal",
          fontStyle: "normal",
          textDecoration: "none",
          textAlign: "center",
          lineHeight: "normal",
          letterSpacing: "normal",
          wordSpacing: "normal",
          color: "#ff4757",
          backgroundColor: "transparent",
          border: "none",
          textShadow: "none",
          text: "If your happiness depends on the",
          opacity: 100,
          width: 600,
          wordWrap: "normal",
          wordBreak: "normal",
          WebkitTextStrokeColor: "#ffffff",
          WebkitTextStrokeWidth: "0px",
          top: 800,
          left: "240px",
          textTransform: "none",
          transform: "none",
          skewX: 0,
          skewY: 0,
          height: 150,
          fontUrl: "https://cdn.designcombo.dev/fonts/the-bold-font.ttf",
          borderWidth: 0,
          borderColor: "#000000",
          boxShadow: {
            color: "#000000",
            x: 0,
            y: 0,
            blur: 0,
          },
          words: [],
        },
      },
      N326snvPf9O1XWB: {
        type: "caption",
        details: {
          fontFamily: "theboldfont",
          fontSize: 60,
          fontWeight: "normal",
          fontStyle: "normal",
          textDecoration: "none",
          textAlign: "center",
          lineHeight: "normal",
          letterSpacing: "normal",
          wordSpacing: "normal",
          color: "#ff4757",
          backgroundColor: "transparent",
          border: "none",
          textShadow: "none",
          text: "actions of others, you're at",
          opacity: 100,
          width: 600,
          wordWrap: "normal",
          wordBreak: "normal",
          WebkitTextStrokeColor: "#ffffff",
          WebkitTextStrokeWidth: "0px",
          top: 800,
          left: "240px",
          textTransform: "none",
          transform: "none",
          skewX: 0,
          skewY: 0,
          height: 150,
          fontUrl: "https://cdn.designcombo.dev/fonts/the-bold-font.ttf",
          borderWidth: 0,
          borderColor: "#000000",
          boxShadow: {
            color: "#000000",
            x: 0,
            y: 0,
            blur: 0,
          },
          words: [],
        },
      },
      */
      ic71GQgUoF393h2: {
        type: "audio",
        details: {
          src: "https://cdn.designcombo.dev/audio/Dawn%20of%20change.mp3",
          volume: 10,
        },
      },
      /* Comment text details
      rmf4bMElei2wRe8G: {
        type: "text",
        details: {
          fontFamily: "Roboto-Bold",
          fontSize: 120,
          fontWeight: "normal",
          fontStyle: "normal",
          textDecoration: "none",
          textAlign: "center",
          lineHeight: "normal",
          letterSpacing: "normal",
          wordSpacing: "normal",
          color: "#ffffff",
          backgroundColor: "transparent",
          border: "none",
          textShadow: "none",
          text: "Heading and some body",
          opacity: 100,
          width: 600,
          wordWrap: "break-word",
          wordBreak: "normal",
          WebkitTextStrokeColor: "#ffffff",
          WebkitTextStrokeWidth: "0px",
          top: "750px",
          left: "240px",
          textTransform: "none",
          transform: "none",
          skewX: 0,
          skewY: 0,
          height: 420,
          fontUrl:
            "https://fonts.gstatic.com/s/roboto/v29/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf",
          borderWidth: 0,
          borderColor: "#000000",
          boxShadow: {
            color: "#ffffff",
            x: 0,
            y: 0,
            blur: 0,
          },
        },
      },
      */
    },
    trackItemIds: [
      "ic71GQgUoF393h2",
      "RZUICjMxa7r3tM8K",
      /* Comment caption and text IDs
      "a5JowII5uEpk6OQP",
      "uSEooSKedBQi9eV",
      "BWMEdVr9uGdg2pmN",
      "JC9MDYMvoHZkiu2w",
      "mdwLiXiu7SSFxSSB",
      "lM6VetPlAiCMU5T",
      "jxMeoaVX8BxOPEmS",
      "M2Sv36YckryY0NAS",
      "CvXTedixwGMqnpS",
      "YpZM0yJx04Zb03zH",
      "dvsBAKrDF6U0zTIV",
      "cpamVHqGkxVnQ2qp",
      "N326snvPf9O1XWB",
      "W1tb2sauODqNRhI5",
      "rmf4bMElei2wRe8G",
      */
    ],
    transitionsMap: {},
    trackItemsMap: {
      RZUICjMxa7r3tM8K: {
        id: "RZUICjMxa7r3tM8K",
        metadata: {
          previewUrl: previewUrl,
        },
        trim: {
          from: 0,
          to: videoDurationInMs,
        },
        type: "video",
        name: "video",
        playbackRate: 1,
        display: {
          from: 0,
          to: videoDurationInMs,
        },
        duration: videoDurationInMs,
        isMain: false,
        details: {
          width: 360,
          height: 640,
          opacity: 100,
          src: videoSrc,
          volume: 100,
          borderRadius: 0,
          borderWidth: 0,
          borderColor: "#000000",
          boxShadow: {
            color: "#000000",
            x: 0,
            y: 0,
            blur: 0,
          },
          top: "640px",
          left: "360px",
          transform: "scale(3)",
          blur: 0,
          brightness: 100,
          flipX: false,
          flipY: false,
          rotate: "0deg",
          visibility: "visible",
        },
      },
      /* Comment caption items
      W1tb2sauODqNRhI5: {
        id: "W1tb2sauODqNRhI5",
        name: "caption",
        type: "caption",
        display: {
          from: 80,
          to: 3040,
        },
        metadata: {
          words: [
            {
              word: "If",
              start: 80,
              end: 240,
              confidence: 0.99063194,
            },
            {
              word: "your",
              start: 240,
              end: 480,
              confidence: 0.98874426,
            },
            {
              word: "happiness",
              start: 480,
              end: 980,
              confidence: 0.99995255,
            },
            {
              word: "depends",
              start: 1920,
              end: 2420,
              confidence: 0.99804354,
            },
            {
              word: "on",
              start: 2639.9999,
              end: 2879.9999000000003,
              confidence: 0.999602,
            },
            {
              word: "the",
              start: 2879.9999000000003,
              end: 3040,
              confidence: 0.99993205,
            },
          ],
          sourceUrl:
            "https://cdn.designcombo.dev/videos/Happiness%20shouldn%E2%80%99t%20depend.mp4",
          parentId: "RZUICjMxa7r3tM8K",
        },
        isMain: false,
        details: {
          fontFamily: "theboldfont",
          fontSize: 60,
          fontWeight: "normal",
          fontStyle: "normal",
          textDecoration: "none",
          textAlign: "center",
          lineHeight: "normal",
          letterSpacing: "normal",
          wordSpacing: "normal",
          color: "#ff4757",
          backgroundColor: "transparent",
          border: "none",
          textShadow: "none",
          text: "If your happiness depends on the",
          opacity: 100,
          width: 600,
          wordWrap: "normal",
          wordBreak: "normal",
          WebkitTextStrokeColor: "#ffffff",
          WebkitTextStrokeWidth: "0px",
          top: 800,
          left: "240px",
          textTransform: "none",
          transform: "none",
          skewX: 0,
          skewY: 0,
          height: 150,
          fontUrl: "https://cdn.designcombo.dev/fonts/the-bold-font.ttf",
          borderWidth: 0,
          borderColor: "#000000",
          boxShadow: {
            color: "#000000",
            x: 0,
            y: 0,
            blur: 0,
          },
          words: [],
        },
      },
      */
      ic71GQgUoF393h2: {
        id: "ic71GQgUoF393h2",
        name: "Dawn of change",
        type: "audio",
        display: {
          from: 0,
          to: videoDurationInMs,
        },
        trim: {
          from: 0,
          to: videoDurationInMs,
        },
        playbackRate: 1,
        metadata: {
          author: "Roman Senyk",
        },
        duration: videoDurationInMs,
        details: {
          src: "https://cdn.designcombo.dev/audio/Dawn%20of%20change.mp3",
          volume: 100,
        },
      },
      /* Comment text item
      rmf4bMElei2wRe8G: {
        id: "rmf4bMElei2wRe8G",
        name: "text",
        type: "text",
        display: {
          from: 24920.212765957447,
          to: 29920.212765957447,
        },
        metadata: {},
        isMain: false,
        details: {
          fontFamily: "Roboto-Bold",
          fontSize: 120,
          fontWeight: "normal",
          fontStyle: "normal",
          textDecoration: "none",
          textAlign: "center",
          lineHeight: "normal",
          letterSpacing: "normal",
          wordSpacing: "normal",
          color: "#ffffff",
          backgroundColor: "transparent",
          border: "none",
          textShadow: "none",
          text: "Heading and some body",
          opacity: 100,
          width: 600,
          wordWrap: "break-word",
          wordBreak: "normal",
          WebkitTextStrokeColor: "#ffffff",
          WebkitTextStrokeWidth: "0px",
          top: "750px",
          left: "240px",
          textTransform: "none",
          transform: "none",
          skewX: 0,
          skewY: 0,
          height: 420,
          fontUrl:
            "https://fonts.gstatic.com/s/roboto/v29/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf",
          borderWidth: 0,
          borderColor: "#000000",
          boxShadow: {
            color: "#ffffff",
            x: 0,
            y: 0,
            blur: 0,
          },
        },
      },
      */
    },
    transitionIds: [],
  };
};
