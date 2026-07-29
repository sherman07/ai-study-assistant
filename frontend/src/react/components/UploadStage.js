import { NOTE_LENGTH_OPTIONS, PROMPT_MODE_OPTIONS } from "../constants.js";
import { h, icon, legacyAction } from "../runtime.js";
import { LanguageSelect } from "./LanguageOptions.js?v=react-shell-v2";

function promptModeOptions() {
  return PROMPT_MODE_OPTIONS.map(([value, label]) =>
    h("option", { key: value, value }, label)
  );
}

function promptModeDescription(value) {
  const option = PROMPT_MODE_OPTIONS.find(([mode]) => mode === value) || PROMPT_MODE_OPTIONS[0];
  return option?.[2] || "";
}

function noteLengthOptions() {
  return NOTE_LENGTH_OPTIONS.map(([value, label]) =>
    h("option", { key: value, value }, label)
  );
}

export function UploadStage() {
  return h(
    "section",
    { id: "uploadStage", className: "upload-stage" },
    h(
      "div",
      { className: "hero-copy text-center" },
      h("div", { className: "brand-pill mx-auto mb-4" }, icon("bi-stars"), "AI Academic Tutor"),
      h(
        "div",
        { className: "workspace-surface-badge workspace-surface-badge--materials mx-auto", "data-workspace-kind": "materials" },
        icon("bi-collection"),
        h("span", null, "Materials")
      ),
      h("h1", null, "Study Smarter"),
      h("p", null, "Your private tutor for readings, notes, images, and links.")
    ),
    h(
      "div",
      { className: "companion-launch-row" },
      h(
        "button",
        {
          type: "button",
          className: "btn btn-outline-primary companion-launch-btn",
          onClick: legacyAction("setLearningExperienceMode", "companion"),
        },
        icon("bi-chat-heart", "me-2"),
        "Start with AI tutor"
      )
    ),
    h(
      "section",
      { className: "premium-upload-card" },
      h(
        "div",
        {
          id: "dropZone",
          className: "drop-zone",
          tabIndex: 0,
          role: "button",
          "aria-label": "Upload area — drop files or click to browse",
        },
        h("input", {
          id: "assetUpload",
          className: "visually-hidden",
          type: "file",
          multiple: true,
          accept: ".pdf,.txt,.md,.docx,.pptx,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.mp4,.webm,image/*,audio/*,video/*,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }),
        h("div", { className: "upload-icon-wrap" }, icon("bi-cloud-arrow-up")),
        h("h2", null, "Upload your study material"),
        h("p", null, "Drop PDFs, slides, images, audio, video, notes, or documents here. Add links below if your source is online."),
        h(
          "div",
          { className: "upload-guidance", "aria-label": "Upload steps" },
          h("span", null, icon("bi-1-circle"), "Choose"),
          h("span", null, icon("bi-2-circle"), "Confirm"),
          h("span", null, icon("bi-3-circle"), "Analyze")
        ),
        h(
          "button",
          {
            type: "button",
            className: "btn btn-primary btn-lg upload-browse-btn",
            onClick: legacyAction("openFilePicker"),
          },
          icon("bi-plus-lg", "me-2"),
          "Select files"
        )
      ),
      h(
        "div",
        { id: "uploadStatus", className: "upload-status", role: "status", "aria-live": "polite" },
        icon("bi-info-circle"),
        h("span", null, "Choose a file to begin. Your files stay visible here until you analyze them.")
      ),
      h("div", { id: "filePreview", className: "file-preview d-none" }),
      h(
        "div",
        { className: "source-box" },
        h("label", { htmlFor: "linkInput", className: "form-label" }, "Add online sources"),
        h(
          "div",
          { className: "multi-link-adder" },
          h(
            "div",
            { className: "multi-link-input-wrap" },
            icon("bi-link-45deg"),
            h("input", {
              id: "linkInput",
              className: "multi-link-input",
              type: "text",
              placeholder: "Paste one or many links, then press Enter or Add",
            })
          ),
          h(
            "button",
            {
              id: "addLinkBtn",
              className: "btn btn-outline-primary multi-link-add-btn",
              type: "button",
              onClick: legacyAction("addLinksFromInput"),
            },
            icon("bi-plus-lg"),
            "Add"
          )
        ),
        h("div", { id: "linkPreview", className: "link-preview d-none", "aria-live": "polite" }),
        h(
          "p",
          { className: "source-helper source-helper-tight" },
          "Supports multiple YouTube, webpage, video, and article links. Paste links separated by spaces, commas, or new lines."
        ),
        h("label", { htmlFor: "sourceInput", className: "form-label mt-3" }, "Optional pasted notes or mixed source text"),
        h(
          "div",
          { className: "source-input-wrap" },
          h(
            "div",
            { className: "source-hints" },
            h("span", null, icon("bi-youtube"), " YouTube link"),
            h("span", null, "/"),
            h("span", null, icon("bi-link-45deg"), " Web URL"),
            h("span", null, "/"),
            h("span", null, icon("bi-camera-video"), " Video link"),
            h("span", null, "/"),
            h("span", null, icon("bi-file-text"), " Free text")
          ),
          h("textarea", {
            id: "sourceInput",
            className: "source-input",
            rows: 5,
            placeholder: "Paste extra notes here, or paste links directly if you do not want to add them one by one...",
          })
        ),
        h(
          "p",
          { className: "source-helper" },
          "YouTube links pasted here or found inside uploaded PDFs/PPTs are expanded into transcript sources for analysis."
        )
      ),
      h(
        "div",
        { className: "language-box" },
        h("label", { htmlFor: "preferredLanguage", className: "form-label" }, "Preferred output language"),
        h(
          "p",
          { className: "language-note" },
          "Choose the language for notes, explanations, image guides, flashcards, and quizzes. Brand names such as Synapse stay unchanged."
        ),
        h(LanguageSelect, {
          id: "preferredLanguage",
          className: "language-select",
          ariaLabel: "Preferred output language",
        })
      ),
      h("input", { type: "hidden", id: "detailLevel", value: "auto", readOnly: true }),
      // Provider is chosen in Account → Settings → Study defaults (kept as a hidden field for analyze payloads).
      h("input", { type: "hidden", id: "aiProvider", value: "", readOnly: true }),
      h(
        "div",
        { className: "language-box prompt-mode-box" },
        h("label", { htmlFor: "promptMode", className: "form-label" }, "Prompt mode"),
        h(
          "p",
          { className: "language-note" },
          "Choose the response style Synapse should use for the generated notes."
        ),
        h(
          "select",
          {
            id: "promptMode",
            className: "language-select prompt-mode-select",
            "aria-label": "Prompt mode",
            defaultValue: "professor_mode",
          },
          promptModeOptions()
        ),
        h(
          "p",
          { id: "promptModeDescription", className: "language-note compact-note" },
          promptModeDescription("professor_mode")
        )
      ),
      h(
        "div",
        { id: "noteLengthField", className: "language-box prompt-mode-box note-length-box" },
        h("label", { htmlFor: "noteLength", className: "form-label" }, "AI study depth"),
        h(
          "p",
          { className: "language-note" },
          "Choose how deeply Synapse studies and explains the uploaded material. This controls content depth, not a fixed word count."
        ),
        h(
          "select",
          {
            id: "noteLength",
            className: "language-select prompt-mode-select",
            "aria-label": "AI study depth",
            defaultValue: "standard_notes",
          },
          noteLengthOptions()
        ),
        h(
          "p",
          { id: "noteLengthDescription", className: "language-note compact-note" },
          "Standard Notes gives a balanced study depth for revision."
        )
      ),
      h(
        "button",
        {
          id: "generateBtn",
          type: "button",
          className: "btn btn-primary btn-lg w-100 generate-btn",
          onClick: legacyAction("analyzeMaterials"),
        },
        icon("bi-stars", "me-2"),
        "Analyze with Synapse"
      )
    )
  );
}
