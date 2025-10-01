import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';
import useAuthStore from "@/store/use-auth-store";

export interface VideoItem {
  video_id: string;
  title?: string;
  file_name?: string;
  file_path?: string;
  file_url?: string;
  video_url?: string;
  created_at: string;
  updated_at?: string;
  thumbnail?: string;
}

interface VideoCache {
  data: VideoItem[];
  timestamp: number;
  lastSelectedVideoId: string | null;
}

interface VideoStore {
  selectedVideoId: string | null;
  isVideoMenuOpen: boolean;
  videos: VideoItem[];
  isLoadingVideos: boolean;
  videoError: string | null;
  lastFetchTimestamp: number | null;
  fetchInProgress: boolean;
  
  setSelectedVideoId: (videoId: string) => void;
  clearSelectedVideoId: () => void;
  openVideoMenu: () => void;
  closeVideoMenu: () => void;
  toggleVideoMenu: () => void;
  
  fetchVideos: (accessToken: string, forceRefresh?: boolean, caller?: string) => Promise<void>;
  setVideos: (videos: VideoItem[]) => void;
  clearVideos: () => void;
  
  // New methods for better caching
  restoreFromCache: () => void;
  getSelectedVideo: () => VideoItem | null;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 phút tính bằng milliseconds
const VIDEO_CACHE_KEY = 'video-cache';
const SELECTED_VIDEO_KEY = 'selected-video-id';

// Helper function to test API response format
const testApiResponse = async (accessToken: string) => {
  try {
    console.log('[API Test] Testing video API endpoint format...');
    const response = await fetch('http://localhost:8000/api/v1/videos/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`[API Test] Response not OK: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('[API Test] Raw API response structure:', {
      isArray: Array.isArray(data),
      hasVideos: data && data.videos && Array.isArray(data.videos),
      hasData: data && data.data && Array.isArray(data.data),
      type: typeof data,
      keys: data && typeof data === 'object' ? Object.keys(data) : [],
      sampleResponse: JSON.stringify(data).substring(0, 200) + '...'
    });
    
    return data;
  } catch (error) {
    console.error('[API Test] Failed to test API:', error);
    return null;
  }
};

// Get initial state from cache
const getInitialState = () => {
  try {
    // Try to get from localStorage first
    const cachedVideoId = localStorage.getItem(SELECTED_VIDEO_KEY);
    const cachedData = localStorage.getItem(VIDEO_CACHE_KEY);
    
    if (cachedData) {
      const cache: VideoCache = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - cache.timestamp < CACHE_DURATION) {
        return {
          selectedVideoId: cachedVideoId || cache.lastSelectedVideoId,
          videos: cache.data || [],
          lastFetchTimestamp: cache.timestamp
        };
      }
    }
    
    return {
      selectedVideoId: cachedVideoId,
      videos: [],
      lastFetchTimestamp: null
    };
  } catch (error) {
    console.warn('Error loading video cache:', error);
    return {
      selectedVideoId: null,
      videos: [],
      lastFetchTimestamp: null
    };
  }
};

