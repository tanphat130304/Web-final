import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IVideo } from "@designcombo/types";
import { VideoIcon } from "lucide-react";
import React, { useEffect } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import useAuthStore from "@/store/use-auth-store";
import useVideoStore, { VideoItem } from "@/store/use-video-store";
import useLayoutStore from "../store/use-layout-store";

const SCROLL_TO_VIDEO = 'SCROLL_TO_VIDEO';

const defaultVideoDetails = {
  width: 1920,
  height: 1080,
  opacity: 100,
  volume: 100,
  borderRadius: 0,
  borderWidth: 0,
  borderColor: "#000000",
  boxShadow: {
    color: "#000000",
    x: 0,
    y: 0,
    blur: 0,
  },
  top: "0px",
  left: "0px",
  transform: "none",
  blur: 0,
  brightness: 100,
  flipX: false,
  flipY: false,
  rotate: "0deg",
  visibility: "visible" as const,
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  return date.toLocaleString('vi-VN', options);
};

/**
 * Định dạng tên file để hiển thị thông minh hơn khi tên quá dài
 * - Giữ lại phần đầu và phần đuôi file, thêm "..." ở giữa
 * - Dùng khi tên file quá dài để hiển thị trong không gian hạn chế
 */
const formatFileName = (fileName: string, maxLength: number = 25) => {
  if (fileName.length <= maxLength) {
    return fileName;
  }
  
  // Tìm phần mở rộng của file (ví dụ: .mp4, .mov)
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // Không có phần mở rộng
    return fileName.substring(0, maxLength - 3) + '...';
  }
  
  const extension = fileName.substring(lastDotIndex);
  const nameWithoutExtension = fileName.substring(0, lastDotIndex);
  
  // Số ký tự hiển thị ở phần đầu của tên file
  const startChars = Math.ceil(maxLength / 2) - 2; // -2 cho dấu "..."
  
  // Giữ nguyên phần đuôi file và một phần tên file, cộng với "..." ở giữa
  return nameWithoutExtension.substring(0, startChars) + 
         '...' + 
         extension;
};

export const Videos = () => {  
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const { accessToken } = useAuthStore();
  const { 
    setSelectedVideoId,
    videos,
    isLoadingVideos: loading,
    videoError: error,
    fetchVideos
  } = useVideoStore();
  const { setShowMenuItem, setActiveMenuItem } = useLayoutStore();

  useEffect(() => {
    // Lấy danh sách videos từ store, sẽ tự động kiểm tra cache time
    if (accessToken) {
      console.log('Tải danh sách videos từ store hoặc API nếu cần');
      fetchVideos(accessToken);
    }
  }, [accessToken, fetchVideos]);

  const handleAddVideo = (video: VideoItem) => {
    // Save the selected video ID to the store and localStorage
    setSelectedVideoId(video.video_id);
    console.log("Selected video ID:", video.video_id);
    
    const payload: Partial<IVideo> = {
      type: "video",
      details: {
        ...defaultVideoDetails,
        src: video.file_url,
      },
      name: video.file_name,
      id: generateId(),
    };

    dispatch(ADD_VIDEO, {
      payload,
      options: {
        resourceId: "main",
        scaleMode: "fit",
      },
    });

    dispatch(SCROLL_TO_VIDEO, {
      payload: {
        id: payload.id,
      },
    });
    
    // Đóng menu videos sau khi chọn video
    setShowMenuItem(false);
    setActiveMenuItem(null);
    
    console.log("Đã đóng menu videos sau khi chọn video:", video.file_name);
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
          Videos
        </div>
        <div className="flex h-32 items-center justify-center text-zinc-400">
          Loading videos...
        </div>
      </div>
    );
  }

  if (error) {
    // Kiểm tra nếu lỗi liên quan đến đăng nhập
    const isAuthError = error.includes("đăng nhập") || 
                        error.includes("Phiên") || 
                        error.includes("401") ||
                        error.includes("Unauthorized");
    
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
          Videos
        </div>
        <div className="flex flex-col h-32 items-center justify-center gap-2">
          <div className="text-red-400">
            {error}
          </div>
          
          {isAuthError && (
            <button 
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              onClick={() => window.location.href = '/auth'}
            >
              Đăng nhập lại
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Videos
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-4">
          {videos.map((video) => (
            <VideoItemComponent
              key={video.video_id}
              video={video}
              shouldDisplayPreview={!isDraggingOverTimeline}
              onAddVideo={handleAddVideo}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

interface VideoItemProps {
  video: VideoItem;
  shouldDisplayPreview: boolean;
  onAddVideo: (video: VideoItem) => void;
}

const VideoItemComponent = ({ video, shouldDisplayPreview, onAddVideo }: VideoItemProps) => {
  const thumbnailStyle = {
    backgroundImage: `url(${video.thumbnail || 'https://placehold.co/300x200/333/FFF?text=Video'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '80px',
    height: '60px',
  };

  const draggableData = {
    type: "video" as const,
    details: {
      ...defaultVideoDetails,
      src: video.file_url,
    },
    name: video.file_name,
  };

  return (
    <Draggable
      data={draggableData}
      className="relative group"
    >
      <button
        onClick={() => onAddVideo(video)}
        className="w-full flex items-center p-2 rounded-lg border border-transparent hover:border-blue-500 hover:bg-blue-500/5 transition-colors"
      >
        <div className="relative">
          <div style={thumbnailStyle} className="rounded"></div>
          {!shouldDisplayPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
              <VideoIcon size={24} className="text-white" />
            </div>
          )}
        </div>

        <div className="ml-3 flex-1 min-w-0 text-left">
          <p 
            className="font-medium text-sm" 
            title={video.file_name}
          >
            {formatFileName(video.file_name, 28)}
          </p>
          <p className="text-xs text-zinc-400 truncate">
            {formatDate(video.created_at)}
          </p>
        </div>
      </button>
    </Draggable>
  );
};
