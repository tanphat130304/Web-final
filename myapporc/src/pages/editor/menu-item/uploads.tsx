import React, { useRef, useState, useEffect } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {FormUpload} from "./form-upload";
import { OptionUpload } from "./upload-option";
import { ActionButton } from "@/components/ActionButton";
import useLayoutStore from "../store/use-layout-store";
import useAuthStore from "@/store/use-auth-store";
import { useNavigate } from "react-router-dom";

// Function to store video IDs in localStorage
const saveVideoId = (videoId, fileName) => {
  try {
    // Get existing video IDs or initialize empty array
    const existingVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
    
    // Add new video ID with filename and timestamp
    existingVideos.push({
      id: videoId,
      fileName: fileName,
      uploadedAt: new Date().toISOString()
    });
    
    // Save back to localStorage
    localStorage.setItem('uploadedVideos', JSON.stringify(existingVideos));
    
    // Also store the most recent video ID separately for quick access
    localStorage.setItem('mostRecentVideoId', videoId);
    
    console.log("Video ID saved successfully:", videoId);
    return true;
  } catch (error) {
    console.error("Failed to save video ID:", error);
    return false;
  }
};

// Function to get a video ID (most recent by default)
export const getVideoId = (specific = null) => {
  try {
    // If a specific ID is requested, try to find it
    if (specific) {
      const existingVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
      const found = existingVideos.find(v => v.id === specific);
      return found ? found.id : null;
    }
    
    // Otherwise return the most recent
    return localStorage.getItem('mostRecentVideoId');
  } catch (error) {
    console.error("Failed to retrieve video ID:", error);
    return null;
  }
};

