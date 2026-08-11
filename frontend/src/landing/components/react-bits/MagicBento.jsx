export function MagicBento({ children, className = "" }) {
  return <div className={`magic-bento-grid ${className}`}>{children}</div>;
}

export function MagicBentoCard({ children, className = "", onPointerMove, onPointerLeave, ...props }) {
  return (
    <div
      className={`magic-bento-card ${className}`}
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        event.currentTarget.style.setProperty("--bento-x", `${x}%`);
        event.currentTarget.style.setProperty("--bento-y", `${y}%`);
        event.currentTarget.style.setProperty("--bento-rotate-x", `${((50 - y) / 50) * 1.35}deg`);
        event.currentTarget.style.setProperty("--bento-rotate-y", `${((x - 50) / 50) * 1.35}deg`);
        onPointerMove?.(event);
      }}
      onPointerLeave={event => {
        event.currentTarget.style.setProperty("--bento-x", "50%");
        event.currentTarget.style.setProperty("--bento-y", "10%");
        event.currentTarget.style.setProperty("--bento-rotate-x", "0deg");
        event.currentTarget.style.setProperty("--bento-rotate-y", "0deg");
        onPointerLeave?.(event);
      }}
      {...props}
    >
      {children}
    </div>
  );
}
