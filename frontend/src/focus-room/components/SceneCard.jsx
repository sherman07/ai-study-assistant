import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

export function SceneCard({ scene, active, onSelect, variant = "default" }) {
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const springX = useSpring(pointerX, { stiffness: 180, damping: 24, mass: 0.5 });
  const springY = useSpring(pointerY, { stiffness: 180, damping: 24, mass: 0.5 });
  const rotateX = useTransform(springY, [0, 1], [2.2, -2.2]);
  const rotateY = useTransform(springX, [0, 1], [-2.2, 2.2]);
  const tiltStyle = reducedMotion ? {} : { rotateX, rotateY, transformPerspective: 820 };

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    pointerX.set(x);
    pointerY.set(y);
    event.currentTarget.style.setProperty("--scene-glare-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--scene-glare-y", `${y * 100}%`);
  }

  function handlePointerLeave(event) {
    pointerX.set(0.5);
    pointerY.set(0.5);
    event.currentTarget.style.setProperty("--scene-glare-x", "50%");
    event.currentTarget.style.setProperty("--scene-glare-y", "15%");
  }

  if (variant === "gallery") {
    return (
      <motion.button
        className={`scene-card scene-card-gallery ${active ? "active" : ""}`.trim()}
        type="button"
        aria-pressed={active}
        aria-label={`${scene.name}: ${scene.description}`}
        onClick={() => onSelect(scene.id)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={tiltStyle}
        whileHover={reducedMotion ? undefined : { y: -2 }}
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
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
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ backgroundImage: `url("${scene.image}")`, ...tiltStyle }}
      whileHover={reducedMotion ? undefined : { scale: 1.025, y: -2 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
    >
      <span className="focus-pill">{scene.kicker}</span>
      <strong>{scene.name}</strong>
      <span>{scene.description}</span>
    </motion.button>
  );
}
