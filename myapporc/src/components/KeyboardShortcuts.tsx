import React, { useState } from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const shortcuts: ShortcutGroup[] = [
  {
    title: "Timeline",
    shortcuts: [
      { keys: ["Space"], description: "Phát/Tạm dừng video" },
      { keys: ["←", "→"], description: "Di chuyển frame trước/sau" },
      { keys: ["Shift", "←/→"], description: "Di chuyển nhanh 10 frame" },
      { keys: ["Home"], description: "Về đầu video" },
      { keys: ["End"], description: "Đến cuối video" },
      { keys: ["L"], description: "Khóa/Mở khóa timeline" },
    ]
  },
  {
    title: "Phụ đề",
    shortcuts: [
      { keys: ["Ctrl", "Z"], description: "Hoàn tác" },
      { keys: ["Ctrl", "Y"], description: "Làm lại" },
      { keys: ["Ctrl", "S"], description: "Lưu phụ đề" },
      { keys: ["Delete"], description: "Xóa phụ đề đã chọn" },
      { keys: ["Double Click"], description: "Chỉnh sửa phụ đề" },
      { keys: ["Tab"], description: "Chuyển sang phụ đề tiếp theo" },
    ]
  },
  {
    title: "Chung",
    shortcuts: [
      { keys: ["Ctrl", "+"], description: "Phóng to timeline" },
      { keys: ["Ctrl", "-"], description: "Thu nhỏ timeline" },
      { keys: ["Ctrl", "0"], description: "Khôi phục zoom" },
      { keys: ["F"], description: "Chế độ toàn màn hình" },
      { keys: ["?"], description: "Hiển thị phím tắt" },
    ]
  }
];

const KeyboardShortcuts: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const renderKey = (key: string) => (
    <kbd 
      key={key}
      className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
    >
      {key}
    </kbd>
  );

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800/90 hover:bg-gray-700/90 text-white border border-gray-600"
        title="Xem phím tắt (?)"
      >
        <Keyboard className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Phím tắt
          </h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {shortcuts.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="text-md font-medium text-blue-400 mb-3 border-b border-gray-700 pb-1">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, shortcutIndex) => (
                  <div 
                    key={shortcutIndex}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                  >
                    <span className="text-sm text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span className="text-gray-500 text-xs mx-1">+</span>
                          )}
                          {renderKey(key)}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/30">
          <p className="text-xs text-gray-400 text-center">
            Nhấn <kbd className="px-1 py-0.5 text-xs bg-gray-600 rounded">?</kbd> bất cứ lúc nào để xem lại phím tắt
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts; 