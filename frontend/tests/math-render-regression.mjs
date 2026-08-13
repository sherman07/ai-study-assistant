import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacyDir = path.resolve(__dirname, "../src/legacy");
const sharedHtmlPath = path.resolve(__dirname, "../src/shared/lib/html.js");

function loadModuleSource(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+[\s\S]*?;\s*$/gm, "")
    .replace(/\nexport\s+\{[\s\S]*?\};\s*$/g, "")
    .replace(/^export\s+(async\s+)?function\s+/gm, "function ")
    .replace(/^export\s+const\s+/gm, "const ")
    .replace(/^export\s+\{[\s\S]*?\};\s*$/gm, "");
}

const source = [
  loadModuleSource(path.join(legacyDir, "readableMath.js")),
  loadModuleSource(path.join(legacyDir, "mathMarkdownNormalize.js")),
  loadModuleSource(path.join(legacyDir, "mathMarkdown.js")),
  loadModuleSource(sharedHtmlPath),
  loadModuleSource(path.join(legacyDir, "markdownRendererSupport.js")),
  loadModuleSource(path.join(legacyDir, "markdownRenderer.js"))
].join("\n\n");

const makeRenderer = new Function(
  "window",
  "document",
  `
  ${source}
  configureMarkdownRenderer({
    getLearningFigureByMarker: () => null,
    renderInlineVisualReference: () => "",
    renderInlineVisualCard: () => ""
  });
  return { markdownToHTML, prepareMathMarkdown, splitMarkdownTableCells };
  `
);


const documentStub = {
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ dataset: {}, addEventListener() {} }),
  head: { appendChild() {} }
};

const { markdownToHTML } = makeRenderer(
  { addEventListener() {}, SYNAPSE_DESMOS_API_KEY: "" },
  documentStub
);

