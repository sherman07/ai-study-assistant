import { DoorOpen, Footprints, Settings2, Users } from "lucide-react";
import { getScenePresentation } from "../presenters/scenePresenter.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { GlassButton } from "./GlassButton.jsx";

export function TopFocusNav({ onWorkspace, onOpenTrail, onOpenCompanion, onOpenSettings, onExit }) {
  const selectedScene = useFocusRoomStore(state => state.selectedScene);
  const scene = getScenePresentation(selectedScene);

  return (
    <header className="focus-room-header">
      <button type="button" className="focus-wordmark" onClick={onWorkspace} aria-label="Return to Synapse workspace">
        <span className="focus-wordmark-mark">S</span><span>synapse</span>
      </button>
      <div className="focus-room-context" aria-label="Current focus context">
        <span>{scene.title}</span>
        <small>Quiet study room</small>
      </div>
      <nav className="focus-room-header-actions" aria-label="Focus Room controls">
        <GlassButton className="header-icon-button" onClick={onOpenTrail} title="Open Focus Trail" aria-label="Open Focus Trail"><Footprints size={16} aria-hidden="true" /><span>Focus Trail</span></GlassButton>
        <GlassButton className="header-icon-button" onClick={onOpenCompanion} title="Open Companion Room" aria-label="Open Companion Room"><Users size={16} aria-hidden="true" /><span>Companion</span></GlassButton>
        <GlassButton className="header-icon-button" onClick={onOpenSettings} title="Open room settings" aria-label="Open room settings"><Settings2 size={16} aria-hidden="true" /><span>Settings</span></GlassButton>
        <GlassButton className="header-icon-button header-exit-button" onClick={onExit} title="Exit Focus Room" aria-label="Exit Focus Room"><DoorOpen size={16} aria-hidden="true" /><span>Exit</span></GlassButton>
      </nav>
    </header>
  );
}
