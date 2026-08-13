function resetGenerateButton() {
  if (!generateBtn) return;
  generateBtn.disabled = false;
  generateBtn.innerHTML = `<i class="bi bi-stars me-2"></i>Analyze with Synapse`;
}

function setGenerateButtonForJob(job = {}) {
  if (!generateBtn) return;
  const status = job.status || "generating";
  const isActive = ["queued", "analysing", "generating"].includes(status);
  generateBtn.disabled = isActive;
  generateBtn.innerHTML = isActive
    ? `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Generating...`
    : `<i class="bi bi-stars me-2"></i>Analyze with Synapse`;
}

function updateGenerateButtonForCurrentJob() {
  if (!generateBtn) return;
  const activeJob = typeof findActiveGenerationJobByNoteId === "function"
    ? findActiveGenerationJobByNoteId(currentSourceFingerprint)
    : null;
  if (activeJob) setGenerateButtonForJob(activeJob);
  else resetGenerateButton();
}

function setGeneratingState(isGenerating) {
  if (isGenerating) setGenerateButtonForJob({ status: "generating" });
  else resetGenerateButton();
}

function resolveUploadedFilesForRetry(fileNames = []) {
  const names = (Array.isArray(fileNames) ? fileNames : []).map(name => String(name || "Uploaded source"));
  if (!names.length || !Array.isArray(uploadedFiles) || !uploadedFiles.length) return [];
  const used = new Set();
  const matched = [];
  for (const name of names) {
    const index = uploadedFiles.findIndex((file, fileIndex) => {
      if (used.has(fileIndex)) return false;
      return String(file?.name || "Uploaded source") === name;
    });
    if (index < 0) return [];
    used.add(index);
    matched.push(uploadedFiles[index]);
  }
  return matched;
}

async function saveUploadRetryPayload(jobId, context = {}) {
  const id = String(jobId || "");
  if (!id || typeof indexedDB === "undefined") return;
  const files = Array.isArray(context.files) ? context.files : [];
  const serializedFiles = [];
  for (const file of files) {
    if (!file) continue;
    serializedFiles.push({
      name: String(file.name || "Uploaded source"),
      type: String(file.type || "application/octet-stream"),
      lastModified: Number(file.lastModified || Date.now()),
      buffer: await file.arrayBuffer()
    });
  }
  const db = await openUploadRetryDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(UPLOAD_RETRY_STORE_CONFIG.storeName, "readwrite");
      tx.objectStore(UPLOAD_RETRY_STORE_CONFIG.storeName).put({
        id: `job:${id}`,
        updatedAt: Date.now(),
        sourceLinks: Array.isArray(context.sourceLinks) ? context.sourceLinks : [],
        uploadedLinks: Array.isArray(context.uploadedLinks) ? context.uploadedLinks : [],
        freeText: String(context.freeText || ""),
        rawSource: String(context.rawSource || ""),
        files: serializedFiles
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to save upload retry payload."));
    });
  } finally {
    db.close();
  }
}

function openUploadRetryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(UPLOAD_RETRY_STORE_CONFIG.dbName, UPLOAD_RETRY_STORE_CONFIG.version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(UPLOAD_RETRY_STORE_CONFIG.storeName)) {
        const store = db.createObjectStore(UPLOAD_RETRY_STORE_CONFIG.storeName, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open upload retry cache."));
  });
}

async function loadUploadRetryPayload(jobId) {
  const id = String(jobId || "");
  if (!id || typeof indexedDB === "undefined") return null;
  const db = await openUploadRetryDb();
  try {
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(UPLOAD_RETRY_STORE_CONFIG.storeName, "readonly");
      const request = tx.objectStore(UPLOAD_RETRY_STORE_CONFIG.storeName).get(`job:${id}`);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Failed to load upload retry payload."));
    });
    if (!record) return null;
    const files = (Array.isArray(record.files) ? record.files : []).map(entry => new File(
      [entry.buffer],
      String(entry.name || "Uploaded source"),
      {
        type: String(entry.type || "application/octet-stream"),
        lastModified: Number(entry.lastModified || Date.now())
      }
    ));
    return {
      sourceLinks: Array.isArray(record.sourceLinks) ? record.sourceLinks : [],
      uploadedLinks: Array.isArray(record.uploadedLinks) ? record.uploadedLinks : [],
      freeText: String(record.freeText || ""),
      rawSource: String(record.rawSource || ""),
      files
    };
  } finally {
    db.close();
  }
}

