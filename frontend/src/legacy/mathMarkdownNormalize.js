import { replaceLatexReadableSymbols } from "./readableMath.js";

const MATH_MARKDOWN_LATEX_FUNCTION_NAMES = [
  "sin", "cos", "tan", "sec", "csc", "cot",
  "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh",
  "log", "ln", "lim", "max", "min", "sup", "inf",
  "det", "rank", "tr", "dim", "ker", "span", "Pr"
];

function normalizeReadableMarkdown(text) {
  const source = String(text || "");
  if (!source.trim()) return source;

  const noteLabelPattern = /^(Definition(?:\/mechanism)?|Mechanism|Explanation|Worked example|Source example|Source evidence|Evidence|Implication|Limitation(?:\/(?:misunderstanding|mistake))?|Common mistake|Exam use|Memory hook|Why it matters|How to read it|What to remember|定义|定義|解释|解釋|来源例子|來源例子|源内证据|源內證據|证据|證據|含义|意義|局限|误区|誤區|考试用法|考試用法|常见错误|常見錯誤|记忆钩子|記憶鉤子|为什么重要|為什麼重要|怎么读|怎麼讀|需要记住)\s*[:：]\s*/i;
  const templateHeadingPattern = /^\s*(#{1,4}\s*)?(Learning question|Source and argument map|Core notes?|Key terms(?: and mechanisms)?|Concepts? explained(?: with source evidence)?|Reading the source evidence|Worked examples?(?: and evidence matrix)?|Source evidence\s*\/\s*example matrix|Exam strategy(?: and common student mistakes)?|How to use major pieces of source evidence|Revision checklist|学习问题|來源與論點地圖|来源与论点地图|核心笔记|核心筆記|关键术语与机制|關鍵術語與機制|复习清单|複習清單)\b.*$/i;
  const lines = source.split("\n");

  const hasTemplateLabel = (line) => {
    const stripped = String(line || "").trim().replace(/^[-*]\s+/, "");
    return noteLabelPattern.test(stripped);
  };

  const canonicalHeadingText = (title) => {
    const clean = String(title || "")
      .replace(/\s*[（(][^)\n）]*(?:->|→|definition|claim|evidence|visual|explicit|teach|exam|quick|writing|interpret|source|定义|定義|证据|證據|图|圖)[^)\n）]*[)）]\s*/gi, "")
      .replace(/\s*(?:—|--|-|:)\s*(?:what\b|how\b|teach\b|then\b|quick\b|high-level\b|definition\b|explicit\b|interpret\b|source\b).*$/i, "")
      .trim();
    const pairs = [
      [/^Learning question\b|^学习问题\b|^學習問題\b/i, "Learning Question"],
      [/^Source and argument map\b|^来源与论点地图\b|^來源與論點地圖\b/i, "Source and Argument Map"],
      [/^Core notes?\b|^核心笔记\b|^核心筆記\b/i, "Core Notes"],
      [/^Key terms(?: and mechanisms)?\b|^关键术语与机制\b|^關鍵術語與機制\b/i, "Key Terms and Mechanisms"],
      [/^Concepts? explained(?: with source evidence)?\b/i, "Concepts Explained With Source Evidence"],
      [/^Reading the source evidence\b/i, "Reading the Source Evidence"],
      [/^Worked examples?(?: and evidence matrix)?\b|^Source evidence\s*\/\s*example matrix\b/i, "Worked Examples and Evidence"],
      [/^Exam strategy(?: and common student mistakes)?\b/i, "Exam Strategy and Common Mistakes"],
      [/^How to use major pieces of source evidence\b|^Using source evidence\b/i, "Using Source Evidence"],
      [/^Revision checklist\b|^复习清单\b|^複習清單\b/i, "Revision Checklist"]
    ];
    return (pairs.find(([pattern]) => pattern.test(clean)) || [null, clean])[1];
  };

  const splitVisualMarkerLine = (line) => {
    if (!/\[\[VISUAL:\d+\]\]/.test(line || "")) return null;
    const trimmed = String(line || "").trim();
    if (/^\[\[VISUAL:\d+\]\]$/.test(trimmed)) return [trimmed];
    const body = trimmed.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, "");
    const match = body.match(/\[\[VISUAL:(\d+)\]\]/);
    if (!match) return [line];
    let before = body.slice(0, match.index).trim();
    let after = body.slice(match.index + match[0].length).trim();
    before = before.replace(/^(?:before|after)\s+(?:the\s+)?(?:visual|image|figure|source figure|source image)\s*[:：-]?\s*$/i, "").trim();
    before = before.replace(/^(?:before|after)\s*[:：-]?\s*$/i, "").trim();
    after = after
      .replace(/^[:：,;.\-\s]+/, "")
      .replace(/^(?:after|before)\s+(?:the\s+)?(?:visual|image|figure|source figure|source image)\s*[:：-]?\s*/i, "")
      .trim();
    return [before, match[0], after].filter(Boolean);
  };

  const polishedLines = [];
  lines.forEach((rawLine, index) => {
    let line = rawLine.replace(/\s+$/g, "");
    const stripped = line.trim();
    const templateHeading = stripped.match(templateHeadingPattern);
    if (templateHeading && !hasTemplateLabel(stripped)) {
      polishedLines.push(`${templateHeading[1] || "## "}${canonicalHeadingText(templateHeading[2])}`);
      return;
    }

    const visualSplit = splitVisualMarkerLine(line);
    if (visualSplit) {
      polishedLines.push(...visualSplit);
      return;
    }

    const orderedConcept = line.match(/^(\s*)\d+\.\s+(.+?)\s*$/);
    if (orderedConcept) {
      const nextNonBlank = lines.slice(index + 1).find(item => item.trim());
      const title = orderedConcept[2].trim();
      if (nextNonBlank && hasTemplateLabel(nextNonBlank) && title.length >= 3 && title.length <= 140 && !title.endsWith(":")) {
        polishedLines.push(`### ${title}`);
        return;
      }
    }

    const bulletLabel = line.match(/^(\s*[-*]\s+)(.+)$/);
    if (bulletLabel) {
      const rewritten = bulletLabel[2].replace(noteLabelPattern, (_, label) => `**${label}:** `);
      if (rewritten !== bulletLabel[2]) {
        polishedLines.push(rewritten);
        return;
      }
    }
    polishedLines.push(line);
  });

  const polished = polishedLines.join("\n");

  return polished.replace(/\n{4,}/g, "\n\n\n").trim();
}

