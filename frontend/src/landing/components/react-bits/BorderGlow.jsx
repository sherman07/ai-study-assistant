function updateBorderGlow(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
  event.currentTarget.style.setProperty("--border-glow-x", `${x}%`);
  event.currentTarget.style.setProperty("--border-glow-y", `${y}%`);
}

function resetBorderGlow(event) {
  event.currentTarget.style.setProperty("--border-glow-x", "50%");
  event.currentTarget.style.setProperty("--border-glow-y", "0%");
}

export function BorderGlow({ children, className = "", onPointerMove, onPointerLeave, ...props }) {
  return (
    <div
      className={`border-glow ${className}`}
      onPointerMove={event => {
        updateBorderGlow(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={event => {
        resetBorderGlow(event);
        onPointerLeave?.(event);
      }}
      {...props}
    >
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}
