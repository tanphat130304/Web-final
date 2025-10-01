import React, { useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { dispatch } from "@designcombo/events";
import {
  ADD_VIDEO,
  EDIT_OBJECT,
} from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import useLayoutStore from "../store/use-layout-store";
import useStore from "../store/use-store";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import useAuthStore from "@/store/use-auth-store";
import useVideoStore, { VideoItem } from "@/store/use-video-store";
import { PlayCircle, CheckCircle2, Clock, AlertCircle, RefreshCcw } from "lucide-react";

const VideoCard = ({ 
  video, 
  isSelected, 
  onClick 
}: { 
  video: VideoItem; 
  isSelected: boolean; 
  onClick: () => void; 
}) => {
  const [hasVideoError, setHasVideoError] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`
        group relative cursor-pointer rounded-lg border-2 transition-all duration-200 hover:scale-[1.02]
        ${isSelected 
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/70'
        }
      `}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full border-2 border-gray-900">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      
      {/* Video preview area */}
      <div className="aspect-video bg-gray-900 rounded-t-lg flex items-center justify-center relative overflow-hidden">
        {(video.video_url || video.file_url) && !hasVideoError ? (
          <video 
            src={video.video_url || video.file_url} 
            className="w-full h-full object-cover"
            muted
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
            onError={(e) => {
              console.log('Video preview error for', video.video_id, ':', e.currentTarget.error);
              setHasVideoError(true);
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <PlayCircle className="w-8 h-8" />
            <span className="text-xs">
              {hasVideoError ? 'Preview không khả dụng' : 'Chưa có preview'}
            </span>
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <PlayCircle className="w-12 h-12 text-white" />
        </div>
      </div>
      
      {/* Video info */}
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-medium text-white truncate" title={video.title || video.file_name}>
          {video.title || video.file_name || 'Untitled Video'}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{new Date(video.created_at).toLocaleDateString('vi-VN')}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">
          ID: {video.video_id}
        </div>
      </div>
    </div>
  );
};

export const Videos = () => {  
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const { accessToken } = useAuthStore();
  const { 
    setSelectedVideoId,
    selectedVideoId,
    videos,
    isLoadingVideos: loading,
    videoError: error,
    fetchVideos,
    getSelectedVideo
  } = useVideoStore();
  const { setShowMenuItem, setActiveMenuItem } = useLayoutStore();
  const { trackItemsMap, size, duration } = useStore();

  useEffect(() => {
    // Fetch videos from store, will auto-check cache time
    if (accessToken) {
      console.log('[VideosComponent] Loading videos from store or API if needed');
      fetchVideos(accessToken, false, 'VideosComponent').catch(error => {
        console.error('[VideosComponent] Error fetching videos:', error);
      });
    } else {
      console.log('[VideosComponent] No access token available');
    }
  }, [accessToken, fetchVideos]);

  const handleAddVideo = async (video: VideoItem) => {
    // Save the selected video ID to the store and localStorage
    setSelectedVideoId(video.video_id);
    console.log("Selected video ID:", video.video_id);
    console.log("Video object:", video);
    console.log("Video title:", video.title);

    // Create video URL for the editor with validation
    // Priority: video_url > file_url > file_path > API fallback
    console.log("Video URL options:", {
      video_url: video.video_url,
      file_url: video.file_url,
      file_path: video.file_path
    });
    
    let videoSrc = video.video_url || video.file_url || video.file_path;
    
    // Validate S3 URLs (check if they're not expired or malformed)
    if (videoSrc && videoSrc.includes('amazonaws.com')) {
      // Check if S3 URL has expired (contains Expires parameter)
      try {
        const url = new URL(videoSrc);
        const expires = url.searchParams.get('Expires');
        if (expires) {
          const expiresTimestamp = parseInt(expires) * 1000; // Convert to milliseconds
          const now = Date.now();
          if (now > expiresTimestamp) {
            console.warn("S3 URL has expired, using API fallback");
            videoSrc = undefined;
          } else {
            console.log("S3 URL is valid, expires at:", new Date(expiresTimestamp));
          }
        }
      } catch (error) {
        console.warn("Failed to parse S3 URL, treating as invalid:", error);
        videoSrc = undefined;
      }
    }
    
    // Only use API fallback if no direct URL is available or URL is invalid
    if (!videoSrc) {
      // Note: For proper authenticated streaming, we should use the useAuthenticatedVideo hook
      // instead of this direct URL, but for now this serves as a fallback identifier
      videoSrc = `http://localhost:8000/api/v1/videos/${video.video_id}/stream`;
      console.log("Using API fallback URL for video:", video.video_id);
    } else {
      console.log("Using direct URL for video:", video.video_id, "->", videoSrc.substring(0, 80) + "...");
    }
    
    // Use video title if available, fallback to file_name
    const videoTitle = video.title || video.file_name || 'Untitled Video';
    
    // Check for existing video items in timeline
    const videoItems = Object.values(trackItemsMap).filter(item => item.type === "video");
    
    if (videoItems.length > 0) {
      // Replace existing video - use correct format for EDIT_OBJECT
      const existingVideoItem = videoItems[0];
      
      console.log("Replacing existing video item:", existingVideoItem);
      
      // Use the correct EDIT_OBJECT format matching basic-audio.tsx
      dispatch(EDIT_OBJECT, {
        payload: {
          [existingVideoItem.id]: {
            details: {
              src: videoSrc,
            },
          },
        },
      });
      
      // Update metadata separately to track video ID
      dispatch(EDIT_OBJECT, {
        payload: {
          [existingVideoItem.id]: {
            metadata: {
              ...existingVideoItem.metadata,
              videoId: video.video_id,
              fileName: videoTitle,
              videoName: videoTitle,
            },
          },
        },
      });
      
      console.log("Replaced existing video with:", videoTitle);
    } else {
      // Add new video - use simple payload format like in droppable.tsx
      dispatch(ADD_VIDEO, { 
        payload: {
          type: "video",
          details: {
            src: videoSrc,
          },
          name: videoTitle,
          metadata: {
            videoId: video.video_id,
            fileName: videoTitle,
            videoName: videoTitle,
          },
          id: generateId(),
        }
      });
      
      console.log("Added new video:", videoTitle);
    }
    
    // Close the menu
    setShowMenuItem(false);
    setActiveMenuItem(null);
  };

  const handleRefresh = () => {
    if (accessToken) {
      fetchVideos(accessToken, true, 'RefreshButton');
    }
  };

  const selectedVideo = getSelectedVideo();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <div className="text-sm text-gray-400">Đang tải danh sách video...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <div className="text-sm text-red-400 text-center max-w-xs">{error}</div>
        <ActionButton
          label="Thử lại"
          onClick={handleRefresh}
          variant="blue"
        />
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-4">
        <PlayCircle className="w-12 h-12 text-gray-500" />
        <div className="text-sm text-gray-400 text-center max-w-xs">
          Chưa có video nào. Hãy tải lên video từ menu "Tải lên".
        </div>
        <ActionButton
          label="Làm mới"
          onClick={handleRefresh}
          variant="blue"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <PlayCircle className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Videos</h2>
          <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
            {videos.length}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Làm mới danh sách"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Selected video info */}
      {selectedVideo && (
        <div className="p-4 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã chọn: {selectedVideo.title || selectedVideo.file_name || 'Untitled Video'}</span>
          </div>
        </div>
      )}

      {/* Video grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.video_id}
              video={video}
              isSelected={selectedVideoId === video.video_id}
              onClick={() => handleAddVideo(video)}
            />
          ))}
        </div>
      </div>

      {/* Drag feedback */}
      {isDraggingOverTimeline && (
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 flex items-center justify-center">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium">
            Thả video vào timeline
          </div>
        </div>
      )}
    </div>
  );
};