function normalizeLatexAliases(text) {
  let output = String(text || "");
  // Model JSON sometimes arrives with LaTeX double-escaped as text, e.g.
  // "\\(" or "\\frac". MathJax needs a single command slash, while matrix row
  // separators such as "\\" must stay untouched. Only collapse command/delimiter
  // escapes when the next character is a LaTeX command or math delimiter.
  let previous = "";
  while (output !== previous) {
    previous = output;
    output = output
      .replace(/\\\\(?=[A-Za-z()[\],;:!])/g, "\\");
  }
  return output
    .replace(/\tfrac\s*\{/g, "\\frac{")
    .replace(/\\(?:tfrac|dfrac)\s*\{/g, "\\frac{")
    .replace(/\\dfrac\s*\{/g, "\\frac{")
    .replace(/\\quad\b/g, " ")
    .replace(/\\qquad\b/g, " ")
    .replace(/\\(?:Rightarrow|Longrightarrow|implies)\b/g, "\\Rightarrow")
    .replace(/\\(?:leftarrow|gets)\b/g, "\\leftarrow");
}

function removeUnbalancedMathParentheses(value) {
  const chars = [...String(value || "")];
  const stack = [];
  const remove = new Set();
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    const previous = chars[index - 1] || "";
    if (char === "(" && previous !== "\\") {
      stack.push(index);
    } else if (char === ")" && previous !== "\\") {
      if (stack.length) {
        stack.pop();
      } else {
        remove.add(index);
      }
    }
  }
  stack.forEach(index => remove.add(index));
  return chars.filter((_, index) => !remove.has(index)).join("");
}

function repairLatexDelimiterLeakage(value) {
  const output = normalizeLatexAliases(String(value || ""))
    .replace(/\\(?:\(|\)|\[|\])/g, "");
  return removeUnbalancedMathParentheses(output);
}

function repairMergedMathProse(text) {
  return String(text || "")
    .replace(/(\\\)|\\\])(?=[A-Za-z])/g, "$1 ")
    .replace(/([A-Za-z])(?=(?:\\\(|\\\[))/g, "$1 ")
    .replace(/([.?!。！？])(?=(?:Which|What|Why|How|When|Where|Who|This|That|The|A|An|If|Because|Since|So|Then|Use|Show|Give|Write)\b)/g, "$1 ")
    .replace(/\bvs(?=[A-Z])/g, "vs ")
    .replace(/\b(Lagrange|Leibniz)\s*\(/g, "$1 (")
    .replace(/\b(Which|What|Why|How|When|Where|Who)iscorrect\b/gi, "$1 is correct")
    .replace(/\b(Which|What|Why|How|When|Where|Who)is\b/g, "$1 is")
    .replace(/\bbothrepresent\b/gi, "both represent")
    .replace(/\beachterm\b/gi, "each term")
    .replace(/\bdivideby\b/gi, "divide by")
    .replace(/\bdividedby\b/gi, "divided by")
    .replace(/\baddone\b/gi, "add one")
    .replace(/\badd1\b/gi, "add 1")
    .replace(/\bcalculatedfromfirstprinciples\b/gi, "calculated from first principles")
    .replace(/\bpowerule\b/gi, "power rule")
    .replace(/\busingarea\b/gi, "using area")
    .replace(/\bcausingdivisionbyzero\b/gi, "causing division by zero")
    .replace(/\bcorrectantiderivative\b/gi, "correct antiderivative")
    .replace(/\btotaldeposits\b/gi, "total deposits")
    .replace(/\bwasnotequalto(?=[A-Z]|\b)/gi, "was not equal to ")
    .replace(/\bnotequalto(?=[A-Z]|\b)/gi, "not equal to ")
    .replace(/\b(equal)to(?=[A-Z]|\b)/gi, "$1 to ")
    .replace(/\bismatchedby\b/gi, "is matched by")
    .replace(/\bmatchedby\b/gi, "matched by")
    .replace(/(\([^()\n]{1,60}\))(?=(?:is|are|was|were|because|when|while)\b)/gi, "$1 ")
    .replace(/\b([A-Z][A-Za-z]{2,})(?=\(\d[\d,.\s%]*\))/g, "$1 ")
    .replace(/\b(National|Domestic|Private|Public)(Saving|Investment)\b/g, "$1 $2")
    .replace(/\b(Net)(Capital)(Outflow)\b/g, "$1 $2 $3")
    .replace(/\bpotential(\d+(?:\.\d+)?\s*[KMBT])\b/gi, "potential $$$1");
}

function normalizePlainMathText(text) {
  let output = repairProseHeavyMath(normalizeLatexAliases(String(text || "")));
  const protectedSegments = protectExistingMathSegments(output);
  output = normalizeLatexAliases(replaceLatexReadableSymbols(repairMergedMathProse(protectedSegments.text)))
    .replace(/sqrt\s*\(\s*([^()\n]+?)\s*\)/gi, "√($1)")
    .replace(/sqrt\s*([0-9A-Za-z]+)/gi, "√($1)");
  return repairMergedMathProse(protectedSegments.restore(output));
}

function isProseHeavyMathBody(body) {
  const value = String(body || "");
  if (!/[=+\-*/^_|∫ΣΠ≈≃≠≤≥<>×·⋅]|\\(?:int|frac|sqrt|lvert|rvert|ln|log|approx|sim|ne|le|ge)\b/.test(value)) return false;
  const readableFraction = value.match(/^\s*([A-Za-z]{2,24})\s*\/\s*([A-Za-z]{2,24})\s*$/);
  if (readableFraction && isReadableFractionPair(readableFraction[1], readableFraction[2])) return false;
  const words = value.match(/[A-Za-z]{3,}/g) || [];
  if (words.length < 2) return false;
  const allowed = new Set([
    ...MATH_MARKDOWN_LATEX_FUNCTION_NAMES.map(item => item.toLowerCase()),
    "frac", "sqrt", "lvert", "rvert", "left", "right", "mathrm", "operatorname", "text",
    "begin", "end", "bmatrix", "pmatrix", "matrix",
    "mid", "cup", "cap", "in", "notin", "and", "or", "given"
  ]);
  const proseWords = words.filter(word => !allowed.has(word.toLowerCase()));
  if (proseWords.some(word => word.length >= 14)) return true;
  return proseWords.length >= 2;
}

function repairProseHeavyMath(text) {
  return String(text || "")
    .replace(/\\\(([\s\S]{1,700}?)\\\)/g, (match, body) => (
      isProseHeavyMathBody(body) ? body : match
    ))
    .replace(/\\\[([\s\S]{1,1200}?)\\\]/g, (match, body) => (
      isProseHeavyMathBody(body) ? body : match
    ))
    .replace(/\$\$([\s\S]{1,1200}?)\$\$/g, (match, body) => (
      isProseHeavyMathBody(body) ? body : match
    ));
}

function normalizeDeltaNotation(value) {
  return String(value || "")
    .replace(/\\Delta\s*([A-Za-z])/g, "\\Delta $1")
    .replace(/Δ\s*([A-Za-z])/g, "\\Delta $1");
}

function protectLatexFragments(value, pattern, prefix = "LATEX") {
  const fragments = [];
  const text = String(value || "").replace(pattern, (match) => {
    const id = `@@${prefix}_${fragments.length}@@`;
    fragments.push(match);
    return id;
  });
  return {
    text,
    restore(output) {
      return fragments.reduce((result, fragment, index) => (
        result.split(`@@${prefix}_${index}@@`).join(fragment)
      ), String(output || ""));
    }
  };
}

function protectExistingMathSegments(value) {
  const segments = [];
  const stash = (segment) => {
    const id = `@@MATHSEG${segments.length}@@`;
    segments.push(segment);
    return id;
  };
  let text = String(value || "")
    .replace(/\$\$[\s\S]*?\$\$/g, stash)
    .replace(/\\\[[\s\S]*?\\\]/g, stash)
    .replace(/\\\([\s\S]*?\\\)/g, stash);

  DOLLAR_INLINE_MATH_PATTERN.lastIndex = 0;
  text = text.replace(DOLLAR_INLINE_MATH_PATTERN, (match, prefix, body) => (
    isDollarInlineMathBody(body) ? `${prefix}${stash(`$${body}$`)}` : match
  ));
  DOLLAR_INLINE_MATH_PATTERN.lastIndex = 0;

  return {
    text,
    restore(output) {
      return segments.reduce((result, segment, index) => (
        result.split(`@@MATHSEG${index}@@`).join(segment)
      ), String(output || ""));
    }
  };
}

const READABLE_FRACTION_WORDS = new Set([
  "rise", "run", "change", "time", "distance", "slope", "speed", "velocity",
  "cost", "benefit", "input", "output", "rate", "growth", "area", "volume",
  "force", "mass", "work", "energy", "power"
]);

function isReadableFractionPair(numerator, denominator) {
  const left = String(numerator || "").toLowerCase();
  const right = String(denominator || "").toLowerCase();
  return READABLE_FRACTION_WORDS.has(left) || READABLE_FRACTION_WORDS.has(right);
}

function convertSlashFractionsToLatex(value) {
  const protectedFractions = protectLatexFragments(value, /\\frac\s*\{[^{}\n]+\}\s*\{[^{}\n]+\}/g, "FRAC");
  let output = protectedFractions.text
    .replace(/\bd\s*\/\s*d([A-Za-z])\b/g, "\\frac{d}{d$1}")
    .replace(/\\Delta\s*([A-Za-z])\s*\/\s*\\Delta\s*([A-Za-z])/g, "\\frac{\\Delta $1}{\\Delta $2}")
    .replace(/\b([A-Za-z]{1,8}\s*\([^()\n]{1,120}\))\s*\/\s*([A-Za-z]{1,8}\s*\([^()\n]{1,120}\))/g, "\\frac{$1}{$2}")
    .replace(/\[([^\[\]\n]{1,220})\]\s*\/\s*(\\Delta\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?)/g, (_, numerator, denominator) => (
      `\\frac{${numerator.trim()}}{${denominator.trim()}}`
    ))
    .replace(/\(((?:[^()\n]|\([^()\n]*\)){1,220})\)\s*\/\s*(\\Delta\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?)/g, (_, numerator, denominator) => (
      `\\frac{${numerator.trim()}}{${denominator.trim()}}`
    ))
    .replace(/\(([^()\n]{1,160})\)\s*\/\s*(\\Delta\s*[A-Za-z]|[A-Za-z][A-Za-z0-9]*|\d+(?:\.\d+)?)/g, (_, numerator, denominator) => (
      `\\frac{${numerator.trim()}}{${denominator.trim()}}`
    ))
    .replace(/\b([0-9]+)\s*\/\s*([A-Za-z][A-Za-z0-9]*)\b/g, "\\frac{$1}{$2}")
    .replace(/\b([A-Za-z]{2,24})\s*\/\s*([A-Za-z]{2,24})\b/g, (match, numerator, denominator) => {
      if (!isReadableFractionPair(numerator, denominator)) return match;
      return `\\frac{${numerator}}{${denominator}}`;
    });
  output = protectedFractions.restore(output);
  return output;
}

function normalizeConditionalProbabilityPipes(value) {
  return String(value || "").replace(
    /\b(P|Pr)\s*\(\s*([^()\n|]{1,100}?)\s*\|\s*([^()\n|]{1,100}?)\s*\)/g,
    (_, fn, left, right) => `${fn}(${left.trim()} \\mid ${right.trim()})`
  );
}

function latexSafeMathText(value) {
  const source = convertSlashFractionsToLatex(normalizeConditionalProbabilityPipes(normalizeDeltaNotation(repairLatexDelimiterLeakage(String(value || "")))))
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/\|([^|\n]{1,100})\|/g, "\\lvert $1 \\rvert")
    .replace(/∪/g, "\\cup ")
    .replace(/∩/g, "\\cap ")
    .replace(/∈/g, "\\in ")
    .replace(/∉/g, "\\notin ")
    .replace(/∫/g, "\\int ")
    .replace(/Σ/g, "\\sum ")
    .replace(/Π/g, "\\prod ")
    .replace(/∞/g, "\\infty ")
    .replace(/∂/g, "\\partial ")
    .replace(/∇/g, "\\nabla ")
    .replace(/÷/g, "\\div ")
    .replace(/[·⋅]/g, "\\cdot ")
    .replace(/×/g, "\\times ")
    .replace(/≈/g, "\\approx ")
    .replace(/≃/g, "\\simeq ")
    .replace(/≡/g, "\\equiv ")
    .replace(/≠/g, "\\ne ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/→/g, "\\to ")
    .replace(/\bdet\s*\(/gi, "\\det(")
    .replace(/\band\b/gi, "\\;\\text{and}\\;")
    .replace(/\bor\b/gi, "\\;\\text{or}\\;")
    .replace(/\bsqrt\s*\(\s*([^()\n]+?)\s*\)/gi, "\\sqrt{$1}")
    .replace(/√\s*\(\s*([^()\n]+?)\s*\)/g, "\\sqrt{$1}")
    .replace(/√\s*([0-9A-Za-z]+)/g, "\\sqrt{$1}")
    .replace(/\^\s*\(([^()\n]{1,60})\)/g, "^{$1}")
    .replace(/\^\s*([-+]?\d{1,4}|[A-Za-z])(?=$|[^A-Za-z0-9])/g, "^{$1}")
    .replace(/_\s*([A-Za-z0-9]{1,6})\b/g, "_{$1}")
    .replace(/\s+/g, " ");
  return source;
}

function plainMatrixToLatex(match) {
  const rows = [];
  String(match || "").replace(/\[\s*([^\[\]\n]*?)\s*\]/g, (_, row) => {
    const cells = row
      .split(/\s*,\s*/)
      .map(cell => latexSafeMathText(cell))
      .filter(Boolean);
    if (cells.length) rows.push(cells.join(" & "));
    return "";
  });
  if (!rows.length) return match;
  return `\\begin{bmatrix}${rows.join(" \\\\ ")}\\end{bmatrix}`;
}

function convertPlainMatricesToLatex(text) {
  return String(text || "").replace(
    /\[\s*(\[[^\[\]\n]*\]\s*(?:,\s*\[[^\[\]\n]*\]\s*)+)\]/g,
    plainMatrixToLatex
  );
}

function isMathAbsPipe(body, index) {
  const before = body.slice(0, index);
  const after = body.slice(index + 1);
  if (/\s$/.test(before) && /^\s/.test(after)) return false;
  const nextPipe = after.indexOf("|");
  if (nextPipe >= 0) {
    const insideAbs = after.slice(0, nextPipe).trim();
    const openerContext = before.trimEnd();
    if (
      insideAbs &&
      insideAbs.length <= 80 &&
      /^[A-Za-z0-9\\{}\s.+\-*/^_]+$/.test(insideAbs) &&
      (
        !openerContext ||
        openerContext.endsWith("|") ||
        /(?:\\?ln|\\?log|\\?det)$/i.test(openerContext) ||
        /[=+\-*/^(]$/.test(openerContext)
      )
    ) {
      return true;
    }
  }
  const prev = before.match(/\S(?=\s*$)/)?.[0] || "";
  const next = after.match(/^\s*(\S)/)?.[1] || "";
  if (!prev || !next) return false;
  const prevMath = /[A-Za-z0-9}\])∞πθαβγδλμσω]/.test(prev);
  const nextMath = /[A-Za-z0-9({\\√∫ΣΠ+\-≤≥≠<>πθαβγδλμσω]/.test(next) || next === ")";
  const previousPipe = before.lastIndexOf("|");
  if (previousPipe >= 0 && prevMath && nextMath) {
    const openerContext = before.slice(0, previousPipe);
    const trimmedOpenerContext = openerContext.trimEnd();
    const insideAbs = before.slice(previousPipe + 1).trim();
    if (
      insideAbs &&
      insideAbs.length <= 80 &&
      /^[A-Za-z0-9\\{}\s.+\-*/^_]+$/.test(insideAbs) &&
      (
        trimmedOpenerContext.endsWith("|") ||
        /(?:\\?ln|\\?log|\\?det|\\?frac|\\?sqrt|[=+\-*/^_(])\s*$/i.test(openerContext)
      )
    ) {
      return true;
    }
  }
  const recent = before.slice(-18);
  if (prevMath && /[)\]}.,;:]/.test(next)) return true;
  return prevMath && nextMath && /(?:\\?ln|\\?log|\\?det|\\?frac|\\?sqrt|[=+\-*/^_(]|∫|Σ|Π|√)\s*[^|]*$/i.test(recent);
}

function isConditionalProbabilityPipe(body, index) {
  const before = String(body || "").slice(0, index);
  const after = String(body || "").slice(index + 1);
  const openIndex = before.lastIndexOf("(");
  const closeBefore = before.lastIndexOf(")");
  if (openIndex < 0 || openIndex < closeBefore) return false;
  if (!/(?:^|[^A-Za-z0-9_])(?:P|Pr)\s*$/i.test(before.slice(0, openIndex))) return false;
  const closeAfter = after.indexOf(")");
  if (closeAfter < 0) return false;
  const left = before.slice(openIndex + 1).trim();
  const right = after.slice(0, closeAfter).trim();
  return Boolean(left && right && left.length <= 100 && right.length <= 100);
}



export {
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
};
