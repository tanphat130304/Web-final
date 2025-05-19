import { useState, useEffect } from 'react';
import useAuthStore from '@/store/use-auth-store';
import useVideoStore, { VideoItem } from '@/store/use-video-store';

// API configuration - use the same base URL as in other hooks
const API_BASE_URL = 'http://localhost:8000';

interface UseFetchVideoResult {
  videoData: VideoItem | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch video data from the store or API when needed
 * @param videoId The ID of the video to fetch
 * @returns An object containing the video data, loading state, and error state
 */
export const useFetchVideo = (videoId: string | null): UseFetchVideoResult => {
  const [videoData, setVideoData] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();
  const { 
    videos, 
    isLoadingVideos, 
    videoError, 
    fetchVideos 
  } = useVideoStore();

  useEffect(() => {
    // Reset states when videoId changes
    setVideoData(null);
    setError(null);
    
    const getVideoData = async () => {
      if (!videoId || !accessToken) {
        return;
      }
      
      try {
        setLoading(true);
        console.log(`Tìm video với ID: ${videoId}`);
        
        // Tải danh sách videos nếu chưa có
        if (videos.length === 0 && !isLoadingVideos) {
          console.log('Danh sách video trống, tải từ API...');
          await fetchVideos(accessToken);
          
          // Nếu có lỗi khi tải danh sách video
          if (videoError) {
            throw new Error(videoError);
          }
        }

        // Tạo URL trực tiếp đến file video với token xác thực
        const videoUrl = `${API_BASE_URL}/api/v1/videos/${videoId}`;
        
        // Tìm video trong danh sách đã lưu trong store
        const videoInfo = videos.find((v) => v.video_id === videoId);
        
        if (!videoInfo) {
          // Kiểm tra xem video có tồn tại không bằng cách gửi HEAD request
          const checkResponse = await fetch(videoUrl, {
            method: 'HEAD',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          console.log('checkResponse', checkResponse);
          if (!checkResponse.ok) {
            if (checkResponse.status === 401) {
              throw new Error('Unauthorized: Please log in again');
            }
            throw new Error(`Video not found: status ${checkResponse.status}`);
          }
          
          // Nếu video không có trong danh sách nhưng vẫn tồn tại, load lại danh sách
          console.log('Video không tìm thấy trong danh sách, tải lại danh sách videos...');
          await fetchVideos(accessToken, true); // Force refresh
          
          // Tìm lại video sau khi tải mới
          const refreshedVideo = useVideoStore.getState().videos.find(v => v.video_id === videoId);
          
          if (!refreshedVideo) {
            throw new Error(`Video with ID ${videoId} not found in list`);
          }
          
          // Cập nhật dữ liệu video với URL trực tiếp
          setVideoData({
            ...refreshedVideo,
            file_url: videoUrl
          });
        } else {
          // Cập nhật dữ liệu video với URL trực tiếp
          setVideoData({
            ...videoInfo,
            file_url: videoUrl
          });
        }
        
      } catch (error) {
        console.error('Error fetching video data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch video data');
      } finally {
        setLoading(false);
      }
    };

    getVideoData();
  }, [videoId, accessToken, videos, isLoadingVideos, videoError, fetchVideos]);

  return { videoData, loading, error };
};