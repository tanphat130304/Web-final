import { create } from "zustand";

interface Subtitle {
  id: number;
  original: string;
  translated: string;
  startTime?: string;
  endTime?: string;
}

interface SubtitleAction {
  type: "ADD" | "DELETE" | "EDIT" | "BATCH_DELETE" | "BATCH_EDIT";
  timestamp: number;
  subtitles: Subtitle[];
  previousSubtitles: Subtitle[];
  affectedIds?: number[];
  description: string;
}

interface SubtitleHistoryStore {
  subtitles: Subtitle[];
  history: SubtitleAction[];
  currentHistoryIndex: number;
  maxHistorySize: number;
  
  // Actions
  setSubtitles: (subtitles: Subtitle[]) => void;
  addAction: (action: Omit<SubtitleAction, "timestamp" | "previousSubtitles">) => void;
  undo: () => Subtitle[] | null;
  redo: () => Subtitle[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // Subtitle operations
  deleteSubtitle: (id: number) => Subtitle[];
  editSubtitle: (id: number, changes: Partial<Subtitle>) => Subtitle[];
  batchDeleteSubtitles: (ids: number[]) => Subtitle[];
}

const useSubtitleHistoryStore = create<SubtitleHistoryStore>((set, get) => ({
  subtitles: [],
  history: [],
  currentHistoryIndex: -1,
  maxHistorySize: 50,

  setSubtitles: (subtitles: Subtitle[]) => {
    set({ subtitles: [...subtitles] });
  },

  addAction: (action: Omit<SubtitleAction, "timestamp" | "previousSubtitles">) => {
    const { history, currentHistoryIndex, maxHistorySize, subtitles } = get();
    
    const newAction: SubtitleAction = {
      ...action,
      timestamp: Date.now(),
      previousSubtitles: [...subtitles]
    };

    // Remove any history after current index (when undoing then doing new action)
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(newAction);

    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      currentHistoryIndex: newHistory.length - 1
    });
  },

  undo: () => {
    const { history, currentHistoryIndex } = get();
    
    if (currentHistoryIndex >= 0) {
      const action = history[currentHistoryIndex];
      const previousSubtitles = action.previousSubtitles;
      
      set({
        subtitles: [...previousSubtitles],
        currentHistoryIndex: currentHistoryIndex - 1
      });
      
      return previousSubtitles;
    }
    return null;
  },

  redo: () => {
    const { history, currentHistoryIndex } = get();
    
    if (currentHistoryIndex < history.length - 1) {
      const nextAction = history[currentHistoryIndex + 1];
      const nextSubtitles = nextAction.subtitles;
      
      set({
        subtitles: [...nextSubtitles],
        currentHistoryIndex: currentHistoryIndex + 1
      });
      
      return nextSubtitles;
    }
    return null;
  },

  canUndo: () => {
    const { currentHistoryIndex } = get();
    return currentHistoryIndex >= 0;
  },

  canRedo: () => {
    const { history, currentHistoryIndex } = get();
    return currentHistoryIndex < history.length - 1;
  },

  clearHistory: () => {
    set({
      history: [],
      currentHistoryIndex: -1
    });
  },

  deleteSubtitle: (id: number) => {
    const { subtitles, addAction } = get();
    const deletedSubtitle = subtitles.find(sub => sub.id === id);
    
    if (!deletedSubtitle) return subtitles;
    
    const newSubtitles = subtitles.filter(sub => sub.id !== id);
    
    addAction({
      type: "DELETE",
      subtitles: newSubtitles,
      affectedIds: [id],
      description: `Xóa phụ đề #${id}: "${deletedSubtitle.original.slice(0, 30)}..."`
    });
    
    set({ subtitles: newSubtitles });
    return newSubtitles;
  },

  editSubtitle: (id: number, changes: Partial<Subtitle>) => {
    const { subtitles, addAction } = get();
    const index = subtitles.findIndex(sub => sub.id === id);
    
    if (index === -1) return subtitles;
    
    const newSubtitles = [...subtitles];
    newSubtitles[index] = { ...newSubtitles[index], ...changes };
    
    addAction({
      type: "EDIT",
      subtitles: newSubtitles,
      affectedIds: [id],
      description: `Chỉnh sửa phụ đề #${id}`
    });
    
    set({ subtitles: newSubtitles });
    return newSubtitles;
  },

  batchDeleteSubtitles: (ids: number[]) => {
    const { subtitles, addAction } = get();
    const deletedSubtitles = subtitles.filter(sub => ids.includes(sub.id));
    
    if (deletedSubtitles.length === 0) return subtitles;
    
    const newSubtitles = subtitles.filter(sub => !ids.includes(sub.id));
    
    addAction({
      type: "BATCH_DELETE",
      subtitles: newSubtitles,
      affectedIds: ids,
      description: `Xóa ${ids.length} phụ đề`
    });
    
    set({ subtitles: newSubtitles });
    return newSubtitles;
  }
}));

export default useSubtitleHistoryStore;
export type { Subtitle, SubtitleAction }; 