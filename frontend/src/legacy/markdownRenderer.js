import { cleanMindText } from "./readableMath.js";
import {
  DOLLAR_INLINE_MATH_PATTERN,
  isDollarInlineMathBody,
  normalizeReadableMarkdown,
  prepareMathMarkdown,
  repairLatexDelimiterLeakage,
  splitMarkdownTableCells
} from "./mathMarkdown.js?v=ai-broadcast-v15";
import {
  escapeAttr,
  escapeHTML,
  hydrateDesmosGraphs,
  renderDesmosGraphCard,
  shorten,
  typeInto
} from "./markdownRendererSupport.js";

const markdownRendererHooks = {
  getLearningFigureByMarker: () => null,
  renderInlineVisualCard: () => "",
  renderInlineVisualReference: () => ""
};

function configureMarkdownRenderer(hooks = {}) {
  Object.assign(markdownRendererHooks, hooks || {});
}

function getLearningFigureByMarker(index) {
  return markdownRendererHooks.getLearningFigureByMarker(index);
}

function renderInlineVisualCard(index) {
  return markdownRendererHooks.renderInlineVisualCard(index);
}

function renderInlineVisualReference(index, shownIndex = null) {
  return markdownRendererHooks.renderInlineVisualReference(index, shownIndex);
}

function splitVisualMarkerLines(text) {
  const markerPattern = /\[\[VISUAL:\d+\]\]/g;
  return String(text || "").split("\n").flatMap(line => {
    markerPattern.lastIndex = 0;
    if (!markerPattern.test(line)) {
      markerPattern.lastIndex = 0;
      return [line];
    }
    markerPattern.lastIndex = 0;
    const pieces = [];
    let cursor = 0;
    const pushText = value => {
      let cleaned = String(value || "")
        .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, "")
        .replace(/^\s*[:：,;.\-\s]+/, "")
        .replace(/\s*(?:before|after)\s+(?:the\s+)?(?:visual|image|figure|source figure|source image)\s*[:：-]?\s*$/i, "")
        .replace(/^(?:after|before)\s+(?:the\s+)?(?:visual|image|figure|source figure|source image)\s*[:：-]?\s*/i, "")
        .trim();
      if (cleaned) pieces.push(cleaned);
    };

    line.replace(markerPattern, (marker, offset) => {
      pushText(line.slice(cursor, offset));
      pieces.push(marker);
      cursor = offset + marker.length;
      return marker;
    });
    pushText(line.slice(cursor));
    return pieces.length ? pieces : [line];
  }).join("\n");
}

