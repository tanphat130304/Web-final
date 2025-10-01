import React, { useState, useEffect, useRef, useCallback } from "react";
import useAuthStore from "@/store/use-auth-store";
import useVideoStore from "@/store/use-video-store";
import useStore from "@/pages/editor/store/use-store";
import useSubtitleHistoryStore, { Subtitle } from "@/store/use-subtitle-history-store";
import { 
  Trash2, 
  RotateCcw, 
  Save, 
  AlertCircle,
  Loader2,
  FileText,
  Video,
  Languages,
  Undo2,
  Redo2,
  Clock,
  CheckCircle2,
  PlayCircle
} from "lucide-react";

// Hàm phân tích nội dung SRT
const parseSRT = (srtContent: string) => {
  const subtitles: Subtitle[] = [];
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
          translated: ''
        });
      }
    }
  });
  
  return subtitles;
};

// Lấy video ID từ localStorage
const getVideoId = (): string | null => {
  return localStorage.getItem('current_video_id');
};

interface SubtitleDisplayProps {
  subtitles?: Subtitle[];
  maxSceneTime?: number;
}

interface SubtitleStatus {
  hasOriginal: boolean;
  hasTranslated: boolean;
  videoId: string | null;
  errorMessage: string | null;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}s`;
};

// Cache cho subtitle
const subtitleCache: Record<string, { 
  subtitles: Subtitle[],
  timestamp: number,
  status: SubtitleStatus
}> = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 phút

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ subtitles: propSubtitles, maxSceneTime: propMaxSceneTime }) => {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { selectedVideoId, getSelectedVideo } = useVideoStore();
  const store = useStore();
  const { 
    subtitles, 
    setSubtitles, 
    deleteSubtitle, 
    editSubtitle, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    clearHistory,
    history,
    currentHistoryIndex
  } = useSubtitleHistoryStore();
  
  const [maxSceneTime, setMaxSceneTime] = useState<number>(propMaxSceneTime || 60);
  const [localSubtitles, setLocalSubtitles] = useState<Subtitle[]>(propSubtitles || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [subtitleStatus, setSubtitleStatus] = useState<SubtitleStatus>({
    hasOriginal: false,
    hasTranslated: false,
    videoId: null,
    errorMessage: null
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [undoMessage, setUndoMessage] = useState<string>("");
  const fetchInProgress = useRef(false);
  
  // Get selected video info
  const selectedVideo = getSelectedVideo();
  
  // Sync subtitle store with local state
  useEffect(() => {
    if (subtitles.length > 0) {
      setLocalSubtitles(subtitles);
    }
  }, [subtitles]);
  
  // Cập nhật maxSceneTime từ thời lượng video
  useEffect(() => {
    if (store.trackItemsMap) {
      const videoItems = Object.values(store.trackItemsMap).filter(item => item.type === "video");
      
      if (videoItems.length > 0 && videoItems[0]) {
        if (videoItems[0].duration) {
          const durationInSeconds = Math.floor(videoItems[0].duration / 1000);
          console.log(`Cập nhật thời lượng video từ metadata: ${durationInSeconds}s`);
          setMaxSceneTime(durationInSeconds);
        }
      }
    }
  }, [store.trackItemsMap]);
  
  // Fetch subtitles from API
  useEffect(() => {
    if (propSubtitles && propSubtitles.length > 0) {
      setLocalSubtitles(propSubtitles);
      setSubtitles(propSubtitles);
      setSubtitleStatus({
        hasOriginal: true,
        hasTranslated: propSubtitles.some(sub => sub.translated && sub.translated.trim() !== ''),
        videoId: 'props',
        errorMessage: null
      });
      return;
    }

    const fetchSubtitles = async () => {
      if (fetchInProgress.current) {
        console.log("Đang tải phụ đề, bỏ qua yêu cầu trùng lặp");
        return;
      }

      const videoId = selectedVideoId || 
                      localStorage.getItem('mostRecentVideoId') || 
                      localStorage.getItem('selectedVideoId') ||
                      localStorage.getItem('current_video_id');
      
      console.log('[SubtitleDisplay] Video ID sources:', {
        selectedVideoId,
        mostRecentVideoId: localStorage.getItem('mostRecentVideoId'),
        legacySelectedVideoId: localStorage.getItem('selectedVideoId'),
        currentVideoId: localStorage.getItem('current_video_id'),
        finalVideoId: videoId
      });
      
      if (!videoId) {
        const errorMsg = "Không tìm thấy ID video. Vui lòng chọn một video từ danh sách.";
        console.warn('[SubtitleDisplay]', errorMsg);
        setError(errorMsg);
        setSubtitleStatus({
          hasOriginal: false,
          hasTranslated: false,
          videoId: null,
          errorMessage: errorMsg
        });
        setIsLoading(false);
        return;
      }
      
      const cachedData = subtitleCache[videoId];
      const now = Date.now();
      
      if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
        console.log("Sử dụng phụ đề từ cache cho video:", videoId);
        setLocalSubtitles(cachedData.subtitles);
        setSubtitles(cachedData.subtitles);
        setSubtitleStatus(cachedData.status);
        setIsLoading(false);
        return;
      }
      
      console.log("🎬 Bắt đầu tải phụ đề cho video ID:", videoId);
      
      setIsLoading(true);
      setError(null);
      setSubtitleStatus({
        hasOriginal: false,
        hasTranslated: false,
        videoId: videoId,
        errorMessage: null
      });
      fetchInProgress.current = true;
      
      let currentStatus: SubtitleStatus = {
        hasOriginal: false,
        hasTranslated: false,
        videoId: videoId,
        errorMessage: null
      };
      
      try {
        if (!isAuthenticated || !accessToken) {
          throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập để xem phụ đề.");
        }
        
        console.log("📥 Gọi API phụ đề gốc:", `http://localhost:8000/api/v1/videos/srt/${videoId}/original`);
        
        const originalResponse = await fetch(`http://localhost:8000/api/v1/videos/srt/${videoId}/original`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (originalResponse.ok) {
          const originalSrt = await originalResponse.text();
          const originalSubtitles = parseSRT(originalSrt);
          console.log(`✅ Tải thành công ${originalSubtitles.length} phụ đề gốc`);
          currentStatus.hasOriginal = true;
          
          try {
            console.log("📥 Gọi API phụ đề đã dịch:", `http://localhost:8000/api/v1/videos/srt/${videoId}/translated`);
          const translatedResponse = await fetch(`http://localhost:8000/api/v1/videos/srt/${videoId}/translated`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
          });
          
          if (translatedResponse.ok) {
              const translatedSrt = await translatedResponse.text();
              const translatedSubtitles = parseSRT(translatedSrt);
              console.log(`✅ Tải thành công ${translatedSubtitles.length} phụ đề đã dịch`);
              currentStatus.hasTranslated = true;
              
              const mergedSubtitles = originalSubtitles.map(originalSub => {
                const translatedSub = translatedSubtitles.find(transSub => transSub.id === originalSub.id);
              return {
                  ...originalSub,
                  translated: translatedSub ? translatedSub.original : ''
              };
            });
              
              setLocalSubtitles(mergedSubtitles);
              setSubtitles(mergedSubtitles);
              clearHistory(); // Clear history when loading new subtitles
            } else {
              console.log("⚠️ Không có phụ đề đã dịch, chỉ hiển thị phụ đề gốc");
              setLocalSubtitles(originalSubtitles);
              setSubtitles(originalSubtitles);
              clearHistory();
            }
          } catch (translatedError) {
            console.log("⚠️ Lỗi khi tải phụ đề đã dịch:", translatedError);
            setLocalSubtitles(originalSubtitles);
            setSubtitles(originalSubtitles);
            clearHistory();
          }
        } else {
          if (originalResponse.status === 404) {
            throw new Error("Video này chưa có phụ đề được tạo. Vui lòng tạo phụ đề trước khi sử dụng.");
          } else if (originalResponse.status === 401) {
            throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          } else {
            throw new Error(`Lỗi tải phụ đề: ${originalResponse.status} ${originalResponse.statusText}`);
          }
        }
      } catch (error) {
        console.error("❌ Lỗi tải phụ đề:", error);
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định khi tải phụ đề";
        setError(errorMessage);
        currentStatus.errorMessage = errorMessage;
          }
          
          subtitleCache[videoId] = {
        subtitles: localSubtitles,
        timestamp: Date.now(),
        status: currentStatus
      };
      
      setSubtitleStatus(currentStatus);
        setIsLoading(false);
        fetchInProgress.current = false;
    };
    
    fetchSubtitles();
  }, [selectedVideoId, isAuthenticated, accessToken]);

  // Event handlers with history support
  const handleDeleteLine = (id: number) => {
    console.log("Delete line", id);
    const newSubtitles = deleteSubtitle(id);
    setLocalSubtitles(newSubtitles);
  
    // Show undo message
    const deletedSubtitle = localSubtitles.find(sub => sub.id === id);
    if (deletedSubtitle) {
      setUndoMessage(`Đã xóa phụ đề #${id}`);
      setTimeout(() => setUndoMessage(""), 3000);
    }
  };
  
  const handleRerollLine = (id: number) => {
    console.log("Reroll line", id);
    // TODO: Implement reroll functionality
  };

  const handleEditSubtitle = (id: number, changes: Partial<Subtitle>) => {
    const newSubtitles = editSubtitle(id, changes);
    setLocalSubtitles(newSubtitles);
    setEditingId(null);
  };

  const handleUndo = () => {
    const undoSubtitles = undo();
    if (undoSubtitles) {
      setLocalSubtitles(undoSubtitles);
      setUndoMessage("Đã hoàn tác");
      setTimeout(() => setUndoMessage(""), 2000);
    }
  };

  const handleRedo = () => {
    const redoSubtitles = redo();
    if (redoSubtitles) {
      setLocalSubtitles(redoSubtitles);
      setUndoMessage("Đã làm lại");
      setTimeout(() => setUndoMessage(""), 2000);
    }
  };

  const saveSubtitles = () => {
    console.log("Save subtitles", localSubtitles);
    // TODO: Implement save functionality
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-3 p-6">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <div className="text-sm font-medium text-white">Đang tải phụ đề...</div>
          <div className="text-xs text-gray-400">Vui lòng chờ trong giây lát</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error.includes("đăng nhập") || 
                        error.includes("Phiên") || 
                        error.includes("401");
    
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4 p-6 max-w-sm mx-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div className="text-sm font-medium text-red-400 text-center">{error}</div>
          
          {isAuthError ? (
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
              onClick={() => window.location.href = '/auth'}
            >
              Đăng nhập lại
            </button>
          ) : (
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!localSubtitles || localSubtitles.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4 p-6 max-w-sm mx-4">
          <FileText className="h-8 w-8 text-gray-500" />
          <div className="text-sm font-medium text-white text-center">Không có phụ đề nào được tìm thấy</div>
          {subtitleStatus.videoId && (
            <div className="text-xs text-gray-400 text-center space-y-1">
              <div>Video ID: {subtitleStatus.videoId}</div>
              <div>Có thể video này chưa được xử lý hoặc không có phụ đề được tạo.</div>
            </div>
          )}
          
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
            onClick={() => window.location.reload()}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }
  
  // Status display component
  const SubtitleStatusDisplay = () => (
    <div className="bg-gray-800/80 px-3 py-2 border-b border-gray-700/50 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Video className="h-3 w-3 text-blue-400" />
            <span className="text-gray-300">Video:</span>
            {selectedVideo ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                <span className="text-green-400 font-medium">
                  {selectedVideo.title || 'Untitled Video'}
                </span>
              </div>
            ) : (
              <span className="text-red-400 text-[10px]">Chưa chọn video</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs ${subtitleStatus.hasOriginal ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${subtitleStatus.hasOriginal ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span>Gốc</span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${subtitleStatus.hasTranslated ? 'text-green-400' : 'text-yellow-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${subtitleStatus.hasTranslated ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span>Dịch</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <FileText className="h-3 w-3" />
          <span>{localSubtitles.length}</span>
        </div>
      </div>
      {!subtitleStatus.hasTranslated && subtitleStatus.hasOriginal && (
        <div className="flex items-center gap-1.5 text-yellow-400 text-[10px] mt-1.5 p-1.5 bg-yellow-400/10 rounded border border-yellow-400/20">
          <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />
          <span>Chỉ có phụ đề gốc, chưa có bản dịch</span>
        </div>
      )}
      {selectedVideo && (
        <div className="flex items-center gap-1.5 text-blue-400 text-[10px] mt-1.5 p-1.5 bg-blue-400/10 rounded border border-blue-400/20">
          <PlayCircle className="h-2.5 w-2.5 flex-shrink-0" />
          <span>ID: {selectedVideo.video_id}</span>
        </div>
      )}
    </div>
  );

  // Action bar with undo/redo
  const ActionBar = () => (
    <div className="bg-gray-800/80 px-3 py-2 border-b border-gray-700/50 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-300">
            Chỉnh sửa phụ đề video
          </div>
          {history.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Clock className="h-2.5 w-2.5" />
              <span>{currentHistoryIndex + 1}/{history.length}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo()}
            className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors text-xs font-medium"
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo2 className="h-3 w-3" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo()}
            className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded transition-colors text-xs font-medium"
            title="Làm lại (Ctrl+Y)"
          >
            <Redo2 className="h-3 w-3" />
          </button>
          <div className="w-px h-4 bg-gray-600 mx-1"></div>
          <button
            onClick={saveSubtitles}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-xs font-medium"
            title="Lưu thay đổi"
          >
            <Save className="h-3 w-3" />
            Lưu
          </button>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div 
      className="flex flex-col h-full bg-gray-900 text-white"
      style={{
        isolation: 'isolate',
        contain: 'layout style paint'
      }}
    >
      {/* Undo message */}
      {undoMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-3 py-2 bg-green-600 text-white text-sm rounded-md shadow-lg">
          {undoMessage}
        </div>
      )}
      
      {/* Status display */}
      <SubtitleStatusDisplay />
      
      {/* Action bar with undo/redo */}
      <ActionBar />

      {/* Subtitle list with simple scroll and explicit max-height */}
      <div 
        className="overflow-y-auto subtitle-scroll-container p-3 space-y-3"
        style={{
          maxHeight: 'calc(100vh - 200px)'
        }}
      >
        {localSubtitles.map((subtitle, index) => (
          <div
            key={subtitle.id}
            className="bg-gray-800 rounded-lg border border-gray-700 p-3 hover:border-gray-600 transition-all duration-200"
          >
            {/* Header with original text and controls */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-400 font-mono mb-1">
                  #{subtitle.id.toString().padStart(3, '0')}
                  {subtitle.startTime && subtitle.endTime && (
                    <span className="ml-2 text-gray-500">
                      {subtitle.startTime} → {subtitle.endTime}
                    </span>
                  )}
                </div>
                <div
                  onDoubleClick={() => setEditingId(subtitle.id)}
                  className="text-sm text-gray-200 cursor-pointer hover:text-white transition-colors leading-relaxed break-words"
                  title="Double-click để chỉnh sửa"
                >
                  {subtitle.original}
                </div>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDeleteLine(subtitle.id)}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  title="Xóa dòng"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleRerollLine(subtitle.id)}
                  className="p-1 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                  title="Tạo lại"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </div>
            
            {/* Translated text area */}
            <div>
              <textarea
                defaultValue={subtitle.translated}
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                placeholder="Nhập bản dịch..."
                rows={2}
                onBlur={(e) => {
                  if (e.target.value !== subtitle.translated) {
                    handleEditSubtitle(subtitle.id, { translated: e.target.value });
                  }
                }}
              />
            </div>
          </div>
        ))}
        
        {/* Padding bottom để scroll thoải mái */}
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default SubtitleDisplay;