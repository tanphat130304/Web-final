import { SelectEffect } from "@/components/SelectEffect";
import { ActionButton } from "@/components/ActionButton";
import { useState, useEffect } from "react";
import useAuthStore from "@/store/use-auth-store";
import useVideoStore from "@/store/use-video-store";
import useLayoutStore from "../store/use-layout-store";

interface SelectOption {
  value: string;
  label: string;
}

const RESOLUTION_OPTIONS: SelectOption[] = [
  { value: "auto", label: "Auto" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" }
];

const FPS_OPTIONS: SelectOption[] = [
  { value: "auto", label: "Auto" },
  { value: "30", label: "30 FPS" },
  { value: "60", label: "60 FPS" }
];

const ENCODING_OPTIONS: SelectOption[] = [
  { value: "h264", label: "H.264" },
  { value: "hevc", label: "HEVC" }
];

const BITRATE_OPTIONS: SelectOption[] = [
  { value: "medium", label: "Trung Bình" },
  { value: "high", label: "Cao" },
  { value: "low", label: "Thấp" }
];

const FORMAT_OPTIONS: SelectOption[] = [
  { value: "mp4", label: "MP4" }
  // { value: "mkv", label: "MKV" },
  // { value: "avi", label: "AVI" }
];

export const Render = () => {
  const [selectedAction, setSelectedAction] = useState<string>("none");
  const [resolution, setResolution] = useState("auto");
  const [fps, setFps] = useState("auto");
  const [encoding, setEncoding] = useState("h264");
  const [bitrate, setBitrate] = useState("medium");
  const [format, setFormat] = useState("mp4");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [videoTtsId, setVideoTtsId] = useState<string | null>(null);
  const [hasVideoToExport, setHasVideoToExport] = useState(false);
  
  const { accessToken } = useAuthStore();
  const { selectedVideoId } = useVideoStore();
  const { setShowMenuItem, setActiveMenuItem } = useLayoutStore();
  
  // Kiểm tra xem có video_tts_id trong localStorage không khi component mount
  useEffect(() => {
    // Đầu tiên kiểm tra videoTtsId hiện tại trong localStorage
    const storedVideoTtsId = localStorage.getItem('videoTtsId');
    
    // Sau đó kiểm tra xem có video_tts_id cho video hiện tại không
    if (selectedVideoId) {
      try {
        // Lấy map của video_id -> video_tts_id từ localStorage
        const videoTtsMap = JSON.parse(localStorage.getItem('videoTtsMap') || '{}');
        
        // Kiểm tra xem có video_tts_id cho video này không
        if (videoTtsMap[selectedVideoId]) {
          const mappedVideoTtsId = videoTtsMap[selectedVideoId];
          console.log(`Đã tìm thấy video_tts_id cho video ${selectedVideoId}:`, mappedVideoTtsId);
          
          // Cập nhật state
          setVideoTtsId(mappedVideoTtsId);
          setHasVideoToExport(true);
          
          // Cập nhật localStorage hiện tại với video_tts_id này
          localStorage.setItem('videoTtsId', mappedVideoTtsId);
          return;
        }
      } catch (error) {
        console.error('Lỗi khi đọc videoTtsMap từ localStorage:', error);
      }
    }
    
    // Nếu không tìm thấy trong map, sử dụng videoTtsId hiện tại (nếu có)
    if (storedVideoTtsId) {
      setVideoTtsId(storedVideoTtsId);
      setHasVideoToExport(true);
      console.log('Đã tìm thấy video_tts_id trong localStorage:', storedVideoTtsId);
    } else {
      setHasVideoToExport(false);
      console.log('Không tìm thấy video_tts_id trong localStorage');
    }
  }, [selectedVideoId]);

  // Hàm để tải xuống video từ API
  const downloadVideo = async (videoTtsId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      // Kiểm tra xem có access token không
      if (!accessToken) {
        throw new Error("Bạn cần đăng nhập để tải xuống video");
      }

      const response = await fetch(`http://localhost:8000/api/v1/videos/videotts/${videoTtsId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        }
        throw new Error(`Lỗi HTTP: ${response.status}`);
      }
      
      // Lấy dữ liệu blob từ response
      const videoBlob = await response.blob();
      
      // Tạo đối tượng URL cho blob
      const url = window.URL.createObjectURL(videoBlob);
      
      // Tạo thẻ a để tải xuống
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `video-xuất-bản-${Date.now()}.${format}`;
      
      // Thêm thẻ a vào body, click để tải xuống, và xóa thẻ
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log("Đã tải xuống video thành công");
      
      // Hiển thị thông báo thành công
      setSuccess("Video đã được tải xuống thành công!");
      
      // Đóng modal sau 2 giây
      setTimeout(() => {
        setShowMenuItem(false);
        setActiveMenuItem(null);
      }, 2000);
    } catch (error) {
      console.error("Lỗi khi tải xuống video:", error);
      setError(error instanceof Error ? error.message : "Lỗi không xác định khi tải xuống video");
      if (error instanceof Error && error.message.includes("401")) {
        alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
      } else {
        alert(error instanceof Error ? error.message : "Lỗi khi tải xuống video");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: string) => {
    switch (action) {
      case "backup":
        // Xử lý tải backup
        alert("Chức năng tải backup đang được phát triển");
        break;
      case "srt":
        // Xử lý tải SRT
        alert("Chức năng tải SRT đang được phát triển");
        break;
      case "save":
        // Xử lý lưu
        alert("Chức năng lưu đang được phát triển");
        break;
      case "publish":
        // Xử lý xuất bản và tải xuống video
        if (!selectedVideoId) {
          alert("Vui lòng chọn một video trước khi xuất bản");
          return;
        }
        
        if (!videoTtsId) {
          alert("Không tìm thấy video đã lồng tiếng. Vui lòng lồng tiếng video trước khi xuất bản.");
          return;
        }
        
        // Tải xuống video
        downloadVideo(videoTtsId);
        break;
      case "cancel":
        // Xử lý hủy - đóng modal
        setShowMenuItem(false);
        setActiveMenuItem(null);
        break;
    }
  };

  return (
    <div
      className="modal-container absolute rounded-lg text-white relative overflow-hidden transition-all duration-150 opacity-100 scale-100"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "50vw",
        height: "60vh",
        zIndex: 200,
        background: 'linear-gradient(40deg, rgb(28, 0, 82), rgb(0, 3, 22))',
        isolation: 'isolate',
        boxShadow: '0 0 4px rgba(39, 6, 95, 0.4), 0 0 40px rgba(103, 0, 108, 0.2)',
        borderRadius: '20px',
      }}
    >
      <style>
        {`
          .modal-container.closing {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
        `}
      </style>
      <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-0 h-0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="gradients-container absolute inset-0 -z-10" style={{ filter: 'url(#goo) blur(20px)' }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`g${i + 1} absolute w-2/5 h-2/5 opacity-${[30, 30, 30, 20, 25][i]} ${
              i === 3 ? 'animate-move-horizontal' : 'animate-move-in-circle'
            }`}
            style={{
              background: [
                'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(18, 83, 255, 0.3) 20%, rgba(18, 83, 255, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
                'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(181, 54, 215, 0.3) 20%, rgba(126, 54, 215, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
                'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(80, 180, 255, 0.3) 20%, rgba(80, 180, 255, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
                'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(147, 51, 234, 0.3) 20%, rgba(147, 51, 234, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
                'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(236, 72, 153, 0.3) 20%, rgba(236, 72, 153, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)'
              ][i],
              mixBlendMode: 'hard-light',
              top: `${30 + i * 5}%`,
              left: `${30 + i * 5}%`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6">
        <h2 className="mb-2 text-ls">Xuất bản</h2>
        
        {/* Hiển thị trạng thái video */}
        <div className={`text-sm ${hasVideoToExport ? 'text-green-400' : 'text-yellow-400'} mb-4`}>
          {hasVideoToExport 
            ? "Video đã lồng tiếng sẵn sàng để xuất bản" 
            : "Chưa có video lồng tiếng. Vui lòng lồng tiếng video trước khi xuất bản."}
        </div>

        <br />

        {/* Form xuất bản */}
        <div className="grid grid-cols-[1fr_150px] gap-x-4 gap-y-3 max-w-[400px] ml-auto">
          <div className="flex justify-end w-full">
            <label className="self-center text-sm font-medium w-[140px]">
              Độ phân giải:
            </label>
          </div>
          <div className="w-full">
            <SelectEffect
              id="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              options={RESOLUTION_OPTIONS}
              title="Chọn độ phân giải xuất video"
            />
          </div>

          <div className="flex justify-end w-full">
            <label className="self-center text-sm font-medium w-[140px]">
              Tốc độ khung hình:
            </label>
          </div>
          <div className="w-full">
            <SelectEffect
              id="fps"
              value={fps}
              onChange={(e) => setFps(e.target.value)}
              options={FPS_OPTIONS}
              title="Chọn tốc độ khung hình"
            />
          </div>

          <div className="flex justify-end w-full">
            <label className="self-center text-sm font-medium w-[140px]">
              Mã hóa:
            </label>
          </div>
          <div className="w-full">
            <SelectEffect
              id="encoding"
              value={encoding}
              onChange={(e) => setEncoding(e.target.value)}
              options={ENCODING_OPTIONS}
              title="Chọn chuẩn mã hóa video"
            />
          </div>

          <div className="flex justify-end w-full">
            <label className="self-center text-sm font-medium w-[140px]">
              Tốc độ Bit:
            </label>
          </div>
          <div className="w-full">
            <SelectEffect
              id="bitrate"
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              options={BITRATE_OPTIONS}
              title="Chọn tốc độ bit cho video"
            />
          </div>

          <div className="flex justify-end w-full">
            <label className="self-center text-sm font-medium w-[140px]">
              Định dạng:
            </label>
          </div>
          <div className="w-full">
            <SelectEffect
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              options={FORMAT_OPTIONS}
              title="Chọn định dạng file xuất"
            />
          </div>
        </div>

        <br />
        <br />

        {/* Hiển thị thông báo lỗi nếu có */}
        {error && (
          <div className="mt-4 p-2 bg-red-500/20 text-red-200 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {/* Hiển thị thông báo thành công nếu có */}
        {success && (
          <div className="mt-4 p-2 bg-green-500/20 text-green-200 rounded-md text-sm">
            {success}
          </div>
        )}
        
        {/* Nút hành động */}
        <div className="mt-4 flex justify-end gap-2">
          {/* <ActionButton
            label="Tải backup"
            onClick={() => handleAction("backup")}
            variant="tree"
            disabled={isLoading}
          /> */}
          {/* <ActionButton
            label="Tải .SRT"
            onClick={() => handleAction("srt")}
            variant="pink"
            disabled={isLoading}
          /> */}
          {/* <ActionButton
            label="Lưu"
            onClick={() => handleAction("save")}
            variant="green"
            disabled={isLoading}
          /> */}
          {isLoading ? (
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center justify-center gap-2 opacity-70 cursor-not-allowed"
              disabled
            >
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              Đang tải...
            </button>
          ) : (
            <ActionButton
              label="Tải xuống"
              onClick={() => handleAction("publish")}
              variant="blue"
            />
          )}
          <ActionButton
            label="Hủy"
            onClick={() => handleAction("cancel")}
            variant="red"
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
};
