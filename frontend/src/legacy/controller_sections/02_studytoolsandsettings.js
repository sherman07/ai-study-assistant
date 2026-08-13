async function translateCurrentNotes(targetLanguage) {
  const language = String(targetLanguage || "").trim();
  if (!language) return;
  if (!fullSummary.trim()) {
    alert("Generate notes before translating.");
    if (notesTranslateLanguage) notesTranslateLanguage.value = "";
    return;
  }

  const previousLabel = notesTranslateLanguage?.options?.[notesTranslateLanguage.selectedIndex]?.textContent || "Translate";
  if (notesTranslateLanguage) notesTranslateLanguage.disabled = true;
  if (downloadNotesBtn) downloadNotesBtn.disabled = true;

  try {
    const response = await apiClient.fetch("/translate-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: fullSummary,
        sections,
        title: storedTitle,
        target_language: language
      })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.error) {
      throw new Error(data?.error || `Translation failed with status ${response.status}.`);
    }

    fullSummary = data.summary || fullSummary;
    storedTitle = data.title || storedTitle;
    sections = cleanAutoLanguageSectionTitles(hydrateSectionsFromSummary(data.sections || {}, fullSummary), fullSummary, language);
    fullSummary = ensureRenderableSummary(fullSummary, sections);
    selectedSection = "";
    renderSections();
    renderFullNotes();

    const savedEntry = saveHistoryEntry({
      title: storedTitle,
      summary: fullSummary,
      sections,
      connections: connectionsData,
      mindMap: currentMindMap,
      visualGallery: compactVisualGalleryForStorage(visualGalleryData),
      language,
      detailLevel: "translated",
      depthLabel: "Translated",
      promptMode: currentPromptMode || "professor_mode",
      promptModeLabel: currentPromptModeLabel || "",
      sourceFingerprint: currentSourceFingerprint,
      clientFingerprint: currentSourceFingerprint,
      primarySourceIdentity: currentPrimarySourceIdentity,
      sourceItems: compactSourceItemsForHistory(sourceViewerItems),
      visualGalleryCount: visualGalleryData.length,
      cached: false
    });
    if (savedEntry?.id) {
      currentHistoryId = savedEntry.id;
      safeSetLocalStorage(ACTIVE_HISTORY_KEY, savedEntry.id);
      await saveVisualGalleryAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint, visualGalleryData);
      await saveSourceAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint, sourceViewerItems);
    }
    if (typeof recordStudyActivity === "function") recordStudyActivity("notes_translated", {
      tool: "notes",
      label: `Translated notes to ${language}`,
      metadata: { language }
    });
  } catch (error) {
    console.error(error);
    alert(`Could not translate notes to ${previousLabel}: ${error.message}`);
  } finally {
    if (notesTranslateLanguage) {
      notesTranslateLanguage.disabled = false;
      notesTranslateLanguage.value = "";
    }
    if (downloadNotesBtn) downloadNotesBtn.disabled = false;
  }
}

function getToolPanelId(toolName) {
  const ids = {
    mindmap: "toolPanelMindMap",
    visualguide: "toolPanelVisualGuide",
    timeline: "toolPanelTimeline",
    masterygraph: "toolPanelMasteryGraph",
    quiz: "toolPanelQuiz",
    flashcards: "toolPanelFlashcards",
    broadcast: "toolPanelBroadcast"
  };
  return ids[toolName] || `toolPanel${toolName.charAt(0).toUpperCase()}${toolName.slice(1)}`;
}

const STUDY_TOOL_BUTTON_IDS = {
  mindmap: "toolBtnMindMap",
  visualguide: "toolBtnVisualGuide",
  timeline: "toolBtnTimeline",
  masterygraph: "toolBtnMasteryGraph",
  quiz: "toolBtnQuiz",
  flashcards: "toolBtnFlashcards",
  broadcast: "toolBtnBroadcast"
};

