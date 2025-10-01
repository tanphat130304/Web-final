import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState, useEffect } from "react";
import { dispatch } from "@designcombo/events";
import { DESIGN_RESIZE, EDIT_OBJECT } from "@designcombo/state";
import useStore from "@/pages/editor/store/use-store";
import { useVideoAspectRatio } from "@/hooks/use-video-aspect-ratio";
import { Monitor, Smartphone, Square, Tv, Camera } from "lucide-react";

// Popular video aspect ratios with icons and descriptions
const aspectRatios = [
  { 
    name: "16:9", 
    value: "16:9", 
    width: 1920, 
    height: 1080, 
    description: "Landscape HD", 
    icon: Monitor,
    category: "landscape" 
  },
  { 
    name: "9:16", 
    value: "9:16", 
    width: 1080, 
    height: 1920, 
    description: "Portrait (Stories)", 
    icon: Smartphone,
    category: "portrait" 
  },
  { 
    name: "1:1", 
    value: "1:1", 
    width: 1080, 
    height: 1080, 
    description: "Square", 
    icon: Square,
    category: "square" 
  },
  { 
    name: "4:3", 
    value: "4:3", 
    width: 1440, 
    height: 1080, 
    description: "Classic TV", 
    icon: Tv,
    category: "landscape" 
  },
  { 
    name: "21:9", 
    value: "21:9", 
    width: 2560, 
    height: 1080, 
    description: "Ultrawide", 
    icon: Monitor,
    category: "ultrawide" 
  },
  { 
    name: "4:5", 
    value: "4:5", 
    width: 1080, 
    height: 1350, 
    description: "Instagram Portrait", 
    icon: Camera,
    category: "portrait" 
  },
];

// Function to scale video to fit composition while maintaining aspect ratio
const getVideoScaleAndPosition = (videoWidth: number, videoHeight: number, canvasWidth: number, canvasHeight: number) => {
  const videoRatio = videoWidth / videoHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  
  let scale: number;
  
  if (videoRatio > canvasRatio) {
    // Video is wider than canvas - fit to width
    scale = canvasWidth / videoWidth;
  } else {
    // Video is taller than canvas - fit to height  
    scale = canvasHeight / videoHeight;
  }
  
  const width = videoWidth * scale;
  const height = videoHeight * scale;
  
  // Center the video in canvas
  const left = (canvasWidth - width) / 2;
  const top = (canvasHeight - height) / 2;
  
  return {
    width: Math.round(width),
    height: Math.round(height),
    left: Math.round(left),
    top: Math.round(top),
    scale
  };
};

