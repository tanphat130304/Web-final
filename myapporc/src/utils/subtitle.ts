// This file contains utility functions for handling subtitles

/**
 * Parse SRT content into an array of subtitle objects
 * @param srtContent Raw SRT content as a string
 * @returns Array of parsed subtitles
 */
export const parseSRT = (srtContent: string) => {
  const subtitles = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);
  
  blocks.forEach(block => {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const id = parseInt(lines[0].trim());
      const timeMatch = lines[1].match(/(\d+:\d+:\d+,\d+)\s*-->\s*(\d+:\d+:\d+,\d+)/);
      if (timeMatch) {
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        const originalText = lines.slice(2).join('\n');
        
        subtitles.push({
          id,
          startTime,
          endTime,
          original: originalText,
          translated: '' // Initially empty
        });
      }
    }
  });
  
  return subtitles;
};

/**
 * Get the current video ID from localStorage
 * @returns The video ID or null if not found
 */
export const getVideoId = (): string | null => {
  return localStorage.getItem('mostRecentVideoId');
};

/**
 * Set the current video ID in localStorage
 * @param videoId The video ID to save
 */
export const setVideoId = (videoId: string): void => {
  localStorage.setItem('mostRecentVideoId', videoId);
};