const useVideoStore = create<VideoStore>()(
  persist(
    (set, get) => {
      const initialState = getInitialState();
      
      return {
        selectedVideoId: initialState.selectedVideoId,
        isVideoMenuOpen: false,
        videos: initialState.videos,
        isLoadingVideos: false,
        videoError: null,
        lastFetchTimestamp: initialState.lastFetchTimestamp,
        fetchInProgress: false,
        
        setSelectedVideoId: (videoId: string) => {
          // Update localStorage immediately
          localStorage.setItem(SELECTED_VIDEO_KEY, videoId);
          localStorage.setItem('mostRecentVideoId', videoId); // For compatibility
          localStorage.setItem('current_video_id', videoId); // For compatibility
          
          // Update cache with new selected video
          const { videos } = get();
          const cache: VideoCache = {
            data: videos,
            timestamp: Date.now(),
            lastSelectedVideoId: videoId
          };
          localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(cache));
          
          set({ selectedVideoId: videoId });
          
          console.log('Video selected and cached:', videoId);
        },
        
        clearSelectedVideoId: () => {
          localStorage.removeItem(SELECTED_VIDEO_KEY);
          localStorage.removeItem('mostRecentVideoId');
          localStorage.removeItem('current_video_id');
          set({ selectedVideoId: null });
        },
        
        openVideoMenu: () => set({ isVideoMenuOpen: true }),
        closeVideoMenu: () => set({ isVideoMenuOpen: false }),
        toggleVideoMenu: () => set((state) => ({ isVideoMenuOpen: !state.isVideoMenuOpen })),
        
        fetchVideos: async (accessToken: string, forceRefresh = false, caller = 'unknown') => {
          console.log(`[DEBUG] fetchVideos called from: ${caller}`);
          console.log(`[DEBUG] forceRefresh: ${forceRefresh}`);
          
          const { videos, lastFetchTimestamp, fetchInProgress } = get();
          const now = Date.now();
          
          console.log(`[DEBUG] Current state: videos.length=${videos.length}, lastFetch=${lastFetchTimestamp ? new Date(lastFetchTimestamp).toLocaleTimeString() : 'null'}`);
          console.log(`[DEBUG] Cache duration: ${CACHE_DURATION}ms, Time since last fetch: ${lastFetchTimestamp ? now - lastFetchTimestamp : 'N/A'}ms`);
          
          // Kiểm tra nếu đã có request đang thực hiện
          if (fetchInProgress) {
            console.log('[DEBUG] Another fetch request is already in progress, skipping');
            return;
          }
          
          // Nếu đã có video trong store và chưa quá thời gian cache, không cần fetch lại
          if (
            !forceRefresh && 
            videos.length > 0 && 
            lastFetchTimestamp && 
            now - lastFetchTimestamp < CACHE_DURATION
          ) {
            console.log('[DEBUG] Using cached video list');
            return;
          }
          
          // Nếu không có token, không thể fetch
          if (!accessToken) {
            console.log('[DEBUG] No access token provided');
            set({ videoError: 'Vui lòng đăng nhập để xem danh sách video', isLoadingVideos: false });
            return;
          }
          
          console.log('[DEBUG] Starting fresh video fetch...');
          set({ 
            isLoadingVideos: true, 
            fetchInProgress: true, 
            videoError: null 
          });
          
          // Test API response format if this is first time or debug mode
          const isFirstFetch = videos.length === 0;
          if (isFirstFetch || caller === 'debug') {
            await testApiResponse(accessToken);
          }
          
          try {
            const response = await fetch('http://localhost:8000/api/v1/videos/', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              if (response.status === 401) {
                throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
              }
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('[DEBUG] Video fetch successful, raw response:', data);
            
            let videoList: VideoItem[] = [];
            
            // Handle different response formats
            if (Array.isArray(data)) {
              // Direct array response
              videoList = data;
              console.log('[DEBUG] Response is direct array');
            } else if (data && data.videos && Array.isArray(data.videos)) {
              // Object with videos property
              videoList = data.videos;
              console.log('[DEBUG] Response has videos property');
            } else if (data && data.data && Array.isArray(data.data)) {
              // Object with data property
              videoList = data.data;
              console.log('[DEBUG] Response has data property');
            } else if (data && typeof data === 'object') {
              // Try to find array in object properties
              const possibleArrays = Object.values(data).filter(Array.isArray);
              if (possibleArrays.length > 0) {
                videoList = possibleArrays[0] as VideoItem[];
                console.log('[DEBUG] Found array in object properties');
              } else {
                console.error('[DEBUG] No valid array found in response:', data);
                throw new Error('Định dạng phản hồi không hợp lệ: không tìm thấy danh sách video');
              }
            } else {
              console.error('[DEBUG] Invalid response format:', data);
              throw new Error('Định dạng phản hồi không hợp lệ');
            }
            
            if (videoList.length === 0) {
              console.log('[DEBUG] No videos found in response');
            }
            
            const timestamp = Date.now();
            
            // Save to cache
            const cache: VideoCache = {
              data: videoList,
              timestamp: timestamp,
              lastSelectedVideoId: get().selectedVideoId
            };
            localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(cache));
            
            set({ 
              videos: videoList, 
              isLoadingVideos: false, 
              fetchInProgress: false,
              videoError: null,
              lastFetchTimestamp: timestamp
            });
            
            console.log(`[DEBUG] Updated video store with ${videoList.length} videos`);
          } catch (error) {
            console.error('[DEBUG] Video fetch failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            set({ 
              videoError: errorMessage, 
              isLoadingVideos: false, 
              fetchInProgress: false 
            });
          }
        },
        
        setVideos: (videos: VideoItem[]) => {
          const timestamp = Date.now();
          
          // Save to cache
          const cache: VideoCache = {
            data: videos,
            timestamp: timestamp,
            lastSelectedVideoId: get().selectedVideoId
          };
          localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(cache));
          
          set({ 
            videos, 
            lastFetchTimestamp: timestamp 
          });
        },
        
        clearVideos: () => {
          localStorage.removeItem(VIDEO_CACHE_KEY);
          set({ 
            videos: [], 
            lastFetchTimestamp: null 
          });
        },
        
        restoreFromCache: () => {
          const initialState = getInitialState();
          set({
            selectedVideoId: initialState.selectedVideoId,
            videos: initialState.videos,
            lastFetchTimestamp: initialState.lastFetchTimestamp
          });
        },
        
        getSelectedVideo: () => {
          const { selectedVideoId, videos } = get();
          if (!selectedVideoId) return null;
          return videos.find(video => video.video_id === selectedVideoId) || null;
        }
      };
    },
    {
      name: 'video-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedVideoId: state.selectedVideoId,
        videos: state.videos,
        lastFetchTimestamp: state.lastFetchTimestamp
      }),
    }
  )
);

export default useVideoStore;