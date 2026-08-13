function makeReadableMindLabel(label, detail = "", fallback = "Key point") {
  const cleaned = cleanMindText(label || detail || fallback);
  const formulaScore = (cleaned.match(/[=<>√×^]|\d/g) || []).length;
  const alphaScore = (cleaned.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  if (cleaned.length > 70 || (formulaScore > 8 && formulaScore >= alphaScore / 2)) {
    const detailText = cleanMindText(detail || cleaned);
    const beforeColon = detailText.split(":")[0].trim();
    if (beforeColon && beforeColon.length >= 4 && beforeColon.length <= 42 && !/[=<>√×^]/.test(beforeColon)) {
      return beforeColon;
    }
    if (/derivative/i.test(detailText)) return "Derivative calculation";
    if (/cross product/i.test(detailText)) return "Cross product";
    if (/curvature/i.test(detailText)) return "Curvature formula";
    if (/vector function/i.test(detailText)) return "Vector function";
    if (/square root|sqrt/i.test(detailText)) return "Square root step";
    if (/sum of squares/i.test(detailText)) return "Sum of squares";
    return fallback;
  }
  return cleaned || fallback;
}

function shortMindText(text, limit = 60) {
  const cleaned = cleanMindText(text)
    .replace(/\s*(?:\.{3}|…)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Untitled";
  if (!limit || cleaned.length <= limit) return cleaned;

  const sliced = cleaned.slice(0, limit).trim();
  const separators = [" ", "，", "、", ",", ";", "；", ":", "：", ")", "）"];
  const cut = Math.max(...separators.map(separator => sliced.lastIndexOf(separator)));
  const minUsefulCut = Math.min(28, Math.floor(limit * 0.45));
  return (cut >= minUsefulCut ? sliced.slice(0, cut) : sliced).trim();
}

function fullMindText(text, fallback = "Untitled") {
  const cleaned = cleanMindText(text)
    .replace(/\s*(?:\.{3}|…)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function deriveMindChildrenFromDetail(detail = "", parentLabel = "", maxChildren = 3) {
  const cleaned = cleanMindText(detail);
  const parentKey = cleanMindText(parentLabel).toLowerCase();
  if (!cleaned || cleaned.length < 70) return [];

  const parts = cleaned
    .split(/\s*[;；]\s*|\s+→\s+|\s+--\s+|\s+—\s+|(?<=[.!?。！？])\s+|\s+\b(?:because|therefore|however|for example|e\.g\.)\b\s+/i)
    .map(part => cleanMindText(part))
    .filter(Boolean);

  const seen = new Set();
  const children = [];
  for (const part of parts) {
    if (part.length < 14 || part.length > 260) continue;
    const key = part.toLowerCase().replace(/\W+/g, "").slice(0, 80);
    if (!key || seen.has(key) || (parentKey && key === parentKey.replace(/\W+/g, "").slice(0, 80))) continue;
    seen.add(key);

    let labelSource = part.split(/[:：,，]/)[0]?.trim() || part;
    if (labelSource.length < 5 || labelSource.length > 58) labelSource = part;
    const label = fullMindText(makeReadableMindLabel(labelSource, part, "Subpoint"), "Subpoint");
    children.push({
      id: `derived-child-${children.length}-${key}`,
      label,
      detail: fullMindText(part, "Open this subpoint for detail.")
    });
    if (children.length >= maxChildren) break;
  }
  return children;
}

function normaliseMindChildren(children = [], parentId = "point", parentDetail = "", parentLabel = "") {
  const source = Array.isArray(children) ? children : [];
  const normalised = source.slice(0, 6).map((child, index) => {
    if (typeof child === "string") {
      const cleaned = cleanMindText(child);
      return {
        id: `${parentId}-child-${index}`,
        label: fullMindText(makeReadableMindLabel(cleaned, cleaned, `Subpoint ${index + 1}`), `Subpoint ${index + 1}`),
        detail: cleaned || "Open this subpoint for detail.",
        rawDetail: child
      };
    }

    const rawLabel = child?.label || child?.title || child?.text || child?.detail || `Subpoint ${index + 1}`;
    const rawDetail = child?.rawDetail || child?.detail || child?.explanation || child?.text || rawLabel;
    const detail = cleanMindText(rawDetail);
    const label = makeReadableMindLabel(rawLabel, detail, `Subpoint ${index + 1}`);
    return {
      id: child?.id || `${parentId}-child-${index}`,
      label: fullMindText(label, `Subpoint ${index + 1}`),
      detail: detail || label || "Open this subpoint for detail.",
      rawDetail
    };
  }).filter(child => child.label);

  if (normalised.length) return normalised;
  return deriveMindChildrenFromDetail(parentDetail, parentLabel, 3).map((child, index) => ({
    ...child,
    id: `${parentId}-${child.id || `derived-${index}`}`
  }));
}

function normaliseMindPoints(points = []) {
  return (points || []).slice(0, 10).map((point, index) => {
    if (typeof point === "string") {
      const cleaned = cleanMindText(point);
      const id = `point-${index}`;
      return {
        id,
        label: fullMindText(makeReadableMindLabel(cleaned, cleaned, `Point ${index + 1}`), `Point ${index + 1}`),
        detail: cleaned || "Open the related notes for more detail.",
        rawDetail: point,
        children: normaliseMindChildren([], id, cleaned, cleaned)
      };
    }

    const rawLabel = point?.label || point?.title || point?.text || point?.detail || `Point ${index + 1}`;
    const rawDetail = point?.rawDetail || point?.detail || point?.explanation || point?.text || rawLabel;
    const detail = cleanMindText(rawDetail);
    const label = makeReadableMindLabel(rawLabel, detail, `Point ${index + 1}`);
    const id = point?.id || `point-${index}`;
    const childSource = point?.children || point?.subpoints || point?.leaves || point?.items || [];
    return {
      id,
      label: fullMindText(label, `Point ${index + 1}`),
      detail: detail || label || "Open the related notes for more detail.",
      rawDetail,
      children: normaliseMindChildren(childSource, id, detail, label)
    };
  }).filter(point => point.label);
}

function firstMindSentenceMatching(text, pattern) {
  const sentences = String(text || "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map(sentence => cleanMindText(sentence))
    .filter(Boolean);
  return sentences.find(sentence => pattern.test(sentence)) || sentences[0] || "";
}

function buildMindPointFromPattern(sectionText, label, pattern, fallbackDetail) {
  if (!pattern.test(sectionText || "")) return null;
  const detail = firstMindSentenceMatching(sectionText, pattern) || fallbackDetail || label;
  return {
    id: `supplement-${label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`,
    label: fullMindText(label, "Point"),
    detail: fullMindText(detail, label)
  };
}

function insertSupplementalMindBranch(data, branch, preferredIndex = 1) {
  if (!branch || !branch.label) return data;
  const newText = `${branch.label} ${branch.section || ""} ${branch.summary || ""}`.toLowerCase();
  const isDuplicate = data.branches.some(existing => {
    const existingText = `${existing.label} ${existing.section || ""} ${existing.summary || ""}`.toLowerCase();
    const existingLabel = String(existing.label || "").toLowerCase();
    const newLabel = String(branch.label || "").toLowerCase();
    return (newLabel && existingText.includes(newLabel)) || (existingLabel && newText.includes(existingLabel));
  });
  if (isDuplicate) return data;
  const branches = [...data.branches];
  branches.splice(Math.max(0, Math.min(preferredIndex, branches.length)), 0, branch);
  return { ...data, branches: branches.slice(0, 14) };
}

function enhanceMindMapData(data) {
  if (!data || !Array.isArray(data.branches)) return data;
  let enhanced = { ...data, branches: [...data.branches] };
  const branchText = enhanced.branches.map(branch => `${branch.label} ${branch.section || ""} ${branch.summary || ""}`).join(" ").toLowerCase();

  if (!/\boverview\b|概述|總覽|总览/.test(branchText) && sections.Overview) {
    const overviewLines = String(sections.Overview || "")
      .split(/\n+/)
      .map(line => cleanMindText(line.replace(/^[\-•*]\s*/, "").replace(/^\d+[.)]\s*/, "")))
      .filter(Boolean);
    enhanced = insertSupplementalMindBranch(enhanced, {
      id: "supplement-overview",
      label: "Overview / Big picture",
      section: "Overview",
      summary: firstMindSentenceMatching(sections.Overview, /./) || "Start here for the main learning frame.",
      points: normaliseMindPoints(overviewLines.slice(0, 6).map(line => ({ label: line, detail: line })))
    }, 0);
  }

  if (!/developmental approach/i.test(branchText)) {
    const entry = Object.entries(sections).find(([name, content]) => /developmental approach/i.test(`${name}\n${content}`));
    if (entry) {
      const [sectionName, sectionText] = entry;
      const points = [
        buildMindPointFromPattern(sectionText, "Analysis vs synthesis", /\banalysis\b|\bsynthesis\b/i, "Break the mind into components, then explain how those components work together during development."),
        buildMindPointFromPattern(sectionText, "Holistic, integrative view", /\bholistic\b|\bintegrative\b|\bintegration\b/i, "Developmental psychology links perception, action, cognition, emotion, and social context instead of treating them as isolated boxes."),
        buildMindPointFromPattern(sectionText, "Levels of analysis", /\blevels? of analysis\b|\bcultural\b.*\bgenetic\b|\bneural\b/i, "A developmental explanation can move between cultural, social, behavioural, neural, physiological, and genetic levels."),
        buildMindPointFromPattern(sectionText, "Ontogeny vs phylogeny", /\bontogen|phylogen|evolutionary\b/i, "Separate change across one life from change across species history, then ask how the two timelines interact."),
        buildMindPointFromPattern(sectionText, "Basic and applied research", /\bbasic research\b|\bapplied research\b|\beducational\b|\bclinical\b/i, "Use the framework to connect theory with applied fields such as education, clinical work, and intervention.")
      ].filter(Boolean);
      enhanced = insertSupplementalMindBranch(enhanced, {
        id: "supplement-developmental-approach",
        label: "Developmental approach overview",
        section: sectionName,
        summary: firstMindSentenceMatching(sectionText, /developmental approach|holistic|integrative|analysis|synthesis/i) || "Developmental psychology studies how the mind changes by connecting components, levels, and time scales.",
        points: points.length ? points : normaliseMindPoints(String(sectionText).split(/\n+/).slice(0, 7).map(line => ({ label: line, detail: line })))
      }, 1);
    }
  }

  return enhanced;
}
function getMindMapData(mindMap) {
  if (mindMap && Array.isArray(mindMap.branches) && mindMap.branches.length) {
    return enhanceMindMapData({
      center: fullMindText(mindMap.center || storedTitle || "Study Notes", "Study Notes"),
      branches: mindMap.branches.slice(0, 14).map((branch, index) => ({
        id: branch.id || `branch-${index}`,
        label: fullMindText(branch.label || branch.section || `Branch ${index + 1}`, `Branch ${index + 1}`),
        section: branch.section || branch.label || `Section ${index + 1}`,
        summary: cleanMindText(branch.summary || ""),
        rawSummary: branch.rawSummary || branch.summary || "",
        points: normaliseMindPoints(branch.points || [])
      }))
    });
  }

  const fallbackBranches = Object.keys(sections).slice(0, 14).map((sectionName, index) => {
    const rawLines = String(sections[sectionName] || "")
      .split(/\n+/)
      .map(line => cleanMindText(line.replace(/^[\-•*]\s*/, "").replace(/^\d+[.)]\s*/, "")))
      .filter(Boolean);

    const points = rawLines.slice(0, 8).map((line, pointIndex) => ({
      id: `fallback-${index}-${pointIndex}`,
      label: fullMindText(line, `Point ${pointIndex + 1}`),
      detail: line,
      rawDetail: line
    }));

    return {
      id: `fallback-${index}`,
      label: sectionName === "Overview" ? "Summary" : sectionName,
      section: sectionName,
      summary: rawLines[0] || "Open this section for more detail.",
      points: normaliseMindPoints(points.length ? points : [{ id: `fallback-${index}-0`, label: "Open related notes", detail: "Open this section for more detail." }])
    };
  });

  return enhanceMindMapData({
    center: fullMindText(storedTitle || "Study Notes", "Study Notes"),
    branches: fallbackBranches
  });
}

function getMindBranchKey(branch, index) {
  return String(branch?.id || branch?.section || branch?.label || `branch-${index}`);
}

function isMindBranchCollapsed(branch, index) {
  return collapsedMindBranches.has(getMindBranchKey(branch, index));
}

function mindMapDetailHTML(value, fallback = "Open this branch for more detail.") {
  const raw = String(value || "").trim();
  const source = cleanMindText(raw || fallback) || "Open this branch for more detail.";
  return markdownToHTML(source);
}