function switchTool(toolName, clickedBtn = null) {
  if (typeof persistStudyToolMemory === "function") persistStudyToolMemory();
  activeTool = toolName;
  if (typeof rememberActiveStudyTool === "function") rememberActiveStudyTool(toolName);
  if (typeof recordStudyActivity === "function") {
    const labels = {
      masterygraph: "Exam Readiness",
      visualguide: "Image Guide",
      broadcast: "AI Broadcast",
      timeline: "Study Path",
      flashcards: "Flashcards",
      quiz: "Quiz",
      mindmap: "Mind Map"
    };
    recordStudyActivity("tool_opened", { tool: toolName, label: `Opened ${labels[toolName] || "Study Tool"}` });
  }
  document.querySelectorAll(".tool-panel").forEach(panel => panel.classList.remove("active"));
  document.querySelectorAll(".tool-switch-btn").forEach(button => {
    if (!button.disabled) button.classList.remove("active");
  });

  const panel = document.getElementById(getToolPanelId(toolName));
  if (panel) panel.classList.add("active");

  const toolButton = clickedBtn && !clickedBtn.disabled
    ? clickedBtn
    : document.getElementById(STUDY_TOOL_BUTTON_IDS[toolName] || "");
  if (toolButton && !toolButton.disabled) toolButton.classList.add("active");

  if (toolName === "mindmap") {
    requestAnimationFrame(() => renderMindMap(currentMindMap));
  } else if (toolName === "visualguide") {
    renderVisualGuidePanel();
  } else if (toolName === "timeline") {
    renderTimelinePanel();
  } else if (toolName === "masterygraph") {
    renderMasteryGraphPanel();
  } else if (toolName === "quiz") {
    renderQuizPanel();
  } else if (toolName === "flashcards") {
    renderFlashcardPanel();
  } else if (toolName === "broadcast") {
    if (typeof renderCurrentBroadcastOrSetup === "function") renderCurrentBroadcastOrSetup();
    else renderBroadcastSetupPanel();
  }
  if (typeof syncStudyToolTabState === "function") syncStudyToolTabState(toolName);
}

const STUDY_TOOL_SETTINGS_STORAGE_KEY = "synapse.study-tool.settings.v1";
const STUDY_TOOL_SETTINGS_DEFAULTS = {
  mindmap: { layout: "tree", detail: "expanded" },
  visualguide: { language: "auto", style: "concept_board" },
  timeline: { language: "auto", pace: "balanced" },
  masterygraph: { reviewFilter: "due", priority: "weakest" }
};
const STUDY_TOOL_SETTINGS_META = {
  mindmap: {
    title: "Mind Map settings",
    description: "Choose how the knowledge tree is presented while you explore the current notes.",
    fields: [
      { key: "layout", label: "Map layout", help: "Tree keeps the full branch structure visible; compact focuses attention on the selected branch.", options: [["tree", "Knowledge tree"], ["compact", "Compact focus"]] },
      { key: "detail", label: "Detail density", help: "Choose whether points open with the full supporting detail or a lighter overview.", options: [["expanded", "Expanded detail"], ["focused", "Focused overview"]] }
    ]
  },
  visualguide: {
    title: "Image Guide settings",
    description: "Set the language and visual direction used when the guide is generated.",
    fields: [
      { key: "language", label: "Guide language", help: "The language used for labels and explanations in the generated image.", options: [["auto", "Auto-detect source language"], ["english", "English"], ["chinese", "Chinese"], ["bilingual", "Bilingual"]] },
      { key: "style", label: "Visual direction", help: "Choose the visual balance for the poster layout.", options: [["concept_board", "Concept board"], ["exam_revision", "Exam revision sheet"], ["process_story", "Process story"]] }
    ]
  },
  timeline: {
    title: "Study Path settings",
    description: "Tune the pace and language of the next guided revision sequence.",
    fields: [
      { key: "language", label: "Path language", help: "The language used for tasks, prompts, and mastery checks.", options: [["auto", "Auto-detect source language"], ["english", "English"], ["chinese", "Chinese"], ["bilingual", "Bilingual"]] },
      { key: "pace", label: "Revision pace", help: "A quick path is concise; a deep path adds more practice and explanation checkpoints.", options: [["quick", "Quick review"], ["balanced", "Balanced"], ["deep", "Deep study"]] }
    ]
  },
  masterygraph: {
    title: "Exam Readiness settings",
    description: "Choose which review queue opens first and how the readiness view prioritises topics.",
    fields: [
      { key: "reviewFilter", label: "Opening review queue", help: "This filter is selected when Exam Readiness opens.", options: [["due", "Due today"], ["missed", "Only missed"], ["all", "All topics"]] },
      { key: "priority", label: "Review priority", help: "Weakest-first surfaces the topics that need attention earliest.", options: [["weakest", "Weakest topics first"], ["balanced", "Balanced coverage"], ["recent", "Recently studied first"]] }
    ]
  }
};
let studyToolSettingsDraft = null;
let studyToolSettingsMemory = {};

function readStudyToolSettings() {
  const saved = safeReadJSONStorage(STUDY_TOOL_SETTINGS_STORAGE_KEY, {});
  const source = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  return Object.fromEntries(Object.entries(STUDY_TOOL_SETTINGS_DEFAULTS).map(([tool, defaults]) => ({
    [tool]: {
      ...defaults,
      ...(source[tool] && typeof source[tool] === "object" ? source[tool] : {}),
      ...(studyToolSettingsMemory[tool] && typeof studyToolSettingsMemory[tool] === "object" ? studyToolSettingsMemory[tool] : {})
    }
  })));
}

