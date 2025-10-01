import { IImage, IText, ITrackItem } from "@designcombo/types";

export const calculateCropStyles = (
  details: IImage["details"],
  crop: IImage["details"]["crop"],
): React.CSSProperties => ({
  width: details.width || "100%",
  height: details.height || "auto",
  top: -crop.y || 0,
  left: -crop.x || 0,
  position: "absolute" as const,
  borderRadius: `${Math.min(crop.width, crop.height) * ((details.borderRadius || 0) / 100)}px`,
});

export const calculateMediaStyles = (
  details: ITrackItem["details"],
  crop: ITrackItem["details"]["crop"],
  options?: { preserveAspectRatio?: boolean }
) => {
  const baseStyles: React.CSSProperties = {
    pointerEvents: "none",
    boxShadow: [
      `0 0 0 ${details.borderWidth}px ${details.borderColor}`,
      details.boxShadow
        ? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
        : "",
    ]
      .filter(Boolean)
      .join(", "),
    ...calculateCropStyles(details, crop),
  };

  // Add aspect ratio preservation for videos
  if (options?.preserveAspectRatio) {
    return {
      ...baseStyles,
      objectFit: "contain" as const,
      objectPosition: "center",
      width: "100%",
      height: "100%",
    };
  }

  return baseStyles;
};

export const calculateTextStyles = (
  details: IText["details"],
): React.CSSProperties => ({
  position: "relative",
  textDecoration: details.textDecoration || "none",
  WebkitTextStroke: `${details.borderWidth}px ${details.borderColor}`, // Outline/stroke color and thickness
  paintOrder: "stroke fill", // Order of painting
  textShadow: details.boxShadow
    ? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
    : "",
  fontFamily: details.fontFamily || "Arial",
  fontWeight: details.fontWeight || "normal",
  lineHeight: details.lineHeight || "normal",
  letterSpacing: details.letterSpacing || "normal",
  wordSpacing: details.wordSpacing || "normal",
  wordWrap: details.wordWrap || "",
  wordBreak: details.wordBreak || "normal",
  textTransform: details.textTransform || "none",
  fontSize: details.fontSize || "16px",
  textAlign: details.textAlign || "left",
  color: details.color || "#000000",
});

export const calculateContainerStyles = (
  details: ITrackItem["details"],
  crop: ITrackItem["details"]["crop"] = {},
  overrides: React.CSSProperties = {},
): React.CSSProperties => {
  return {
    pointerEvents: "auto",
    top: details.top || 0,
    left: details.left || 0,
    width: crop.width || details.width || "100%",
    height: crop.height || details.height || "auto",
    transform: details.transform || "none",
    opacity: details.opacity !== undefined ? details.opacity / 100 : 1,
    transformOrigin: details.transformOrigin || "center center",
    filter: `brightness(${details.brightness}%) blur(${details.blur}px)`,
    rotate: details.rotate || "0deg",
    ...overrides, // Merge overrides into the calculated styles
  };
};
