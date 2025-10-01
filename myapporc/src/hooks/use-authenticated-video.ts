import { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '@/store/use-auth-store';

// Cache lưu trữ blob URL theo video ID
const videoBlobCache: Record<string, { url: string, timestamp: number }> = {};
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 phút

// Track active video requests to prevent duplicate requests
const activeRequests: Record<string, Promise<string>> = {};

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
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Hàm lấy video và cập nhật cache
  const getVideoBlob = useCallback(async (id: string, token: string): Promise<string> => {
    // Check if there's already an active request for this video
    if (id in activeRequests) {
      console.log(`Waiting for existing request for video: ${id}`);
      return activeRequests[id];
    }

    const requestPromise = (async () => {
      try {
        console.log(`Fetching video with ID: ${id}`);
        
        const response = await fetch(`http://localhost:8000/api/v1/videos/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Lưu vào cache
        videoBlobCache[id] = { 
          url, 
          timestamp: Date.now() 
        };
        
        console.log(`Successfully cached video blob for ID: ${id}`);
        return url;
      } finally {
        // Remove from active requests when done
        delete activeRequests[id];
      }
    })();

    // Store the promise to prevent duplicate requests
    activeRequests[id] = requestPromise;
    return requestPromise;
  }, []);

  useEffect(() => {
    if (!videoId || !accessToken || !isMountedRef.current) {
      return;
    }
    
    // Kiểm tra cache
    const cachedVideo = videoBlobCache[videoId];
    const now = Date.now();
    
    if (cachedVideo && now - cachedVideo.timestamp < CACHE_EXPIRY) {
      console.log(`Using cached blob URL for video: ${videoId}`);
      if (isMountedRef.current) {
        setBlobUrl(cachedVideo.url);
        setLoading(false);
        setError(null);
      }
      return;
    }
    
    // Nếu không có trong cache hoặc đã hết hạn, tải lại
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    getVideoBlob(videoId, accessToken)
      .then((url) => {
        if (isMountedRef.current) {
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching video:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch video');
          setLoading(false);
        }
      });

    // Clean up function
    return () => {
      // Không revoke URL khi component unmount để giữ cache
    };
  }, [videoId, accessToken, getVideoBlob]);

  // Đảm bảo revoke tất cả URLs khi window unload để tránh memory leak
  useEffect(() => {
    const handleUnload = () => {
      Object.values(videoBlobCache).forEach(({ url }) => {
        URL.revokeObjectURL(url);
      });
    };
    
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return { blobUrl, loading, error };
};