function getStudyToolSettings(toolName = "") {
  return readStudyToolSettings()[toolName] || {};
}

function openStudyToolSettingsModal(toolName = "") {
  const tool = String(toolName || "").trim().toLowerCase();
  if (tool === "quiz") {
    openQuizSettingsModal();
    return;
  }
  if (tool === "flashcards") {
    openFlashcardSettingsModal();
    return;
  }
  if (tool === "broadcast") {
    openAiBroadcastSetup();
    return;
  }
  const meta = STUDY_TOOL_SETTINGS_META[tool];
  if (!meta) return;
  studyToolSettingsDraft = { tool, values: { ...getStudyToolSettings(tool) } };
  document.getElementById("studyToolSettingsOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "studyToolSettingsOverlay";
  overlay.className = "visual-modal visual-modal-overlay study-tool-settings-overlay";
  overlay.innerHTML = `
    <div class="visual-modal-content settings-pattern-modal study-tool-settings-modal" role="dialog" aria-modal="true" aria-labelledby="studyToolSettingsTitle">
      <button class="visual-modal-close" type="button" aria-label="Close settings" onclick="closeStudyToolSettingsModal()"><i class="bi bi-x-lg"></i></button>
      <div class="settings-pattern-header">
        <span class="study-tool-settings-kicker">Study Tools</span>
        <h3 id="studyToolSettingsTitle">${escapeHTML(meta.title)}</h3>
        <p class="text-secondary">${escapeHTML(meta.description)}</p>
      </div>
      <div class="settings-pattern-body study-tool-settings-fields">
        ${meta.fields.map(field => `
          <label class="study-tool-settings-field" for="studyToolSetting-${escapeAttr(field.key)}">
            <span>${escapeHTML(field.label)}</span>
            <select id="studyToolSetting-${escapeAttr(field.key)}" class="form-select" onchange="updateStudyToolSettingDraft('${escapeAttr(field.key)}', this.value)">
              ${field.options.map(([value, label]) => `<option value="${escapeAttr(value)}" ${studyToolSettingsDraft.values[field.key] === value ? "selected" : ""}>${escapeHTML(label)}</option>`).join("")}
            </select>
            <small>${escapeHTML(field.help)}</small>
          </label>
        `).join("")}
      </div>
      <div class="settings-pattern-footer study-tool-settings-actions">
        <button class="btn btn-outline-secondary" type="button" onclick="closeStudyToolSettingsModal()">Cancel</button>
        <button class="btn btn-primary" type="button" onclick="saveStudyToolSettingsModal()"><i class="bi bi-check2 me-1"></i>Save settings</button>
      </div>
    </div>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeStudyToolSettingsModal();
  });
  document.body.appendChild(overlay);
}

function updateStudyToolSettingDraft(key, value) {
  if (!studyToolSettingsDraft) return;
  studyToolSettingsDraft.values[String(key || "")] = String(value || "");
}

function closeStudyToolSettingsModal() {
  document.getElementById("studyToolSettingsOverlay")?.remove();
  studyToolSettingsDraft = null;
}

function saveStudyToolSettingsModal() {
  if (!studyToolSettingsDraft) return;
  const overlay = document.getElementById("studyToolSettingsOverlay");
  if (overlay) {
    const meta = STUDY_TOOL_SETTINGS_META[studyToolSettingsDraft.tool];
    meta?.fields.forEach(field => {
      const input = overlay.querySelector(`#studyToolSetting-${CSS.escape(field.key)}`);
      if (input) studyToolSettingsDraft.values[field.key] = String(input.value || "");
    });
  }
  const saved = readStudyToolSettings();
  saved[studyToolSettingsDraft.tool] = { ...saved[studyToolSettingsDraft.tool], ...studyToolSettingsDraft.values };
  studyToolSettingsMemory[studyToolSettingsDraft.tool] = { ...saved[studyToolSettingsDraft.tool] };
  safeWriteJSONStorage(STUDY_TOOL_SETTINGS_STORAGE_KEY, saved);
  const { tool } = studyToolSettingsDraft;
  closeStudyToolSettingsModal();
  if (tool === "mindmap") {
    requestAnimationFrame(() => renderMindMap(currentMindMap));
  } else if (tool === "timeline") {
    renderTimelinePanel();
  } else if (tool === "masterygraph") {
    activeMemoryFilter = saved.masterygraph.reviewFilter || "due";
    renderMasteryGraphPanel();
  } else if (tool === "visualguide") {
    renderVisualGuidePanel();
  }
}

