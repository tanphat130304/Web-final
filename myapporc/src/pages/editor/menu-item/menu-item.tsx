import React from "react";
import useLayoutStore from "../store/use-layout-store";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Uploads } from "./uploads";
import { Audios } from "./audios";
import { Images } from "./images";
import { Videos } from "./videos";
import { Texts } from "./texts";
import { Dubbing } from "./dubbing";
import { Render } from "./render";

interface ContainerProps {
  children: React.ReactNode;
}

const CONTAINER_BASE_STYLES = "modal-container absolute bg-background/95 backdrop-blur-lg backdrop-filter rounded-lg shadow-lg transition-all duration-150 opacity-100 scale-100";

const Container: React.FC<ContainerProps> = ({ children }) => {
  const { showMenuItem, setShowMenuItem, activeMenuItem } = useLayoutStore();
  
  return (
    <div
      style={{
        left: showMenuItem ? "0" : "-100%",
        transition: "left 0.25s ease-in-out",
        zIndex: 200,
        display: activeMenuItem ? "block" : "none",
        marginLeft: "3.5rem"
      }}
      className={`${CONTAINER_BASE_STYLES} top-1/2 mt-6 flex h-[calc(100%-32px-64px)] w-[350px] -translate-y-1/2`}
    >
      <style>
        {`
          .modal-container.closing {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
        `}
      </style>
      <div className="w-[74px]" />
      <div className="relative flex flex-1 bg-background/80 backdrop-blur-lg backdrop-filter">
        <Button
          variant="ghost"
          className="absolute right-2 top-2 h-8 w-8 text-muted-foreground"
          size="icon"
          onClick={() => setShowMenuItem(false)}
        >
          <X width={16} />
        </Button>
        {children}
      </div>
    </div>
  );
};

const CenteredContainer: React.FC<ContainerProps & { width: string; height: string }> = ({ 
  children, 
  width, 
  height 
}) => {
  const { activeMenuItem } = useLayoutStore();
  
  return (
    <div
      className={CONTAINER_BASE_STYLES}
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width,
        height,
        zIndex: 200,
        display: activeMenuItem ? "block" : "none"
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
      {children}
    </div>
  );
};

const UploadsContainer: React.FC<ContainerProps> = (props) => (
  <CenteredContainer width="60vw" height="70vh" {...props} />
);

const DubbingRenderContainer: React.FC<ContainerProps> = (props) => (
  <CenteredContainer width="50vw" height="60vh" {...props} />
);

const MENU_ITEMS = {
  uploads: Uploads,
  playlist: Videos,
  dubbing: Dubbing,
  render: Render,
  audio: Audios,
  logo: () => <div className="p-4">Logo Component</div>,
  settings: () => <div className="p-4">Settings Component</div>,
  subtitle: () => <div className="p-4">Subtitle Component</div>,
  user: () => <div className="p-4">User Component</div>,
  texts: Texts,
  videos: Videos,
  images: Images,
} as const;

type MenuItem = keyof typeof MENU_ITEMS;

const ActiveMenuItem = () => {
  const { activeMenuItem } = useLayoutStore();
  const Component = MENU_ITEMS[activeMenuItem as MenuItem];
  return Component ? <Component /> : null;
};

export const MenuItem = () => {
  const { activeMenuItem } = useLayoutStore();

  const getWrapper = (type: string) => {
    if (type === "uploads") return UploadsContainer;
    if (type === "dubbing" || type === "render") return DubbingRenderContainer;
    return Container;
  };

  const Wrapper = getWrapper(activeMenuItem || "");

  return activeMenuItem ? (
    <Wrapper>
      <ActiveMenuItem />
    </Wrapper>
  ) : null;
};