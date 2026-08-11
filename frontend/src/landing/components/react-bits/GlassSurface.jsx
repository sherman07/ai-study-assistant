function updateGlassLight(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
  event.currentTarget.style.setProperty("--glass-surface-x", `${x}%`);
  event.currentTarget.style.setProperty("--glass-surface-y", `${y}%`);
}

export function GlassSurface({ as: Tag = "div", children, className = "", onPointerMove, onPointerLeave, ...props }) {
  return (
    <Tag
      className={`glass-surface ${className}`}
      onPointerMove={event => {
        updateGlassLight(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={event => {
        event.currentTarget.style.setProperty("--glass-surface-x", "50%");
        event.currentTarget.style.setProperty("--glass-surface-y", "0%");
        onPointerLeave?.(event);
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
