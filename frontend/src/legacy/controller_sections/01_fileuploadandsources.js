function openFilePicker() {
  assetUpload.click();
}

assetUpload.addEventListener("change", (event) => {
  addFiles([...event.target.files]);
  assetUpload.value = "";
});

["dragenter", "dragover"].forEach(type => {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
    setUploadStatus("neutral", "Release to add your study material.");
  });
});

["dragleave", "drop"].forEach(type => {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
    if (type === "dragleave" && uploadedFiles.length === 0) {
      setUploadStatus("neutral", "Choose a file to begin. Your files stay visible here until you analyze them.");
    }
  });
});

dropZone.addEventListener("drop", (event) => {
  addFiles([...event.dataTransfer.files]);
});

dropZone.addEventListener("click", (event) => {
  if (!event.target.closest("button")) openFilePicker();
});

if (linkInput) {
  linkInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addLinksFromInput();
    }
  });
}

function addFiles(files) {
  const nextFiles = Array.isArray(files) ? files.filter(file => file && file.name) : [];
  if (!nextFiles.length) {
    setUploadStatus("error", "We could not read that upload. Choose a file and try again.");
    flashUploadState("error");
    return;
  }
  uploadedFiles.push(...nextFiles);
  renderFilePreview();
  setUploadStatus("success", `${nextFiles.length} file${nextFiles.length === 1 ? "" : "s"} ready. Review the list below, then click Analyze materials.`);
  flashUploadState("success");
}

function renderFilePreview() {
  if (uploadedFiles.length === 0) {
    filePreview.classList.add("d-none");
    filePreview.innerHTML = "";
    setUploadStatus("neutral", "Choose a file to begin. Your files stay visible here until you analyze them.");
    return;
  }

  filePreview.classList.remove("d-none");
  filePreview.innerHTML = uploadedFiles.map((file, index) => `
    <div class="file-chip file-chip-added">
      <i class="bi ${fileIcon(file)}"></i>
      <span title="${escapeAttr(file.name)}">${escapeHTML(shorten(file.name, 42))}</span>
      <button type="button" onclick="removeFile(${index})" aria-label="Remove file">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `).join("");
}

function setUploadStatus(type, message) {
  if (!uploadStatus) return;
  const icons = { success: "bi-check-circle", error: "bi-exclamation-triangle", neutral: "bi-info-circle" };
  uploadStatus.className = `upload-status upload-status-${type}`;
  uploadStatus.innerHTML = `<i class="bi ${icons[type] || icons.neutral}"></i><span>${escapeHTML(message)}</span>`;
}

function flashUploadState(type) {
  if (!dropZone) return;
  dropZone.classList.remove("upload-state-success", "upload-state-error");
  dropZone.offsetWidth;
  dropZone.classList.add(type === "success" ? "upload-state-success" : "upload-state-error");
  window.setTimeout(() => dropZone.classList.remove("upload-state-success", "upload-state-error"), 900);
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderFilePreview();
}

function fileIcon(file) {
  const name = (file.name || "").toLowerCase();
  if (file.type && file.type.includes("image")) return "bi-image";
  if ((file.type && file.type.includes("pdf")) || name.endsWith(".pdf")) return "bi-file-earmark-pdf";
  if (name.endsWith(".docx")) return "bi-file-earmark-word";
  return "bi-file-earmark-text";
}