function markdownToHTML(text) {
  text = normalizeReadableMarkdown(text);
  text = prepareMathMarkdown(text);
  let safe = escapeHTML(text);

  // Protect display math blocks before markdown parsing
  const mathBlocks = [];
  const inlineMath = [];
  safe = safe.replace(/\$\$([\s\S]*?)\$\$/g, (_, body) => {
    const id = `@@MATH_BLOCK_${mathBlocks.length}@@`;
    mathBlocks.push(`\\[${repairLatexDelimiterLeakage(body)}\\]`);
    return id;
  });
  safe = safe.replace(/\\\[[\s\S]*?\\\]/g, (match) => {
    const id = `@@MATH_BLOCK_${mathBlocks.length}@@`;
    mathBlocks.push(`\\[${repairLatexDelimiterLeakage(match.replace(/^\\\[/, "").replace(/\\\]$/, ""))}\\]`);
    return id;
  });
  // Protect inline math before markdown parsing
  safe = safe.replace(/\\\([\s\S]*?\\\)/g, (match) => {
    const id = `@@INLINE_MATH_${inlineMath.length}@@`;
    inlineMath.push(`\\(${repairLatexDelimiterLeakage(match.replace(/^\\\(/, "").replace(/\\\)$/, ""))}\\)`);
    return id;
  });
  const matrixEnvironmentPattern = new RegExp(
    "\\\\begin\\{(?:bmatrix|pmatrix|matrix|vmatrix|Bmatrix|smallmatrix)\\}" +
      "[\\s\\S]*?" +
      "\\\\end\\{(?:bmatrix|pmatrix|matrix|vmatrix|Bmatrix|smallmatrix)\\}",
    "g"
  );
  safe = safe.replace(matrixEnvironmentPattern, (match) => {
    const id = `@@INLINE_MATH_${inlineMath.length}@@`;
    inlineMath.push(`\\(${match}\\)`);
    return id;
  });
  safe = safe.replace(DOLLAR_INLINE_MATH_PATTERN, (match, prefix, body) => {
    if (!isDollarInlineMathBody(body)) return match;
    const id = `@@INLINE_MATH_${inlineMath.length}@@`;
    inlineMath.push(`\\(${repairLatexDelimiterLeakage(body)}\\)`);
    return `${prefix}${id}`;
  });
  safe = splitVisualMarkerLines(safe);

  const lines = safe.split("\n");
  const output = [];
  let inList = false;
  let inOrderedList = false;
  let inTable = false;
  let tableColumnCount = 0;
  const renderedVisualMarkers = new Set();
  const renderedVisualUrlToIndex = new Map();
  let lastVisualReferenceKey = "";

  function isTableLine(value) {
    return /^\s*\|.*\|\s*$/.test(value || "");
  }

  function isTableSeparator(value) {
    return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(value || "");
  }

  function splitTableCells(value) {
    return splitMarkdownTableCells(value, tableColumnCount);
  }

  function closeTable() {
    if (inTable) {
      output.push("</tbody></table></div>");
      inTable = false;
      tableColumnCount = 0;
    }
  }

  function closeLists() {
    if (inList) {
      output.push("</ul>");
      inList = false;
    }
    if (inOrderedList) {
      output.push("</ol>");
      inOrderedList = false;
    }
  }

  function shouldRenderDesmosForMathBlock(block, lineIndex) {
    const latex = normalizeDesmosLatex(block);
    if (!latex) return false;
    const context = [
      lines[lineIndex - 2] || "",
      lines[lineIndex - 1] || "",
      lines[lineIndex + 1] || "",
      lines[lineIndex + 2] || ""
    ].join(" ").toLowerCase();
    if (/\b(?:do not graph|no graph|without graph|not a graph)\b/.test(context)) return false;
    const graphContextPattern = new RegExp(
      "\\b(?:" +
        "interactive\\s+graph|desmos|graph\\s+this|plot\\s+this|plot\\s+the|" +
        "graph\\s+of|curve|coordinate\\s+plane|x-axis|y-axis|axes" +
      ")\\b"
    );
    return graphContextPattern.test(context);
  }

  function renderDesmosForMathToken(token, lineIndex) {
    const match = String(token || "").match(/^@@MATH_BLOCK_(\d+)@@$/);
    if (!match) return "";
    const block = mathBlocks[Number(match[1])] || "";
    return shouldRenderDesmosForMathBlock(block, lineIndex) ? renderDesmosGraphCard(block) : "";
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const nextLine = lines[index + 1] || "";

    const visualMarker = trimmed.match(/^\[\[VISUAL:(\d+)\]\]$/);
    if (!visualMarker && trimmed) {
      lastVisualReferenceKey = "";
    }
    if (visualMarker) {
      closeLists();
      closeTable();
      const visualIndex = Number(visualMarker[1]);
      const visualItem = getLearningFigureByMarker(visualIndex);
      const visualUrl = visualItem?.url || "";
      const visualKey = visualUrl ? `url:${visualUrl}` : `index:${visualIndex}`;
      if (renderedVisualMarkers.has(visualIndex) || (visualUrl && renderedVisualUrlToIndex.has(visualUrl))) {
        const shownIndex = visualUrl && renderedVisualUrlToIndex.has(visualUrl)
          ? renderedVisualUrlToIndex.get(visualUrl)
          : visualIndex;
        const referenceKey = visualUrl ? `url:${visualUrl}` : `index:${shownIndex}`;
        if (lastVisualReferenceKey !== referenceKey) {
          output.push(renderInlineVisualReference(visualIndex, shownIndex));
          lastVisualReferenceKey = referenceKey;
        }
      } else {
        renderedVisualMarkers.add(visualIndex);
        if (visualUrl) renderedVisualUrlToIndex.set(visualUrl, visualIndex);
        output.push(renderInlineVisualCard(visualIndex));
        lastVisualReferenceKey = visualKey;
      }
      return;
    }

    if (isTableLine(line) && isTableSeparator(nextLine)) {
      closeLists();
      closeTable();
      const headers = splitMarkdownTableCells(line);
      tableColumnCount = headers.length;
      const headerHtml = headers.map(cell => `<th>${cell}</th>`).join("");
      output.push(
        '<div class="markdown-table-wrap"><table class="markdown-table"><thead><tr>' +
          headerHtml +
          '</tr></thead><tbody>'
      );
      inTable = true;
      return;
    }

    if (isTableSeparator(line)) {
      return;
    }

    if (inTable && isTableLine(line)) {
      const cells = splitTableCells(line);
      output.push('<tr>' + cells.map(cell => `<td>${cell}</td>`).join("") + '</tr>');
      return;
    }

    if (inTable && !isTableLine(line)) {
      closeTable();
    }

    if (trimmed.startsWith("@@MATH_BLOCK_")) {
      closeLists();
      output.push(`<div class="math-block">${trimmed}</div>${renderDesmosForMathToken(trimmed, index)}`);
    } else if (/^####\s+/.test(line)) {
      closeLists();
      output.push(`<h4>${line.replace(/^####\s+/, "")}</h4>`);
    } else if (/^###\s+/.test(line)) {
      closeLists();
      output.push(`<h3>${line.replace(/^###\s+/, "")}</h3>`);
    } else if (/^##\s+/.test(line)) {
      closeLists();
      output.push(`<h2>${line.replace(/^##\s+/, "")}</h2>`);
    } else if (/^#\s+/.test(line)) {
      closeLists();
      output.push(`<h1>${line.replace(/^#\s+/, "")}</h1>`);
    } else if (/^-\s+/.test(line)) {
      if (inOrderedList) {
        output.push("</ol>");
        inOrderedList = false;
      }
      if (!inList) {
        output.push("<ul>");
        inList = true;
      }
      output.push(`<li>${line.replace(/^-\s+/, "")}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (inList) {
        output.push("</ul>");
        inList = false;
      }
      const orderedLine = line.match(/^(\d+)\.\s+(.*)$/);
      const startNumber = orderedLine ? Number(orderedLine[1]) : 1;
      if (!inOrderedList) {
        output.push(startNumber > 1 ? `<ol start="${startNumber}">` : "<ol>");
        inOrderedList = true;
      }
      output.push(`<li>${orderedLine ? orderedLine[2] : line.replace(/^\d+\.\s+/, "")}</li>`);
    } else if (trimmed === "") {
      closeLists();
    } else {
      closeLists();
      output.push(`<p>${line}</p>`);
    }
  });

  closeLists();
  closeTable();

  let html = output.join("");

  // Restore math blocks
  mathBlocks.forEach((block, index) => {
    html = html.replace(`@@MATH_BLOCK_${index}@@`, block);
  });

  inlineMath.forEach((block, index) => {
    html = html.replace(`@@INLINE_MATH_${index}@@`, block);
  });

  return html
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
}

function inlineMarkdownHTML(text) {
  const html = markdownToHTML(text).trim();
  if (html.startsWith("<p>") && html.endsWith("</p>") && !html.includes("</p><p>")) {
    return html.slice(3, -4);
  }
  return html;
}

function renderMath() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    return window.MathJax.typesetPromise()
      .catch(error => {
        console.error("MathJax render error:", error);
      })
      .then(() => hydrateDesmosGraphs());
  }
  return hydrateDesmosGraphs();
}


export {
  cleanMindText,
  configureMarkdownRenderer,
  escapeAttr,
  escapeHTML,
  inlineMarkdownHTML,
  markdownToHTML,
  prepareMathMarkdown,
  repairLatexDelimiterLeakage,
  renderMath,
  shorten,
  splitMarkdownTableCells,
  typeInto
};
