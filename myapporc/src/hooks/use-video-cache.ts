import { useEffect } from 'react';
import useVideoStore from '@/store/use-video-store';
import useAuthStore from '@/store/use-auth-store';

export const useVideoCache = () => {
  const { restoreFromCache, fetchVideos, selectedVideoId, videos } = useVideoStore();
  const { isAuthenticated, accessToken } = useAuthStore();

  // Restore cache on app load
  useEffect(() => {
    console.log('[VideoCache] Initializing video cache...');
    restoreFromCache();
  }, [restoreFromCache]);

  // Auto-fetch videos if cache is empty or outdated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      // If we have a selected video but no videos in cache, fetch them
      if (selectedVideoId && videos.length === 0) {
        console.log('[VideoCache] Selected video exists but no videos cached, fetching...');
        fetchVideos(accessToken, false, 'VideoCache');
      }
      // If no selected video, also try to fetch to populate the list
      else if (!selectedVideoId && videos.length === 0) {
        console.log('[VideoCache] No selected video and no cache, fetching videos...');
        fetchVideos(accessToken, false, 'VideoCache');
      }
    }
  }, [isAuthenticated, accessToken, selectedVideoId, videos.length, fetchVideos]);

  // Log cache status
  useEffect(() => {
    console.log('[VideoCache] Status:', {
      selectedVideoId,
      videosCount: videos.length,
      isAuthenticated,
      hasAccessToken: !!accessToken
    });
  }, [selectedVideoId, videos.length, isAuthenticated, accessToken]);

  return {
    selectedVideoId,
    videosCount: videos.length,
    isLoaded: videos.length > 0 || !isAuthenticated
  };
}; 