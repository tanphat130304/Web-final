import { useState, useEffect } from 'react';
import useAuthStore from '@/store/use-auth-store';

// API configuration - in a real application, this would be from environment variables
const API_BASE_URL = 'http://localhost:8000';

/**
 * Custom hook to load a video with authentication
 * @param videoId The ID of the video to load
 * @returns An object containing the video blob URL and loading state
 */
export const useAuthenticatedVideo = (videoId: string | null) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    // Clean up previous blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    if (!videoId) {
      setError("No video ID provided");
      return;
    }
    
    if (!accessToken) {
      setError("Not authenticated. Please log in to access videos.");
      return;
    }

    const fetchVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching video with ID: ${videoId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/v1/videos/${videoId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 404) {
            throw new Error(`Video not found (404). The requested video ID ${videoId} does not exist.`);
          } else if (status === 401 || status === 403) {
            throw new Error(`Authentication error (${status}). Please log in again.`);
          } else {
            throw new Error(`Failed to fetch video: ${status}`);
          }
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();

    // Clean up function
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [videoId, accessToken]);

  return { blobUrl, loading, error };
};