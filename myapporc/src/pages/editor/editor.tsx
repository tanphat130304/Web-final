import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import MenuList from "./menu-list";
import { MenuItem } from "./menu-item";
import useTimelineEvents from "@/hooks/use-timeline-events";
import Scene from "./scene";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { ControlItem } from "./control-item";
import ControlList from "./control-list";
import { useEffect, useRef, useState } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { dispatch } from "@designcombo/events";
import { createData } from "./data";
import useVideoStore from "@/store/use-video-store";
import { useFetchVideo } from "@/hooks/use-fetch-video";
import { useAuthenticatedVideo } from "@/hooks/use-authenticated-video";
import { useVideoCache } from "@/hooks/use-video-cache";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

const stateManager = new StateManager({
    size: {
        width: 1920,
        height: 1080,
    },
    scale: {
        // 1x distance (second 0 to second 5, 5 segments).
        index: 7,
        unit: 300,
        zoom: 1 / 300,
        segments: 5,
    },
});

export default function Editor() {
    const store = useStore();
    const timelinePanelRef = useRef<ImperativePanelHandle>(null);
    const [timelineHeight, setTimelineHeight] = useState(30);
    const [isTimelineLocked, setIsTimelineLocked] = useState(false);
    const [isPlayerLocked, setIsPlayerLocked] = useState(false);
    const videoStore = useVideoStore();
    
    // Video management hooks
    useFetchVideo();
    useAuthenticatedVideo();
    useVideoCache(); // Restore video cache on app load

    // Xử lý sự kiện thay đổi kích thước timeline
    const handleTimelineResize = (size: number) => {
        setTimelineHeight(size);
    };

    // Toggle timeline lock function
    const toggleTimelineLock = () => {
        setIsTimelineLocked(!isTimelineLocked);
    };

    // Toggle player lock function
    const togglePlayerLock = () => {
        setIsPlayerLocked(!isPlayerLocked);
    };

    useTimelineEvents();

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await createData();
                dispatch(DESIGN_LOAD, {
                    payload: data,
                });
            } catch (error) {
                console.error("Error loading editor data:", error);
            }
        };
        
        loadData();
    }, []);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Show shortcuts on ? key
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                // Keyboard shortcuts component handles its own visibility
            }
            
            // Timeline lock toggle with L key
            if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                toggleTimelineLock();
            }
            
            // Player lock toggle with P key (only when not in fullscreen or focused on player)
            if ((e.key === 'p' || e.key === 'P') && !document.fullscreenElement) {
                e.preventDefault();
                togglePlayerLock();
            }
            
            // Full screen toggle with F key
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(console.error);
                } else {
                    document.documentElement.requestFullscreen().catch(console.error);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isTimelineLocked, isPlayerLocked]);

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-950">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <MenuList />
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                        <MenuItem />
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={60} minSize={40}>
                        <ResizablePanelGroup direction="vertical">
                            <ResizablePanel defaultSize={70} minSize={50}>
                                <div className="h-full flex flex-col">
                                    <ControlList />
                                    <div className="flex-1 relative overflow-hidden">
                                        <Scene 
                                            stateManager={stateManager}
                                            isPlayerLocked={isPlayerLocked}
                                            onTogglePlayerLock={togglePlayerLock}
                                        />
                                        <ControlItem />
                                    </div>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle />
                            <ResizablePanel 
                                defaultSize={30} 
                                minSize={20} 
                                maxSize={50}
                                ref={timelinePanelRef}
                                onResize={handleTimelineResize}
                            >
                                <Timeline 
                                    stateManager={stateManager} 
                                    isLocked={isTimelineLocked}
                                    onToggleLock={toggleTimelineLock}
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
            
            {/* Keyboard Shortcuts Component */}
            <KeyboardShortcuts />
        </div>
    );
}