const cases = [
  {
    name: "readable word fraction",
    input: "Starting point: gradient = rise/run for linear functions.",
    must: ["\\frac{rise}{run}"],
    not: ["rise/run"]
  },
  {
    name: "difference quotient with Delta",
    input: "Use [f(x + \u0394x) - f(x)] / \u0394x.",
    must: ["\\frac{f(x+\\Delta x)-f(x)}{\\Delta x}"],
    not: ["[f(x + \u0394x)"]
  },
  {
    name: "nested parenthesis quotient",
    input: "Use (f(x+h)-f(x))/h for first principles.",
    must: ["\\frac{f(x+h)-f(x)}{h}"],
    not: ["(f(x+h)-f(x))/h"]
  },
  {
    name: "Delta limit",
    input: "Take the limit as \u0394x -> 0.",
    must: ["\\Delta x \\to 0"],
    not: ["\u0394x -> 0"]
  },
  {
    name: "merged prose around notation",
    input: "Notation: Leibniz (d/dx) vsLagrange(f'(x)); bothrepresent the derivative.",
    must: ["vs Lagrange", "both represent", "\\frac{d}{dx}", "f'(x)"],
    not: ["vsLagrange", "bothrepresent", "d/dx) vs"]
  },
  {
    name: "polynomial exponent range",
    input: "Use x^2+2x+1 as the function.",
    must: ["x^{2}+2x+1"],
    not: ["x^{2+2x}"]
  },
  {
    name: "negative exponent",
    input: "Important caveat: x^-1 is handled separately.",
    must: ["x^{-1}"],
    not: ["x^{-1is}"]
  },
  {
    name: "numeric function calls remain math",
    input: "Evaluate f(2)=4 and log(10)=1.",
    must: ["\\(f(2)=4\\)", "\\(\\log(10)=1\\)"],
    not: ["f (2)", "log (10)"]
  },
  {
    name: "parenthesized exponent",
    input: "For n^(n-1), subtract one from the exponent.",
    must: ["n^{n-1}"],
    not: ["n^(n-1)"]
  },
  {
    name: "absolute value in prose",
    input: "Solve |x| \u2264 1.",
    must: ["\\lvert x \\rvert \\le 1"],
    not: ["|x| \u2264 1"]
  },
  {
    name: "absolute value in table",
    input: "| Case | Formula |\n| --- | --- |\n| abs | |x| \u2264 1 |",
    must: ["\\lvert x \\rvert \\le 1"],
    not: ["<td>\u2264 1</td>"]
  },
  {
    name: "log absolute value in table",
    input: "| Case | Formula |\n| --- | --- |\n| log | ln|x| + C |",
    must: ["\\ln\\lvert x \\rvert+C"],
    not: ["<td>+ C</td>"]
  },
  {
    name: "double escaped inline delimiters",
    input: String.raw`Solve \\(\\frac{1}{1+y^2}\\,dy=x\\,dx\\).`,
    must: ["\\(\\frac{1}{1+y^2}\\,dy=x\\,dx\\)"],
    not: [String.raw`\\(`, String.raw`\\frac`, String.raw`\\)`]
  },
  {
    name: "double escaped display delimiters",
    input: String.raw`\\[\\int \\frac{1}{1+y^2}\\,dy = \\arctan(y) + C\\]`,
    must: ["\\[\\int \\frac{1}{1+y^2}\\,dy = \\arctan(y) + C\\]"],
    not: [String.raw`\\[`, String.raw`\\int`, String.raw`\\frac`]
  },
  {
    name: "quad arrow cleanup",
    input: String.raw`\\quad=>\\quad`,
    must: ["⇒"],
    not: [String.raw`\quad`, String.raw`=>`]
  },
  {
    name: "space between math and prose",
    input: String.raw`Notation: Leibniz \\(\\frac{d}{dx}\\)vsLagrange\\(f'(x)\\); bothrepresent the derivative.`,
    must: ["\\(\\frac{d}{dx}\\) vs Lagrange \\(f'(x)\\)", "both represent"],
    not: [")vs", "Lagrange\\(", "bothrepresent"]
  },
  {
    name: "double escaped table math",
    input: String.raw`| Concept | Result |
| --- | --- |
| inverse trig | Integrate \\(\\frac{1}{1+y^2}\\) to get \\(\\arctan(y)\\). |`,
    must: ["\\(\\frac{1}{1+y^2}\\)", "\\(\\arctan(y)\\)"],
    not: ["@@AUTO_INLINE_MATH", String.raw`\\(`, String.raw`\\frac`]
  },
  {
    name: "matrix",
    input: "A = [[1,2],[3,4]] and det(A)= -2.",
    must: ["\\begin{bmatrix}1", "3 &amp; 4\\end{bmatrix}", "\\det(A)"],
    not: ["[[1,2]"]
  },
  {
    name: "currency does not break later math",
    input: "The book costs $50 and $x$ is the variable; slope = rise/run.",
    must: ["$50", "\\(x\\)", "\\frac{rise}{run}"],
    not: ["\\(50 and"]
  },
  {
    name: "quantity theory formula stops before prose",
    input: "Core theories used in the source: Quantity theory of money M × V = P × Y; Fisher effect (nominal ≈ real + expected inflation); Loanable-funds market and its distinction.",
    must: ["\\(M \\times V=P \\times Y\\); Fisher effect", "nominal ≈ real + expected inflation", "Loanable-funds market"],
    not: ["Fishereffect", "expectedinflation", "Loanable-fun\\,ds"]
  },
  {
    name: "quantity identity keeps following words outside math",
    input: "Caveat: thus MV = PY is a useful identity. For MV = PY questions, check whether V is held constant.",
    must: ["\\(MV=PY\\) is a useful identity", "For \\(MV=PY\\) questions, check whether"],
    not: ["isauseful", "questions,checkwhether", "PY questions"]
  },
  {
    name: "quantity identity stops before infinitive prose",
    input: "Use M × V = P × Y to calculate required changes in M when V or Y changes.",
    must: ["Use \\(M \\times V=P \\times Y\\) to calculate"],
    not: ["tocalculate", "M × \\(V=P\\) × Y"]
  },
  {
    name: "quantity memory hook keeps prose readable",
    input: "MV = PY: remember velocity moved a lot in 2020 → central banks had to increase base money.",
    must: ["\\(MV=PY\\): remember velocity moved"],
    not: ["remembervelocity", "centralbankshad"]
  },
  {
    name: "fisher approximation wraps whole equation",
    input: "Fisher equation: i ≈ r + π^e.",
    must: ["\\(i \\approx r+π^{e}\\)."],
    not: ["i ≈ r + \\(π"]
  },
  {
    name: "probability chain with conditional mid",
    input: String.raw`Relationship: P(A∩B)=P(A\\mid B)P(B)=P(B\\mid A)P(A).`,
    must: ["\\(P(A \\cap B)=P(A \\mid B)P(B)=P(B \\mid A)P(A)\\)."],
    not: [String.raw`P(A\mid B)`, "P(A∩B)="]
  },
  {
    name: "set builder expression",
    input: "Set-language: A ∩ B = {x : x ∈ A and x ∈ B}.",
    must: ["\\(A \\cap B={x:x \\in A \\;\\text{and}\\;x \\in B}\\)."],
    not: ["A ∩ \\(B=", "x ∈ A and"]
  },
  {
    name: "conditional probability fraction",
    input: "Definition: P(A | B) = P(A∩B) / P(B).",
    must: ["\\(P(A \\mid B)=\\frac{P(A \\cap B)}{P(B)}\\)."],
    not: ["P(A | B)", "\\frac{A∩B}{P}"]
  },
  {
    name: "conditional probability table pipe",
    input: "| Concept | Formula | Meaning |\n| --- | --- | --- |\n| Conditional | P(A | B) = P(A∩B) / P(B) | Restrict to B |",
    must: ["<td>Conditional</td><td>\\(P(A \\mid B)=\\frac{P(A \\cap B)}{P(B)}\\)</td><td>Restrict to B</td>"],
    not: ["<td>P(A</td>", "<td>B) ="]
  },
  {
    name: "broken display delimiter is repaired",
    input: String.raw`\[
i \approx r + (\pi^e\)
\]`,
    must: ["\\[\ni \\approx r + \\pi^e\n\\]"],
    not: [String.raw`(\pi^e\)`, String.raw`\)\n\]`]
  },
  {
    name: "currency suffix does not start dollar math",
    input: "LSAP adds reserves -> potential $1T if r = 0.1 and $x$ is a variable.",
    must: ["potential $1T", "\\(r=0.1\\)", "\\(x\\)"],
    not: ["\\(1T if", "potential1T"]
  },
  {
    name: "generated econ glued words are repaired",
    input: "Example: D=1,000, r = 0.5 → totaldeposits 2,000. Module 9 LSAP 100b → potential1T example.",
    must: ["\\(D=1,000\\)", "total deposits", "potential $1T"],
    not: ["totaldeposits", "potential1T"]
  },
  {
    name: "parenthetical relation stops before prose",
    input: "The value of the exported good (NX > 0) is matched by the value of the capital outflow (NCO > 0).",
    must: ["\\((NX &gt; 0)\\) is matched by", "\\((NCO &gt; 0)\\)"],
    not: ["is matched by\\)", "ismatchedby", "matchedby"]
  },
  {
    name: "generated econ parenthesis spacing is repaired",
    input: "NationalSaving (2,500)wasnotequaltoDomesticInvestment(2,000) because $500 flowed overseas (NCO).",
    must: ["National Saving (2,500) was not equal to Domestic Investment (2,000)"],
    not: [")was", "wasnotequalto", "DomesticInvestment", "Investment(2,000)"]
  },
  {
    name: "URLs stay text",
    input: "Source: https://example.com/a/b?x=1 and f(x)=x^2.",
    must: ["https://example.com/a/b?x=1", "f(x)=x^{2}"],
    not: ["\\frac{https:"]
  },
  {
    name: "display equation does not graph by default",
    input: "$$f(x)=x^2+2x+1$$",
    must: ["\\[f(x)=x^2+2x+1\\]"],
    not: ["desmos-card", "x^{2+2x}"]
  },
  {
    name: "explicit graph context gets graph hook",
    input: "Graph this function:\n$$f(x)=x^2+2x+1$$",
    must: ["desmos-card", "y=x^{2}+2x+1"],
    not: ["x^{2+2x}"]
  }
];

let failures = 0;

for (const testCase of cases) {
  const output = markdownToHTML(testCase.input);
  const missing = (testCase.must || []).filter(fragment => !output.includes(fragment));
  const forbidden = (testCase.not || []).filter(fragment => output.includes(fragment));
  if (missing.length || forbidden.length) {
    failures += 1;
    console.error(`FAIL ${testCase.name}`);
    if (missing.length) console.error("  missing:", missing.join(", "));
    if (forbidden.length) console.error("  forbidden:", forbidden.join(", "));
    console.error(output);
  } else {
    console.log(`PASS ${testCase.name}`);
  }
}

if (failures) {
  process.exit(1);
}
