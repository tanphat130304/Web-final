import React, { useState } from "react";
import { RadioButtonEffect } from "@/components/RadioButtonEffect";
import { SelectEffect } from "@/components/SelectEffect";
import { CheckboxEffect } from "@/components/CheckboxEffect";
import { ButtonEffect } from "@/components/ButtonEffect";

export const OptionUpload: React.FC = () => {
  // State lưu trữ các giá trị chọn
  const [langOption, setLangOption] = useState("all_lang");
  const [targetLang, setTargetLang] = useState("vi");
  const [translateOption, setTranslateOption] = useState("medium_translate");
  const [translateType, setTranslateType] = useState("text_translate_plus");
  const [removeOriginal, setRemoveOriginal] = useState(false);
  const [separateMusic, setSeparateMusic] = useState(false);
  const [mergeLine, setMergeLine] = useState(true);
  const [mergeBlur, setMergeBlur] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Hàm xử lý ví dụ (bạn có thể cập nhật theo logic thực tế)
  const handleCalPoint = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    console.log("cal_point", e.target.value);
  };

  const handleLangChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLangOption(e.target.id);
    handleCalPoint(e);
  };

  const handleTargetLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetLang(e.target.value);
    handleCalPoint(e);
  };

  const handleTranslateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTranslateOption(e.target.id);
    handleCalPoint(e);
  };

  const handleTranslateTypeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setTranslateType(e.target.id);
    handleCalPoint(e);
  };

  const languageOptions = [
    { value: "ocr", label: "Chỉ quét" },
    { value: "vi", label: "Tiếng Việt" },
    { value: "en", label: "Tiếng Anh" },
    { value: "zh", label: "Tiếng Trung" },
    { value: "es", label: "Tiếng Tây Ban Nha" },
    { value: "pt", label: "Tiếng Bồ Đào Nha" },
    { value: "tr", label: "Tiếng Thổ Nhĩ Kỳ" },
    { value: "it", label: "Tiếng Ý" },
    { value: "pl", label: "Tiếng Ba Lan" },
    { value: "de", label: "Tiếng Đức" },
    { value: "hi", label: "Tiếng Ấn Độ" },
    { value: "ar", label: "Tiếng Ả Rập" },
    { value: "ru", label: "Tiếng Nga" },
    { value: "ja", label: "Tiếng Nhật" },
    { value: "ko", label: "Tiếng Hàn Quốc" },
    { value: "th", label: "Tiếng Thái" },
    { value: "fr", label: "Tiếng Pháp" },
    { value: "ms", label: "Tiếng Malay" },
    { value: "id", label: "Tiếng Indonesia" },
    { value: "cs", label: "Tiếng Czech" },
    { value: "nl", label: "Tiếng Dutch" },
    { value: "hu", label: "Tiếng Hungarian" },
    { value: "tl", label: "Tiếng Philippines" },
    { value: "mn", label: "Tiếng Mông Cổ" },
    { value: "ro", label: "Romanian" },
    { value: "el", label: "Yunani" },
    { value: "ka", label: "Georgia" }
  ];

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      // Implement the logic to upload the data
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="upload_option_block max-w-4xl mx-auto p-4 rounded-2xl shadow-lg text-white relative overflow-hidden"
      style={{
        background: 'linear-gradient(40deg, rgb(28, 0, 82), rgb(0, 3, 22))',
        isolation: 'isolate',
        boxShadow: '0 0 4px rgba(39, 6, 95, 0.4), 0 0 40px rgba(103, 0, 108, 0.2)',
        borderRadius: '20px',
      }}
    >
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
        <div className="g1 absolute w-2/5 h-2/5 opacity-30 animate-move-vertical" 
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(18, 83, 255, 0.3) 20%, rgba(18, 83, 255, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
            mixBlendMode: 'hard-light',
            top: '30%',
            left: '30%'
          }}
        />
        <div className="g2 absolute w-2/5 h-2/5 opacity-30 animate-move-in-circle"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(181, 54, 215, 0.3) 20%, rgba(126, 54, 215, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
            mixBlendMode: 'hard-light',
            top: '40%',
            left: '40%'
          }}
        />
        <div className="g3 absolute w-2/5 h-2/5 opacity-30 animate-move-in-circle"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(80, 180, 255, 0.3) 20%, rgba(80, 180, 255, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
            mixBlendMode: 'hard-light',
            top: '35%',
            left: '35%'
          }}
        />
        <div className="g4 absolute w-2/5 h-2/5 opacity-20 animate-move-horizontal"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(147, 51, 234, 0.3) 20%, rgba(147, 51, 234, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
            mixBlendMode: 'hard-light',
            top: '45%',
            left: '45%'
          }}
        />
        <div className="g5 absolute w-2/5 h-2/5 opacity-25 animate-move-in-circle"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(236, 72, 153, 0.3) 20%, rgba(236, 72, 153, 0.3) 50%, rgba(0, 0, 0, 0.95) 80%, rgba(0, 0, 0, 1) 100%)',
            mixBlendMode: 'hard-light',
            top: '35%',
            left: '40%'
          }}
        />
      </div>
      <div className="upload_option_block_setting space-y-2 relative z-10">
        {/* Block 1: Ngôn ngữ đầu vào */}
        <div className="upload_option_element w-full flex justify-evenly flex-wrap items-center gap-2 p-2 border-b border-gray-200/20">
          <RadioButtonEffect
            id="all_lang"
            name="radio_lang"
            value="all_lang"
            label="Phát hiện ngôn ngữ"
            checked={langOption === "all_lang"}
            onChange={handleLangChange}
          />
          
          {/* Translator icon */}
          <div className="element_option flex items-center gap-1">
            <div
              className="translator-icon flex items-center gap-1"
              title="Chuyển đổi ngôn ngữ tự động cho phần thuyết minh"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 backdrop-blur-lg backdrop-filter"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
          </div>
          {/* Select: Ngôn ngữ đích */}
          <div className="element_option">
            <SelectEffect
              id="lang_des"
              value={targetLang}
              onChange={handleTargetLangChange}
              options={languageOptions}
              title="Ngôn ngữ đích cần dịch sang."
            />
          </div>
        </div>

        {/* Block 2: Các tùy chọn dịch */}
        <div className="upload_option_element w-full flex justify-evenly flex-wrap items-center gap-2 p-2 border-b border-gray-200/20">
          <RadioButtonEffect
            id="medium_translate"
            name="radio_translate"
            value="medium_translate"
            label="Tiêu chuẩn"
            checked={translateOption === "medium_translate"}
            onChange={handleTranslateChange}
          />
          <RadioButtonEffect
            id="gpt_plus"
            name="radio_translate"
            value="gpt_plus"
            label="GPT+"
            checked={translateOption === "gpt_plus"}
            onChange={handleTranslateChange}
          />
          <RadioButtonEffect
            id="openai_translate_4"
            name="radio_translate"
            value="openai_translate_4"
            label="Deepseek"
            checked={translateOption === "openai_translate_4"}
            onChange={handleTranslateChange}
          />
          <RadioButtonEffect
            id="openai_translate_4o"
            name="radio_translate"
            value="openai_translate_4o"
            label="GPT 4o"
            checked={translateOption === "openai_translate_4o"}
            onChange={handleTranslateChange}
          />
          <RadioButtonEffect
            id="openai_translate_4mini"
            name="radio_translate"
            value="openai_translate_4mini"
            label="GPT 4mini"
            checked={translateOption === "openai_translate_4mini"}
            onChange={handleTranslateChange}
          />
        </div>

        {/* Block 3: Tùy chọn dịch kiểu */}
        <div className="upload_option_element w-full flex justify-evenly flex-wrap items-center gap-2 p-2 border-b border-gray-200/20">
          <RadioButtonEffect
            id="only_video"
            name="radio_translate_type"
            value="only_video"
            label="Lồng tiếng từ .SRT"
            checked={translateType === "only_video"}
            onChange={handleTranslateTypeChange}
          />
          <RadioButtonEffect
            id="text_translate_plus"
            name="radio_translate_type"
            value="text_translate_plus"
            label="Dịch sub cứng"
            checked={translateType === "text_translate_plus"}
            onChange={handleTranslateTypeChange}
          />
          <RadioButtonEffect
            id="text_translate_basic"
            name="radio_translate_type"
            value="text_translate_basic"
            label="Dịch văn bản"
            checked={translateType === "text_translate_basic"}
            onChange={handleTranslateTypeChange}
          />
          <RadioButtonEffect
            id="audio_translate"
            name="radio_translate_type"
            value="audio_translate"
            label="Dịch âm thanh"
            checked={translateType === "audio_translate"}
            onChange={handleTranslateTypeChange}
          />
          <RadioButtonEffect
            id="audio_translate_v2"
            name="radio_translate_type"
            value="audio_translate_v2"
            label="Dịch âm thanh V2"
            checked={translateType === "audio_translate_v2"}
            onChange={handleTranslateTypeChange}
          />
        </div>

        {/* Block 4: Checkbox các tùy chọn bổ sung */}
        <div className="upload_option_element w-full flex justify-evenly flex-wrap items-center gap-2 p-2">
          <CheckboxEffect
            id="xoa_nen"
            label="Xóa văn bản gốc"
            checked={removeOriginal}
            onChange={(e) => {
              setRemoveOriginal(e.target.checked);
              handleCalPoint(e);
            }}
          />
          <CheckboxEffect
            id="tach_nhac_in"
            label="Tách nhạc nền"
            checked={separateMusic}
            onChange={(e) => {
              setSeparateMusic(e.target.checked);
              handleCalPoint(e);
            }}
          />
          <CheckboxEffect
            id="gop_dong"
            label="Gộp dòng"
            checked={mergeLine}
            onChange={(e) => {
              setMergeLine(e.target.checked);
              handleCalPoint(e);
            }}
          />
          <CheckboxEffect
            id="blur_combine"
            label="Gộp làm mờ"
            checked={mergeBlur}
            onChange={(e) => {
              setMergeBlur(e.target.checked);
              handleCalPoint(e);
            }}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <ButtonEffect
          type="cancel"
          onClick={() => {}}
          disabled={isUploading}
        />
        <ButtonEffect
          type="upload"
          onClick={handleUpload}
          disabled={isUploading}
        />
      </div>
    </div>
  );
};

export default OptionUpload;