/* Synapse's single, browser-safe appearance manager.
 * It is loaded in the document head so static pages, legacy DOM, React roots,
 * and portal content all receive the resolved theme before first paint. */
(function initialiseSynapseTheme(global, documentRef) {
  "use strict";

  if (!global || !documentRef || global.SynapseTheme) return;

  const STORAGE_KEY = "synapse.account.preferences.v1";
  const VALID_PREFERENCES = new Set(["system", "light", "dark"]);
  const mediaQuery = global.matchMedia ? global.matchMedia("(prefers-color-scheme: dark)") : null;
  const listeners = new Set();

  function normalisePreference(value) {
    return VALID_PREFERENCES.has(value) ? value : "system";
  }

  function readPreferences() {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function getPreference() {
    return normalisePreference(readPreferences().appearance);
  }

  function resolve(preference = getPreference()) {
    const value = normalisePreference(preference);
    if (value !== "system") return value;
    return mediaQuery?.matches ? "dark" : "light";
  }

  function isFocusRoomStandaloneDocument() {
    try {
      const path = String(global.location?.pathname || "");
      if (/focus-room\.html(?:$|[?#])/i.test(path)) return true;
    } catch {
      // Ignore restricted location access in embedded contexts.
    }
    return Boolean(documentRef.body?.classList?.contains("focus-room-standalone"));
  }

  function notify(detail) {
    listeners.forEach(listener => listener(detail));
    try {
      documentRef.dispatchEvent(new CustomEvent("synapse:themechange", { detail }));
    } catch {
      // Older embedded browsers may not expose CustomEvent; DOM state is still updated.
    }
  }

  function apply(preference = getPreference(), options = {}) {
    const selected = normalisePreference(preference);
    // Immersive Focus Room chrome is cream-glass on scene photography. Keep it dark
    // even when the account preference resolves to light, otherwise UA/theme rules
    // paint brand buttons as opaque white boxes.
    const resolved = isFocusRoomStandaloneDocument() ? "dark" : resolve(selected);
    const root = documentRef.documentElement;
    if (!root) return resolved;

    root.dataset.theme = resolved;
    root.dataset.themePreference = selected;
    root.style.colorScheme = resolved;
    documentRef.body?.classList.toggle("synapse-theme-dark", resolved === "dark");
    documentRef.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      resolved === "dark" ? "#0a111f" : "#4a7cff"
    );

    if (!options.silent) notify({ preference: selected, resolved });
    return resolved;
  }

  function setPreference(preference) {
    const selected = normalisePreference(preference);
    try {
      global.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ ...readPreferences(), appearance: selected }));
    } catch {
      // Private browsing/storage denial should not stop an in-memory theme change.
    }
    return apply(selected);
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function onSystemChange() {
    if (getPreference() === "system") apply("system");
  }

  function onStorageChange(event) {
    if (event?.key === STORAGE_KEY) apply();
  }

  if (mediaQuery?.addEventListener) mediaQuery.addEventListener("change", onSystemChange);
  else if (mediaQuery?.addListener) mediaQuery.addListener(onSystemChange);
  global.addEventListener?.("storage", onStorageChange);

  global.SynapseTheme = Object.freeze({
    STORAGE_KEY,
    normalisePreference,
    readPreferences,
    getPreference,
    resolve,
    apply,
    setPreference,
    subscribe
  });

  apply(getPreference(), { silent: true });
  if (documentRef.readyState === "loading") {
    documentRef.addEventListener("DOMContentLoaded", () => apply(getPreference(), { silent: true }), { once: true });
  }
})(window, document);
