import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Menu, Moon, Sun, X } from "lucide-react";
import { CTASection } from "./components/sections/CTASection.jsx";
import { ComparisonSection } from "./components/sections/ComparisonSection.jsx";
import { ContactSection } from "./components/sections/ContactSection.jsx";
import { FeaturesSection } from "./components/sections/FeaturesSection.jsx";
import { HeroSection } from "./components/sections/HeroSection.jsx";
import { HowItWorksSection } from "./components/sections/HowItWorksSection.jsx";
import { LearningIntelligenceSection } from "./components/sections/LearningIntelligenceSection.jsx";
import { PricingSection } from "./components/sections/PricingSection.jsx";
import { ProductDemoSection } from "./components/sections/ProductDemoSection.jsx";
import { Magnet } from "./components/react-bits/index.js";
import { navItems } from "./data/landingContent.js";

const footerLinkGroups = [
  {
    title: "Product",
    links: [
      { label: "Product tour", href: "#product" },
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Compare", href: "#about" },
      { label: "Pricing", href: "#pricing" }
    ]
  },
  {
    title: "Learning loop",
    links: [
      { label: "Structured notes", href: "#features" },
      { label: "Mind maps", href: "#product" },
      { label: "Practice questions", href: "#features" },
      { label: "Teach-back feedback", href: "#about" }
    ]
  },
  {
    title: "Account",
    links: [
      { label: "Login", href: "login.html" },
      { label: "Create account", href: "signup.html" },
      { label: "Contact", href: "#contact" },
      { label: "Privacy", href: "privacy.html" },
      { label: "Terms", href: "terms.html" }
    ]
  }
];

const footerLoop = ["Upload", "Understand", "Practice", "Revise"];

const footerHighlights = [
  "Built around active recall, not passive summaries.",
  "Notes, maps, and questions stay grounded in your material.",
  "Start free, then upgrade when your study load grows."
];

function getInitialThemePreference() {
  if (typeof window === "undefined") return "system";
  return window.SynapseTheme?.getPreference?.() || "system";
}

