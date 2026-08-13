async function runGenerationJobAnalysis(jobId, context = {}) {
  const job = getGenerationJob(jobId);
  if (!job) return;
  const request = job.request || {};
  const rawSource = context.rawSource ?? request.rawSource ?? "";
  const parsedSources = context.parsedSources || {
    links: Array.isArray(request.sourceLinks) ? request.sourceLinks : [],
    freeText: request.freeText || ""
  };
  const sourceLinks = typeof primaryAnalysisSourceLinks === "function"
    ? primaryAnalysisSourceLinks(
      Array.isArray(context.uploadedLinks) ? context.uploadedLinks : (request.uploadedLinks || []),
      Array.isArray(parsedSources.links) ? parsedSources.links : []
    )
    : uniqueSourceLinks(context.sourceLinks || request.sourceLinks || []);
  const files = Array.isArray(context.files) ? context.files : [];
  const outputLanguageSetting = context.preferredLanguage || request.preferredLanguage || "auto";
  const detailLevelValue = context.detailLevel || request.detailLevel || "auto";
  const promptModeValue = context.promptMode || request.promptMode || "professor_mode";
  const noteLengthValue = context.noteLength || request.noteLength || "standard_notes";
  const aiProviderValue = normaliseAiProvider(context.aiProvider || request.aiProvider || "");
  const previousUploadedFiles = uploadedFiles;
  const previousUploadedLinks = uploadedLinks;
  const previousHistoryId = currentHistoryId;
  uploadedFiles = files;
  uploadedLinks = Array.isArray(context.uploadedLinks) ? context.uploadedLinks : (request.uploadedLinks || []);
  currentSourceFingerprint = job.noteId || request.clientFingerprint || currentSourceFingerprint;
  upsertGenerationJob({
    jobId,
    status: "analysing",
    progress: 18,
    message: "Reading sources and preparing context"
  });
  const buildAnalyzeFormData = () => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("links", JSON.stringify(sourceLinks));
    formData.append("free_text", parsedSources.freeText);
    formData.append("preferred_language", outputLanguageSetting);
    formData.append("detail_level", detailLevelValue);
    formData.append("prompt_mode", promptModeValue);
    formData.append("note_length", noteLengthValue);
    formData.append("ai_provider", aiProviderValue);
    formData.append("client_fingerprint", currentSourceFingerprint);
    return formData;
  };

  try {
    const abortController = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (abortController) runtimeGenerationJobControllers.set(jobId, abortController);
    upsertGenerationJob({
      jobId,
      status: "analysing",
      progress: 26,
      message: "Connecting to Synapse and preparing your workspace"
    });
    await apiClient.warmup({
      signal: abortController?.signal,
      attempts: 16,
      retryDelayMs: 5000,
      timeoutMs: 75000,
      maxWaitMs: 90000
    });
    upsertGenerationJob({
      jobId,
      status: "generating",
      progress: 34,
      message: "Generating tutor-style study notes"
    });
    let keepAliveId = null;
    if (typeof window !== "undefined" && window.setInterval) {
      keepAliveId = window.setInterval(() => {
        apiClient.fetch("/healthz", { method: "GET", timeoutMs: 12000 }).catch(() => {});
      }, 25000);
    }
    let response;
    try {
      response = await apiClient.fetchWithRetry("/analyze", () => ({
        method: "POST",
        body: buildAnalyzeFormData(),
        timeoutMs: ANALYSIS_TIMEOUT_MS,
        signal: abortController?.signal
      }), {
        attempts: 4,
        retryDelayMs: 4000,
        retryOnConnectionError: true,
        onRetry: ({ attempt, totalAttempts, reason }) => {
          upsertGenerationJob({
            jobId,
            status: "generating",
            progress: Math.min(48, 34 + attempt * 3),
            message: `Hosted service interrupted (${reason}). Retrying analysis ${attempt + 1}/${totalAttempts}…`
          });
        }
      });
    } catch (error) {
      if (error?.name === "ApiConnectionError" && error.code !== "cancelled" && error.code !== "timeout") {
        throw new Error(
          typeof apiClient.analysisInterruptedMessage === "function"
            ? apiClient.analysisInterruptedMessage()
            : error.message
        );
      }
      throw error;
    } finally {
      if (keepAliveId) window.clearInterval(keepAliveId);
    }

    let data = null;
    try {
      const contentType = response.headers?.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        const body = await response.text().catch(() => "");
        const preview = body ? ` Response preview: ${shorten(body.replace(/\s+/g, " "), 180)}` : "";
        throw new Error(
          `Backend returned ${contentType || "non-JSON"} from ${response.url || apiClient.endpoint("/analyze")} (HTTP ${response.status}). Make sure the Python backend is running at ${apiClient.baseUrl}.${preview}`
        );
      }
      data = await response.json();
    } catch (error) {
      throw new Error(error?.message || "Backend returned non-JSON response. Check the Python terminal.");
    }

    if (!response.ok || data.error) {
      throw new Error(data.error || `Analysis failed with status ${response.status}.`);
    }

    const outputLanguage = outputLanguageSetting;
    fullSummary = removeAutoBilingualHeadings(data.summary || "", outputLanguage);
    storedTitle = data.title || makeHistoryTitle(fullSummary) || "Study Notes";
    sections = cleanAutoLanguageSectionTitles(hydrateSectionsFromSummary(data.sections || {}, fullSummary), fullSummary, outputLanguage);
    fullSummary = ensureRenderableSummary(fullSummary, sections);
    connectionsData = data.connections || [];
    currentMindMap = data.mind_map || data.mindMap || data.brainstorm || null;
    visualGalleryData = normalizeLearningFigures(data.visual_gallery || data.source_evidence_cards || data.figure_cards || data.visuals || []);
    fullSummary = pruneUnavailableVisualMarkers(fullSummary, visualGalleryData);
    sections = Object.fromEntries(Object.entries(sections).map(([title, markdown]) => [
      title,
      pruneUnavailableVisualMarkers(markdown, visualGalleryData)
    ]));
    currentPrimarySourceIdentity = data.primary_source_identity || data.source_identity || "";
    currentPromptMode = data.prompt_mode || promptModeValue;
    currentPromptModeLabel = data.prompt_mode_label || "";
    currentAiGeneration = normaliseAiGenerationDiagnostics(data.ai_generation || null);
    if (currentAiGeneration?.fallbackUsed) {
      throw new Error(
        "AI generation did not complete. Synapse rejected local fallback notes; fix the selected provider and retry."
      );
    }
    currentHistoryId = "";
    resetTimelineState();
    resetVisualGuideState();
    resetQuizState();
    resetFlashcardState();
    resetVoiceTutorState();
    activeMindBranchIndex = 0;
    activeMindPointIndex = 0;
    activeMindChildIndex = -1;
    mindDetailPopupOpen = false;
    collapsedMindBranches = new Set();
    currentSourceFingerprint = data.source_fingerprint || currentSourceFingerprint;
    await buildCurrentSourceItems(rawSource, data.sources || []);
    console.info("Synapse adaptive depth", {
      depth: data.generation_depth || data.detail_level,
      label: data.depth_label,
      reason: data.depth_reason,
      promptMode: data.prompt_mode || promptModeValue,
      noteLength: data.note_length || noteLengthValue,
      aiProvider: data.ai_provider || aiProviderValue,
      aiGeneration: currentAiGeneration,
      cached: Boolean(data.cached)
    });

    const shouldPresentJobResult = isGenerationJobSelected(jobId);
    if (shouldPresentJobResult) {
      // Keep the completed job panel visible briefly; content is prepared in the
      // background so the auto-reveal can open notes without a blank flash.
      renderSections();
      renderConnections();
      switchTool("mindmap");
      renderMindMap(currentMindMap);
      renderVisualGallery();
    }
    let dataApiRecord = null;
    if (typeof persistGeneratedContentToDataApi === "function") {
      try {
        dataApiRecord = await persistGeneratedContentToDataApi({
          ...data,
          title: data.title || storedTitle,
          summary: fullSummary,
          sections,
          connections: connectionsData,
          mind_map: currentMindMap,
          visual_gallery: compactVisualGalleryForStorage(visualGalleryData),
          visuals: compactVisualGalleryForStorage(visualGalleryData),
          sources: data.sources || [],
          source_fingerprint: data.source_fingerprint || currentSourceFingerprint,
          client_fingerprint: currentSourceFingerprint,
          output_language: data.output_language || outputLanguage
        });
      } catch (error) {
        console.warn("Synapse data API save failed after analysis:", {
          error,
          title: storedTitle,
          sourceFingerprint: currentSourceFingerprint
        });
        dataApiRecord = null;
      }
    }
    const savedEntry = saveHistoryEntry({
      title: data.title || null,
      summary: fullSummary,
      sections,
      connections: connectionsData,
      mindMap: currentMindMap,
      // Store only compact browser-safe visual metadata. Large base64 images are
      // filtered out by compactVisualGalleryForStorage before localStorage write.
      visualGallery: compactVisualGalleryForStorage(visualGalleryData),
      language: data.output_language || outputLanguage,
      detailLevel: data.detail_level || data.generation_depth || "auto",
      depthLabel: data.depth_label || data.generation_depth || data.detail_level || "Auto",
      depthReason: data.depth_reason || "",
      promptMode: data.prompt_mode || promptModeValue,
      promptModeLabel: data.prompt_mode_label || "",
      noteLength: data.note_length || noteLengthValue,
      noteLengthLabel: data.note_length_label || "",
      aiProvider: data.ai_provider || aiProviderValue,
      aiGeneration: currentAiGeneration,
      sourceFingerprint: data.source_fingerprint || currentSourceFingerprint,
      clientFingerprint: currentSourceFingerprint,
      primarySourceIdentity: data.primary_source_identity || data.source_identity || "",
      sources: data.sources || [],
      sourceItems: compactSourceItemsForHistory(sourceViewerItems),
      visualGalleryCount: visualGalleryData.length,
      databaseRecord: dataApiRecord || data.database_record || null,
      cached: Boolean(data.cached)
    });
    if (savedEntry && savedEntry.id) {
      currentHistoryId = savedEntry.id;
      safeSetLocalStorage(ACTIVE_HISTORY_KEY, savedEntry.id);
      if (typeof recordStudyActivity === "function") recordStudyActivity("notes_ready", {
        tool: "notes",
        label: `Generated notes with ${Object.keys(sections || {}).length} sections`,
        metadata: { sectionCount: Object.keys(sections || {}).length, cached: Boolean(data.cached) }
      });
      upsertGenerationJob({
        jobId,
        status: "completed",
        progress: 100,
        message: "Study notes are ready",
        resultId: savedEntry.id,
        completedAt: new Date().toISOString(),
        error: ""
      });
      await saveVisualGalleryAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint, visualGalleryData);
      await saveSourceAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint, sourceViewerItems);
      if (!visualGalleryData.length) {
        const restoredVisuals = await loadVisualGalleryAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint);
        if (restoredVisuals.length) {
          visualGalleryData = normalizeLearningFigures(restoredVisuals);
          renderVisualGallery();
        }
      }
    }
    if (shouldPresentJobResult) {
      loadTimelineForCurrentNote();
      loadVisualGuideForCurrentNote();
      loadQuizHistoryForCurrentNote();
      loadFlashcardsForCurrentNote();
      loadTutorChatHistoryForCurrentNote();
      loadVoiceTutorHistoryForCurrentNote();
      renderMasteryGraphPanel();
      renderFullNotes();
      requestAnimationFrame(() => renderMindMap(currentMindMap));
    } else if (previousHistoryId && getHistory().some(item => item.id === previousHistoryId)) {
      await loadHistoryEntry(previousHistoryId, { preserveScroll: true });
    }
  } catch (error) {
    console.error(error);
    const wasCancelled = getGenerationJob(jobId)?.status === "cancelled";
    if (!wasCancelled) {
      if (typeof refundGenerationJobCredits === "function") {
        await refundGenerationJobCredits(jobId, "failed").catch(() => {});
      }
      upsertGenerationJob({
        jobId,
        status: "failed",
        progress: 100,
        message: "Generation failed",
        error: error.message || "Synapse could not generate this note."
      });
      if (isGenerationJobSelected(jobId)) {
        renderGenerationJobProgress(jobId);
      }
    }
  } finally {
    uploadedFiles = previousUploadedFiles;
    uploadedLinks = previousUploadedLinks;
    updateGenerateButtonForCurrentJob();
  }
}

