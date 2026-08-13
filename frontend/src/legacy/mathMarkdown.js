import {
  MATH_MARKDOWN_LATEX_FUNCTION_NAMES,
  convertPlainMatricesToLatex,
  isConditionalProbabilityPipe,
  isMathAbsPipe,
  isProseHeavyMathBody,
  isReadableFractionPair,
  latexSafeMathText,
  normalizePlainMathText,
  normalizeReadableMarkdown,
  protectExistingMathSegments,
  repairLatexDelimiterLeakage,
  repairMergedMathProse
} from "./mathMarkdownNormalize.js";

function splitMarkdownTableCells(value, expectedCount = 0) {
  let body = String(value || "").trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);

  const cells = [];
  let cell = "";
  let mathDelimiter = "";
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const prev = body[index - 1] || "";
    const next = body[index + 1] || "";

    if (char === "\\" && next) {
      const pair = char + next;
      if (!mathDelimiter && (pair === "\\(" || pair === "\\[")) {
        mathDelimiter = pair === "\\(" ? "\\)" : "\\]";
      } else if (mathDelimiter && pair === mathDelimiter) {
        mathDelimiter = "";
      }
      cell += pair;
      index += 1;
      continue;
    }

    if (char === "$" && prev !== "\\") {
      if (!mathDelimiter) {
        mathDelimiter = "$";
      } else if (mathDelimiter === "$") {
        mathDelimiter = "";
      }
      cell += char;
      continue;
    }

    if (char === "|" && !mathDelimiter && prev !== "\\" && !isMathAbsPipe(body, index) && !isConditionalProbabilityPipe(body, index)) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }
  cells.push(cell.trim());

  if (expectedCount > 0 && cells.length < expectedCount) {
    return cells.concat(Array.from({ length: expectedCount - cells.length }, () => ""));
  }
  if (expectedCount > 0 && cells.length > expectedCount) {
    const overflow = cells.length - expectedCount;
    let mergeIndex = cells.findIndex((item, index) => (
      index < cells.length - 1 &&
      /(?:\\?ln|\\?log|∫|Σ|Π|√|sqrt|frac|abs|absolute|=|x\^|x_|\($)/i.test(item)
    ));
    if (mergeIndex < 0) mergeIndex = Math.max(0, expectedCount - 2);
    return [
      ...cells.slice(0, mergeIndex),
      cells.slice(mergeIndex, mergeIndex + overflow + 1).join(" | ").trim(),
      ...cells.slice(mergeIndex + overflow + 1)
    ];
  }
  return cells;
}