export const Uploads = () => {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const currentXhr = useRef<XMLHttpRequest | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<{
    success: boolean;
    message: string;
    videoId?: string;
  } | null>(null);
  
  // Lấy hàm setShowMenuItem từ useLayoutStore để đóng form upload
  const { setShowMenuItem, setActiveMenuItem } = useLayoutStore();
  
  // Lấy thông tin xác thực từ useAuthStore
  const { isAuthenticated, accessToken } = useAuthStore();
  const navigate = useNavigate();
  
  // Kiểm tra trạng thái đăng nhập khi component được mount
  useEffect(() => {
    if (!isAuthenticated) {
      setUploadStatus({
        success: false,
        message: "Bạn cần đăng nhập để tải lên video. Đang chuyển hướng đến trang đăng nhập..."
      });
      
      // Chờ 2 giây trước khi chuyển hướng
      const redirectTimer = setTimeout(() => {
        navigate("/auth");
      }, 2000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, navigate]);

  const handleAction = (action: string) => {
    if (action === "cancel") {
      setSelectedFile(null);
      setUploadStatus(null);
      if (inputFileRef.current) inputFileRef.current.value = "";
      if (currentXhr.current) {
        currentXhr.current.abort();
        currentXhr.current = null;
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setUploadStatus(null); // Reset status when new file is selected
    }
  };

  const handleConfirm = async () => {
    // Kiểm tra xác thực trước khi upload
    if (!isAuthenticated || !accessToken) {
      setUploadStatus({
        success: false,
        message: "Bạn cần đăng nhập để tải lên video. Đang chuyển hướng đến trang đăng nhập..."
      });
      
      // Chuyển hướng đến trang đăng nhập sau 2 giây
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
      return;
    }
    
    if (!selectedFile) {
      console.error("Chưa chọn tệp nào.");
      alert("Vui lòng chọn một tệp video.");
      return;
    }
  
    const formData = new FormData();
    formData.append("video", selectedFile);
  
    const apiUrl = "http://localhost:8000/api/v1/videos/upload";
  
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus({ success: true, message: "Đang tải video lên server..." });
      
      // Khởi tạo đối tượng XMLHttpRequest
      const xhr = new XMLHttpRequest();
      
      // Lưu tham chiếu để có thể hủy yêu cầu khi cần
      currentXhr.current = xhr;
      
      // Chia tiến trình thành các giai đoạn
      // Phase 1: 0-40% - Upload dữ liệu lên server
      // Phase 2: 40-95% - Server xử lý dữ liệu (phần này sẽ mất nhiều thời gian)
      // Phase 3: 95-100% - Hoàn thành và xác nhận
      
      let phase = 1;
      let simulatedProgress = 0;
      let actualUploadProgress = 0;
      let processingStarted = false;
      let progressInterval: ReturnType<typeof setInterval>;
      
      // Theo dõi sự kiện tiến trình tải lên thực tế
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          // Tiến trình upload thực tế chỉ tính đến 40%
          actualUploadProgress = Math.round((event.loaded / event.total) * 40);
        }
      });
      
      // Theo dõi khi tải lên hoàn tất (nhưng server vẫn đang xử lý)
      xhr.upload.addEventListener('load', () => {
        phase = 2;
        processingStarted = true;
        actualUploadProgress = 40;
        setUploadStatus({ success: true, message: "Video đã được tải lên, đang chờ server xử lý..." });
      });
      
      // Phân chia các mốc tiến trình cho tự nhiên
      const simulateProgress = () => {
        progressInterval = setInterval(() => {
          // Phase 1: Upload file (0-40%)
          if (phase === 1) {
            if (simulatedProgress < actualUploadProgress) {
              simulatedProgress += 1;
              setUploadProgress(simulatedProgress);
            }
          } 
          // Phase 2: Server processing (40-95%) - Mô phỏng thời gian xử lý dài
          else if (phase === 2) {
            // Tiến độ xử lý server - tăng rất chậm
            if (processingStarted) {
              if (simulatedProgress < 50) {
                // 40-50%: Tăng nhanh ban đầu
                simulatedProgress += 0.5;
              } else if (simulatedProgress < 60) {
                // 50-60%: Chậm lại
                simulatedProgress += 0.2;
                if (simulatedProgress >= 60 && !processingMessageUpdated) {
                  setUploadStatus({ success: true, message: "Đang chuyển đổi định dạng video..." });
                  processingMessageUpdated = true;
                }
              } else if (simulatedProgress < 75) {
                // 60-75%: Rất chậm
                simulatedProgress += 0.1;
                if (simulatedProgress >= 70 && !processingMessageUpdated2) {
                  setUploadStatus({ success: true, message: "Đang xử lý video, vui lòng đợi..." });
                  processingMessageUpdated2 = true;
                }
              } else if (simulatedProgress < 85) {
                // 75-85%: Cực kỳ chậm
                simulatedProgress += 0.05;
              } else if (simulatedProgress < 90) {
                // 85-90%: Gần như dừng lại
                simulatedProgress += 0.02;
              } else if (simulatedProgress < 95) {
                // 90-95%: Hầu như không nhúc nhích
                const shouldIncrement = Math.random() < 0.3; // Chỉ tăng 30% thời gian
                if (shouldIncrement) {
                  simulatedProgress += 0.01;
                }
              }
              
              setUploadProgress(Math.min(Math.round(simulatedProgress * 10) / 10, 95));
            }
          }
        }, 200);
      };
      
      // Biến để theo dõi cập nhật thông báo
      let processingMessageUpdated = false;
      let processingMessageUpdated2 = false;
      
      simulateProgress();
      
      // Promise wrapper cho XMLHttpRequest
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              clearInterval(progressInterval);
              const data = JSON.parse(xhr.responseText);
              
              // Lưu video_id từ response nếu có
              const videoId = data.video_id;
              if (videoId) {
                // Lưu video_id vào localStorage
                const saved = saveVideoId(videoId, selectedFile.name);
                console.log(`Video ID ${videoId} saved:`, saved);
              }
              
              // Cập nhật thông báo khi server trả về thành công
              setUploadStatus({ 
                success: true, 
                message: "Xử lý video hoàn tất!",
                videoId: videoId // Lưu video_id vào state để hiển thị nếu cần
              });
              
              // Hoàn thành tiến trình - chuyển từ 95% lên 100%
              const completeProgress = () => {
                const startValue = 95;
                const endValue = 100;
                const duration = 1000; // 1 giây
                const startTime = Date.now();
                
                const animateToComplete = () => {
                  const elapsed = Date.now() - startTime;
                  const progress = Math.min(elapsed / duration, 1);
                  const currentValue = Math.round(startValue + (endValue - startValue) * progress);
                  setUploadProgress(currentValue);
                  
                  if (progress < 1) {
                    requestAnimationFrame(animateToComplete);
                  } else {
                    // Chỉ resolve promise khi tiến trình đạt 100%
                    resolve(data);
                  }
                };
                
                animateToComplete();
              };
              
              completeProgress();
            } catch (e) {
              clearInterval(progressInterval);
              reject(new Error('Lỗi khi phân tích phản hồi từ máy chủ'));
            }
          } else {
            clearInterval(progressInterval);
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(errorData);
            } catch (e) {
              reject(new Error(`Lỗi máy chủ: ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = () => {
          clearInterval(progressInterval);
          reject(new Error('Lỗi kết nối mạng'));
        };
        
        xhr.ontimeout = () => {
          clearInterval(progressInterval);
          reject(new Error('Yêu cầu hết thời gian chờ'));
        };
        
        xhr.onabort = () => {
          clearInterval(progressInterval);
          reject(new Error('Đã hủy tải lên'));
        };
      });
      
      // Thiết lập và gửi yêu cầu
      xhr.open('POST', apiUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(formData);
      
      // Đợi kết quả từ promise
      const data = await uploadPromise;
      
      console.log("Upload thành công:", data);
      setUploadStatus({ 
        success: true, 
        message: `Video "${selectedFile.name}" đã được tải lên thành công!`,
        videoId: data.video_id // Lưu lại video_id vào state
      });
      
      // Tự động đóng form upload sau 2 giây khi thành công
      setTimeout(() => {
        // Reset file input và các state
        setSelectedFile(null);
        setUploadStatus(null);
        if (inputFileRef.current) inputFileRef.current.value = "";
        
        // Tự động đóng menu tải lên hoàn toàn bằng cách reset cả hai trạng thái
        setShowMenuItem(false);
        setActiveMenuItem(null);
      }, 2000);
      
    } catch (error) {
      console.error("Lỗi upload:", error);
      setUploadStatus({ 
        success: false, 
        message: error.message || 'Đã xảy ra lỗi khi tải lên video'
      });
    } finally {
      setIsUploading(false);
      currentXhr.current = null;
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-[linear-gradient(40deg,rgb(0,1,18),rgb(0,2,36))]">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium ">
        Tải lên
      </div>
      <input
        onChange={handleFileChange}
        ref={inputFileRef}
        type="file"
        className="hidden"
        accept="image/*,audio/*,video/*"
      />
      <div className="px-0 py-0 ">
        <Tabs defaultValue="projects" className="w-full">
          <TabsContent value="projects">
            <FormUpload onFileSelected={setSelectedFile} selectedFile={selectedFile} />  
            <div className="relative">
              <OptionUpload />
              <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg backdrop-filter rounded-lg shadow-lg p-4">
                {selectedFile && (
                  <div className="mb-2 text-sm text-green-500">
                    File đã chọn: <strong>{selectedFile.name}</strong> ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                )}
                
                {/* Hiển thị thanh tiến trình khi đang tải lên */}
                {isUploading && (
                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-300">Đang tải lên...</span>
                      <span className="text-xs text-gray-300">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <ActionButton
                    label="Hủy"
                    onClick={() => handleAction("cancel")}
                    variant="red"
                  />
                  <ActionButton
                    label={isUploading ? "Đang tải lên..." : selectedFile ? "Xác nhận tải lên" : "Xác nhận"}
                    onClick={handleConfirm}
                    variant="blue"
                    disabled={isUploading || !selectedFile}
                  />
                </div>
                {uploadStatus && (
                  <div
                    className={`mt-2 text-sm ${
                      uploadStatus.success ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {uploadStatus.message}
                    {uploadStatus.videoId && (
                      <div className="mt-1 text-xs text-blue-400">
                        Video ID: {uploadStatus.videoId}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="workspace">
            {/* <Button
              onClick={() => {
                inputFileRef.current?.click();
              }}
              className="flex w-full gap-2"
              variant="secondary"
            >
              <UploadIcon size={16} /> Upload
            </Button> */}
          </TabsContent>
        </Tabs>
      </div>
      <ScrollArea>
        <div className="masonry-sm px-4"></div>
      </ScrollArea>
    </div>
  );
};