const SOURCE_LINK_CANDIDATE_PATTERN = /(?:https?:\/\/|www\.|youtube(?:-nocookie)?\.com\/|youtu\.be\/|[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s<>()]*)?)[^\s<>()]*/gi;
function cleanSourceLinkCandidate(value) {
  return String(value || "")
    .trim()
    .replace(/^[<("'“”‘’]+/g, "")
    .replace(/[>),.;!?'"\u201c\u201d\u2018\u2019]+$/g, "")
    .trim();
}

function normalizeSourceLink(value) {
  const cleaned = cleanSourceLinkCandidate(value);
  if (!cleaned) return "";
  const youtubeId = getYouTubeVideoIdClient(cleaned);
  if (youtubeId) return `https://www.youtube.com/watch?v=${youtubeId}`;
  const withProtocol = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : (/^(?:www\.|[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i.test(cleaned) ? `https://${cleaned}` : cleaned);
  try {
    const url = new URL(withProtocol);
    if (!/^https?:$/i.test(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function uniqueSourceLinks(links) {
  const seenLinks = new Set();
  const seenYoutubeIds = new Set();
  const unique = [];
  (links || []).forEach(link => {
    const normalized = normalizeSourceLink(link);
    if (!normalized) return;
    const youtubeId = getYouTubeVideoIdClient(normalized);
    if (youtubeId) {
      if (seenYoutubeIds.has(youtubeId)) return;
      seenYoutubeIds.add(youtubeId);
      unique.push(`https://www.youtube.com/watch?v=${youtubeId}`);
      return;
    }
    if (seenLinks.has(normalized)) return;
    seenLinks.add(normalized);
    unique.push(normalized);
  });
  return unique;
}

function isYouTubeSourceUrl(url) {
  return Boolean(typeof getYouTubeVideoIdClient === "function" && getYouTubeVideoIdClient(url));
}

function youtubeSourceLinks(links) {
  return uniqueSourceLinks(links).filter(url => isYouTubeSourceUrl(url));
}

function primaryAnalysisSourceLinks(explicitLinks = uploadedLinks, parsedLinks = []) {
  // Keep explicit chip links the user added, but only promote YouTube URLs
  // that were discovered inside pasted text. Generic websites found in notes
  // should not become review/analysis sources.
  return uniqueSourceLinks([...(explicitLinks || []), ...youtubeSourceLinks(parsedLinks)]);
}

function isPrimarySourceReviewItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.blob || item.file) return true;
  const kind = String(item.kind || "").toLowerCase();
  if (["pdf", "presentation", "document", "image", "text", "note", "youtube"].includes(kind)) {
    return true;
  }
  const identity = String(item.sourceIdentity || item.source_identity || "");
  if (identity.startsWith("youtube:") || identity.startsWith("text:")) return true;
  if (isYouTubeSourceUrl(item.originalUrl || item.url || item.embedded_url || "")) return true;
  return false;
}

function extractSourceLinksClient(value) {
  const matches = String(value || "").match(SOURCE_LINK_CANDIDATE_PATTERN) || [];
  return uniqueSourceLinks(matches);
}

function renderLinkPreview() {
  if (!linkPreview) return;
  if (!uploadedLinks.length) {
    linkPreview.classList.add("d-none");
    linkPreview.innerHTML = "";
    return;
  }
  linkPreview.classList.remove("d-none");
  linkPreview.innerHTML = uploadedLinks.map((url, index) => {
    const isYoutube = Boolean(getYouTubeVideoIdClient(url));
    return `
      <div class="link-chip">
        <i class="bi ${isYoutube ? "bi-youtube" : "bi-link-45deg"}"></i>
        <span title="${escapeAttr(url)}">${escapeHTML(shorten(url, 68))}</span>
        <button type="button" onclick="removeLink(${index})" aria-label="Remove link">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
  }).join("");
}

function addLinksFromInput(value = null) {
  const source = value === null ? (linkInput?.value || "") : value;
  const links = extractSourceLinksClient(source);
  if (!links.length) {
    if (linkInput && String(source || "").trim()) {
      const wrap = linkInput.closest(".multi-link-input-wrap");
      wrap?.classList.add("invalid");
      window.setTimeout(() => wrap?.classList.remove("invalid"), 1200);
    }
    return;
  }
  uploadedLinks = uniqueSourceLinks([...uploadedLinks, ...links]);
  if (linkInput && value === null) linkInput.value = "";
  renderLinkPreview();
}

function removeLink(index) {
  uploadedLinks.splice(index, 1);
  renderLinkPreview();
}

function parseMixedSources(rawSource) {
  const text = String(rawSource || "").trim();
  const links = extractSourceLinksClient(text);

  return {
    links,
    freeText: removeDetectedUrlsClient(text)
  };
}

async function refundGenerationJobCredits(jobId, reason = "failed") {
  const job = typeof getGenerationJob === "function" ? getGenerationJob(jobId) : null;
  const spend = job?.request?.creditSpend;
  if (!spend || spend.refunded) return null;
  if (!window.SynapseAuth?.refundCredits) return null;
  try {
    const result = await window.SynapseAuth.refundCredits({
      dailyUsed: spend.dailyUsed,
      boostUsed: spend.boostUsed,
      amount: spend.charged
    });
    if (typeof upsertGenerationJob === "function") {
      upsertGenerationJob({
        jobId,
        request: {
          ...(job.request || {}),
          creditSpend: {
            ...spend,
            refunded: true,
            refundReason: reason
          }
        }
      });
    }
    if (typeof renderAccountMenu === "function") renderAccountMenu();
    return result;
  } catch (error) {
    console.warn("Synapse credit refund failed:", error);
    return null;
  }
}

async function analyzeMaterials() {
  return startGenerationJobFromCurrentUpload();
}

function generationSourceTitle(files = [], rawSource = "", sourceLinks = []) {
  const firstFile = files[0]?.name || "";
  if (firstFile && files.length > 1) return `${firstFile} + ${files.length - 1} more`;
  if (firstFile) return firstFile;
  if (sourceLinks.length) return shorten(sourceLinks[0], 68);
  const text = String(rawSource || "").trim().replace(/\s+/g, " ");
  return text ? shorten(text, 68) : "Study material";
}

async function startGenerationJobFromCurrentUpload() {
  const rawSource = sourceInput ? sourceInput.value.trim() : "";
  const parsedSources = parseMixedSources(rawSource);
  const sourceLinks = primaryAnalysisSourceLinks(uploadedLinks, parsedSources.links);
  const noteLengthSelect = document.getElementById("noteLength");

  if (uploadedFiles.length === 0 && !rawSource && !sourceLinks.length) {
    alert("Upload at least one file, link, video link, or text first.");
    return;
  }

  currentSourceFingerprint = await buildClientFingerprint(rawSource, sourceLinks);
  const existingJob = typeof findActiveGenerationJobByNoteId === "function"
    ? findActiveGenerationJobByNoteId(currentSourceFingerprint)
    : null;
  if (existingJob) {
    openGenerationJob(existingJob.jobId);
    updateGenerateButtonForCurrentJob();
    return existingJob;
  }

  const noteLengthValue = noteLengthSelect ? noteLengthSelect.value : "standard_notes";
  const creditAction = window.SynapseCredits?.creditActionForNoteLength?.(noteLengthValue) || "standard_notes";

  const launchJob = async (spend = null) => {
    const request = {
      rawSource,
      freeText: parsedSources.freeText,
      sourceLinks,
      uploadedLinks: [...uploadedLinks],
      fileNames: uploadedFiles.map(file => file.name || "Uploaded source"),
      hasFiles: uploadedFiles.length > 0,
      preferredLanguage: preferredLanguage ? preferredLanguage.value : "auto",
      detailLevel: detailLevel ? detailLevel.value : "auto",
      promptMode: promptMode ? promptMode.value : "professor_mode",
      noteLength: noteLengthValue,
      aiProvider: aiProvider ? normaliseAiProvider(aiProvider.value) : "",
      clientFingerprint: currentSourceFingerprint,
      creditAction,
      creditSpend: spend
        ? {
            charged: spend.charged,
            dailyUsed: spend.dailyUsed,
            boostUsed: spend.boostUsed,
            actionId: spend.actionId || creditAction
          }
        : null
    };
    const job = createGenerationJob({
      noteId: currentSourceFingerprint,
      classId: currentSourceFingerprint,
      sourceTitle: generationSourceTitle(uploadedFiles, rawSource, sourceLinks),
      request
    });
    openGenerationJob(job.jobId);
    setGenerateButtonForJob(job);
    enqueueGenerationJobRun(job.jobId, {
      ...request,
      parsedSources,
      files: [...uploadedFiles]
    });
    return job;
  };

  if (window.SynapseCredits?.withCreditReservation) {
    try {
      return await window.SynapseCredits.withCreditReservation(creditAction, launchJob, {
        confirmLabel: "Generate notes"
      });
    } catch (error) {
      if (String(error?.message || "").toLowerCase().includes("cancelled")) return null;
      alert(error?.message || "Could not start generation with credits.");
      return null;
    }
  }
  return launchJob(null);
}

