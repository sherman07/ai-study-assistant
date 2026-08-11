function updateSpotlight(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  event.currentTarget.style.setProperty("--spotlight-x", `${x}%`);
  event.currentTarget.style.setProperty("--spotlight-y", `${y}%`);
}

export function SpotlightCard({ as: Tag = "article", children, className = "", onPointerMove, onPointerLeave, ...props }) {
  return (
    <Tag
      className={`spotlight-card ${className}`}
      onPointerMove={event => {
        updateSpotlight(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={event => {
        event.currentTarget.style.setProperty("--spotlight-x", "50%");
        event.currentTarget.style.setProperty("--spotlight-y", "20%");
        onPointerLeave?.(event);
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