function resolveLandingTheme(preference) {
  if (typeof window === "undefined") return "light";
  return window.SynapseTheme?.resolve?.(preference)
    || (preference === "dark" ? "dark" : "light");
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function AuthModal({ open, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus?.());
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div className={`auth-modal ${open ? "active" : ""}`} id="authModal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle" aria-hidden={!open}>
      <button type="button" className="auth-modal-overlay" aria-label="Close account options" onClick={onClose} />
      <div className="auth-modal-panel">
        <button ref={closeButtonRef} type="button" className="auth-modal-close" aria-label="Close account options" onClick={onClose}>
          <X size={20} />
        </button>
        <img src="/logos/synapse.png" alt="Synapse" />
        <h2 id="authModalTitle">Get Started with Synapse</h2>
        <p>Choose how you want to continue.</p>
        <div className="auth-modal-actions">
          <a className="button button-primary button-wide" href="signup.html">Create New Account</a>
          <a className="button button-secondary button-wide" href="login.html">Login to Existing Account</a>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle({ onToggleTheme, preference }) {
  const isDark = resolveLandingTheme(preference) === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      onClick={onToggleTheme}
    >
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

function Navigation({ onGetStarted, onToggleTheme, preference }) {
  const [open, setOpen] = useState(false);

  function handleAnchorClick(event, href) {
    event.preventDefault();
    setOpen(false);
    scrollToId(href.slice(1));
  }

  return (
    <nav className="landing-nav" id="mainNav">
      <div className="landing-nav-container">
        <a className="landing-logo" href="landing.html" aria-label="Synapse home">
          <img src="/logos/synapse.png" alt="" />
          <span>Synapse</span>
        </a>
        <div className={`landing-nav-menu ${open ? "active" : ""}`} id="navMenu">
          {navItems.map((item) => (
            <a href={item.href} key={item.href} onClick={(event) => handleAnchorClick(event, item.href)}>
              {item.label}
            </a>
          ))}
        </div>
        <ThemeToggle preference={preference} onToggleTheme={onToggleTheme} />
        <div className="landing-nav-actions">
          <a className="button button-ghost" href="login.html">Login</a>
          <Magnet strength={0.12}>
            <button type="button" className="button button-primary" data-action="get-started" onClick={onGetStarted}>Get Started</button>
          </Magnet>
        </div>
        <button
          type="button"
          className="mobile-toggle"
          id="mobileToggle"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="navMenu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </nav>
  );
}

function LandingAtmosphere() {
  return (
    <div className="landing-atmosphere" aria-hidden="true">
      <span className="atmosphere-glow glow-primary" />
      <span className="atmosphere-glow glow-violet" />
      <span className="atmosphere-glow glow-warm" />
      <span className="atmosphere-beam beam-one" />
      <span className="atmosphere-beam beam-two" />
      <span className="atmosphere-grid" />
      <span className="atmosphere-particle particle-one" />
      <span className="atmosphere-particle particle-two" />
      <span className="atmosphere-particle particle-three" />
      <span className="atmosphere-particle particle-four" />
      <span className="atmosphere-particle particle-five" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-container footer-shell">
        <div className="footer-main">
          <div className="footer-brand">
            <a className="footer-logo" href="landing.html" aria-label="Synapse home">
              <img src="/logos/synapse.png" alt="" />
              <span>Synapse</span>
            </a>
            <p className="footer-tagline">
              Source-aware notes, maps, practice, and feedback for students who need to understand the material, not just summarize it.
            </p>
            <div className="footer-loop" aria-label="Synapse study loop">
              {footerLoop.map((item) => (
                <span className="footer-loop-item" key={item}>{item}</span>
              ))}
            </div>
          </div>

          <nav className="footer-columns" aria-label="Footer navigation">
            {footerLinkGroups.map((group) => (
              <div className="footer-column" key={group.title}>
                <h3>{group.title}</h3>
                <div className="footer-link-list">
                  {group.links.map((link) => (
                    <a href={link.href} key={`${group.title}-${link.href}-${link.label}`}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <aside className="footer-insight" aria-labelledby="footer-insight-title">
            <h3 id="footer-insight-title">A cleaner revision loop</h3>
            <p>Bring messy study material in once, then keep turning it into the next useful learning action.</p>
            <ul className="footer-insight-list">
              {footerHighlights.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <a className="footer-text-link" href="#how-it-works">
              See the workflow
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </aside>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Synapse. All rights reserved.</span>
          <div className="footer-bottom-links">
            <a href="privacy.html">Privacy</a>
            <a href="terms.html">Terms</a>
            <a href="#contact">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [themePreference, setThemePreference] = useState(getInitialThemePreference);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    const theme = window.SynapseTheme;
    if (!theme) return undefined;
    theme.apply(theme.getPreference(), { silent: true });
    return theme.subscribe(({ preference }) => setThemePreference(preference));
  }, []);

  function toggleTheme() {
    const next = resolveLandingTheme(themePreference) === "dark" ? "light" : "dark";
    if (window.SynapseTheme?.setPreference) window.SynapseTheme.setPreference(next);
    else setThemePreference(next);
  }

  function handleGetStarted(event) {
    const trigger = event?.currentTarget;
    if (trigger && typeof trigger.focus === "function") returnFocusRef.current = trigger;
    setAuthOpen(true);
  }

  function closeAuthModal() {
    setAuthOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus?.());
  }

  function handleViewDemo() {
    scrollToId("product-demo");
  }

  return (
    <>
      <LandingAtmosphere />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navigation onGetStarted={handleGetStarted} onToggleTheme={toggleTheme} preference={themePreference} />
      <main id="main-content">
        <HeroSection onGetStarted={handleGetStarted} onViewDemo={handleViewDemo} />
        <ProductDemoSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ComparisonSection />
        <LearningIntelligenceSection />
        <PricingSection onGetStarted={handleGetStarted} />
        <ContactSection />
        <CTASection onGetStarted={handleGetStarted} />
      </main>
      <Footer />
      <AuthModal open={authOpen} onClose={closeAuthModal} />
    </>
  );
}
