import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Brain, ExternalLink, FileText, GitBranch, LayoutList, Quote, Sparkles, Target } from "lucide-react";
import { ensureRenderableSummary } from "../../legacy/notesContent.js";
import { markdownToHTML, renderMath } from "../../legacy/markdownRenderer.js";
import { renderStudyNotesSurface, shouldCollapseSecondarySections } from "../../legacy/notesSurface.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { focusFlashcards, focusQuizQuestions } from "../utils.js";
import { GlassButton } from "./GlassButton.jsx";

const SECTION_GROUPS = [
  { label: "Generated Notes", matcher: /(generated|overview|introduction|learning question|main note|study note)/i },
  { label: "Key Concepts", matcher: /(key concept|core concept|main idea|key idea|concept|framework)/i },
  { label: "Definitions", matcher: /(definition|term|glossary|vocabulary)/i },
  { label: "Examples", matcher: /(example|application|case|scenario|worked)/i },
  { label: "Source Evidence", matcher: /(source|evidence|citation|study|reference|figure|data)/i },
  { label: "Revision Summary", matcher: /(revision|summary|takeaway|exam|review|remember)/i }
];

function cssEscapeValue(value) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(value);
  return String(value || "").replace(/["\\]/g, "\\$&");
}

function promptModeLabel(material) {
  if (material?.isSourceRestricted) return "Source-restricted";
  if (material?.promptMode === "research_mode") return "Research mode";
  if (material?.promptMode === "professor_mode") return "Professional Mode";
  return "Study notes";
}

function promptModeDescription(material) {
  if (material?.isSourceRestricted) {
    return "The tutor stays inside the uploaded source and tells you when the source is missing a point.";
  }
  if (material?.promptMode === "research_mode") {
    return "Notes can connect the uploaded material with extra outside research when needed.";
  }
  return "Notes emphasize explanation, structure, and exam-ready understanding from the current material.";
}

function groupedSections(material) {
  const titles = Object.keys(material?.sections || {}).filter(Boolean);
  const groups = SECTION_GROUPS.map(group => ({
    ...group,
    items: titles.filter(title => group.matcher.test(title))
  })).filter(group => group.items.length);

  const used = new Set(groups.flatMap(group => group.items));
  const remaining = titles.filter(title => !used.has(title));
  if (remaining.length) {
    groups.push({ label: "More Sections", matcher: /.*/, items: remaining });
  }
  if (!groups.length && material?.aiSummary) {
    groups.push({ label: "Generated Notes", matcher: /.*/, items: ["Full notes"] });
  }
  return groups;
}

function focusContext(material, activeSection, selectionText) {
  const title = String(activeSection || material?.studyHeadings?.[0] || "").trim();
  const sectionBody = title && material?.sections?.[title] ? String(material.sections[title]).trim() : "";
  const excerpt = String(selectionText || sectionBody || "").trim().slice(0, 1600);
  return {
    sectionTitle: title,
    excerpt
  };
}

function actionPrompt(action, material, context) {
  const target = context.sectionTitle
    ? `the section "${context.sectionTitle}"`
    : `the material "${material?.materialTitle || "this material"}"`;
  const excerpt = context.excerpt ? `\n\nFocus excerpt:\n${context.excerpt}` : "";

  if (action === "explain") {
    return `Explain ${target} more simply, step by step, using only the current material.${excerpt}`;
  }
  if (action === "summarize") {
    return `Summarise ${target} for exam revision using only the current material. Include the core claim, evidence, and likely mistake.${excerpt}`;
  }
  return "";
}

function SourceHighlightList({ highlights = [], activeId = "", onSelect }) {
  if (!highlights.length) {
    return <p className="focus-panel-empty">No source highlights are attached to this material yet.</p>;
  }

  return (
    <div className="focus-source-highlight-list">
      {highlights.map((highlight, index) => (
        <button
          className={`source-highlight ${highlight.id === activeId ? "is-active" : ""}`.trim()}
          key={highlight.id || `${highlight.title}-${index}`}
          type="button"
          onClick={() => onSelect?.(highlight, { openSources: false })}
        >
          <span className="source-highlight-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="source-highlight-copy">
            <strong>{highlight.title || highlight.sectionTitle || highlight.sourceLabel || `Source ${index + 1}`}</strong>
            <span>{highlight.excerpt || highlight.sourceLabel || "Open this evidence source."}</span>
          </span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function FocusMaterialContent({ mode = "materials", materials = [], status = "ready", error = "", onWorkspace }) {
  const material = useFocusRoomStore(state => state.selectedMaterial);
  const openStudyPanel = useFocusRoomStore(state => state.openStudyPanel);
  const askAssistant = useFocusRoomStore(state => state.askAssistant);
  const setAssistantContext = useFocusRoomStore(state => state.setAssistantContext);
  const activeSourceHighlight = useFocusRoomStore(state => state.activeSourceHighlight);
  const selectSourceHighlight = useFocusRoomStore(state => state.selectSourceHighlight);
  const setActiveNoteSection = useFocusRoomStore(state => state.setActiveNoteSection);
  const [activeSection, setActiveSection] = useState("");
  const [selectedExcerpt, setSelectedExcerpt] = useState("");
  const surfaceRef = useRef(null);

  useEffect(() => {
    if (!material) {
      setActiveSection("");
      setSelectedExcerpt("");
      return;
    }
    const firstSection = Object.keys(material.sections || {}).find(Boolean) || "";
    setActiveSection(firstSection);
    setActiveNoteSection(firstSection);
    setSelectedExcerpt("");
    selectSourceHighlight(material.sourceHighlights?.[0] || null, { openPanel: false });
  }, [material?.materialId, selectSourceHighlight, setActiveNoteSection]);

  const renderedSurface = useMemo(() => {
    if (!material) return "";
    const summary = ensureRenderableSummary(material.aiSummary, material.sections || {});
    const html = markdownToHTML(summary);
    return renderStudyNotesSurface(html, {
      promptMode: material.promptMode,
      collapseSecondary: shouldCollapseSecondarySections()
    });
  }, [material]);

  useEffect(() => {
    if (!renderedSurface) return;
    renderMath();
  }, [renderedSurface]);

  const sectionGroups = useMemo(() => groupedSections(material), [material]);
  const sourceHighlights = Array.isArray(material?.sourceHighlights) ? material.sourceHighlights : [];
  const selectedSourceHighlight = sourceHighlights.find(item => item.id === activeSourceHighlight?.id) || sourceHighlights[0] || null;
  const quizzes = focusQuizQuestions(material);
  const flashcards = focusFlashcards(material);

  const openMaterial = materialId => {
    const suffix = materialId ? `/${encodeURIComponent(materialId)}` : "";
    globalThis.location.hash = `#/focus-room${suffix}`;
  };

  const jumpToSection = title => {
    setActiveSection(title);
    setActiveNoteSection(title);
    setAssistantContext(focusContext(material, title, selectedExcerpt));
    const surface = surfaceRef.current;
    if (!surface || title === "Full notes") return;
    const selector = `[data-section-title="${cssEscapeValue(title)}"]`;
    surface.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const captureSelection = () => {
    const selection = String(globalThis.getSelection?.()?.toString?.() || "").trim();
    if (!selection) return;
    setSelectedExcerpt(selection.slice(0, 1600));
    setAssistantContext(focusContext(material, activeSection, selection));
  };

  const runAssistantAction = action => {
    const context = focusContext(material, activeSection, selectedExcerpt);
    setAssistantContext(context);
    openStudyPanel("chat");
    const prompt = actionPrompt(action, material, context);
    if (prompt) askAssistant(prompt);
  };

  const applySourceHighlight = (highlight, { openSources = false } = {}) => {
    if (!highlight) return;
    const nextExcerpt = String(highlight.excerpt || "").slice(0, 1600);
    setSelectedExcerpt(nextExcerpt);
    selectSourceHighlight(highlight, { openPanel: false });
    if (highlight.sectionTitle) {
      setActiveSection(highlight.sectionTitle);
      setActiveNoteSection(highlight.sectionTitle);
      const surface = surfaceRef.current;
      const selector = `[data-section-title="${cssEscapeValue(highlight.sectionTitle)}"]`;
      surface?.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setAssistantContext({
      sectionTitle: highlight.sectionTitle || activeSection,
      excerpt: nextExcerpt
    });
    if (openSources) openStudyPanel("sources");
  };

  const askAboutSource = highlight => {
    const target = highlight || selectedSourceHighlight;
    if (!target) return;
    applySourceHighlight(target);
    openStudyPanel("chat");
    askAssistant(`Explain this source evidence and how it supports the generated notes:\n\n${target.excerpt || target.title || target.sourceLabel}`);
  };

  const openSourceInWorkspace = (highlight = selectedSourceHighlight) => {
    const target = highlight || {};
    onWorkspace?.(material?.materialId || "", "source", {
      sourceId: target.sourceId || "",
      sourceIndex: target.sourceIndex || 0,
      sourceLabel: target.sourceLabel || "",
      sectionTitle: target.sectionTitle || activeSection || "",
      highlightId: target.id || "",
      excerpt: target.excerpt || ""
    });
  };

  if (!material && status === "loading") {
    return <p className="focus-panel-empty is-loading" role="status">Generating study materials...</p>;
  }
  if (!material && status === "error") {
    return <p className="focus-panel-empty is-error" role="alert">Unable to load materials. Try again. {error ? `(${error})` : ""}</p>;
  }
  if (!material) {
    return <p className="focus-panel-empty">No generated materials yet</p>;
  }

  const showMeta = mode === "materials";
  const showReader = mode !== "sources";
  const showSourceWorkbench = mode !== "notes";

  return (
    <section className={`study-tool-stack focus-material-layout focus-material-mode-${mode}`.trim()}>
      {showMeta ? (
      <article className="study-card liquid-glass-lite focus-material-meta">
        <div className="study-tool-head">
          <div>
            <span className="focus-kicker">Study Materials</span>
            <h3>{material.materialTitle || "Generated study notes"}</h3>
          </div>
          <label className="focus-field focus-material-select">
            Material
            <select value={material.materialId} onChange={event => openMaterial(event.target.value)}>
              {materials.map(item => (
                <option key={item.materialId} value={item.materialId}>{item.materialTitle || "Study material"}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="focus-material-badges">
          <span className="focus-pill"><Sparkles size={14} aria-hidden="true" /> {promptModeLabel(material)}</span>
          <span className="focus-pill"><LayoutList size={14} aria-hidden="true" /> {Object.keys(material.sections || {}).length || material.studyHeadings.length || 1} sections</span>
          <span className="focus-pill"><GitBranch size={14} aria-hidden="true" /> {sourceHighlights.length || material.sources?.length || material.sourceItems?.length || 0} sources</span>
        </div>

        <p className="focus-subtle-copy">{promptModeDescription(material)}</p>

        {material.isSourceRestricted ? (
          <div className="focus-source-banner">
            <strong>Source-restricted mode</strong>
            <span>Answers and summaries stay inside the uploaded material. When the source is missing something, Synapse says so directly.</span>
          </div>
        ) : null}

        <div className="focus-action-grid">
          <GlassButton variant="primary" onClick={() => runAssistantAction("explain")}><Brain size={16} aria-hidden="true" /> Explain this section</GlassButton>
          <GlassButton onClick={() => (quizzes.length ? openStudyPanel("quiz") : onWorkspace?.(material.materialId || "", "quiz"))}>Make quiz from this section</GlassButton>
          <GlassButton onClick={() => (flashcards.length ? openStudyPanel("flashcards") : onWorkspace?.(material.materialId || "", "flashcards"))}>Turn this into flashcards</GlassButton>
          <GlassButton onClick={() => (material.mindMap ? openStudyPanel("mindmap") : onWorkspace?.(material.materialId || "", "mindmap"))}>Create mind map from this section</GlassButton>
          <GlassButton onClick={() => runAssistantAction("summarize")}>Summarise for exam revision</GlassButton>
          <GlassButton onClick={() => openStudyPanel("notes")}><FileText size={16} aria-hidden="true" /> Read generated notes</GlassButton>
          <GlassButton onClick={() => openStudyPanel("sources")} disabled={!sourceHighlights.length}><Quote size={16} aria-hidden="true" /> Inspect sources</GlassButton>
        </div>
      </article>
      ) : null}

      <article className="study-card liquid-glass-lite focus-material-outline">
        <div className="study-tool-head">
          <div>
            <span className="focus-kicker">Section Map</span>
            <h3>Read inside the room</h3>
          </div>
          <span className="focus-pill"><FileText size={14} aria-hidden="true" /> Full content</span>
        </div>

        <div className="focus-section-groups">
          {sectionGroups.map(group => (
            <div className="focus-section-group" key={group.label}>
              <strong>{group.label}</strong>
              <div className="focus-section-chip-row">
                {group.items.map(title => (
                  <button
                    className={`focus-section-chip ${activeSection === title ? "is-active" : ""}`.trim()}
                    key={title}
                    type="button"
                    onClick={() => jumpToSection(title)}
                  >
                    <span>{title}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!!(material.sources?.length || material.sourceItems?.length) && (
          <div className="focus-source-list">
            {(material.sources?.length ? material.sources : material.sourceItems).slice(0, 6).map((item, index) => {
              const label = typeof item === "string"
                ? item
                : (item?.title || item?.name || item?.label || item?.url || `Source ${index + 1}`);
              return <span className="focus-pill" key={`${label}-${index}`}>{label}</span>;
            })}
          </div>
        )}

        {sourceHighlights.length ? (
          <div className="focus-source-highlight-strip" aria-label="Generated source highlights">
            <div className="study-tool-head compact">
              <div>
                <span className="focus-kicker">Source Highlights</span>
                <h3>Evidence you can jump to</h3>
              </div>
              <span className="focus-pill"><Quote size={14} aria-hidden="true" /> {sourceHighlights.length}</span>
            </div>
            <SourceHighlightList
              highlights={sourceHighlights.slice(0, mode === "sources" ? sourceHighlights.length : 5)}
              activeId={selectedSourceHighlight?.id || ""}
              onSelect={(highlight) => applySourceHighlight(highlight, { openSources: mode !== "sources" })}
            />
          </div>
        ) : null}
      </article>

      {showSourceWorkbench ? (
        <article className="study-card liquid-glass-lite focus-source-workbench">
          <div className="study-tool-head">
            <div>
              <span className="focus-kicker">Source Workbench</span>
              <h3>{selectedSourceHighlight?.sourceLabel || "Uploaded sources"}</h3>
            </div>
            <span className="focus-pill"><Target size={14} aria-hidden="true" /> Direct source</span>
          </div>
          {selectedSourceHighlight ? (
            <div className="focus-source-preview-card">
              <div className="focus-source-preview-meta">
                <span>{selectedSourceHighlight.sourceKind || "source"}</span>
                <strong>{selectedSourceHighlight.title || selectedSourceHighlight.sourceLabel}</strong>
                {selectedSourceHighlight.sectionTitle ? <button type="button" onClick={() => jumpToSection(selectedSourceHighlight.sectionTitle)}>Jump to {selectedSourceHighlight.sectionTitle}</button> : null}
              </div>
              <blockquote>{selectedSourceHighlight.excerpt || "No extracted excerpt is available for this source yet."}</blockquote>
              <div className="focus-button-row">
                <GlassButton variant="primary" onClick={() => askAboutSource(selectedSourceHighlight)}>
                  <Brain size={16} aria-hidden="true" /> Ask AI about this source
                </GlassButton>
                <GlassButton onClick={() => openSourceInWorkspace(selectedSourceHighlight)}>
                  <ExternalLink size={16} aria-hidden="true" /> Open source in workspace
                </GlassButton>
              </div>
            </div>
          ) : (
            <p className="focus-panel-empty">No source highlights are attached to this material yet. Open the workspace source viewer to restore previews for older notes.</p>
          )}
        </article>
      ) : null}

      {showReader ? (
      <article className="study-card liquid-glass-lite focus-material-reader">
        <div className="study-tool-head">
          <div>
            <span className="focus-kicker">Generated Notes</span>
            <h3>{activeSection || "Scrollable reading view"}</h3>
          </div>
          {selectedExcerpt ? <span className="focus-pill">Text selected for AI follow-up</span> : null}
        </div>
        {sourceHighlights.length ? (
          <div className="focus-reader-source-bar">
            {sourceHighlights.slice(0, 4).map((highlight, index) => (
              <button
                className={`source-highlight inline ${highlight.id === selectedSourceHighlight?.id ? "is-active" : ""}`.trim()}
                key={highlight.id || index}
                type="button"
                onClick={() => applySourceHighlight(highlight, { openSources: true })}
              >
                <Quote size={14} aria-hidden="true" />
                <span>{highlight.title || highlight.sourceLabel || `Source ${index + 1}`}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div
          ref={surfaceRef}
          className="focus-material-surface"
          onMouseUp={captureSelection}
          onKeyUp={captureSelection}
          dangerouslySetInnerHTML={{ __html: renderedSurface }}
        />
      </article>
      ) : null}
    </section>
  );
}
