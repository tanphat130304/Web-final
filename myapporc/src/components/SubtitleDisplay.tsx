import React, { useState, useEffect } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import useAuthStore from "@/store/use-auth-store";
import useVideoStore from "@/store/use-video-store";
import useStore from "@/pages/editor/store/use-store";

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
          translated: '' // Ban đầu để trống
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

interface Subtitle {
  id: number;
  original: string;
  translated: string;
  startTime?: string;
  endTime?: string;
}

interface SubtitleDisplayProps {
  subtitles?: Subtitle[];
  maxSceneTime?: number;
}

interface ContainerCheckboxState {
  lt1: boolean;
  lt2: boolean;
  lt3: boolean;
}

const formatTime = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}s`;
};

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ subtitles: propSubtitles, maxSceneTime: propMaxSceneTime }) => {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { selectedVideoId } = useVideoStore();
  const store = useStore();
  const [maxSceneTime, setMaxSceneTime] = useState<number>(propMaxSceneTime || 60);
  const [allLt1State, setAllLt1State] = useState<boolean>(false);
  const [allLt2State, setAllLt2State] = useState<boolean>(false);
  const [allLt3State, setAllLt3State] = useState<boolean>(false);
  const [subtitles, setSubtitles] = useState<Subtitle[]>(propSubtitles || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cập nhật maxSceneTime từ thời lượng video trong store
  useEffect(() => {
    if (store.trackItemsMap) {
      // Tìm video item trong trackItemsMap
      const videoItems = Object.values(store.trackItemsMap).filter(item => item.type === "video");
      
      if (videoItems.length > 0 && videoItems[0]) {
        // Nếu có thông tin duration, cập nhật maxSceneTime
        if (videoItems[0].duration) {
          // Chuyển từ milliseconds sang seconds
          const durationInSeconds = Math.floor(videoItems[0].duration / 1000);
          console.log(`Cập nhật thời lượng video từ metadata: ${durationInSeconds}s`);
          setMaxSceneTime(durationInSeconds);
        }
      }
    }
  }, [store.trackItemsMap]);
  
  // Fetch subtitles from API when component is mounted
  useEffect(() => {
    // If subtitles are provided through props, use them
    if (propSubtitles && propSubtitles.length > 0) {
      setSubtitles(propSubtitles);
      return;
    }
      const fetchSubtitles = async () => {
      // Sử dụng video ID từ store, fallback to localStorage
      const videoId = selectedVideoId || 
                     localStorage.getItem('mostRecentVideoId') || 
                     localStorage.getItem('selectedVideoId');
      
      if (!videoId) {
        setError("Không tìm thấy ID video. Vui lòng chọn một video từ danh sách.");
        setIsLoading(false);
        return;
      }
      
      console.log("Đang sử dụng video ID:", videoId);
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Kiểm tra xem đã đăng nhập chưa
        if (!isAuthenticated || !accessToken) {
          throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập để xem phụ đề.");
        }
        
        // Thử gọi API với accessToken từ useAuthStore
        console.log("Gọi API phụ đề gốc:", `http://localhost:8000/api/v1/videos/srt/${videoId}/original`);
        console.log("Token xác thực:", accessToken ? "Đã tìm thấy" : "Không tìm thấy");
        console.log("Token value:", accessToken);
        
        // Tải phụ đề gốc
        const originalResponse = await fetch(`http://localhost:8000/api/v1/videos/srt/${videoId}/original`, {
          method: 'GET',
          headers: {
            'Content-Type': 'text/plain',
            'Accept': 'text/plain, */*',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (!originalResponse.ok) {
          if (originalResponse.status === 401) {
            throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          } else if (originalResponse.status === 404) {
            throw new Error("Không tìm thấy phụ đề cho video này.");
          } else {
            throw new Error(`Lỗi khi tải phụ đề gốc: ${originalResponse.status}`);
          }
        }
        
        // Phân tích phụ đề gốc
        const originalSrtContent = await originalResponse.text();
        const parsedOriginalSubtitles = parseSRT(originalSrtContent);
        
        // Thử tải phụ đề đã dịch
        console.log("Gọi API phụ đề đã dịch:", `http://localhost:8000/api/v1/videos/srt/${videoId}/translated`);
        
        try {
          const translatedResponse = await fetch(`http://localhost:8000/api/v1/videos/srt/${videoId}/translated`, {
            method: 'GET',
            headers: {
              'Content-Type': 'text/plain',
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (translatedResponse.ok) {
            // Nếu phụ đề đã dịch tồn tại, tích hợp vào kết quả
            const translatedSrtContent = await translatedResponse.text();
            const parsedTranslatedSubtitles = parseSRT(translatedSrtContent);
            
            // Kết hợp phụ đề gốc và đã dịch
            const combinedSubtitles = parsedOriginalSubtitles.map(original => {
              // Tìm phụ đề dịch tương ứng dựa trên ID
              const translatedMatch = parsedTranslatedSubtitles.find(
                translated => translated.id === original.id
              );
              
              return {
                ...original,
                translated: translatedMatch ? translatedMatch.original : ''
              };
            });
            
            setSubtitles(combinedSubtitles);
          } else {
            // Nếu không có phụ đề đã dịch, chỉ sử dụng phụ đề gốc
            console.log("Không tìm thấy phụ đề đã dịch, chỉ hiển thị phụ đề gốc");
            setSubtitles(parsedOriginalSubtitles);
          }
        } catch (translatedError) {
          // Nếu có lỗi khi tải phụ đề dịch, vẫn hiển thị phụ đề gốc
          console.warn("Lỗi khi tải phụ đề đã dịch:", translatedError);
          setSubtitles(parsedOriginalSubtitles);
        }
      } catch (error: any) {
        console.error("Lỗi khi tải phụ đề:", error);
        setError(`Không thể tải phụ đề: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubtitles();
  }, [propSubtitles, selectedVideoId, accessToken, isAuthenticated]);
  const [containerStates, setContainerStates] = useState<Record<number, ContainerCheckboxState>>(() => {
      if (!subtitles.length) return {};
      
      return subtitles.reduce((acc, cur) => {
        acc[cur.id] = { lt1: false, lt2: false, lt3: false };
        return acc;
      }, {} as Record<number, ContainerCheckboxState>);
    });
  
  // Update container states when subtitles change
  useEffect(() => {
    if (subtitles.length) {
      setContainerStates(
        subtitles.reduce((acc, cur) => {
          acc[cur.id] = { lt1: false, lt2: false, lt3: false };
          return acc;
        }, {} as Record<number, ContainerCheckboxState>)
      );
    }
  }, [subtitles]);

  const undoAction = () => console.log("Undo action");
  const deleteLine = (id: number) => console.log("Delete line", id);
  const rerollLine = (id: number) => console.log("Reroll line", id);
  const changeDrawTimeline = (e: React.ChangeEvent<HTMLSelectElement>) =>
    console.log("Changed timeline segment:", e.target.value);

  const handleAllLt1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAllLt1State(checked);
    setContainerStates(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[+key] = { ...updated[+key], lt1: checked };
      });
      return updated;
    });
  };

  const handleAllLt2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAllLt2State(checked);
    setContainerStates(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[+key] = { ...updated[+key], lt2: checked };
      });
      return updated;
    });
  };

  const handleAllLt3Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAllLt3State(checked);
    setContainerStates(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[+key] = { ...updated[+key], lt3: checked };
      });
      return updated;
    });
  };

  const handleContainerLt1Change = (id: number, checked: boolean) => {
    setContainerStates(prev => ({
      ...prev,
      [id]: { ...prev[id], lt1: checked },
    }));
  };

  const handleContainerLt2Change = (id: number, checked: boolean) => {
    setContainerStates(prev => ({
      ...prev,
      [id]: { ...prev[id], lt2: checked },
    }));
  };

  const handleContainerLt3Change = (id: number, checked: boolean) => {
    setContainerStates(prev => ({
      ...prev,
      [id]: { ...prev[id], lt3: checked },
    }));
  };

  // Style dùng chung
  const rightGroupStyle: React.CSSProperties = {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  };

  const rightGroupStyleControl: React.CSSProperties = {
    ...rightGroupStyle,
    marginRight: "12px",
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: "rgba(229, 236, 255, 0.1)",
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  };

  // Header của phần edit, được đặt sticky để luôn hiển thị
  const controlHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px",
    backgroundColor: "#1a1a1a",
    zIndex: 10,
  };

  const leftControlStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 1,
    overflow: "hidden",
    whiteSpace: "nowrap",
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: "8px",
    borderBottom: "1px solid #ccc",
    paddingBottom: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const mainTextStyle: React.CSSProperties = {
    cursor: "pointer",
    fontWeight: 500,
    opacity: 0.5,
    fontSize: "0.8rem",
  };

  const textAreaStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    resize: "vertical",
    backgroundColor: "transparent",
    color: "#fff",
  };

  const CheckboxGroup = () => (
    <div style={rightGroupStyle}>
      <input
        type="checkbox"
        checked={allLt1State}
        onChange={handleAllLt1Change}
        className="long_tieng_all"
        style={{ cursor: "pointer" }}
      />
      <input
        type="checkbox"
        checked={allLt2State}
        onChange={handleAllLt2Change}
        className="long_tieng_all"
        style={{ cursor: "pointer" }}
      />
      <input
        type="checkbox"
        checked={allLt3State}
        onChange={handleAllLt3Change}
        className="long_tieng_all"
        style={{ cursor: "pointer" }}
      />
    </div>
  );
  // Add loading and error handling UI
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="text-lg text-white mb-4">Đang tải phụ đề...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }  if (error) {
    // Kiểm tra nếu lỗi liên quan đến đăng nhập
    const isAuthError = error.includes("đăng nhập") || 
                        error.includes("Phiên") || 
                        error.includes("401");
    
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="text-lg text-red-500 mb-4">{error}</div>
          
          {isAuthError ? (
            // Hiển thị nút đăng nhập lại nếu lỗi liên quan đến xác thực
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => window.location.href = '/auth'}
            >
              Đăng nhập lại
            </button>
          ) : (
            // Hiển thị nút thử lại cho các lỗi khác
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!subtitles || subtitles.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg text-white">Không có phụ đề nào được tìm thấy.</div>
      </div>
    );
  }
  
  return (
    <div id="string_edit" className="string-edit-layout" data-delogo="false">
      {/* Phần header cố định */}
      <div id="string_edit_control" style={controlHeaderStyle}>
        <div id="chunks_left" style={leftControlStyle}>
            <svg
              style={{ transform: "rotateZ(270deg)", color: "blueviolet", fontSize: "20px" }}
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              preserveAspectRatio="xMidYMid meet"
              fill="none"
              role="presentation"
              xmlns="http://www.w3.org/2000/svg"
              className="iconpark-icon"
            >
              <g>
                <path
                  data-follow-fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18 2H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3ZM6 4h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
                  fill="currentColor"
                />
                <path
                  data-follow-fill="currentColor"
                  d="M14.914 15.57L12 18.482 9.086 15.57 7.67 16.983l3.268 3.268a1.5 1.5 0 0 0 2.121 0l3.268-3.268-1.414-1.414Z"
                  fill="currentColor"
                />
              </g>
            </svg>
          <select
            title="Chia bản dịch thành nhiều đoạn nhỏ giảm thiểu hiện tượng giật lag trong khi chỉnh sửa!"
            onChange={changeDrawTimeline}
            id="chunk"
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              color: "#fff",
              backgroundColor: "transparent",
            }}
          >
            <option value={`0-${maxSceneTime}`}>
              Toàn bộ: 0:00s - {formatTime(maxSceneTime)}
            </option>
          </select>
          <div
              id="pre_button"
              className="undo"
              onClick={undoAction}
              style={{ color: "rgba(222, 227, 247, 0.2)", cursor: "pointer" }}
            >
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8.94 3.146a.5.5 0 0 1 .707 0l.707.708a.5.5 0 0 1 0 .707L7.914 7H13.5a6.5 6.5 0 0 1 0 13H6.224l.535-2H13.5a4.5 4.5 0 0 0 0-9H7.914l2.44 2.44a.5.5 0 0 1 0 .706l-.707.708a.5.5 0 0 1-.708 0l-4.5-4.5a.5.5 0 0 1 0-.708l4.5-4.5Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div
              className="undo"
              id="next_button"
              style={{ cursor: "pointer" }}
            >
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15.354 3.146a.5.5 0 0 0-.707 0l-.707.708a.5.5 0 0 0 0 .707L16.379 7h-5.586a6.5 6.5 0 0 0 0 13h7.277l-.536-2h-6.741a4.5 4.5 0 0 1 0-9h5.586l-2.44 2.44a.5.5 0 0 0 0 .706l.708.708a.5.5 0 0 0 .707 0l4.5-4.5a.5.5 0 0 0 0-.708l-4.5-4.5Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div
              id="save_json"
              className="undo"
              onClick={() => console.log("Save JSON")}
              style={{ cursor: "pointer" }}
            >
              <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10.451 8.118a.5.5 0 0 1 0 .707l-2.646 2.646a.667.667 0 0 1-.943 0L5.215 9.825a.5.5 0 0 1 0-.707l.236-.236a.5.5 0 0 1 .707 0l1.175 1.175 2.175-2.175a.5.5 0 0 1 .708 0l.235.236Z"
                  fill="currentColor"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8 2a4.667 4.667 0 0 0-4.611 5.39A3.334 3.334 0 0 0 4 14h8a3.333 3.333 0 0 0 .611-6.61A4.667 4.667 0 0 0 8 2ZM3.632 8.7l1.273-.236-.199-1.28a3.333 3.333 0 1 1 6.587 0l-.198 1.28 1.273.236A2.001 2.001 0 0 1 12 12.667H4A2 2 0 0 1 3.632 8.7Z"
                  fill="currentColor"
                />
              </svg>
            </div>
        </div>
        <div id="chunks_right" style={rightGroupStyleControl}>
          <CheckboxGroup />
        </div>
      </div>

      {/* ScrollArea chỉ chứa danh sách phụ đề, không bao gồm header */}
      <ScrollArea.Root
        type="always"
        className="SubtitleScrollRoot"
        style={{ height: "calc(100vh - 60px)", width: "100%" }}
      >
        <ScrollArea.Viewport
          className="SubtitleScrollViewport"
          style={{ width: "100%", paddingRight: "8px", overflowY: "auto" }}
        >
          {subtitles.map((subtitle) => (
            <div
              key={subtitle.id}
              id={`container_${subtitle.id}`}
              className="string_container"
              data-name={`text_${subtitle.id}`}
              style={containerStyle}
            >
              <div className="upline line" style={headerStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    id={`upline_${subtitle.id}`}
                    data-name={`text_${subtitle.id}`}
                    onDoubleClick={() => console.log("Edit main string", subtitle.id)}
                    className="l1 src-string line2"
                    style={mainTextStyle}
                  >
                    {subtitle.original}
                  </div>
                  <div
                    id={`delete_${subtitle.id}`}
                    onClick={() => deleteLine(subtitle.id)}
                    className="delete_line"
                    data-name={`text_${subtitle.id}`}
                    style={{ cursor: "pointer" }}
                  >
                    <i id={`icon_${subtitle.id}`} className="fa-solid fa-trash-can" />
                  </div>
                  <div
                    id={`reroll_${subtitle.id}`}
                    onClick={() => rerollLine(subtitle.id)}
                    data-name={`text_${subtitle.id}`}
                    className="rerool_sound"
                    style={{ cursor: "pointer" }}
                  >
                    <i className="fa-solid fa-rotate-right" />
                  </div>
                </div>
                <div style={rightGroupStyle}>
                  <input
                    type="checkbox"
                    checked={containerStates[subtitle.id]?.lt1 || false}
                    onChange={e => handleContainerLt1Change(subtitle.id, e.target.checked)}
                    className="long_tieng"
                    style={{ cursor: "pointer" }}
                  />
                  <input
                    type="checkbox"
                    checked={containerStates[subtitle.id]?.lt2 || false}
                    onChange={e => handleContainerLt2Change(subtitle.id, e.target.checked)}
                    className="long_tieng_2"
                    style={{ cursor: "pointer" }}
                  />
                  <input
                    type="checkbox"
                    checked={containerStates[subtitle.id]?.lt3 || false}
                    onChange={e => handleContainerLt3Change(subtitle.id, e.target.checked)}
                    className="long_tieng_3"
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </div>
              <div className="downline line notranslate" style={{ paddingTop: "4px" }}>
                <div className="line2">
                  <textarea
                    id={`textbox_${subtitle.id}`}
                    name={`text_${subtitle.id}`}
                    onInput={() => {}}
                    className="json active_right"
                    onClick={() => {}}
                    onChange={() => {}}
                    style={textAreaStyle}
                    defaultValue={subtitle.translated}
                  />
                </div>
              </div>
            </div>
          ))}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="SubtitleScrollScrollbar">
          <ScrollArea.Thumb className="SubtitleScrollThumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
};

export default SubtitleDisplay;