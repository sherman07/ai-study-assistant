import { latexFormula } from "./mathMarkdown.js?v=ai-broadcast-v15";
import { escapeAttr, escapeHTML, shorten } from "../shared/lib/html.js";

const DESMOS_API_URL = "https://www.desmos.com/api/v1.11/calculator.js";
const DESMOS_DEFAULT_API_KEY = "desmos";
let desmosAPILoadPromise = null;
let desmosCardCounter = 0;
let currentTypingTimer = null;

function stripMathDelimiters(value) {
  return String(value || "")
    .trim()
    .replace(/^\\\[/, "")
    .replace(/\\\]$/, "")
    .replace(/^\\\(/, "")
    .replace(/\\\)$/, "")
    .replace(/^\$\$/, "")
    .replace(/\$\$$/, "")
    .trim();
}

function normalizeDesmosLatex(value) {
  let latex = latexFormula(stripMathDelimiters(value))
    .replace(/\\left|\\right/g, "")
    .replace(/\\,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!latex || latex.length > 180) return "";
  if (!/[xX]/.test(latex)) return "";
  if (/\\(?:lim|Delta|int|sum|prod|begin)\b|\\to\b|(?:^|[^A-Za-z])d[A-Za-z]\b/.test(latex)) return "";

  const functionMatch = latex.match(/^f\s*\(\s*x\s*\)\s*=\s*([\s\S]+)$/i);
  if (functionMatch) return `y=${functionMatch[1].trim()}`;
  const derivativeMatch = latex.match(/^f'\s*\(\s*x\s*\)\s*=\s*([\s\S]+)$/i);
  if (derivativeMatch) return `y=${derivativeMatch[1].trim()}`;
  if (/^(?:y|x)\s*=/.test(latex) || /^f\s*\(\s*x\s*\)\s*=/.test(latex)) return latex;
  if (/=/.test(latex)) return latex;
  if (/^[0-9A-Za-z\\{}^_+\-*/().,\s]+$/.test(latex)) return `y=${latex}`;
  return "";
}

function renderDesmosGraphCard(rawLatex) {
  const latex = normalizeDesmosLatex(rawLatex);
  if (!latex) return "";
  const id = `desmos-graph-${++desmosCardCounter}`;
  const label = `Interactive Desmos graph for ${escapeAttr(latex)}`;
  return `
    <div class="desmos-card" data-desmos-latex="${encodeURIComponent(latex)}">
      <div class="desmos-card-head">
        <span><i class="bi bi-graph-up"></i> Interactive graph</span>
        <code>${escapeHTML(latex)}</code>
      </div>
      <div id="${id}" class="desmos-calculator" role="img" aria-label="${label}"></div>
    </div>
  `;
}

function getDesmosAPIKey() {
  return String(window.SYNAPSE_DESMOS_API_KEY || DESMOS_DEFAULT_API_KEY);
}

function loadDesmosAPI() {
  if (window.Desmos && typeof window.Desmos.GraphingCalculator === "function") {
    return Promise.resolve(window.Desmos);
  }
  if (desmosAPILoadPromise) return desmosAPILoadPromise;

  desmosAPILoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-synapse-desmos]");
    const complete = () => {
      if (window.Desmos && typeof window.Desmos.GraphingCalculator === "function") {
        resolve(window.Desmos);
      } else {
        reject(new Error("Desmos API loaded, but GraphingCalculator was unavailable."));
      }
    };
    if (existing) {
      existing.addEventListener("load", complete, { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load the Desmos API.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `${DESMOS_API_URL}?apiKey=${encodeURIComponent(getDesmosAPIKey())}`;
    script.async = true;
    script.dataset.synapseDesmos = "true";
    script.onload = complete;
    script.onerror = () => reject(new Error("Could not load the Desmos API."));
    document.head.appendChild(script);
  });

  return desmosAPILoadPromise;
}

function markDesmosCardsUnavailable(cards, error) {
  console.warn("Desmos graph preview unavailable:", error);
  cards.forEach(card => {
    card.dataset.desmosMounted = "failed";
    card.classList.add("desmos-card-fallback");
    const target = card.querySelector(".desmos-calculator");
    if (target) {
      target.innerHTML = `<p>Interactive graph preview could not load. You can still read the equation above.</p>`;
    }
  });
}

function hydrateDesmosGraphs(root = document) {
  const cards = [...root.querySelectorAll(".desmos-card:not([data-desmos-mounted])")];
  if (!cards.length) return Promise.resolve();

  return loadDesmosAPI()
    .then(Desmos => {
      cards.forEach(card => {
        const target = card.querySelector(".desmos-calculator");
        const latex = decodeURIComponent(card.dataset.desmosLatex || "");
        if (!target || !latex) {
          card.dataset.desmosMounted = "skipped";
          return;
        }
        try {
          const calculator = Desmos.GraphingCalculator(target, {
            expressions: false,
            keypad: false,
            settingsMenu: false,
            zoomButtons: true,
            lockViewport: false,
            border: false
          });
          calculator.setExpression({ id: "synapse-main", latex });
          card.dataset.desmosMounted = "true";
          card._synapseDesmosCalculator = calculator;
        } catch (error) {
          markDesmosCardsUnavailable([card], error);
        }
      });
    })
    .catch(error => markDesmosCardsUnavailable(cards, error));
}


function typeInto(element, html, done = null, speed = 4) {
  // v22: show the generated content immediately.
  // The loading animation stays unchanged while the backend is generating; this
  // only removes the slow post-generation typing effect that made long notes feel
  // like they were still generating.
  if (!element) return;
  if (currentTypingTimer) {
    clearInterval(currentTypingTimer);
    currentTypingTimer = null;
  }
  element.innerHTML = String(html || "");
  if (typeof done === "function") done();
}

export {
  escapeAttr,
  escapeHTML,
  hydrateDesmosGraphs,
  renderDesmosGraphCard,
  shorten,
  stripMathDelimiters,
  typeInto
};
