import { useState, useEffect } from "react";
import waveTop from "@/assets/wave-top.png";
import waveMid from "@/assets/wave-mid.png";
import waveBot from "@/assets/wave-bot.png";
import { ActionButton } from "@/components/ActionButton";
import useVideoStore from "@/store/use-video-store";
import useAuthStore from "@/store/use-auth-store";
import useLayoutStore from "../store/use-layout-store";

const waveAnimations = {
  moveWaveTop: `
    @keyframes moveWaveTop {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `,
  moveWaveMiddle: `
    @keyframes moveWaveMiddle {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `,
  moveWaveBottom: `
    @keyframes moveWaveBottom {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `
};

export const Dubbing = () => {
  const [checked, setChecked] = useState(false);
  const [voiceType, setVoiceType] = useState("male"); // Default to male voice
  const [videoTtsId, setVideoTtsId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDubbingComplete, setIsDubbingComplete] = useState(false);
  const [showDownloadOption, setShowDownloadOption] = useState(true);
  const { selectedVideoId } = useVideoStore(); // Lấy video_id từ store
  const { accessToken } = useAuthStore(); // Lấy access token từ store
  const { setShowMenuItem, setActiveMenuItem } = useLayoutStore(); // Lấy hàm đóng modal từ store
  
  // Kiểm tra xem có video_tts_id trong localStorage không khi component mount
  useEffect(() => {
    if (selectedVideoId) {
      // Kiểm tra xem có video_tts_id cho video này không trong localStorage
      try {
        // Lấy map của video_id -> video_tts_id từ localStorage
        const videoTtsMap = JSON.parse(localStorage.getItem('videoTtsMap') || '{}');
        
        // Kiểm tra xem có video_tts_id cho video này không
        if (videoTtsMap[selectedVideoId]) {
          const storedVideoTtsId = videoTtsMap[selectedVideoId];
          console.log(`Đã tìm thấy video_tts_id cho video ${selectedVideoId}:`, storedVideoTtsId);
          
          // Cập nhật state
          setVideoTtsId(storedVideoTtsId);
          
          // Cập nhật localStorage hiện tại với video_tts_id này
          localStorage.setItem('videoTtsId', storedVideoTtsId);
          
          // Đánh dấu là đã lồng tiếng xong
          setIsDubbingComplete(true);
          
          // Lấy video preview
          getVideoPreview(storedVideoTtsId);
        } else {
          console.debug(`Không tìm thấy video_tts_id cho video ${selectedVideoId}`);
          setIsDubbingComplete(false);
          setVideoTtsId(null);
        }
      } catch (error) {
        console.error('Lỗi khi đọc videoTtsMap từ localStorage:', error);
      }
    }
  }, [selectedVideoId]);
  
  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      // Khi component unmount, revoke URL để tránh memory leak
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Chuyển đổi voiceType thành giá trị voice cho API (1: nam, 2: nữ)
  const getVoiceParam = () => voiceType === "male" ? "1" : "2";

  const handleAction = (action: string) => {
    switch (action) {
      case "cancel":
        // Đóng modal lồng tiếng
        setShowMenuItem(false);
        setActiveMenuItem(null);
        
        // Không xóa video URL khi đóng form để có thể sử dụng lại khi mở lại
        // Chỉ revoke URL khi component unmount (sẽ được xử lý trong useEffect cleanup)
        
        // Hiển thị lại tùy chọn tải xuống khi đóng form
        setShowDownloadOption(true);
        
        // Không xóa videoTtsId từ localStorage khi đóng form
        // để có thể sử dụng lại trong component Render
        break;
      case "dubbing":
        // Kiểm tra xem người dùng đã đăng nhập chưa
        if (!accessToken) {
          alert("Bạn cần đăng nhập để sử dụng tính năng lồng tiếng");
          // Có thể chuyển hướng người dùng đến trang đăng nhập
          // window.location.href = "/auth";
          return;
        }
        
        // Xử lý lồng tiếng với giọng đã chọn (voiceType)
        const voiceParam = getVoiceParam();
        console.log("Bắt đầu lồng tiếng với giọng:", voiceType, "- Tham số API voice:", voiceParam);
        
        // Lấy video_id từ store
        if (!selectedVideoId) {
          console.error("Không tìm thấy video_id. Vui lòng chọn một video trước khi lồng tiếng.");
          alert("Vui lòng chọn một video trước khi lồng tiếng");
          return;
        }
        
        console.log("Lồng tiếng cho video ID:", selectedVideoId);
        // Thiết lập trạng thái loading
        setIsLoading(true);
        // Ẩn tùy chọn tải xuống khi bắt đầu lồng tiếng
        setShowDownloadOption(false);
        // Gọi API lồng tiếng
        callDubbingAPI(selectedVideoId, voiceParam)
          .then(result => {
            console.log("Lồng tiếng thành công:", result);
            
            // Lưu video_tts_id từ kết quả
            if (result.video_tts_id) {
              setVideoTtsId(result.video_tts_id);
              
              // Lưu video_tts_id vào localStorage để các component khác có thể sử dụng
              localStorage.setItem('videoTtsId', result.video_tts_id);
              
              // Lưu video_tts_id theo video_id vào localStorage
              try {
                // Lấy map hiện tại hoặc tạo mới nếu chưa có
                const videoTtsMap = JSON.parse(localStorage.getItem('videoTtsMap') || '{}');
                
                // Thêm/cập nhật mapping cho video hiện tại
                videoTtsMap[selectedVideoId] = result.video_tts_id;
                
                // Lưu lại vào localStorage
                localStorage.setItem('videoTtsMap', JSON.stringify(videoTtsMap));
                console.log(`Đã lưu video_tts_id cho video ${selectedVideoId}:`, result.video_tts_id);
              } catch (error) {
                console.error('Lỗi khi lưu videoTtsMap vào localStorage:', error);
              }
              
              // Gọi API để lấy video
              getVideoPreview(result.video_tts_id);
              
              // Đánh dấu là đã lồng tiếng xong
              setIsDubbingComplete(true);
            }
            
            // Nếu người dùng không chọn tải xuống video, chúng ta sẽ không tự động đóng form
            // Việc tải xuống và đóng form sẽ được xử lý trong hàm getVideoPreview nếu checked = true
          })
          .catch(error => {
            console.error("Lồng tiếng thất bại:", error);
            // Hiển thị thông báo lỗi cho người dùng
            alert(error instanceof Error ? error.message : "Lồng tiếng thất bại, vui lòng thử lại sau");
            // Xử lý khi lồng tiếng thất bại
            setIsLoading(false);
          });
        break;
    }
  };  // Hàm gọi API lồng tiếng
  const callDubbingAPI = async (videoId: string, voice: string) => {
    try {
      // Kiểm tra xem có access token không
      if (!accessToken) {
        throw new Error("Bạn cần đăng nhập để sử dụng tính năng này");
      }

      const response = await fetch(`http://localhost:8000/api/v1/videos/creation/${videoId}/${voice}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        }
        throw new Error(`Lỗi HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Kết quả lồng tiếng:", data);
      return data;
    } catch (error) {
      console.error("Lỗi khi lồng tiếng:", error);
      throw error;
    }
  };
  
  // Hàm để tải xuống video
  const downloadVideo = async (videoTtsId: string) => {
    try {
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
      a.download = `video-lồng-tiếng-${Date.now()}.mp4`;
      
      // Thêm thẻ a vào body, click để tải xuống, và xóa thẻ
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log("Đã tải xuống video thành công");
      
      // Đóng modal sau khi tải xuống
      setShowMenuItem(false);
      setActiveMenuItem(null);
    } catch (error) {
      console.error("Lỗi khi tải xuống video:", error);
      if (error instanceof Error && error.message.includes("401")) {
        alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
      }
    }
  };

  // Hàm để lấy video preview từ API
  const getVideoPreview = async (videoTtsId: string) => {
    try {
      // Kiểm tra xem có access token không
      if (!accessToken) {
        throw new Error("Bạn cần đăng nhập để xem video");
      }

      // Kiểm tra xem có video URL đã lưu trong localStorage không
      try {
        const videoUrlMap = JSON.parse(localStorage.getItem('videoUrlMap') || '{}');
        if (videoUrlMap[videoTtsId]) {
          console.log(`Sử dụng video URL đã lưu cho video_tts_id ${videoTtsId}`);
          // Không sử dụng URL trực tiếp từ localStorage vì blob URL không tồn tại giữa các phiên
          // Thay vào đó, chúng ta vẫn tải lại video từ server
        }
      } catch (error) {
        console.error('Lỗi khi đọc videoUrlMap từ localStorage:', error);
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
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      
      // Lưu URL vào state
      setVideoUrl(videoObjectUrl);
      setIsLoading(false);
      
      console.log("Đã lấy video preview thành công");
      
      // Nếu người dùng đã chọn tải xuống video sau khi lồng tiếng
      if (checked) {
        console.log("Tiến hành tải xuống video sau khi lồng tiếng");
        downloadVideo(videoTtsId);
      }
    } catch (error) {
      console.error("Lỗi khi lấy video preview:", error);
      if (error instanceof Error && error.message.includes("401")) {
        alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
      }
      setIsLoading(false);
    }
  };

  return (
    <div
      className="modal-container absolute rounded-lg p-6 shadow-lg overflow-hidden transition-all duration-150 opacity-100 scale-100"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "50vw",
        height: "60vh",
        zIndex: 200,
      }}
    >
      <style>
        {Object.values(waveAnimations).join('\n')}
        {`
          .modal-container.closing {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
        `}
      </style>
      {/* Wave Animation Wrapper */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#86377b] via-[#27273c] to-[#27273c]">
          {/* Top Wave */}
          <div className="absolute inset-x-0 bottom-0 z-[15] opacity-50 h-[200px]">
            <div 
              className="absolute left-0 w-[400%] h-full bg-repeat-x"
              style={{
                backgroundImage: `url(${waveTop})`,
                backgroundPosition: "0 bottom",
                backgroundSize: "25% 100%",
                transformOrigin: "center bottom",
                animation: "moveWaveTop 30s linear infinite",
              }}
            />
          </div>

          {/* Middle Wave */}
          <div className="absolute inset-x-0 bottom-0 z-[10] opacity-75 h-[200px]">
            <div 
              className="absolute left-0 w-[400%] h-full bg-repeat-x"
              style={{
                backgroundImage: `url(${waveMid})`,
                backgroundPosition: "0 bottom",
                backgroundSize: "25% 100%",
                transformOrigin: "center bottom",
                animation: "moveWaveMiddle 10s linear infinite",
              }}
            />
          </div>

          {/* Bottom Wave */}
          <div className="absolute inset-x-0 bottom-0 z-[5] h-[200px]">
            <div 
              className="absolute left-0 w-[400%] h-full bg-repeat-x"
              style={{
                backgroundImage: `url(${waveBot})`,
                backgroundPosition: "0 bottom",
                backgroundSize: "25% 100%",
                transformOrigin: "center bottom",
                animation: "moveWaveBottom 20s linear infinite",
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20">
        <h2 className="mb-2 text-ls text-white">Lồng Tiếng</h2>

        <div className="grid grid-cols-2 gap-6 mt">          {/* Video Frame - Left Column */}
          <div className="w-full h-full p-4 bg-black/20 rounded-lg backdrop-blur-sm flex items-center justify-center">
            {isLoading ? (
              // Hiển thị loading spinner khi đang tải video
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-t-[#883df2] border-gray-200 rounded-full animate-spin mb-2"></div>
                <span className="text-sm text-white">Đang xử lý video...</span>
              </div>
            ) : videoUrl ? (
              // Hiển thị video khi đã có URL video
              <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
                <video 
                  src={videoUrl} 
                  className="max-w-full max-h-full object-contain" 
                  controls 
                  autoPlay
                  controlsList="nodownload"
                  style={{ maxHeight: "calc(60vh - 150px)" }}
                />
              </div>
            ) : (
              // Hiển thị placeholder khi chưa có video
              <div className="w-48 h-36 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-[#883df2] transition-colors duration-200 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded bg-gray-700/50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-400">Video Preview</span>
              </div>
            )}
          </div>

          {/* Controls - Right Column */}
          <div className="flex flex-col items-end gap-6 mt-24">
            {/* Voice Type Selection */}
            <div className="flex flex-col items-end gap-3 w-full">
              <div className="text-sm font-medium text-white self-start mb-1">
                Chọn giọng lồng tiếng:
              </div>
              <div className="flex gap-6 self-start">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div 
                    className={`h-5 w-5 rounded-full border ${
                      voiceType === "male" 
                        ? "border-[#883df2] bg-[#883df2]" 
                        : "border-gray-400 bg-black/30"
                    } flex items-center justify-center`}
                    onClick={() => setVoiceType("male")}
                  >
                    {voiceType === "male" && (
                      <div className="h-2 w-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-sm text-white">Giọng Nam</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <div 
                    className={`h-5 w-5 rounded-full border ${
                      voiceType === "female" 
                        ? "border-[#883df2] bg-[#883df2]" 
                        : "border-gray-400 bg-black/30"
                    } flex items-center justify-center`}
                    onClick={() => setVoiceType("female")}
                  >
                    {voiceType === "female" && (
                      <div className="h-2 w-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-sm text-white">Giọng Nữ</span>
                </label>
              </div>
            </div>

            {showDownloadOption && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-white">
                  Tải video xuống sau khi lồng tiếng
                </label>
                <div
                  className={`h-6 w-6 flex items-center justify-center border border-gray-400 rounded cursor-pointer ${
                    checked ? "bg-[#883df2] border-white" : "bg-black/70"
                  }`}
                  onClick={() => setChecked(!checked)}
                >
                  {checked && <span className="text-white text-lg">✔</span>}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              {isDubbingComplete ? (
                // Khi đã lồng tiếng xong, chỉ hiển thị nút Đóng
                <ActionButton
                  label="Đóng"
                  onClick={() => handleAction("cancel")}
                  variant="blue"
                />
              ) : (
                // Khi chưa lồng tiếng, hiển thị cả hai nút
                <>
                  <ActionButton
                    label="Hủy"
                    onClick={() => handleAction("cancel")}
                    variant="red"
                  />
                  {!isLoading && (
                    <ActionButton
                      label="Lồng tiếng"
                      onClick={() => handleAction("dubbing")}
                      variant="blue"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
