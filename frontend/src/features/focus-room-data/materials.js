/** Focus Room material normalization, merge, and study-plan helpers. */
import {
  fetchGeneratedContentFromDataApi
} from "../../legacy/dataApiClient.js";
import {
  stripHTML,
  plainObject,
  arrayValue,
  compactString,
  clippedText
} from "./valueHelpers.js";

function titleFromSummary(summary) {
  const line = String(summary || "")
    .split(/\n+/)
    .map(item => item.replace(/^#+\s*/, "").trim())
    .find(item => item.length > 4);
  return line ? line.slice(0, 72) : "Generated Study Notes";
}

function sourceSafeId(value, fallback) {
  const raw = compactString(value || fallback);
  return raw
    .replace(/[^A-Za-z0-9:_%-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 180) || compactString(fallback);
}

function normalizeFocusRoomSourceItems(source = {}) {
  return [...arrayValue(source.sourceItems), ...arrayValue(source.sources)]
    .map((item, index) => {
      const object = typeof item === "string" ? { title: item, name: item } : plainObject(item);
      const label = compactString(
        object.title ||
        object.name ||
        object.displayName ||
        object.display_name ||
        object.label ||
        object.url ||
        object.originalUrl ||
        `Source ${index + 1}`
      );
      const id = sourceSafeId(
        object.id ||
        object.sourceId ||
        object.source_id ||
        object.sourceIdentity ||
        object.source_identity ||
        label,
        `source:${index + 1}`
      );
      return {
        ...object,
        id,
        index: Number(object.index || index + 1) || index + 1,
        label,
        title: label,
        kind: compactString(object.kind || object.type || "source") || "source",
        excerpt: clippedText(object.content || object.text || object.excerpt || object.summary || label, 520)
      };
    })
    .filter(item => item.id || item.label || item.excerpt);
}

function sourceItemForHighlight(sourceItems, highlight = {}) {
  const sourceId = compactString(highlight.sourceId || highlight.source_id || highlight.sourceIdentity || highlight.source_identity);
  if (sourceId) {
    const exact = sourceItems.find(item => item.id === sourceId || item.sourceIdentity === sourceId || item.source_identity === sourceId);
    if (exact) return exact;
  }

  const sourceIndex = Number(highlight.sourceIndex || highlight.source_index || highlight.index);
  if (Number.isFinite(sourceIndex) && sourceIndex > 0) {
    return sourceItems[sourceIndex - 1] || null;
  }

  const label = compactString(highlight.source || highlight.sourceLabel || highlight.source_label || highlight.reference);
  if (label) {
    return sourceItems.find(item => item.label === label || item.title === label || item.name === label) || null;
  }

  return sourceItems[0] || null;
}

function normalizeFocusRoomSourceHighlights(source = {}) {
  const sourceItems = normalizeFocusRoomSourceItems(source);
  const explicitHighlights = [
    ...arrayValue(source.sourceHighlights),
    ...arrayValue(source.source_highlights),
    ...arrayValue(source.evidenceHighlights),
    ...arrayValue(source.evidence_highlights),
    ...arrayValue(source.sourceMap),
    ...arrayValue(source.source_map),
    ...arrayValue(source.citations)
  ];

  const normalizedExplicit = explicitHighlights
    .map((item, index) => {
      const object = typeof item === "string" ? { excerpt: item, title: item } : plainObject(item);
      const sourceItem = sourceItemForHighlight(sourceItems, object);
      const sourceId = compactString(
        object.sourceId ||
        object.source_id ||
        object.sourceIdentity ||
        object.source_identity ||
        sourceItem?.id
      );
      const sectionTitle = compactString(
        object.sectionTitle ||
        object.section_title ||
        object.noteSection ||
        object.note_section ||
        object.section ||
        object.heading
      );
      const excerpt = clippedText(
        object.excerpt ||
        object.quote ||
        object.evidence ||
        object.sourceEvidence ||
        object.source_evidence ||
        object.text ||
        object.content ||
        object.summary,
        520
      );
      const title = compactString(
        object.title ||
        object.claim ||
        object.label ||
        sectionTitle ||
        sourceItem?.label ||
        `Source highlight ${index + 1}`
      );
      if (!title && !excerpt && !sourceId) return null;
      return {
        id: sourceSafeId(object.id || `${sourceId || title}:${index}`, `highlight:${index + 1}`),
        title,
        excerpt,
        sourceId,
        sourceIndex: Number(object.sourceIndex || object.source_index || sourceItem?.index || index + 1) || index + 1,
        sourceLabel: compactString(object.sourceLabel || object.source_label || object.source || sourceItem?.label || `Source ${index + 1}`),
        sourceKind: compactString(object.sourceKind || object.source_kind || sourceItem?.kind || "source") || "source",
        sectionTitle,
        kind: compactString(object.kind || "evidence") || "evidence"
      };
    })
    .filter(Boolean);

  if (normalizedExplicit.length) return normalizedExplicit.slice(0, 24);

  const sectionHighlights = Object.entries(plainObject(source.sections))
    .filter(([title, body]) => /(source|evidence|citation|reference|example|case|data)/i.test(title) && clippedText(body, 520))
    .slice(0, 8)
    .map(([title, body], index) => {
      const sourceItem = sourceItems[index] || sourceItems[0] || null;
      return {
        id: sourceSafeId(`${sourceItem?.id || "section"}:${title}:${index}`, `section-highlight:${index + 1}`),
        title,
        excerpt: clippedText(body, 520),
        sourceId: sourceItem?.id || "",
        sourceIndex: sourceItem?.index || index + 1,
        sourceLabel: sourceItem?.label || "Generated notes",
        sourceKind: sourceItem?.kind || "notes",
        sectionTitle: title,
        kind: "section"
      };
    });

  if (sectionHighlights.length) return sectionHighlights;

  return sourceItems
    .filter(item => item.excerpt || item.label)
    .slice(0, 12)
    .map((item, index) => ({
      id: sourceSafeId(`${item.id}:fallback:${index}`, `source-highlight:${index + 1}`),
      title: item.label || `Source ${index + 1}`,
      excerpt: item.excerpt || item.label,
      sourceId: item.id,
      sourceIndex: item.index || index + 1,
      sourceLabel: item.label || `Source ${index + 1}`,
      sourceKind: item.kind || "source",
      sectionTitle: "",
      kind: "source"
    }));
}

function materialTimestamp(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function headingsFromMaterial(source) {
  const sectionKeys = source?.sections && typeof source.sections === "object"
    ? Object.keys(source.sections).filter(Boolean)
    : [];
  if (sectionKeys.length) return sectionKeys.slice(0, 8);

  return String(source?.summary || source?.aiSummary || "")
    .split("\n")
    .map(line => line.match(/^#{1,4}\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function materialDatabaseRecord(source = {}) {
  const direct = source.databaseRecord || source.database_record;
  if (direct && typeof direct === "object") return direct;

  const id = compactString(source.generatedContentId || source.generated_content_id || source.id);
  if (!id) return null;
  return {
    id,
    source_fingerprint: source.source_fingerprint || source.sourceFingerprint || "",
    created_at: source.created_at || source.createdAt || "",
    updated_at: source.updated_at || source.updatedAt || ""
  };
}

function normalizeFocusRoomMaterial(source = {}) {
  if (!source || typeof source !== "object") {
    source = {};
  }

  const databaseRecord = materialDatabaseRecord(source);
  const materialId = compactString(
    source.materialId ||
    source.id ||
    source.historyId ||
    source.generatedContentId ||
    source.generated_content_id ||
    databaseRecord?.id ||
    source.sourceFingerprint ||
    source.source_fingerprint ||
    "current-material"
  );
  const aiSummary = String(source.aiSummary || source.summary || source.fullSummary || "");
  const materialTitle = String(source.materialTitle || source.title || titleFromSummary(aiSummary));
  const sourceFingerprint = compactString(source.sourceFingerprint || source.source_fingerprint || source.clientFingerprint || source.client_fingerprint);
  const clientFingerprint = compactString(source.clientFingerprint || source.client_fingerprint || sourceFingerprint);
  const sections = plainObject(source.sections);
  const promptMode = compactString(source.promptMode || source.prompt_mode) || "professor_mode";
  const detailLevel = compactString(source.detailLevel || source.detail_level);
  const flashcards = arrayValue(source.flashcards || source.cards);
  const quizzes = arrayValue(source.quizzes || source.quizHistory);
  const studyPlan = arrayValue(source.studyPlan || source.timeline?.events || source.study_path);
  const progressHistory = arrayValue(source.progressHistory);
  const visualGallery = arrayValue(source.visualGallery || source.visual_gallery || source.visuals);
  const sources = arrayValue(source.sources);
  const sourceItems = arrayValue(source.sourceItems);
  const sourceHighlights = normalizeFocusRoomSourceHighlights({ ...source, sources, sourceItems, sections });
  const mindMap = source.mindMap || source.mind_map || source.brainstorm || null;
  const uploadedContent = source.uploadedContent || source.sourceText || source.source_text || "";
  const connections = arrayValue(source.connections);
  const createdAt = source.createdAt || source.created_at || "";
  const updatedAt = source.updatedAt || source.updated_at || createdAt;
  const summaryText = stripHTML(aiSummary);

  return {
    materialId,
    materialTitle,
    materialType: source.materialType || source.type || "Generated notes",
    uploadedContent,
    aiSummary,
    summaryText,
    sections,
    studyHeadings: headingsFromMaterial(source),
    flashcards,
    quizzes,
    mindMap,
    studyPlan,
    progressHistory,
    connections,
    visualGallery,
    visualGalleryCount: Number(source.visualGalleryCount || visualGallery.length || 0),
    sources,
    sourceItems,
    sourceHighlights,
    promptMode,
    detailLevel,
    isSourceRestricted: promptMode === "source_strict_research_mode",
    sourceFingerprint,
    clientFingerprint,
    databaseRecord,
    cached: Boolean(source.cached),
    createdAt,
    updatedAt
  };
}

function materialIdentityKeys(material = {}) {
  const keys = [];
  const materialId = compactString(material.materialId);
  const sourceFingerprint = compactString(material.sourceFingerprint);
  const clientFingerprint = compactString(material.clientFingerprint);
  const databaseId = compactString(material.databaseRecord?.id || material.generatedContentId || material.generated_content_id);

  if (materialId) keys.push(`id:${materialId}`);
  if (databaseId) keys.push(`db:${databaseId}`);
  if (sourceFingerprint) keys.push(`fp:${sourceFingerprint}`);
  if (clientFingerprint) keys.push(`cf:${clientFingerprint}`);
  return [...new Set(keys)];
}

function mergeFocusRoomMaterial(baseMaterial = {}, incomingMaterial = {}) {
  const base = normalizeFocusRoomMaterial(baseMaterial);
  const incoming = normalizeFocusRoomMaterial(incomingMaterial);
  const incomingSections = plainObject(incoming.sections);
  const baseSections = plainObject(base.sections);
  const incomingSummary = compactString(incoming.aiSummary);
  const baseSummary = compactString(base.aiSummary);
  const mergedSummary = incomingSummary || baseSummary;

  return {
    ...base,
    ...incoming,
    materialId: base.materialId || incoming.materialId,
    materialTitle: incoming.materialTitle || base.materialTitle || "Generated Study Notes",
    materialType: incoming.materialType || base.materialType || "Generated notes",
    uploadedContent: incoming.uploadedContent || base.uploadedContent || "",
    aiSummary: mergedSummary,
    summaryText: stripHTML(mergedSummary),
    sections: Object.keys(incomingSections).length ? incomingSections : baseSections,
    studyHeadings: incoming.studyHeadings.length ? incoming.studyHeadings : base.studyHeadings,
    flashcards: incoming.flashcards.length ? incoming.flashcards : base.flashcards,
    quizzes: incoming.quizzes.length ? incoming.quizzes : base.quizzes,
    mindMap: incoming.mindMap || base.mindMap || null,
    studyPlan: incoming.studyPlan.length ? incoming.studyPlan : base.studyPlan,
    progressHistory: incoming.progressHistory.length ? incoming.progressHistory : base.progressHistory,
    connections: incoming.connections.length ? incoming.connections : base.connections,
    visualGallery: incoming.visualGallery.length ? incoming.visualGallery : base.visualGallery,
    visualGalleryCount: incoming.visualGallery.length
      ? incoming.visualGallery.length
      : Number(base.visualGalleryCount || base.visualGallery.length || 0),
    sources: incoming.sources.length ? incoming.sources : base.sources,
    sourceItems: incoming.sourceItems.length ? incoming.sourceItems : base.sourceItems,
    sourceHighlights: incoming.sourceHighlights.length ? incoming.sourceHighlights : base.sourceHighlights,
    promptMode: incoming.promptMode || base.promptMode || "professor_mode",
    detailLevel: incoming.detailLevel || base.detailLevel || "",
    isSourceRestricted: incoming.isSourceRestricted || base.isSourceRestricted,
    sourceFingerprint: incoming.sourceFingerprint || base.sourceFingerprint || "",
    clientFingerprint: incoming.clientFingerprint || base.clientFingerprint || incoming.sourceFingerprint || base.sourceFingerprint || "",
    databaseRecord: incoming.databaseRecord || base.databaseRecord || null,
    cached: incoming.cached || base.cached,
    createdAt: base.createdAt || incoming.createdAt || "",
    updatedAt: materialTimestamp(incoming.updatedAt) >= materialTimestamp(base.updatedAt)
      ? incoming.updatedAt
      : base.updatedAt
  };
}

function mergeFocusRoomMaterials(...lists) {
  const items = lists.flatMap(list => arrayValue(list));
  const merged = [];
  const indexByKey = new Map();

  items
    .map(normalizeFocusRoomMaterial)
    .filter(item => item.materialId || item.aiSummary)
    .forEach(item => {
      const keys = materialIdentityKeys(item);
      const existingIndex = keys.reduce((match, key) => (
        match >= 0 ? match : (indexByKey.has(key) ? indexByKey.get(key) : -1)
      ), -1);

      if (existingIndex >= 0) {
        const next = mergeFocusRoomMaterial(merged[existingIndex], item);
        merged[existingIndex] = next;
        materialIdentityKeys(next).forEach(key => indexByKey.set(key, existingIndex));
        return;
      }

      const nextIndex = merged.push(item) - 1;
      keys.forEach(key => indexByKey.set(key, nextIndex));
    });

  return merged.sort((left, right) => (
    materialTimestamp(right.updatedAt || right.createdAt) - materialTimestamp(left.updatedAt || left.createdAt)
  ));
}

function getLegacyMaterials() {
  if (typeof globalThis.getSynapseFocusRoomMaterials === "function") {
    const materials = globalThis.getSynapseFocusRoomMaterials();
    return Array.isArray(materials) ? materials.map(normalizeFocusRoomMaterial) : [];
  }
  return [];
}

function getLegacyCurrentMaterial() {
  if (typeof globalThis.getSynapseFocusRoomCurrentMaterial === "function") {
    const material = globalThis.getSynapseFocusRoomCurrentMaterial();
    return material ? normalizeFocusRoomMaterial(material) : null;
  }
  return null;
}

function getFocusRoomMaterials() {
  const materials = getLegacyMaterials();
  const current = getLegacyCurrentMaterial();
  if (current && current.aiSummary && !materials.some(item => item.materialId === current.materialId)) {
    return mergeFocusRoomMaterials([current], materials);
  }
  return mergeFocusRoomMaterials(materials);
}

function getFocusRoomMaterial(materialId) {
  const id = String(materialId || "");
  const materials = getFocusRoomMaterials();
  return materials.find(item => item.materialId === id) || materials[0] || null;
}

async function getFocusRoomMaterialsWithDataApi(limit = 50) {
  const localMaterials = getFocusRoomMaterials();
  try {
    const remoteItems = await fetchGeneratedContentFromDataApi(limit);
    const remoteMaterials = arrayValue(remoteItems).map(normalizeFocusRoomMaterial);
    return mergeFocusRoomMaterials(localMaterials, remoteMaterials);
  } catch (error) {
    if (typeof window !== "undefined") {
      console.warn("Synapse data API Focus Room materials sync skipped:", error);
    }
    return localMaterials;
  }
}

function buildFocusRoomStudyPlan({ material, goal, durationMinutes }) {
  const minutes = Math.max(10, Number(durationMinutes) || 25);
  const headings = material?.studyHeadings?.length
    ? material.studyHeadings
    : ["Key ideas", "Examples", "Practice", "Review"];
  const goalText = String(goal || "").trim() || `Study ${material?.materialTitle || "this material"}`;
  const firstBlock = Math.max(1, Math.floor(minutes * 0.2));
  const secondBlock = Math.max(1, Math.floor(minutes * 0.4));
  const thirdBlock = Math.max(1, Math.floor(minutes * 0.2));
  const finalBlock = Math.max(1, minutes - firstBlock - secondBlock - thirdBlock);

  return [
    { minutes: firstBlock, task: `Set the goal: ${goalText}` },
    { minutes: secondBlock, task: `Review ${headings[0] || "the core ideas"}` },
    { minutes: thirdBlock, task: `Practice with ${headings[1] || headings[0] || "the generated examples"}` },
    { minutes: finalBlock, task: "Summarize mistakes and choose the next study step" }
  ];
}

export {
  normalizeFocusRoomSourceHighlights,
  normalizeFocusRoomMaterial,
  mergeFocusRoomMaterials,
  getFocusRoomMaterials,
  getFocusRoomMaterial,
  getFocusRoomMaterialsWithDataApi,
  buildFocusRoomStudyPlan
};
