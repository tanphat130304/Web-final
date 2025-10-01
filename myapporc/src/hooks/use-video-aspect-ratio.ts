import { useState, useEffect, useCallback } from 'react';

interface VideoMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  duration: number;
}

interface AspectRatioInfo {
  ratio: string;
  name: string;
  isStandard: boolean;
}

export const useVideoAspectRatio = (videoSrc?: string) => {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectAspectRatio = useCallback((width: number, height: number): AspectRatioInfo => {
    const aspectRatio = width / height;
    const tolerance = 0.01;

    // Common aspect ratios
    const ratios = [
      { ratio: 16/9, name: '16:9', display: '16:9' },
      { ratio: 9/16, name: '9:16', display: '9:16' },
      { ratio: 4/3, name: '4:3', display: '4:3' },
      { ratio: 3/4, name: '3:4', display: '3:4' },
      { ratio: 1, name: '1:1', display: '1:1' },
      { ratio: 21/9, name: '21:9', display: '21:9' },
      { ratio: 4/5, name: '4:5', display: '4:5' },
      { ratio: 5/4, name: '5:4', display: '5:4' },
    ];

    for (const { ratio, name, display } of ratios) {
      if (Math.abs(aspectRatio - ratio) < tolerance) {
        return {
          ratio: display,
          name,
          isStandard: true,
        };
      }
    }

    // Custom aspect ratio
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    const simplifiedWidth = width / divisor;
    const simplifiedHeight = height / divisor;

    return {
      ratio: `${simplifiedWidth}:${simplifiedHeight}`,
      name: 'Custom',
      isStandard: false,
    };
  }, []);

  const loadVideoMetadata = useCallback(async (src: string) => {
    setLoading(true);
    setError(null);

    try {
      // Validate video source first
      if (!src || typeof src !== 'string' || src.trim() === '') {
        throw new Error('Invalid video source');
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video metadata loading timeout'));
        }, 10000); // 10 second timeout

        video.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          
          // Validate video dimensions
          if (!video.videoWidth || !video.videoHeight || 
              video.videoWidth <= 0 || video.videoHeight <= 0) {
            reject(new Error('Invalid video dimensions'));
            return;
          }

          const metadata: VideoMetadata = {
            width: video.videoWidth,
            height: video.videoHeight,
            aspectRatio: video.videoWidth / video.videoHeight,
            duration: video.duration || 0,
          };
          
          setMetadata(metadata);
          resolve();
        });

        video.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load video metadata'));
        });

        // Additional error handling for network issues
        video.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Video loading aborted'));
        });

        video.addEventListener('stalled', () => {
          clearTimeout(timeout);
          reject(new Error('Video loading stalled'));
        });

        try {
          video.src = src;
        } catch (srcError) {
          clearTimeout(timeout);
          reject(new Error('Invalid video source URL'));
        }
      });
    } catch (err) {
      console.warn('Video metadata loading failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (videoSrc) {
      loadVideoMetadata(videoSrc);
    } else {
      setMetadata(null);
      setError(null);
    }
  }, [videoSrc, loadVideoMetadata]);

  const aspectRatioInfo = metadata ? detectAspectRatio(metadata.width, metadata.height) : null;

  const getOptimalDimensions = useCallback((
    targetWidth: number,
    targetHeight: number,
    preserveAspectRatio = true
  ) => {
    if (!metadata || !preserveAspectRatio) {
      return { width: targetWidth, height: targetHeight };
    }

    const { aspectRatio } = metadata;
    const targetAspectRatio = targetWidth / targetHeight;

    if (aspectRatio > targetAspectRatio) {
      // Video is wider than target - fit to width
      return {
        width: targetWidth,
        height: targetWidth / aspectRatio,
      };
    } else {
      // Video is taller than target - fit to height
      return {
        width: targetHeight * aspectRatio,
        height: targetHeight,
      };
    }
  }, [metadata]);

  return {
    metadata,
    loading,
    error,
    aspectRatioInfo,
    getOptimalDimensions,
    detectAspectRatio,
    loadVideoMetadata,
  };
}; 