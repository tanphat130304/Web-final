import { create } from "zustand";
import useAuthStore from "@/store/use-auth-store";

export interface VideoItem {
  video_id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  thumbnail: string;
}

interface VideoStore {
  selectedVideoId: string | null;
  isVideoMenuOpen: boolean;
  videos: VideoItem[];
  isLoadingVideos: boolean;
  videoError: string | null;
  lastFetchTimestamp: number | null;
  
  setSelectedVideoId: (videoId: string) => void;
  clearSelectedVideoId: () => void;
  openVideoMenu: () => void;
  closeVideoMenu: () => void;
  toggleVideoMenu: () => void;
  
  fetchVideos: (accessToken: string, forceRefresh?: boolean) => Promise<void>;
  setVideos: (videos: VideoItem[]) => void;
  clearVideos: () => void;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 phút tính bằng milliseconds

const useVideoStore = create<VideoStore>((set, get) => ({
  selectedVideoId: localStorage.getItem('selectedVideoId'),
  isVideoMenuOpen: false,
  videos: [],
  isLoadingVideos: false,
  videoError: null,
  lastFetchTimestamp: null,
  
  setSelectedVideoId: (videoId: string) => {
    localStorage.setItem('selectedVideoId', videoId);
    localStorage.setItem('mostRecentVideoId', videoId); // For compatibility with existing code
    set({ selectedVideoId: videoId });
  },
  
  clearSelectedVideoId: () => {
    localStorage.removeItem('selectedVideoId');
    set({ selectedVideoId: null });
  },
  
  openVideoMenu: () => set({ isVideoMenuOpen: true }),
  closeVideoMenu: () => set({ isVideoMenuOpen: false }),
  toggleVideoMenu: () => set((state) => ({ isVideoMenuOpen: !state.isVideoMenuOpen })),
  
  fetchVideos: async (accessToken: string, forceRefresh = false) => {
    const { videos, lastFetchTimestamp } = get();
    const now = Date.now();
    
    // Nếu đã có video trong store và chưa quá thời gian cache, không cần fetch lại
    if (
      !forceRefresh && 
      videos.length > 0 && 
      lastFetchTimestamp && 
      now - lastFetchTimestamp < CACHE_DURATION
    ) {
      console.log('Sử dụng danh sách video đã lưu trong cache');
      return;
    }
    
    // Nếu không có token, không thể fetch
    if (!accessToken) {
      set({ videoError: 'Vui lòng đăng nhập để xem danh sách video', isLoadingVideos: false });
      return;
    }
    
    try {
      set({ isLoadingVideos: true, videoError: null });
      console.log('Đang tải danh sách video từ API...');
      
      const response = await fetch('http://localhost:8000/api/v1/videos/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        }
        throw new Error(`Lỗi khi lấy danh sách video: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.videos && Array.isArray(data.videos)) {
        console.log(`Đã tải ${data.videos.length} video từ API`);
        set({ 
          videos: data.videos, 
          lastFetchTimestamp: now,
          isLoadingVideos: false 
        });
      } else {
        throw new Error('Định dạng phản hồi không hợp lệ');
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách video:', error);
      set({ 
        videoError: error instanceof Error ? error.message : 'Lỗi khi tải danh sách video',
        isLoadingVideos: false 
      });
    }
  },
  
  setVideos: (videos: VideoItem[]) => {
    set({ videos, lastFetchTimestamp: Date.now() });
  },
  
  clearVideos: () => {
    set({ videos: [], lastFetchTimestamp: null });
  }
}));

export default useVideoStore;