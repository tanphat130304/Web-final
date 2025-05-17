import { ITrackItem } from "@designcombo/types";

export type IMenuItem =
  | "uploads"
  | "playlist"
  | "dubbing"
  | "render"
  | "audio"
  | "logo"
  | "settings"
  | "subtitle"
  | "user"
  | "texts"
  | "videos"
  | "images";

  
export interface ILayoutState {
  cropTarget: ITrackItem | null;
  activeMenuItem: IMenuItem | null;
  showMenuItem: boolean;
  showControlItem: boolean;
  showToolboxItem: boolean;
  activeToolboxItem: string | null;
  setCropTarget: (cropTarget: ITrackItem | null) => void;
  setActiveMenuItem: (menu: IMenuItem | null) => void;
  setShowMenuItem: (showMenuItem: boolean) => void;
  setShowControlItem: (showControlItem: boolean) => void;
  setShowToolboxItem: (showToolboxItem: boolean) => void;
  setActiveToolboxItem: (activeToolboxItem: string | null) => void;
}