import useStore from "@/pages/editor/store/use-store";
import { SequenceItem } from "./sequence-item";
import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { dispatch, filter, subject } from "@designcombo/events";
import {
  EDIT_OBJECT,
  EDIT_TEMPLATE_ITEM,
  ENTER_EDIT_MODE,
} from "@designcombo/state";
import { merge } from "lodash";
import { groupTrackItems } from "../utils/track-items";
import { calculateTextHeight } from "../utils/text";
import { Transitions } from "./presentations";

// Memoized sequence item renderer to prevent unnecessary re-renders
const MemoizedSequenceItem = memo(({ 
  item, 
  fps, 
  handleTextChange, 
  onTextBlur, 
  editableTextId 
}: {
  item: any;
  fps: number;
  handleTextChange: (id: string, text: string) => void;
  onTextBlur: (id: string, text: string) => void;
  editableTextId: string | null;
}) => {
  const renderer = SequenceItem[item.type];
  if (!renderer) {
    console.warn(`No renderer found for item type: ${item.type}`);
    return null;
  }
  
  return renderer(item, {
    fps,
    handleTextChange,
    onTextBlur,
    editableTextId,
  });
});

MemoizedSequenceItem.displayName = 'MemoizedSequenceItem';

const Composition = () => {
  const [editableTextId, setEditableTextId] = useState<string | null>(null);
  const {
    trackItemIds,
    trackItemsMap,
    fps,
    trackItemDetailsMap,
    sceneMoveableRef,
    size,
    transitionsMap,
  } = useStore();

  // Memoize the merged track items map to prevent unnecessary recalculations
  const mergedTrackItemsDeatilsMap = useMemo(
    () => merge(trackItemsMap, trackItemDetailsMap),
    [trackItemsMap, trackItemDetailsMap]
  );

  // Memoize the grouped items to prevent unnecessary recalculations
  const groupedItems = useMemo(
    () => groupTrackItems({
      trackItemIds,
      transitionsMap,
      trackItemsMap: mergedTrackItemsDeatilsMap,
    }),
    [trackItemIds, transitionsMap, mergedTrackItemsDeatilsMap]
  );

  const handleTextChange = useCallback((id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    const textDiv = elRef.firstElementChild?.firstElementChild
      ?.firstElementChild as HTMLDivElement;

    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textShadow,
      webkitTextStroke,
    } = textDiv.style;
    const { width } = elRef.style;
    if (!elRef.innerText) return;
    const newHeight = calculateTextHeight({
      family: fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      text: elRef.innerText!,
      textShadow: textShadow,
      webkitTextStroke,
      width,
      id: id,
    });
    elRef.style.height = `${newHeight}px`;
    sceneMoveableRef?.current?.moveable.updateRect();
    sceneMoveableRef?.current?.moveable.forceUpdate();
  }, [sceneMoveableRef]);

  const onTextBlur = useCallback((id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    const textDiv = elRef.firstElementChild?.firstElementChild
      ?.firstElementChild as HTMLDivElement;
    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textShadow,
      webkitTextStroke,
    } = textDiv.style;
    const { width } = elRef.style;
    if (!elRef.innerText) return;
    const newHeight = calculateTextHeight({
      family: fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      text: elRef.innerText!,
      textShadow: textShadow,
      webkitTextStroke,
      width,
      id: id,
    });
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            height: newHeight,
          },
        },
      },
    });
  }, []);

  //   handle track and track item events - updates
  useEffect(() => {
    const stateEvents = subject.pipe(
      filter(({ key }) => key.startsWith(ENTER_EDIT_MODE)),
    );

    const subscription = stateEvents.subscribe((obj) => {
      if (obj.key === ENTER_EDIT_MODE) {
        if (editableTextId) {
          // get element by  data-text-id={id}
          const element = document.querySelector(
            `[data-text-id="${editableTextId}"]`,
          );
          if (trackItemIds.includes(editableTextId)) {
            dispatch(EDIT_OBJECT, {
              payload: {
                [editableTextId]: {
                  details: {
                    text: element?.innerHTML || "",
                  },
                },
              },
            });
          } else {
            dispatch(EDIT_TEMPLATE_ITEM, {
              payload: {
                [editableTextId]: {
                  details: {
                    text: element?.textContent || "",
                  },
                },
              },
            });
          }
        }
        setEditableTextId(obj.value?.payload.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [editableTextId, trackItemIds]);

  // Memoize the rendered items to prevent unnecessary re-renders
  const renderedItems = useMemo(() => {
    return groupedItems.map((group, index) => {
      if (group.length === 1) {
        const item = mergedTrackItemsDeatilsMap[group[0].id];
        if (!item) return null;
        
        return (
          <MemoizedSequenceItem
            key={`${item.id}-${item.type}-${index}`}
            item={item}
            fps={fps}
            handleTextChange={handleTextChange}
            onTextBlur={onTextBlur}
            editableTextId={editableTextId}
          />
        );
      }
      return null;
    }).filter(Boolean);
  }, [groupedItems, mergedTrackItemsDeatilsMap, fps, handleTextChange, onTextBlur, editableTextId]);

  return <>{renderedItems}</>;
};

export default memo(Composition);
