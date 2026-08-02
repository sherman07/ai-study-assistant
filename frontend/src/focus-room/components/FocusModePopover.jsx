import { X } from "lucide-react";

export function FocusModePopover({ id, title, onClose, children }) {
  const titleId = `focus-mode-${id}-title`;
  return (
    <section className="focus-mode-popover" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <header className="focus-mode-popover-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      <div className="focus-mode-popover-body">{children}</div>
    </section>
  );
}
