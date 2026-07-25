import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FOCUS_ROOM_GALLERY_SCENES, FOCUS_ROOM_SCENES } from "../data.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { SceneCard } from "./SceneCard.jsx";

const GALLERY_PAGE_SIZE = 8;

export function SceneSelector({ variant = "default" }) {
  const selectedScene = useFocusRoomStore(state => state.selectedScene);
  const selectScene = useFocusRoomStore(state => state.selectScene);
  const [page, setPage] = useState(0);

  const scenes = useMemo(() => {
    if (variant === "gallery") return FOCUS_ROOM_GALLERY_SCENES;
    return FOCUS_ROOM_SCENES.filter(scene => !scene.galleryOnly || scene.id === selectedScene);
  }, [selectedScene, variant]);

  const pageCount = Math.max(1, Math.ceil(scenes.length / GALLERY_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleScenes = variant === "gallery"
    ? scenes.slice(safePage * GALLERY_PAGE_SIZE, safePage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE)
    : scenes;

  if (variant !== "gallery") {
    return (
      <div className="scene-selector" aria-label="Study scenes">
        {visibleScenes.map(scene => (
          <SceneCard
            key={scene.id}
            scene={scene}
            active={scene.id === selectedScene}
            onSelect={selectScene}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="scene-selector-wrap" aria-label="Study scenes">
      <div className="scene-selector scene-selector-gallery">
        {visibleScenes.map(scene => (
          <SceneCard
            key={scene.id}
            scene={scene}
            active={scene.id === selectedScene}
            onSelect={selectScene}
            variant="gallery"
          />
        ))}
      </div>
      {pageCount > 1 ? (
        <div className="scene-pagination" aria-label="Scene pages">
          <button
            type="button"
            className="scene-page-arrow scene-page-button-left"
            onClick={() => setPage(value => Math.max(0, value - 1))}
            disabled={safePage <= 0}
            aria-label="Previous scenes"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="scene-page-arrow scene-page-button-right"
            onClick={() => setPage(value => Math.min(pageCount - 1, value + 1))}
            disabled={safePage >= pageCount - 1}
            aria-label="Next scenes"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
