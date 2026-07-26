function escapeHTML(value) {
  return String(value || "").replace(/[<>&]/g, char => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;"
  }[char]));
}

function focusRoomHasMounted() {
  return Boolean(document.getElementById("focusRoomSurface"));
}

function renderFocusRoomLoadError(error) {
  if (focusRoomHasMounted()) return;
  console.error("Synapse Focus Room failed to load:", error);
  const root = document.getElementById("focusRoomRoot");
  if (!root) return;
  const message = String(error?.message || error || "Unknown error");
  root.innerHTML = [
    '<section class="focus-empty-stage">',
    '<article class="liquid-glass focus-empty-card">',
    "<h1>Synapse Focus Room</h1>",
    "<p>Focus Room could not load. Refresh the page, or start the project from a local server instead of opening the HTML file directly.</p>",
    `<p class="focus-error-detail">${escapeHTML(message)}</p>`,
    "</article>",
    "</section>"
  ].join("");
}

function verifyFocusRoomMounted() {
  const nextFrame = window.requestAnimationFrame || (callback => window.setTimeout(callback, 0));
  nextFrame(() => {
    nextFrame(() => {
      if (!focusRoomHasMounted()) {
        renderFocusRoomLoadError(new Error("Focus Room started, but no interface mounted. Refresh the page to reload the app bundle."));
      }
    });
  });
}

window.addEventListener("error", event => {
  window.setTimeout(() => renderFocusRoomLoadError(event.error || event.message), 0);
});

window.addEventListener("unhandledrejection", event => {
  window.setTimeout(() => renderFocusRoomLoadError(event.reason), 0);
});

// Keep the URL in a runtime string so Vite does not rewrite this to a stale hashed chunk.
const FOCUS_ROOM_STATIC_URL = "../../assets/focus-room-app/focus-room-static.js?v=focus-room-static-v15";
import(/* @vite-ignore */ FOCUS_ROOM_STATIC_URL)
  .then(verifyFocusRoomMounted)
  .catch(renderFocusRoomLoadError);
