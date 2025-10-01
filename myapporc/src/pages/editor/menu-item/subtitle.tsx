import React from "react";
import SubtitleDisplay from "@/components/SubtitleDisplay";
import { Languages, FileText } from "lucide-react";

const SubtitleMenuItem: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-gray-900/95 backdrop-blur-sm">
      {/* Compact Header */}
      <div className="bg-gray-800/90 px-3 py-2 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-medium text-white">Phụ đề</h2>
          <div className="ml-auto">
            <FileText className="h-3 w-3 text-gray-400" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Chỉnh sửa và quản lý phụ đề video
        </p>
      </div>

      {/* SubtitleDisplay component with proper height */}
      <div className="flex-1">
        <SubtitleDisplay />
      </div>
    </div>
  );
};

export default SubtitleMenuItem; 