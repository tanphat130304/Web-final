import React, { useRef, useState, useEffect } from "react";

interface FormUploadProps {
  onFileSelected?: (file: File) => void;
  selectedFile: File | null;
}

export const FormUpload: React.FC<FormUploadProps> = ({ onFileSelected, selectedFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [videoUrl, setVideoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Xử lý preview khi có file được chọn
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log("Selected file:", files[0]);
      // Pass the file to parent component if callback exists
      if (onFileSelected) {
        onFileSelected(files[0]);
      }
    }
  };

  const handleUrlUpload = () => {
    const pattern = /^(https?:\/\/)?(www\.)?(drive\.google\.com|tiktok\.com|douyin\.com|xiagua\.com|youtube\.com|dropblox\.com).*$/i;
    if (!pattern.test(videoUrl)) {
      alert(
        "Đường link không hợp lệ. Vui lòng dán link video từ các nền tảng được hỗ trợ."
      );
      return;
    }
    console.log("Uploading video from URL:", videoUrl);
  };

  return (
    <div className="px-4 py-2 h-full max-h-[400px] overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        tabIndex={-1}
        accept="image/*,.jpeg,.jpg,.png,.gif,.heif,.heic,.tiff,.tif,.ico,.svg,.svgz,.psd,.avif,video/*,.mp4,.mov,.m4v,.flv,.mkv,.avi,.webm,.wmv,.rm,.rmvb,.3gp,.m2ts,.mt2s,.m2t,.mxf,.mpg,.mpeg,.mpe,.ts,.mts,.qt,.asf,audio/*,.mp3,.flac,.m4a,.wav,.aac,.oga,.ogg,.wma,.amr,.aif,.aiff,.ac3,.mpa,.ape,.mac,.mp2,.acc"
        className="hidden"
        onChange={handleFileChange}
      />

      <section
        tabIndex={-1}
        className="lv-layout player relative border border-dashed border-gray-300 w-full max-w-full mx-auto h-[200px] rounded-lg"
        style={{
          background:
            'url("https://drive.google.com/thumbnail?id=1ulz1tNn7vmA7cYBmxQsX04G2dbwEu_rg&sz=w1000") no-repeat center center',
          backgroundSize: "cover",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = e.dataTransfer.files;
          handleFileChange({ target: { files } } as React.ChangeEvent<HTMLInputElement>);
        }}
      >
        <div className="mx-auto my-4 w-full max-w-[724px] h-[200px]">
          {/* Header: lựa chọn mode */}
          <div className="flex justify-center space-x-4 p-2">
            <button
              onClick={() => setUploadMode("file")}
              className={`px-2 py-1 text-sm rounded-md transition-all duration-200 ${
                uploadMode === "file"
                  ? "bg-gradient-to-r from-[#883df2] via-[#0014ff] to-[#24243e] text-white shadow-[0_0_10px_rgba(17,269,251,0.4)]"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              Tải lên video
            </button>
            <button
              onClick={() => setUploadMode("link")}
              className={`px-2 py-1 text-sm rounded-md transition-all duration-200 ${
                uploadMode === "link"
                  ? "bg-gradient-to-r from-[#883df2] via-[#0014ff] to-[#24243e] text-white shadow-[0_0_10px_rgba(17,269,251,0.4)]"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              Dán URL video
            </button>
          </div>

          {/* Nội dung upload: vùng bên dưới header */}
          <div className="flex flex-col h-[calc(100%-50px)] items-center justify-center">
            {uploadMode === "file" ? (
              // Khi chế độ file: vùng chính có onClick mở file input
              <div
                onClick={handleClick}
                className="cursor-pointer flex flex-col items-center justify-center h-full w-full"
              >
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <>
                    <div className="p-4 bg-gradient-to-r from-[#883df2] via-[#0014ff] to-[#24243e] rounded-md shadow-[0_0_10px_rgba(17,269,251,0.8)]">
                      <svg
                        width="1.5em"
                        height="1.5em"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="xMidYMid meet"
                        fill="none"
                        role="presentation"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g>
                          <path
                            d="M10.5 13.5v8a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-8h8a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-8v-8A.5.5 0 0 0 13 2h-2a.5.5 0 0 0-.5.5v8h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h8Z"
                            clipRule="evenodd"
                            fillRule="evenodd"
                            fill="white"
                          ></path>
                        </g>
                      </svg>
                    </div>
                    <p className="text-lg text-gray-0 mt-3">Nhấp để tải lên</p>
                    <p className="text-sm text-gray-100">Hoặc kéo thả file vào đây</p>
                  </>
                )}
              </div>
            ) : (
              // Khi chế độ link: không kích hoạt file input
              <div
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center items-center space-x-1 mb-3 ">
                  {/* Google Drive SVG */}
                  <svg
                    id="fi_5968523"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 511.999 511.999"
                    width="16"
                    height="16"
                    className="h-6 w-6"
                  >
                    <g>
                      <path
                        d="m38.563 418.862 22.51 39.042c4.677 8.219 11.41 14.682 19.319 19.388l80.744-57.248.147-82.19-80.577-36.303-80.706 36.014c-.016 9.09 2.313 18.185 6.991 26.404z"
                        fill="#06d"
                      ></path>
                      <path
                        d="m256.293 173.808 4.212-107.064-84.604-32.663c-7.926 4.678-14.682 11.117-19.389 19.319l-149.427 257.786c-4.706 8.203-7.069 17.289-7.085 26.379l161.283.288z"
                        fill="#00ad3c"
                      ></path>
                      <path
                        d="m256.293 173.808 77.503-41.694 3.387-97.745c-7.909-4.706-16.996-7.068-26.379-7.085l-108.499-.194c-9.384-.017-18.479 2.606-26.405 6.991z"
                        fill="#00831e"
                      ></path>
                      <path
                        d="m350.716 338.192-189.434-.338-80.89 139.438c7.909 4.706 16.996 7.068 26.379 7.085l297.933.532c9.384.017 18.479-2.606 26.405-6.991l.314-93.66z"
                        fill="#0084ff"
                      ></path>
                      <path
                        d="m431.109 477.919c7.926-4.678 14.682-11.117 19.388-19.319l9.413-16.111 45.005-77.629c4.706-8.202 7.069-17.288 7.085-26.379l-93.221-49.051-67.768 48.764z"
                        fill="#ff4131"
                      ></path>
                      <path
                        d="m430.756 182.917-74.253-129.16c-4.677-8.22-11.41-14.683-19.32-19.389l-80.891 139.439 94.423 164.385 160.99.288c.016-9.09-2.314-18.185-6.991-26.405z"
                        fill="#ffba00"
                      ></path>
                    </g>
                  </svg>
                  {/* TikTok SVG */}
                  <svg
                    id="fi_4138137"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    width="16"
                    height="16"
                    className="h-6 w-6"
                  >
                    <circle cx="256" cy="256" fill="#1976d2" r="225"></circle>
                    <g fill="#fff">
                      <path d="m256 282.9-62.5 38.8 62.5 38.7 62.5-38.7z"></path>
                      <path d="m318.5 229.1-62.5 38.7 62.5 38.7 62.5-38.7z"></path>
                      <path d="m193.5 229.1-62.5 38.7 62.5 38.7 62.5-38.7z"></path>
                      <path d="m318.5 151.6-62.5 38.7 62.5 38.8 62.5-38.8z"></path>
                      <path d="m193.5 151.6-62.5 38.7 62.5 38.8 62.5-38.8z"></path>
                    </g>
                  </svg>
                  {/* Douyin SVG */}
                  <svg
                    id="fi_6994770"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    className="h-6 w-6"
                  >
                    <path
                      d="m8 0a8 8 0 1 0 8 8 8.0106 8.0106 0 0 0 -8-8zm1.06 10.47-.71.71a2.4506 2.4506 0 0 1 -1.76.73 2.4961 2.4961 0 0 1 -1.77-4.26l.71-.71a.4833.4833 0 0 1 .7 0 .4951.4951 0 0 1 0 .71l-.71.7a1.5064 1.5064 0 0 0 -.43 1.06 1.4723 1.4723 0 0 0 .43 1.06 1.5029 1.5029 0 0 0 2.13 0l.7-.7a.4951.4951 0 0 1 .71 0 .4833.4833 0 0 1 0 .7zm.35-3.18-2.12 2.12a.4833.4833 0 0 1 -.7 0 .4833.4833 0 0 1 0-.7l2.12-2.12a.495.4951 0 1 1 .7.7zm1.77 1.06-.71.71a.4691.4691 0 0 1 -.35.15.4852.4852 0 0 1 -.35-.15.4951.4951 0 0 1 0-.71l.71-.7a1.5064 1.5064 0 0 0 .43-1.06 1.4723 1.4723 0 0 0 -.43-1.06 1.5029 1.5029 0 0 0 -2.13 0l-.7.7a.4951.4951 0 0 1 -.71 0 .4833.4833 0 0 1 0-.7l.71-.71a2.4961 2.4961 0 0 1 3.53 3.53z"
                      fill="#2196f3"
                    ></path>
                  </svg>
                  {/* YouTube SVG */}
                  <svg
                    id="fi_3670147"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 152 152"
                    width="16"
                    height="16"
                    className="h-6 w-6"
                  >
                    <g id="Layer_2" data-name="Layer 2">
                      <g id="Color">
                        <g id="_02.YouTube" data-name="02.YouTube">
                          <circle id="Background" cx="76" cy="76" fill="#f00" r="76"></circle>
                          <path
                            id="Icon"
                            d="m100.87 47.41h-49.74a15.13 15.13 0 0 0 -15.13 15.14v26.9a15.13 15.13 0 0 0 15.13 15.14h49.74a15.13 15.13 0 0 0 15.13-15.14v-26.9a15.13 15.13 0 0 0 -15.13-15.14zm-35.41 40.85v-24.52l21.08 12.26z"
                            fill="#fff"
                          ></path>
                        </g>
                      </g>
                    </g>
                  </svg>
                  {/* Dropblox SVG */}
                  <svg
                    id="fi_4782345"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 405.82 405.82"
                    width="16"
                    height="16"
                    className="h-6 w-6"
                  >
                    <g transform="translate(-2.24 -1.18)">
                      <path
                        d="m408.07 204.09c0 112.06-90.85 202.91-202.92 202.91h-.38c-111.89-.21-202.53-91-202.53-202.91s90.64-202.71 202.53-202.91h.38c112.07 0 202.92 90.82 202.92 202.91z"
                      ></path>
                      <path
                        d="m204.77 1.18v405.82c-111.89-.21-202.53-91-202.53-202.91s90.64-202.71 202.53-202.91z"
                        fill="#0c0c0c"
                      ></path>
                      <path
                        d="m315.56 147.92-.25 41.57a100.19 100.19 0 0 1 -24-3.22 101.52 101.52 0 0 1 -33.65-15.83c0 4.25.06 10.59.06 18.3 0 10.26 0 16.09-.06 22.28-.18 38.24.77 45.64-2.59 60.76a78.83 78.83 0 0 1 -2.86 10.75c-6.46 18-20.54 32.42-34.89 40.09a69.47 69.47 0 0 1 -12.55 5.17v-248.18l40.82-.24a32.32 32.32 0 0 0 1.31 9.41c.1.33.2.64.31 1l3.83-.07a80.81 80.81 0 0 0 14.09 28 78.29 78.29 0 0 0 6.6 7.4c10.88 8.78 23.38 11.26 31.22 12 .05 2.46.11 4.92.16 7.38a90.74 90.74 0 0 0 12.45 3.43z"
                        fill="#fd2854"
                      ></path>
                    </g>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Sao chép và dán link video ở đây để tải"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-black"
                />
                <button
                  onClick={handleUrlUpload}
                  className="mt-2 px-4 py-2 bg-gradient-to-r from-[#883df2] via-[#0014ff] to-[#24243e] text-white rounded-md shadow-[0_0_10px_rgba(17,269,251,0)] hover:opacity-80 transition w-full"
                >
                  Tải video
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FormUpload;