async function clearUploadRetryPayload(jobId) {
  const id = String(jobId || "");
  if (!id || typeof indexedDB === "undefined") return;
  const db = await openUploadRetryDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(UPLOAD_RETRY_STORE_CONFIG.storeName, "readwrite");
      tx.objectStore(UPLOAD_RETRY_STORE_CONFIG.storeName).delete(`job:${id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to clear upload retry payload."));
    });
  } finally {
    db.close();
  }
}

async function retryGenerationJobFromUpload(job = {}) {
  const request = job.request || {};
  const retained = typeof runtimeGenerationJobRetryPayloads !== "undefined"
    ? runtimeGenerationJobRetryPayloads.get(job.jobId)
    : null;
  let files = Array.isArray(retained?.files) ? [...retained.files] : [];
  let sourceLinks = uniqueSourceLinks(
    retained?.sourceLinks || request.sourceLinks || []
  );
  let uploadedLinks = Array.isArray(retained?.uploadedLinks)
    ? [...retained.uploadedLinks]
    : (Array.isArray(request.uploadedLinks) ? [...request.uploadedLinks] : []);
  let freeText = retained?.freeText ?? request.freeText ?? "";
  let rawSource = retained?.rawSource ?? request.rawSource ?? "";

  if (request.hasFiles && !files.length) {
    files = resolveUploadedFilesForRetry(request.fileNames);
  }
  if (request.hasFiles && !files.length) {
    const restored = await loadUploadRetryPayload(job.jobId);
    if (restored?.files?.length) {
      files = restored.files;
      if (!sourceLinks.length) sourceLinks = uniqueSourceLinks(restored.sourceLinks || []);
      if (!uploadedLinks.length) uploadedLinks = Array.isArray(restored.uploadedLinks) ? restored.uploadedLinks : [];
      if (!freeText) freeText = restored.freeText || "";
      if (!rawSource) rawSource = restored.rawSource || "";
    }
  }
  if (request.hasFiles && !files.length) return false;

  if (files.length) uploadedFiles = [...files];
  uploadedLinks = [...uploadedLinks];
  if (sourceInput && rawSource) sourceInput.value = rawSource;

  upsertGenerationJob({
    jobId: job.jobId,
    status: "queued",
    progress: 4,
    message: "Queued for retry",
    error: ""
  });
  openGenerationJob(job.jobId);
  enqueueGenerationJobRun(job.jobId, {
    ...request,
    rawSource,
    freeText,
    sourceLinks,
    uploadedLinks,
    parsedSources: {
      links: sourceLinks,
      freeText
    },
    files: [...files]
  });
  return true;
}



function showAnalysisView({ scrollToTop = false } = {}) {
  if (typeof setLearningExperienceMode === "function") {
    setLearningExperienceMode("materials");
  }
  if (uploadStage) uploadStage.classList.add("d-none");
  if (analysisStage) analysisStage.classList.remove("d-none");
  if (loadingBox) loadingBox.classList.add("d-none");
  if (resultGrid) resultGrid.classList.remove("d-none");

  appLayout.classList.remove("initial-state", "loading-state", "generation-job-state");
  appLayout.classList.add("analysis-ready", "assistant-closed", "generated-notes-state");
  if (assistant) assistant.classList.add("hidden");
  if (openAssistantBtn) openAssistantBtn.style.display = "block";
  if (typeof setWorkspaceNavTab === "function") {
    setWorkspaceNavTab("outline", { persist: true, expandRail: true });
  } else {
    syncWorkspaceNavTabUi("outline");
  }
  renderSourceViewer();
  if (typeof renderFocusRoomWorkspaceActions === "function") {
    renderFocusRoomWorkspaceActions();
  }
  if (typeof notifyFocusRoomMaterialsChanged === "function") {
    notifyFocusRoomMaterialsChanged();
  }

  if (scrollToTop) {
    requestAnimationFrame(() => {
      const header = document.querySelector(".notes-header") || analysisStage || mainNotes;
      if (header && typeof header.scrollIntoView === "function") {
        header.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (mainNotes) mainNotes.scrollTop = 0;
    });
  }
}


function renderVisualGallery() {
  if (!visualGallery) return;
  const figures = sanitizeLearningFigures(visualGalleryData).slice(0, 8);
  if (!figures.length) {
    visualGallery.classList.add("d-none");
    visualGallery.innerHTML = "";
    return;
  }

  visualGallery.classList.remove("d-none");
  visualGallery.innerHTML = `
    <div class="visual-gallery-head">
      <div>
        <h3>Source Evidence</h3>
        <p>Figures, tables, and diagrams from the uploaded material.</p>
      </div>
      <span>${figures.length} item${figures.length === 1 ? "" : "s"}</span>
    </div>
    <div class="visual-gallery-grid">
      ${figures.map((item, fallbackIndex) => {
        const index = Number.isFinite(Number(item.index)) ? Number(item.index) : fallbackIndex;
        const title = cleanSourceFigureDisplayText(item.title) || `Source figure ${index + 1}`;
        const caption = (
          getVisualDetailText(item, ["what_shows", "caption"]) ||
          getVisualDetailText(item, ["why_relevant", "argument_supported", "cross_source_connection"]) ||
          cleanSourceFigureDisplayText(sourceFigureText(item))
        );
        return `
          <figure class="visual-card" onclick="openVisualModal(${index})" role="button" tabindex="0" aria-label="Open ${escapeAttr(title)}">
            <img src="${escapeAttr(item.url)}" alt="${escapeAttr(title)}" loading="lazy">
            <figcaption>
              <strong>Source figure ${index + 1}</strong>
              <span>${escapeHTML(title)}</span>
              ${caption ? `<small>${escapeHTML(shorten(caption, 150))}</small>` : ""}
            </figcaption>
          </figure>
        `;
      }).join("")}
    </div>
  `;
}