export default function AspectRatio() {
  const { size, trackItemsMap, trackItemDetailsMap } = useStore();
  const [currentAspectRatio, setCurrentAspectRatio] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);

  // Get current video source
  const currentVideoSrc = React.useMemo(() => {
    const videoItems = Object.values(trackItemsMap).filter(item => item.type === "video");
    return videoItems.length > 0 ? videoItems[0].details.src : undefined;
  }, [trackItemsMap]);

  const { metadata, aspectRatioInfo, loading } = useVideoAspectRatio(currentVideoSrc);

  // Detect current composition aspect ratio
  useEffect(() => {
    const currentRatio = size.width / size.height;
    const detectedRatio = aspectRatios.find(ratio => 
      Math.abs((ratio.width / ratio.height) - currentRatio) < 0.01
    );
    setCurrentAspectRatio(detectedRatio?.value || "custom");
  }, [size]);

  const handleAspectRatioChange = (value: string) => {
    if (!value) return;
    
    const selectedRatio = aspectRatios.find(ratio => ratio.value === value);
    if (!selectedRatio) return;

    setCurrentAspectRatio(value);

    // Resize the composition
    dispatch(DESIGN_RESIZE, {
      payload: {
        size: {
          width: selectedRatio.width,
          height: selectedRatio.height,
        },
      },
    });

    // If there are video items, adjust their position and scale to fit the new aspect ratio
    const videoItems = Object.values(trackItemsMap).filter(item => item.type === "video");
    
    videoItems.forEach(videoItem => {
      if (metadata) {
        const { width, height, left, top } = getVideoScaleAndPosition(
          metadata.width,
          metadata.height,
          selectedRatio.width,
          selectedRatio.height
        );

        dispatch(EDIT_OBJECT, {
          payload: {
            [videoItem.id]: {
              details: {
                width,
                height,
                left,
                top,
              },
            },
          },
        });
      }
    });
  };

  const handleAutoDetectFromVideo = () => {
    if (!metadata || !aspectRatioInfo) return;
    
    setIsDetecting(true);
    
    // Find the closest standard aspect ratio or use video dimensions
    const closestStandardRatio = aspectRatios.find(ratio => 
      ratio.value === aspectRatioInfo.ratio
    );

    if (closestStandardRatio) {
      handleAspectRatioChange(closestStandardRatio.value);
    } else {
      // Use video's native dimensions
      dispatch(DESIGN_RESIZE, {
        payload: {
          size: {
            width: metadata.width,
            height: metadata.height,
          },
        },
      });
      setCurrentAspectRatio("custom");
    }
    
    setTimeout(() => setIsDetecting(false), 500);
  };

  const handleFitVideoToCanvas = () => {
    if (!metadata) return;
    
    const videoItems = Object.values(trackItemsMap).filter(item => item.type === "video");
    
    videoItems.forEach(videoItem => {
      const { width, height, left, top } = getVideoScaleAndPosition(
        metadata.width,
        metadata.height,
        size.width,
        size.height
      );

      dispatch(EDIT_OBJECT, {
        payload: {
          [videoItem.id]: {
            details: {
              width,
              height,
              left,
              top,
            },
          },
        },
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Aspect Ratio</Label>
        {aspectRatioInfo && (
          <div className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {aspectRatioInfo.ratio} 
            {aspectRatioInfo.isStandard ? " (Standard)" : " (Custom)"}
          </div>
        )}
      </div>

      {/* Current composition info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Composition: {size.width}x{size.height}</div>
        {metadata && (
          <div className="text-blue-400">
            Video: {metadata.width}x{metadata.height} ({aspectRatioInfo?.ratio})
          </div>
        )}
      </div>

      {/* Auto-detect from video */}
      {metadata && aspectRatioInfo && (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoDetectFromVideo}
            disabled={isDetecting || loading}
            className="w-full"
          >
            {isDetecting ? "Detecting..." : `Auto-detect from Video (${aspectRatioInfo.ratio})`}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitVideoToCanvas}
            className="w-full"
          >
            Fit Video to Canvas
          </Button>
        </div>
      )}

      {/* Standard aspect ratios */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Standard Ratios</Label>
        <ToggleGroup
          type="single"
          value={currentAspectRatio}
          onValueChange={handleAspectRatioChange}
          className="grid grid-cols-2 gap-2"
        >
          {aspectRatios.map((ratio) => {
            const Icon = ratio.icon;
            const isActive = currentAspectRatio === ratio.value;
            
            return (
              <ToggleGroupItem
                key={ratio.value}
                value={ratio.value}
                className={`flex flex-col items-center gap-1 p-3 h-auto ${
                  isActive ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
                <div className="text-xs font-medium">{ratio.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {ratio.description}
                </div>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {/* Tips */}
      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
        <div className="font-medium mb-1">Tips:</div>
        <ul className="space-y-1 text-[11px]">
          <li>• 16:9 for YouTube, landscape videos</li>
          <li>• 9:16 for TikTok, Instagram Stories</li>
          <li>• 1:1 for Instagram posts</li>
          <li>• Auto-detect matches your video's ratio</li>
        </ul>
      </div>
    </div>
  );
}
