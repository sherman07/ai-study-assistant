import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { resolveSceneBundle } from "../model/sceneBundle.js";
import { LiquidGlassFilterDefs } from "./LiquidGlass.jsx";
import { SceneMotionLayer } from "./SceneMotionLayer.jsx";

export function FocusBackground({ scene }) {
  const [activeScene, setActiveScene] = useState(scene);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(() => globalThis.document?.visibilityState === "hidden");
  const [reducedMotion, setReducedMotion] = useState(() => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false);

  useEffect(() => {
    setMediaReady(false);
    setMediaError(false);
  }, [activeScene?.id]);

  useEffect(() => {
    if (!scene?.id || scene.id === activeScene?.id) return undefined;
    let cancelled = false;
    const preload = new Image();
    preload.onload = () => {
      if (!cancelled) setActiveScene(scene);
    };
    preload.onerror = () => {
      if (!cancelled) setMediaError(true);
    };
    preload.src = scene.image;
    return () => {
      cancelled = true;
      preload.onload = null;
      preload.onerror = null;
    };
  }, [activeScene?.id, scene]);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(globalThis.document?.visibilityState === "hidden");
    globalThis.document?.addEventListener?.("visibilitychange", onVisibilityChange);
    return () => globalThis.document?.removeEventListener?.("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const media = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return undefined;
    const onChange = event => setReducedMotion(Boolean(event.matches));
    setReducedMotion(Boolean(media.matches));
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  const bundle = resolveSceneBundle(activeScene?.id);
  const profile = bundle?.motion;
  const camera = profile?.layers?.find(layer => layer.kind === "camera");

  return (
    <div className="focus-background-wrap" aria-hidden="true">
      <LiquidGlassFilterDefs />
      <AnimatePresence mode="sync">
        <motion.div
          key={activeScene?.id || "focus-background"}
          className={`focus-background ${mediaReady && !reducedMotion ? "has-scene-motion" : ""} ${documentHidden ? "is-motion-paused" : ""}`.trim()}
          style={{ backgroundImage: mediaError ? "none" : undefined }}
          initial={{ opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1.02 }}
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {activeScene?.image ? (
            <img
              className={`focus-background-media focus-background-poster ${mediaReady ? "is-ready" : ""}`.trim()}
              src={activeScene.image}
              alt=""
              style={{ "--scene-camera-duration": `${camera?.duration || 36}s`, "--scene-camera-intensity": camera?.intensity || 0.2 }}
              onLoad={() => setMediaReady(true)}
              onError={() => setMediaError(true)}
            />
          ) : null}
          {activeScene?.video ? (
            <video
              className={`focus-background-media focus-background-video ${mediaReady ? "is-ready" : ""}`.trim()}
              src={activeScene.video}
              poster={activeScene.image}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onLoadedData={() => setMediaReady(true)}
              onError={() => setMediaError(true)}
            />
          ) : null}
          <SceneMotionLayer profile={profile} paused={documentHidden} reducedMotion={reducedMotion} />
        </motion.div>
      </AnimatePresence>
      <div className="focus-overlay" />
      <div className="focus-vignette" />
    </div>
  );
}
