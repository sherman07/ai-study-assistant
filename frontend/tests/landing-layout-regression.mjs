import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const frontendRoot = path.join(repoRoot, "frontend");
const landingRoot = path.join(frontendRoot, "src", "landing");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function readTreeText(dir) {
  if (!fs.existsSync(dir)) return "";
  return fs.readdirSync(dir, { withFileTypes: true }).map((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return readTreeText(entryPath);
    if (!/\.(jsx|js|css)$/.test(entry.name)) return "";
    return fs.readFileSync(entryPath, "utf8");
  }).join("\n");
}

const landingHtml = read("frontend/landing.html");
const landingSource = readTreeText(landingRoot);
const packageJson = JSON.parse(read("package.json"));
const viteConfig = read("vite.config.js");

const requiredSections = [
  "HeroSection",
  "ProductDemoSection",
  "FeaturesSection",
  "HowItWorksSection",
  "ComparisonSection",
  "LearningIntelligenceSection",
  "PricingSection",
  "ContactSection",
  "CTASection"
];

const reactBitsComponents = [
  "AnimatedList",
  "Aurora",
  "BlurText",
  "BorderGlow",
  "CountUp",
  "GlassSurface",
  "GradientText",
  "MagicBento",
  "Magnet",
  "ScrollStack",
  "SplitText",
  "SpotlightCard"
];

const threeComponentNames = [
  "ConnectionLines",
  "FloatingStudyCards",
  "Hero3DScene",
  "MindMapCluster",
  "ParticleField",
  "SceneLighting",
  "SynapseCore",
  "SceneFallback"
];

assert.match(landingHtml, /id="landing-root"/, "landing.html should mount the React landing app");
assert.match(landingHtml, /<script type="module" src="\.\/src\/landing\/main\.jsx"><\/script>/, "landing.html should load only the Vite React landing entry");
assert.doesNotMatch(landingHtml, /landing-static\.(css|js)/, "landing.html should not include the old static fallback design");
assert.doesNotMatch(landingHtml, /data-static-fallback|static-landing|static-hero/, "landing.html should not keep static fallback markers");
assert.ok(!exists("frontend/landing-static.css"), "static fallback CSS should be removed");
assert.ok(!exists("frontend/landing-static.js"), "static fallback JS should be removed");
assert.match(landingHtml, /<meta name="theme-color" content="#4a7cff" \/>/, "landing page must keep the original Synapse theme color");
assert.match(viteConfig, /landing:\s*resolve\(__dirname,\s*"frontend\/landing\.html"\)/, "Vite should build the public landing page");

for (const requiredId of ["product", "features", "how-it-works", "about", "pricing", "contact", "contactForm", "authModal"]) {
  assert.ok(landingHtml.includes(`id="${requiredId}"`) || landingSource.includes(`id="${requiredId}"`), `landing page is missing #${requiredId}`);
}

assert.ok(landingSource.includes("data-cycle-step={index + 1}"), "React journey should expose mapped cycle-step attributes");
for (const stepTitle of ["Upload Material", "Generate Notes", "Organise Ideas", "Teach and Practice", "Get Feedback", "Revise and Master"]) {
  assert.ok(landingSource.includes(stepTitle), `React journey should include ${stepTitle}`);
}

for (const sectionName of requiredSections) {
  assert.ok(
    exists(`frontend/src/landing/components/sections/${sectionName}.jsx`),
    `${sectionName} should be implemented as a focused React section`
  );
  assert.ok(landingSource.includes(sectionName), `${sectionName} should be used by the landing app`);
}

for (const componentName of reactBitsComponents) {
  assert.ok(
    exists(`frontend/src/landing/components/react-bits/${componentName}.jsx`),
    `${componentName} React Bits wrapper should exist`
  );
  assert.ok(landingSource.includes(componentName), `${componentName} should be used by the landing page`);
}

for (const componentName of ["Hero3DScene", "SceneFallback"]) {
  assert.ok(exists(`frontend/src/landing/components/three/${componentName}.jsx`), `${componentName} 3D component file should exist`);
}

for (const componentName of threeComponentNames) {
  assert.ok(landingSource.includes(componentName), `${componentName} should be used by the landing page`);
}

assert.ok(packageJson.dependencies.three, "Three.js should be installed for the 3D hero scene");
assert.ok(packageJson.dependencies["@react-three/fiber"], "React Three Fiber should be installed for React-owned 3D components");
assert.ok(!landingSource.includes("@react-three/drei"), "3D scene should avoid Drei helpers to keep the lazy WebGL chunk light");

for (const requiredCopy of [
  "Turn passive study notes into active learning.",
  "Upload Material",
  "Generate Notes",
  "Mind Map",
  "Teach-Back Feedback",
  "Get Started for Free"
]) {
  assert.ok(landingHtml.includes(requiredCopy) || landingSource.includes(requiredCopy), `landing page should include: ${requiredCopy}`);
}

const landingCss = read("frontend/src/landing/landing.css");
assert.ok(landingCss.includes("--primary: #4a7cff"), "landing CSS must keep #4a7cff as the primary token");
assert.ok(landingCss.includes("--accent: #5b8cff"), "landing CSS should keep the Synapse blue accent family");
assert.ok(landingCss.includes("--accent-deep: #3d6af0"), "landing CSS should keep a deeper Synapse blue accent");
for (const forbiddenToken of ["--cyan", "--mint", "--sky", "#06b6d4", "#10b981", "#764ba2"]) {
  assert.ok(!landingCss.includes(forbiddenToken), `landing CSS should not reintroduce ${forbiddenToken}`);
}

for (const requiredCss of [
  "@media (max-width: 1024px)",
  "@media (max-width: 768px)",
  "@media (max-width: 480px)",
  "@media (prefers-reduced-motion: reduce)",
  ".synapse-hero-grid",
  ".three-scene-shell",
  ".magic-bento-grid",
  ".pricing-card.recommended"
]) {
  assert.ok(landingCss.includes(requiredCss), `landing CSS should include ${requiredCss}`);
}

console.log("landing React upgrade regression passed");
