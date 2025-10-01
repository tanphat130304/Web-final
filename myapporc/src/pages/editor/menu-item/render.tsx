import { SelectEffect } from "@/components/SelectEffect";
import { ActionButton } from "@/components/ActionButton";
import { useState, useEffect } from "react";
import useAuthStore from "@/store/use-auth-store";
import useVideoStore from "@/store/use-video-store";
import useLayoutStore from "../store/use-layout-store";
import { X, Download, CheckCircle2, XCircle, AlertCircle, Loader2, Video, VideoOff } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

// Simplified options - only essential ones
const QUALITY_OPTIONS: SelectOption[] = [
  { value: "1080p", label: "Full HD (1080p)" },
  { value: "720p", label: "HD (720p)" },
  { value: "480p", label: "SD (480p)" }
];

const VIDEO_TYPE_OPTIONS: SelectOption[] = [
  { value: "original", label: "Video gốc" },
  { value: "dubbed", label: "Video đã lồng tiếng" }
];

// Toast notification component
const Toast = ({ 
  type, 
  message, 
  onClose 
}: { 
  type: 'success' | 'error' | 'warning';
  message: string;
  onClose: () => void;
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />
  };
  
  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200'
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg border shadow-lg z-50 ${bgColors[type]}`}>
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="flex-1">
          <p className="text-sm text-gray-800 font-medium">{message}</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const Render = () => {
  const [quality, setQuality] = useState("1080p");
  const [videoType, setVideoType] = useState("original");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [videoTtsId, setVideoTtsId] = useState<string | null>(null);
  const [hasVideoToExport, setHasVideoToExport] = useState(false);
  const [hasDubbedVideo, setHasDubbedVideo] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const { accessToken } = useAuthStore();
  const { selectedVideoId } = useVideoStore();
  const { setShowMenuItem, setActiveMenuItem } = useLayoutStore();

  // Show toast notification
  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
  };

  // Close modal
  const closeModal = () => {
    setShowMenuItem(false);
    setActiveMenuItem(null);
  };

  // Check available videos on mount
  useEffect(() => {
    if (selectedVideoId) {
      setHasVideoToExport(true);
      console.log('Video gốc có sẵn cho video ID:', selectedVideoId);
    } else {
      setHasVideoToExport(false);
    }

    // Check for dubbed video
    const storedVideoTtsId = localStorage.getItem('videoTtsId');
    
    if (selectedVideoId) {
      try {
        const videoTtsMap = JSON.parse(localStorage.getItem('videoTtsMap') || '{}');
        
        if (videoTtsMap[selectedVideoId]) {
          const mappedVideoTtsId = videoTtsMap[selectedVideoId];
          setVideoTtsId(mappedVideoTtsId);
          setHasDubbedVideo(true);
          localStorage.setItem('videoTtsId', mappedVideoTtsId);
          return;
        }
      } catch (error) {
        console.error('Lỗi khi đọc videoTtsMap từ localStorage:', error);
      }
    }
    
    if (storedVideoTtsId) {
      setVideoTtsId(storedVideoTtsId);
      setHasDubbedVideo(true);
    } else {
      setHasDubbedVideo(false);
    }
  }, [selectedVideoId]);

  // Auto switch to original if dubbed not available
  useEffect(() => {
    if (videoType === "dubbed" && !hasDubbedVideo) {
      setVideoType("original");
      showToast('warning', 'Video lồng tiếng không có sẵn. Đã chuyển về video gốc.');
    }
  }, [videoType, hasDubbedVideo]);

  // Get available video type options
  const getAvailableVideoTypeOptions = (): SelectOption[] => {
    const options: SelectOption[] = [{ value: "original", label: "Video gốc" }];
    if (hasDubbedVideo) {
      options.push({ value: "dubbed", label: "Video đã lồng tiếng" });
    }
    return options;
  };

  // Download with progress simulation
  const downloadWithProgress = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Phiên đăng nhập đã hết hạn");
        }
        throw new Error(`Lỗi tải xuống: ${response.status}`);
      }

      // Simulate progress for better UX
      const intervals = [10, 30, 50, 70, 85, 95];
      for (const progress of intervals) {
        setDownloadProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const videoBlob = await response.blob();
      setDownloadProgress(100);
      
      // Download file
      const url_blob = window.URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url_blob;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url_blob);
      document.body.removeChild(a);
      
      return true;
    } catch (error) {
      throw error;
    } finally {
      setDownloadProgress(0);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!selectedVideoId) {
      showToast('error', 'Vui lòng chọn một video trước khi xuất bản');
      return;
    }

    if (!accessToken) {
      showToast('error', 'Bạn cần đăng nhập để tải xuống video');
      return;
    }

    setIsLoading(true);
    
    try {
      let url: string;
      let filename: string;
      
      if (videoType === "original") {
        url = `http://localhost:8000/api/v1/videos/${selectedVideoId}`;
        filename = `video-gốc-${quality}-${Date.now()}.mp4`;
      } else {
        if (!videoTtsId) {
          showToast('error', 'Video lồng tiếng không có sẵn');
          return;
        }
        url = `http://localhost:8000/api/v1/videos/videotts/${videoTtsId}`;
        filename = `video-lồng-tiếng-${quality}-${Date.now()}.mp4`;
      }

      await downloadWithProgress(url, filename);
      
      showToast('success', 'Video đã được tải xuống thành công!');
      
      // Close modal after successful download
      setTimeout(closeModal, 1500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      showToast('error', `Lỗi tải xuống: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Download className="w-5 h-5" />
              Xuất bản video
            </h2>
            <button
              onClick={closeModal}
              className="text-slate-400 hover:text-white transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Video Status */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 mb-2">Trạng thái video</h3>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800">
                {hasVideoToExport ? (
                  <Video className="w-4 h-4 text-green-400" />
                ) : (
                  <VideoOff className="w-4 h-4 text-red-400" />
                )}
                <div className="flex-1">
                  <div className="text-sm text-white">Video gốc</div>
                  <div className={`text-xs ${hasVideoToExport ? 'text-green-400' : 'text-red-400'}`}>
                    {hasVideoToExport ? 'Có sẵn' : 'Không có'}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${hasVideoToExport ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800">
                {hasDubbedVideo ? (
                  <Video className="w-4 h-4 text-green-400" />
                ) : (
                  <VideoOff className="w-4 h-4 text-yellow-400" />
                )}
                <div className="flex-1">
                  <div className="text-sm text-white">Video lồng tiếng</div>
                  <div className={`text-xs ${hasDubbedVideo ? 'text-green-400' : 'text-yellow-400'}`}>
                    {hasDubbedVideo ? 'Có sẵn' : 'Chưa có'}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${hasDubbedVideo ? 'bg-green-400' : 'bg-yellow-400'}`} />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300">Cài đặt xuất bản</h3>
              
              {/* Video Type */}
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Loại video</label>
                <SelectEffect
                  id="videoType"
                  value={videoType}
                  onChange={(e) => setVideoType(e.target.value)}
                  options={getAvailableVideoTypeOptions()}
                  title="Chọn loại video"
                />
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Chất lượng</label>
                <SelectEffect
                  id="quality"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  options={QUALITY_OPTIONS}
                  title="Chọn chất lượng video"
                />
              </div>
            </div>

            {/* Progress bar during download */}
            {isLoading && downloadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Đang tải xuống...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-slate-700">
            <button
              onClick={closeModal}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !hasVideoToExport}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xuất bản...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Xuất bản
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
