import useLayoutStore from "./store/use-layout-store";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IMenuItem } from "@/interfaces/layout";

interface IMenuItemObj {
  id: IMenuItem;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}

export default function MenuList() {
  const { setActiveMenuItem, setShowMenuItem, activeMenuItem, showMenuItem } =
    useLayoutStore();

  const menuItems: IMenuItemObj[] = [
    { id: "uploads", icon: Icons.upload, label: "Tải lên" },
    { id: "playlist", icon: Icons.playlist, label: "Danh sách phát" },
    { id: "dubbing", icon: Icons.dubbing, label: "Lồng tiếng" },
    { id: "render", icon: Icons.render, label: "Xuất bản" },
    { id: "audio", icon: Icons.audio, label: "Âm thanh" },
    { id: "logo", icon: Icons.logo, label: "Logo" },
    { id: "settings", icon: Icons.settings, label: "Cài đặt" },
    { id: "subtitle", icon: Icons.subtitle, label: "Phụ đề" },
    { id: "user", icon: Icons.user, label: "Người dùng" },
  ];

  return (
    <div
      style={{ zIndex: 201 }}
      className="
        absolute left-2.5 top-1/2 mt-6 -translate-y-1/2
        flex flex-col items-center space-y-2
        rounded-lg bg-gray-900 py-2
        shadow-lg backdrop-blur-lg backdrop-filter
      "
    >
      {menuItems.map((item) => (
        <Button
          key={item.id}
          onClick={() => {
            setActiveMenuItem(item.id);
            setShowMenuItem(true);
          }}
          className={cn(
            "group relative flex flex-col items-center h-12 w-12 rounded-md px-2",
            "overflow-visible transition-all duration-300 ease-in-out",
            "hover:bg-gray-700",
            showMenuItem && activeMenuItem === item.id
              ? "bg-gray-700 text-white"
              : "bg-transparent text-white"
          )}
          variant="ghost"
          size="icon"
        >
          {/* Hiển thị icon nếu có */}
          <div className="flex justify-center items-center w-full h-full">
            {item.icon ? (
              <item.icon width={24} height={24} className="text-gray-300" />
            ) : null}
          </div>
          {/* Hiển thị label khi di chuột vào */}
          <span
            className="absolute left-full ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 bg-gray-800 text-white px-3 py-1 rounded-md text-sm whitespace-nowrap transition-all duration-300 transform -translate-x-2"
          >
            {item.label}
          </span>
        </Button>
      ))}
    </div>
  );
}