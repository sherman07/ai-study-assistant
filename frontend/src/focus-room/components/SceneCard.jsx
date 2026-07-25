import { motion } from "motion/react";

export function SceneCard({ scene, active, onSelect, variant = "default" }) {
  if (variant === "gallery") {
    return (
      <motion.button
        className={`scene-card scene-card-gallery ${active ? "active" : ""}`.trim()}
        type="button"
        aria-pressed={active}
        aria-label={`${scene.name}: ${scene.description}`}
        onClick={() => onSelect(scene.id)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.985 }}
      >
        <span
          className="scene-card-gallery-media"
          style={{ backgroundImage: `url("${scene.image}")` }}
        >
          {active ? <span className="scene-card-check" aria-hidden="true">✓</span> : null}
        </span>
        <span className="scene-card-gallery-copy">
          <strong>{scene.name}</strong>
          <small>{scene.kicker}</small>
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      className={`scene-card ${active ? "active" : ""}`.trim()}
      type="button"
      aria-pressed={active}
      aria-label={`${scene.name}: ${scene.description}`}
      onClick={() => onSelect(scene.id)}
      style={{ backgroundImage: `url("${scene.image}")` }}
      whileHover={{ scale: 1.025, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="focus-pill">{scene.kicker}</span>
      <strong>{scene.name}</strong>
      <span>{scene.description}</span>
    </motion.button>
  );
}
