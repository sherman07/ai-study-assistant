function frontendRuntimeBaseUrl(pageUrl = window.location.href) {
  const page = new URL(pageUrl, window.location.origin);

  if (page.pathname.includes("/frontend/")) {
    return new URL("./", page);
  }

  return new URL("frontend/", page);
}

export function loadLegacyController() {
  const existingController = document.querySelector("script[data-synapse-controller]");
  if (existingController) return existingController;

  const version = "study-tools-20260730-01";
  const controllerScript = document.createElement("script");
  controllerScript.type = "module";
  // This must remain a browser-served module URL. Vite turns import.meta-relative
  // URLs into data URLs here, which prevents controller imports from resolving.
  controllerScript.src = `${new URL("src/legacy/controller.js", frontendRuntimeBaseUrl()).href}?v=${version}`;
  controllerScript.dataset.synapseController = "true";
  controllerScript.async = false;
  controllerScript.addEventListener("error", () => {
    window.__synapseControllerLoadError = "The Synapse workspace controller module could not be loaded.";
    window.dispatchEvent(new CustomEvent("synapse-runtime-failed", {
      detail: { message: "The Synapse workspace controller could not be loaded." }
    }));
  }, { once: true });
  document.body.appendChild(controllerScript);
  return controllerScript;
}
