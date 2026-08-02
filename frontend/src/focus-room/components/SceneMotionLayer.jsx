export function SceneMotionLayer({ profile, paused = false, reducedMotion = false }) {
  if (reducedMotion || !profile?.layers?.length) return null;
  const decorativeLayers = profile.layers.filter(layer => layer.kind !== "camera");
  return (
    <div className={`scene-motion-layer ${paused ? "is-paused" : ""}`.trim()} aria-hidden="true">
      {decorativeLayers.map((layer, index) => (
        <span
          key={`${profile.id}-${layer.kind}-${index}`}
          className={`scene-motion scene-motion-${layer.kind}`}
          style={{
            "--motion-duration": `${layer.duration}s`,
            "--motion-intensity": layer.intensity,
            "--motion-density": layer.density,
            "--motion-delay": `${-index * 3.7}s`
          }}
        />
      ))}
    </div>
  );
}
