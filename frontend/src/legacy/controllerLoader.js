class LegacyControllerLoader {
  constructor({
    baseUrl,
    bootFile,
    configureMarkdownRenderer,
    definitionFiles,
    documentRef = globalThis.document,
    globalScope = globalThis,
    utilities = {},
    version
  }) {
    this.baseUrl = baseUrl;
    this.bootFile = bootFile;
    this.configureMarkdownRenderer = configureMarkdownRenderer;
    this.definitionFiles = definitionFiles;
    this.documentRef = documentRef;
    this.globalScope = globalScope;
    this.utilities = utilities;
    this.version = version;
  }

  exposeUtilities() {
    Object.assign(this.globalScope, this.utilities);
    this.globalScope.__synapseRuntimeUtilitiesReady = true;
    this.globalScope.dispatchEvent(new Event("synapse-runtime-utilities-ready"));
  }

  sectionUrl(fileName) {
    const url = new URL(`./controller_sections/${fileName}`, this.baseUrl);
    return `${url.href}?v=${this.version}`;
  }

  async fetchSection(fileName) {
    const response = await fetch(this.sectionUrl(fileName));
    if (!response.ok) {
      throw new Error(`Could not load ${fileName}: ${response.status}`);
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const source = await response.text();
    // Vite can return HTML for missing assets with a 200. Reject that early.
    if (contentType.includes("text/html") || /^\s*</.test(source)) {
      throw new Error(`Could not load ${fileName}: expected JavaScript, received HTML`);
    }
    return {
      fileName,
      source
    };
  }

  configureMarkdownHooks = () => {
    this.configureMarkdownRenderer({
      getLearningFigureByMarker: this.globalScope.getLearningFigureByMarker,
      renderInlineVisualCard: this.globalScope.renderInlineVisualCard,
      renderInlineVisualReference: this.globalScope.renderInlineVisualReference
    });
  };

  combinedSource(definitionSections, bootSection) {
    const definitionSource = definitionSections
      .map(({ fileName, source }) => `\n/* ${fileName} */\n${source}`)
      .join("\n");
    return [
      "globalThis.__synapseCombinedEvalStarted = true;",
      definitionSource,
      "globalThis.__synapseConfigureMarkdownHooks && globalThis.__synapseConfigureMarkdownHooks();",
      `\n/* ${bootSection.fileName} */\n${bootSection.source}`,
      "\n//# sourceURL=synapse-legacy-controller-combined.js"
    ].join("\n");
  }

  loadSectionScript(fileName) {
    return new Promise((resolve, reject) => {
      const script = this.documentRef.createElement("script");
      script.src = this.sectionUrl(fileName);
      script.dataset.synapseControllerSection = fileName;
      script.async = false;
      script.addEventListener("load", () => resolve(script), { once: true });
      script.addEventListener("error", () => {
        reject(new Error(`The Synapse controller section could not be loaded: ${fileName}`));
      }, { once: true });
      this.documentRef.body.appendChild(script);
    });
  }

  loadRuntimeScript(fileName) {
    return new Promise((resolve, reject) => {
      const script = this.documentRef.createElement("script");
      const url = new URL(`./${fileName}`, this.baseUrl);
      script.src = `${url.href}?v=${this.version}`;
      script.type = "text/javascript";
      script.dataset.synapseControllerSection = "combined-runtime";
      script.async = false;
      const captureError = event => {
        if (!event.filename || event.filename === script.src || event.filename.includes(fileName)) {
          this.globalScope.__synapseControllerRuntimeError = event.error?.stack || event.message || String(event.error || event);
        }
      };
      this.globalScope.addEventListener("error", captureError, true);
      script.addEventListener("load", () => resolve(script), { once: true });
      script.addEventListener("error", () => {
        this.globalScope.removeEventListener("error", captureError, true);
        reject(new Error(`The Synapse combined controller could not be loaded: ${fileName}`));
      }, { once: true });
      script.addEventListener("load", () => {
        this.globalScope.removeEventListener("error", captureError, true);
      }, { once: true });
      this.documentRef.body.appendChild(script);
    });
  }

  executeCombinedScript(source) {
    return new Promise((resolve, reject) => {
      const script = this.documentRef.createElement("script");
      const blob = new Blob([source], { type: "text/javascript" });
      const objectUrl = URL.createObjectURL(blob);
      script.dataset.synapseControllerSection = "combined";
      script.type = "text/javascript";
      script.async = false;
      script.src = objectUrl;
      script.addEventListener("load", () => {
        URL.revokeObjectURL(objectUrl);
        resolve(script);
      }, { once: true });
      script.addEventListener("error", () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("The combined Synapse controller module could not be executed."));
      }, { once: true });
      this.documentRef.body.appendChild(script);
    });
  }

  waitForCombinedController(timeoutMs = 1200) {
    if (this.globalScope.__synapseCombinedControllerReady) {
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        this.globalScope.removeEventListener("synapse-combined-controller-ready", onReady);
        clearTimeout(timer);
        resolve(ok);
      };
      const onReady = () => finish(true);
      const timer = setTimeout(() => finish(false), timeoutMs);
      this.globalScope.addEventListener("synapse-combined-controller-ready", onReady, { once: true });
      if (this.globalScope.__synapseCombinedControllerReady) finish(true);
    });
  }

  async assembleAndRunCombinedController() {
    const definitionSections = await Promise.all(
      this.definitionFiles.map(fileName => this.fetchSection(fileName))
    );
    const bootSection = await this.fetchSection(this.bootFile);
    const source = [
      this.combinedSource(definitionSections, bootSection),
      "globalThis.__synapseCombinedControllerReady = true;",
      "globalThis.dispatchEvent(new Event('synapse-combined-controller-ready'));"
    ].join("\n");
    await this.executeCombinedScript(source);
  }

  async loadCombinedController() {
    const ready = await this.waitForCombinedController(1200);
    if (ready) return;
    // Vite/dev and incomplete static publishes may omit the prebuilt combined
    // artifact referenced by index.html. Assemble sections in the browser then.
    await this.assembleAndRunCombinedController();
    const assembled = await this.waitForCombinedController(8000);
    if (!assembled) {
      throw new Error("Synapse combined controller did not become ready after section assembly.");
    }
  }

  async load() {
    this.globalScope.__synapseConfigureMarkdownHooks = this.configureMarkdownHooks;
    this.exposeUtilities();
    try {
      await this.loadCombinedController();
    } finally {
      delete this.globalScope.__synapseConfigureMarkdownHooks;
    }
  }
}

export { LegacyControllerLoader };