function splitFormulaTrailingText(value) {
  let formula = repairMergedMathProse(String(value || "")).trimEnd();
  let trailing = "";
  const moveTrailing = (index) => {
    trailing = formula.slice(index) + trailing;
    formula = formula.slice(0, index).trimEnd();
  };
  const setBuilder = formula.match(/^([A-Za-z]\s*(?:∩|∪|\\cap|\\cup)\s*[A-Za-z]\s*=\s*\{[^{}\n]{1,240}\})([.,;:]?[\s\S]*)$/);
  if (setBuilder) {
    formula = setBuilder[1];
    trailing = setBuilder[2] + trailing;
    return { formula, trailing };
  }
  const derivativeOperatorOnly = formula.match(/^(d\s*\/\s*d[A-Za-z]|\\frac\{d\}\{d[A-Za-z]\})([\s\S]+)$/);
  if (derivativeOperatorOnly && /^(?:\s*\)|\s+(?:vs|versus)\b|[,.;:])/.test(derivativeOperatorOnly[2])) {
    formula = derivativeOperatorOnly[1];
    trailing = derivativeOperatorOnly[2] + trailing;
    return { formula, trailing };
  }
  const parentheticalRelationThenProse = formula.match(/^(\([^()\n]{1,160}(?:=|≈|≃|≠|≤|≥|<|>)[^()\n]{1,160}\))(\s*(?:is|are|was|were|be|being|the|a|an|this|that|which|where|when|because|since|so|then|and|but)\b[\s\S]*)$/i);
  if (parentheticalRelationThenProse) {
    formula = parentheticalRelationThenProse[1];
    const prose = parentheticalRelationThenProse[2].replace(/^\s*/, " ");
    trailing = prose + trailing;
    return { formula, trailing };
  }
  const arrowToProse = formula.match(/\s*(?:→|⇒|->)\s+(?=(?:derivative|antiderivative|area|proof|power|rule|calculated|using|from|by|with)\b)/i);
  if (arrowToProse && arrowToProse.index > 0) {
    moveTrailing(arrowToProse.index);
  }
  const proseAfterRelationBoundary = formula.match(/[:;]\s+(?=(?:[A-Za-z][A-Za-z-]{2,}|[A-Z][A-Za-z0-9]*(?:\s|$)))/);
  if (proseAfterRelationBoundary && proseAfterRelationBoundary.index > 0) {
    moveTrailing(proseAfterRelationBoundary.index);
  }
  const chainedFormulaBoundary = formula.match(/[:;]\s*(?=(?:[A-Za-z][A-Za-z0-9]*'?\s*\(|[A-Za-z]\s*(?:=|≈|≃|≠|≤|≥|<|>)|tangent|slope|line|where|then|with|use|show|therefore|remember)\b)/i);
  if (chainedFormulaBoundary && chainedFormulaBoundary.index > 0) {
    moveTrailing(chainedFormulaBoundary.index + 1);
  }
  const questionSentenceBoundary = formula.match(/[.?!。！？]\s*(?=(?:which|what|why|how|who|choose|select|identify|state|explain|find|compute|differentiate|integrate|solve|evaluate|determine|is|are|does|do|can|should|would|show|give|write)\b)/i);
  if (questionSentenceBoundary && questionSentenceBoundary.index > 0) {
    moveTrailing(questionSentenceBoundary.index + 1);
  }
  const relationValueThenProse = formula.match(/^([\s\S]*?[=≈≃≠≤≥<>]\s*(?:[-+]?\d+(?:\.\d+)?%?|[A-Za-z\u0370-\u03ff]{1,4}(?:\^\{[^{}]+\}|\^[A-Za-z0-9+\-=]+|_\{[^{}]+\}|_[A-Za-z0-9]{1,6})?|\\frac\{[^{}]+\}\{[^{}]+\})(?:\s*(?:[+\-*/×·⋅]|\\times|\\cdot)\s*(?:[-+]?\d+(?:\.\d+)?%?|[A-Za-z\u0370-\u03ff]{1,4}(?:\^\{[^{}]+\}|\^[A-Za-z0-9+\-=]+|_\{[^{}]+\}|_[A-Za-z0-9]{1,6})?|\\frac\{[^{}]+\}\{[^{}]+\}))*)(\s+[A-Za-z][A-Za-z-]{2,}[\s\S]*)$/);
  if (relationValueThenProse && relationValueThenProse[1].length > 0) {
    moveTrailing(relationValueThenProse[1].length);
  }
  const mathTerm = String.raw`(?:[-+]?\d+(?:\.\d+)?%?|[A-Za-z\u0370-\u03ff]{1,4}(?:[A-Za-z0-9]{0,3})?(?:\^\{[^{}]+\}|\^[A-Za-z0-9+\-=]+|_\{[^{}]+\}|_[A-Za-z0-9]{1,6})?|\\frac\{[^{}]+\}\{[^{}]+\}|\([^()\n]{1,80}\))`;
  const relationThenSentence = formula.match(new RegExp(
    String.raw`^([\s\S]*?[=≈≃≠≤≥<>]\s*${mathTerm}(?:\s*(?:[+\-*/×·⋅]|\\times|\\cdot)\s*${mathTerm})*)(\s+(?:is|are|was|were|be|being|questions?|the|a|an|this|that|which|where|when|because|since|so|then|and|but)\b[\s\S]*)$`,
    "i"
  ));
  if (relationThenSentence && relationThenSentence[1].length > 0) {
    moveTrailing(relationThenSentence[1].length);
  }
  const relationThenInfinitive = formula.match(new RegExp(
    String.raw`^([\s\S]*?[=≈≃≠≤≥<>]\s*${mathTerm}(?:\s*(?:[+\-*/×·⋅]|\\times|\\cdot)\s*${mathTerm})*)(\s+to\s+(?:calculate|compute|find|solve|show|explain|keep|produce|derive|estimate|work|remember)\b[\s\S]*)$`,
    "i"
  ));
  if (relationThenInfinitive && relationThenInfinitive[1].length > 0) {
    moveTrailing(relationThenInfinitive[1].length);
  }
  const textParenthetical = formula.match(/\s+\(([^()]*)\)\s*$/);
  if (textParenthetical) {
    const parenthetical = textParenthetical[1].trim();
    const wordCount = (parenthetical.match(/[A-Za-z]{2,}/g) || []).length;
    const hasFormulaMarks = /[=<>^_\\]|[+\-*/]\s*\d|\d\s*[+\-*/]/.test(parenthetical);
    if (wordCount >= 2 && !hasFormulaMarks) {
      moveTrailing(textParenthetical.index);
    }
  }
  const trailingPatterns = [
    /(?=(?:Which|What|Why|How|Who|Choose|Select|Identify|State|Explain|Show|Give|Write)\b)/,
    /\s+\((?:explicit|show|if|required|where|since|because|when|while|which|this|that|treat|use|note|i\.e\.|e\.g\.)\b[\s\S]*$/i,
    /\s+(?:which|what|why|how|who|choose|select|identify|state|explain|show|give|write)\b[\s\S]*$/i,
    /[,;:]?\s+(?:according|special\s+case|case|or|unless|except|when|while|if|but|for)\b[\s\S]*$/i,
    /[,;:]?\s+(?:compute|find|solve|evaluate|determine)\b[\s\S]*$/i,
    /[,;:]?\s+(?:and|then|with|where|gives?|shows?|means?|makes?|causes?|causing|requires?|therefore|because|since|so|hence|thus)\s+\(?[A-Za-z\u0370-\u03ff∂∇∫ΣΠℝℂℕℤ][\s\S]*$/i,
    /[,;:]?\s+(?:the|a|an)\s+(?:correct|main|final|next|same|rule|answer|antiderivative|derivative|matrix|value|result|step)\b[\s\S]*$/i
  ];
  for (const pattern of trailingPatterns) {
    const match = formula.match(pattern);
    if (match && match.index > 0) {
      moveTrailing(match.index);
    }
  }
  const punctuation = formula.match(/([.,;:!?？。！])$/);
  if (punctuation) {
    trailing = punctuation[1] + trailing;
    formula = formula.slice(0, -1).trimEnd();
  }
  while (formula.endsWith(")")) {
    const openCount = (formula.match(/\(/g) || []).length;
    const closeCount = (formula.match(/\)/g) || []).length;
    if (closeCount <= openCount) break;
    trailing = ")" + trailing;
    formula = formula.slice(0, -1).trimEnd();
  }
  return { formula, trailing };
}

function findPlainFormulaStart(value) {
  const body = String(value || "");
  const patterns = [
    /(?:^|[^\w])(\\(?:frac|tfrac|dfrac)\s*\{)/,
    /(?:^|[^\w])((?:P|Pr)\s*\([^()\n]{1,120}\)\s*(?:=|≈|≃|≠|≤|≥|<|>)\s*)/i,
    /(?:^|[^\w])([A-Za-z]\s*(?:∩|∪|\\cap|\\cup)\s*[A-Za-z]\s*=\s*\{)/,
    /(?:^|[^\w])([A-Za-z]\s*(?:∩|∪|\\cap|\\cup)\s*[A-Za-z])/,
    /(?:^|[^\w])((?:d\s*\/\s*d[A-Za-z]|(?:\\Delta|Δ)\s*[A-Za-z]\s*\/\s*(?:\\Delta|Δ)\s*[A-Za-z]|\[[^\[\]\n]{1,220}\]\s*\/\s*(?:(?:\\Delta|Δ)\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*)|\((?:[^()\n]|\([^()\n]*\)){1,220}\)\s*\/\s*(?:(?:\\Delta|Δ)\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*)))/,
    /(?:^|[^\w])(((?:[-+]?\d+(?:\.\d+)?|[A-Za-z][A-Za-z0-9_{}^\\-]*|\([^()\n]{1,40}\))\s*(?:\\cdot|·|⋅|×|\*)\s*)?\\begin\{(?:bmatrix|pmatrix|matrix|vmatrix|Bmatrix|smallmatrix)\})/,
    /\\begin\{(?:bmatrix|pmatrix|matrix|vmatrix|Bmatrix|smallmatrix)\}/,
    /(?:^|[^\w])(\([^()\n]{0,80}(?:=|≈|≃|≠|≤|≥|<|>)[^()\n]{0,80}\))/,
    /(?:^|[^\w])(\([^()\n]{1,80}\)\s*(?:=|≈|≃|≠|≤|≥|<|>))/,
    /(?:^|[^\w])((?!(?:makes?|causes?|causing|requires?|explains?|shows?|means?|because|since|where|when|while|which|that|this)\b)[A-Za-z][A-Za-z0-9]*'?\s*\([^()\n]{1,36}\)\s*(?:=|≈|≃|≠|≤|≥|<|>))/i,
    /(?:^|[^\w])((?:[-+]?\d+(?:\.\d+)?\s*)?[A-Za-z][A-Za-z0-9_{}^\\-]*(?:\s*(?:\+|-|−|–|—|·|⋅|×|\*|\/)\s*(?:[-+]?\d+(?:\.\d+)?\s*)?[A-Za-z0-9_{}^\\()+-]+)*\s*(?:=|≈|≃|≠|≤|≥|<|>))/,
    /(?:^|[^\w])([A-Za-z]\s*(?:=|≈|≃|≠|≤|≥|<|>)\s*)/,
    /(?:^|[^\w])(det\s*\()/i,
    /(?:^|[^\w])((?:ln|log)\s*\|[^|\n]{1,100}\|(?:\s*[+\-]\s*[A-Za-z])?)/i,
    /(?:^|[^\w])(\|[^|\n]{1,100}\|\s*(?:=|≠|≤|≥|<|>|[+\-]))/,
    /(?:^|[^\w])([∫ΣΠ]\s*[A-Za-z0-9_{}^\\()+\-*/| ]{1,80}\s*(?:d[A-Za-z]\b|=|≈|≃))/,
    /(?:^|[^\w])([A-Za-z][A-Za-z0-9]*\s*\^\s*\{[^{}]+\})/
  ];
  const starts = patterns
    .map(pattern => {
      const match = body.match(pattern);
      if (!match) return -1;
      const offset = match[1] ? match[0].indexOf(match[1]) : 0;
      return (match.index || 0) + Math.max(0, offset);
    })
    .filter(index => index >= 0);
  return starts.length ? Math.min(...starts) : -1;
}

function shouldWrapFormula(formula) {
  const value = String(formula || "");
  if (/^\s*[-+]?\d+(?:\.\d+)?\s*[A-Za-z]\s*$/.test(value)) return true;
  if (value.length < 3 || value.length > 700) return false;
  if (/(?:https?:\/\/|www\.|youtu\.?be|youtube\.com)/i.test(value)) return false;
  const parentheticalOnly = value.match(/^\s*\(([\s\S]*)\)\s*$/);
  if (parentheticalOnly) {
    const body = parentheticalOnly[1];
    const proseWords = body.match(/[A-Za-z]{3,}/g) || [];
    const hasRealMath = /[≠≤≥<>^_∫ΣΠ√]|\\(?:frac|sqrt|int|sum|prod|lvert|rvert|approx|simeq)\b|(?:^|[^A-Za-z])(?:[A-Za-z]\s*(?:=|≈|≃)|(?:=|≈|≃)\s*[-+]?\d|\d\s*[+\-*/]\s*\d)/.test(body);
    if (proseWords.length >= 2 && !hasRealMath) return false;
  }
  if (isProseHeavyMathBody(value)) return false;
  if (/\b(?:P|Pr)\s*\([^()\n]{1,120}\)/.test(value) && /[=≈≃≠≤≥<>]|\\mid|\||∩|∪/.test(value)) return true;
  if (/[A-Za-z]\s*(?:∩|∪|\\cap|\\cup)\s*[A-Za-z]|\{[^{}\n]*(?:∈|\\in)[^{}\n]*\}/.test(value)) return true;
  const relationMatch = value.match(/^\s*([A-Za-z][A-Za-z\s-]{3,})\s*(?:=|≈|≃|≠|≤|≥|<|>)/);
  if (relationMatch && !/[()_^'\\∫ΣΠ√]/.test(relationMatch[1])) return false;
  if (/^\s*[A-Za-z]'\s*\([^()\n]{1,20}\)\s*$/.test(value)) return true;
  if (/\\begin\{(?:bmatrix|pmatrix|matrix|vmatrix|Bmatrix|smallmatrix)\}/.test(value)) return true;
  if (/\\(?:frac|sqrt|lim|int|sum|prod)\b|\\Delta\b|(?:^|[^\w])d\s*\/\s*d[A-Za-z]\b/.test(value)) return true;
  if (/^(?:\\Delta|Δ)\s*[A-Za-z]\s*(?:→|->|=|≠|≤|≥|<|>)\s*[-+]?(?:\d+(?:\.\d+)?|[A-Za-z][A-Za-z0-9]*)$/.test(value.trim())) return true;
  if (/(?:\\Delta|Δ)\s*[A-Za-z]\s*\/\s*(?:\\Delta|Δ)\s*[A-Za-z]|\[[^\[\]\n]{1,220}\]\s*\/\s*(?:(?:\\Delta|Δ)\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*)|\((?:[^()\n]|\([^()\n]*\)){1,220}\)\s*\/\s*(?:(?:\\Delta|Δ)\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*)/.test(value)) return true;
  const readableFraction = value.match(/^\s*([A-Za-z]{2,24})\s*\/\s*([A-Za-z]{2,24})\s*$/);
  if (readableFraction && isReadableFractionPair(readableFraction[1], readableFraction[2])) return true;
  if (/\|[^|\n]{1,100}\|/.test(value)) return true;
  if (/\b(?:ln|log)\s*(?:\\lvert|\|)/i.test(value)) return true;
  if (/[=≈≃≠≤≥<>]|\\frac|\\sqrt|√|[∫ΣΠ]|[A-Za-z]\s*\^\s*(?:\{|\(|[A-Za-z0-9+\-=])|[A-Za-z]_\{?[A-Za-z0-9]/.test(value)) return true;
  return /\bdet\s*\(/i.test(value);
}

function latexFormula(value) {
  let output = latexSafeMathText(value)
    .replace(/\b(\d+)\s*x\s*(\d+)\b/gi, "$1 \\times $2")
    .replace(/\s*([=+\-*/(){}\[\],;:])\s*/g, "$1")
    .replace(/([A-Za-z0-9}\)])d([A-Za-z])\b/g, "$1\\,d$2")
    .replace(/\bln\b/g, "\\ln")
    .replace(/\blog\b/g, "\\log")
    .replace(/\s*(\\(?:cdot|times|div|ne|le|ge|to|mid|cup|cap|in|notin)\s*)\s*/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
  MATH_MARKDOWN_LATEX_FUNCTION_NAMES.forEach(name => {
    if (name === "Pr") return;
    output = output.replace(new RegExp(`(?<!\\\\)\\b${name}\\b`, "g"), `\\${name}`);
  });
  return output;
}

const DOLLAR_INLINE_MATH_PATTERN = /(^|[^\\])\$(?!\d)([^\n$]{1,700}?)\$/g;

function isDollarInlineMathBody(body) {
  const value = String(body || "").trim();
  if (!value) return false;
  if (/^\d+(?:\.\d{2})?(?:\s|$)/.test(value)) return false;
  if (/^(?:[A-Za-z]|[A-Za-z][A-Za-z0-9]*'?\([^()\n]{0,30}\)|\\[A-Za-z]+(?:\{[^{}]*\})*)$/.test(value)) return true;
  if (/[=<>^_{}\\]|[+\-*/]\s*(?:\d|[A-Za-z\\])|(?:\d|[A-Za-z)])\s*[+\-*/]/.test(value)) return true;
  if (/(?:\\Delta|Δ|∫|Σ|Π|√|∞|≤|≥|≠|→)/.test(value)) return true;
  const words = value.match(/[A-Za-z]{3,}/g) || [];
  return words.length <= 1 && /[A-Za-z0-9]/.test(value);
}

function hasDollarInlineMath(value) {
  DOLLAR_INLINE_MATH_PATTERN.lastIndex = 0;
  let match;
  while ((match = DOLLAR_INLINE_MATH_PATTERN.exec(String(value || "")))) {
    if (isDollarInlineMathBody(match[2])) {
      DOLLAR_INLINE_MATH_PATTERN.lastIndex = 0;
      return true;
    }
  }
  DOLLAR_INLINE_MATH_PATTERN.lastIndex = 0;
  return false;
}

function wrapLooseInlineMath(value) {
  if (/\\\(|\\\[|\$\$/.test(value) || hasDollarInlineMath(value)) return value;
  const stashed = [];
  const stash = (formula) => {
    const id = `@@AUTO_INLINE_MATH_${stashed.length}@@`;
    stashed.push(formula);
    return id;
  };
  const restore = (text) => stashed.reduce((result, formula, index) => (
    result.split(`@@AUTO_INLINE_MATH_${index}@@`).join(formula)
  ), String(text || ""));
  const stashFormula = (formula) => {
    const split = splitFormulaTrailingText(formula);
    if (!shouldWrapFormula(split.formula)) return formula;
    return `${stash(`\\(${latexFormula(split.formula)}\\)`)}${wrapLooseInlineMath(split.trailing)}`;
  };
  let output = String(value || "");
  output = output
    .replace(/(^|[^A-Za-z0-9_@])((?:\\Delta|Δ)\s*[A-Za-z]\s*(?:→|->|=|≠|≤|≥|<|>)\s*[-+]?(?:\d+(?:\.\d+)?|[A-Za-z][A-Za-z0-9]*))/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])((?:\\Delta|Δ)\s*[A-Za-z]\s*\/\s*(?:\\Delta|Δ)\s*[A-Za-z])/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])(\[[^\[\]\n]{1,220}\]\s*\/\s*(?:(?:\\Delta|Δ)\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?))/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])(\((?:[^()\n]|\([^()\n]*\)){1,220}\)\s*\/\s*(?:(?:\\Delta|Δ)\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?))/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])\b([A-Za-z]{2,24})\s*\/\s*([A-Za-z]{2,24})\b/g, (match, prefix, numerator, denominator) => (
      isReadableFractionPair(numerator, denominator)
        ? `${prefix}${stashFormula(`${numerator}/${denominator}`)}`
        : match
    ))
    .replace(/(^|[^A-Za-z0-9_@])(\|[^|\n]{1,100}\|\s*(?:(?:=|≈|≃|≠|≤|≥|<|>)\s*[^,.;\n]{1,80}|(?:[+\-]\s*[A-Za-z0-9]+)?))/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])(d\s*\/\s*d[A-Za-z])(?=\s*\)|\s+(?:vs|versus)\b|[,.;:]|$)/gi, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])([A-Za-z]'\s*\([^()\n]{1,20}\))/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])\b(derivative|antiderivative|gradient|slope|result|answer)\s*=\s*([-+]?\d+(?:\.\d+)?\s*[A-Za-z](?:\s*\^\s*(?:\{[^{}]+\}|[-+]?\d{1,4}|[A-Za-z]))?(?:\s*[+\-]\s*[-+]?\d+(?:\.\d+)?\s*[A-Za-z]?)?)/gi, (_, prefix, label, formula) => (
      `${prefix}${label} = ${stashFormula(formula)}`
    ))
    .replace(/(^|[^A-Za-z0-9_@])((?:ln|log)\s*\|[^|\n]{1,100}\|(?!\|)(?:\s*[+\-]\s*[A-Za-z])?)/gi, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])((?:[-+]?\d+(?:\.\d+)?\s*)?[A-Za-z]\s*\^\s*(?:\{[^{}]+\}|\([^()\n]{1,60}\)|[A-Za-z0-9+\-=]{1,6})(?:\s*[+\-]\s*(?:(?:\d+(?:\.\d+)?\s*)?[A-Za-z](?:\s*\^\s*(?:\{[^{}]+\}|\([^()\n]{1,60}\)|[A-Za-z0-9+\-=]{1,6}))?|\d+(?:\.\d+)?)){1,})/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])((?!(?:makes?|causes?|causing|requires?|explains?|shows?|means?|because|since|where|when|while|which|that|this)\b)[A-Za-z][A-Za-z0-9]*'?\s*\([^()\n]{1,36}\)\s*(?:=|≈|≃|≠|≤|≥)\s*[^,.;\n]{1,160})/gi, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])(\([^()\n]{1,80}\)\s*(?:=|≈|≃|≠|≤|≥|<|>)\s*[^,.;\n]{1,120})/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])([A-Za-z]\s*(?:=|≈|≃|≠|≤|≥)\s*[-+]?(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?|[A-Za-z0-9.\u0370-\u03ff]+)(?:\s*[+\-*/]\s*[-+]?(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?|[A-Za-z0-9.\u0370-\u03ff]+)(?:\s*\^\s*(?:\{[^{}]+\}|[A-Za-z0-9+\-=]{1,6}))?)*\)?)/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])([∫ΣΠ]\s*[A-Za-z0-9_{}^()+\-*/| ]{1,100}\s*(?:d[A-Za-z]\b|(?:=|≈|≃)\s*[^,.;\n]{1,100}))/g, (_, prefix, formula) => `${prefix}${stashFormula(formula)}`)
    .replace(/(^|[^A-Za-z0-9_@])([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s*\^\s*\{([^{}]+)\}/g, (_, prefix, base, exponent) => `${prefix}${stash(`\\(${base}^{${latexFormula(exponent)}}\\)`)}`)
    .replace(/(^|[^A-Za-z0-9_@])([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)_\{([^{}]+)\}/g, (_, prefix, base, subscript) => `${prefix}${stash(`\\(${base}_{${latexFormula(subscript)}}\\)`)}`)
    .replace(/(^|[^A-Za-z0-9_@])([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s*\^\s*\(([^()\n]{1,60})\)/g, (_, prefix, base, exponent) => `${prefix}${stash(`\\(${base}^{${latexFormula(exponent)}}\\)`)}`)
    .replace(/(^|[^A-Za-z0-9_@])([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s*\^\s*([A-Za-z0-9+\-=]{1,6})(?![A-Za-z0-9])/g, (_, prefix, base, exponent) => `${prefix}${stash(`\\(${base}^{${latexFormula(exponent)}}\\)`)}`)
    .replace(/(^|[^A-Za-z0-9_@])([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)_([0-9A-Za-z]{1,6})(?![A-Za-z0-9])/g, (_, prefix, base, subscript) => `${prefix}${stash(`\\(${base}_{${latexFormula(subscript)}}\\)`)}`)
    .replace(/(\([^()\n]{1,80}\)\s*_\s*[A-Za-z0-9]{1,6}\s*=\s*[A-Za-z][A-Za-z0-9]*\s*_\s*[A-Za-z0-9]{1,6})/g, (match) => stash(`\\(${latexFormula(match)}\\)`))
    .replace(/(\([^()\n]{1,80}\)\s*_\s*[A-Za-z0-9]{1,6})/g, (match) => stash(`\\(${latexFormula(match)}\\)`))
    .replace(/\bdet\s*\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)/gi, (_, variable) => stash(`\\(\\det(${variable})\\)`))
    .replace(/\b([A-Za-z][A-Za-z0-9]*)\s*\^\s*\{([^{}]+)\}/g, (_, base, exponent) => stash(`\\(${base}^{${latexFormula(exponent)}}\\)`))
    .replace(/\b([A-Za-z][A-Za-z0-9]*)_\{([^{}]+)\}/g, (_, base, subscript) => stash(`\\(${base}_{${latexFormula(subscript)}}\\)`))
    .replace(/\b([A-Za-z][A-Za-z0-9]*)\s*\^\s*([A-Za-z0-9+\-=]{1,6})\b/g, (_, base, exponent) => stash(`\\(${base}^{${latexFormula(exponent)}}\\)`))
    .replace(/\b([A-Za-z][A-Za-z0-9]*)_([0-9A-Za-z]{1,6})\b/g, (_, base, subscript) => stash(`\\(${base}_{${latexFormula(subscript)}}\\)`))
    .replace(/(?:√|sqrt)\s*\(\s*([^()\n]+?)\s*\)/gi, (_, radicand) => stash(`\\(\\sqrt{${latexFormula(radicand)}}\\)`));
  return restore(output);
}

function wrapTextOutsideExistingMath(value) {
  const protectedSegments = protectExistingMathSegments(value);
  return protectedSegments.restore(wrapLooseInlineMath(protectedSegments.text));
}

function protectNonMathSegments(text) {
  const segments = [];
  const stash = (segment) => {
    const id = `@@TEXTSEG${segments.length}@@`;
    segments.push(segment);
    return id;
  };
  const source = String(text || "").replace(/https?:\/\/[^\s<>"']+/gi, (match) => {
    const split = String(match).match(/^(.+?)([)\].,;:!?，。；：！？]*)$/);
    const url = split ? split[1] : match;
    const trailing = split ? split[2] : "";
    return `${stash(url)}${trailing}`;
  });
  return {
    text: source,
    restore(value) {
      return segments.reduce((result, segment, index) => (
        result.replaceAll(`@@TEXTSEG${index}@@`, segment)
      ), String(value || ""));
    }
  };
}

function wrapPlainMathLine(line, forceInline = false) {
  if (!line || /^\s*```/.test(line) || /^\s*\[\[VISUAL:\d+\]\]\s*$/.test(line)) return line;
  if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)) return line;
  if (/^\s*\|.*\|\s*$/.test(line)) {
    const trimmed = String(line).trim();
    const cells = splitMarkdownTableCells(trimmed)
      .map(cell => wrapPlainMathLine(cell.trim(), true));
    return `| ${cells.join(" | ")} |`;
  }

  const lineMatch = String(line).match(/^(\s*(?:[-*+]\s+|\d+\.\s+|>\s*)?)(.*)$/);
  const prefix = lineMatch ? lineMatch[1] : "";
  const body = lineMatch ? lineMatch[2] : String(line);
  if (!body.trim()) return line;
  if (/\\\(|\\\[|\$\$|\$/.test(body)) {
    return prefix + wrapTextOutsideExistingMath(body);
  }

  const formulaStart = findPlainFormulaStart(body);
  if (formulaStart < 0) return prefix + wrapLooseInlineMath(body);

  const before = body.slice(0, formulaStart);
  const candidate = body.slice(formulaStart);
  const { formula, trailing } = splitFormulaTrailingText(candidate);
  if (!shouldWrapFormula(formula)) return prefix + wrapLooseInlineMath(body);

  const isStandaloneFormula = !forceInline && !prefix && !before.trim() && !trailing.trim() && formula.length <= 220;
  const latex = latexFormula(formula);
  const wrapped = isStandaloneFormula ? `\\[${latex}\\]` : `\\(${latex}\\)`;
  let trailingText = trailing;
  if (/^\)+/.test(trailingText)) {
    const beforeOpen = (before.match(/\(/g) || []).length;
    const beforeClose = (before.match(/\)/g) || []).length;
    if (beforeClose >= beforeOpen && !before.trimEnd().endsWith("(")) {
      trailingText = trailingText.replace(/^\)+/, "");
    }
  }
  return prefix + wrapLooseInlineMath(before) + wrapped + (trailingText ? wrapPlainMathLine(trailingText, true) : "");
}

function prepareMathMarkdown(text) {
  const protectedSegments = protectNonMathSegments(convertPlainMatricesToLatex(normalizePlainMathText(text)));
  const protectedMath = protectExistingMathSegments(protectedSegments.text);
  const prepared = protectedMath.text
    .split("\n")
    .map(line => wrapPlainMathLine(line))
    .join("\n");
  return protectedSegments.restore(protectedMath.restore(prepared));
}


export {
  DOLLAR_INLINE_MATH_PATTERN,
  isDollarInlineMathBody,
  latexFormula,
  normalizeReadableMarkdown,
  prepareMathMarkdown,
  repairLatexDelimiterLeakage,
  splitMarkdownTableCells
};
