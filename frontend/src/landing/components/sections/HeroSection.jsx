import { lazy, Suspense } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { BlurText, CountUp, GlassSurface, GradientText, Magnet, SplitText } from "../react-bits/index.js";
import { heroBadges, heroStats } from "../../data/landingContent.js";
import { SceneFallback } from "../three/SceneFallback.jsx";

const Hero3DScene = lazy(() => import("../three/Hero3DScene.jsx"));

export function HeroSection({ onGetStarted, onViewDemo }) {
  return (
    <section className="section hero-section" id="product">
      <div className="hero-noise" aria-hidden="true" />
      <div className="landing-container synapse-hero-grid">
        <div className="hero-copy">
          <p className="hero-brand-mark">
            <img src="/logos/synapse.png" alt="" />
            <span>Synapse</span>
          </p>
          <h1 aria-label="Turn passive study notes into active learning.">
            <span className="hero-title-line">
              <SplitText text="Turn passive" />
            </span>{" "}
            <span className="hero-title-line">
              <SplitText text="study notes into" startDelay={150} />
            </span>{" "}
            <GradientText className="hero-title-line hero-title-accent">active learning.</GradientText>
          </h1>
          <p className="hero-subtitle">
            <BlurText>
              Upload lectures, PDFs, slides, images, or notes. Synapse builds source-aware notes, maps, practice, and feedback as mastery grows.
            </BlurText>
          </p>
          <div className="hero-actions">
            <Magnet>
              <button type="button" className="button button-primary" data-action="get-started" onClick={onGetStarted}>
                Get Started
                <ArrowRight size={18} />
              </button>
            </Magnet>
            <Magnet strength={0.16}>
              <button type="button" className="button button-secondary" data-action="view-demo" onClick={onViewDemo}>
                <PlayCircle size={18} />
                View Demo
              </button>
            </Magnet>
          </div>
          <ul className="hero-flow-list" aria-label="Synapse learning flow">
            {heroBadges.map((badge) => (
              <li key={badge}>{badge}</li>
            ))}
          </ul>
        </div>

        <div className="hero-visual">
          <GlassSurface className="hero-scene-card">
            <Suspense fallback={<SceneFallback />}>
              <Hero3DScene />
            </Suspense>
          </GlassSurface>
        </div>
      </div>

      <div className="landing-container hero-trust-strip" aria-label="Synapse product signals">
        {heroStats.map((stat) => (
          <div className="hero-stat hero-stat-copy" key={stat.label}>
            {stat.value !== "" && stat.value != null ? (
              <strong><CountUp value={stat.value} suffix={stat.suffix} /></strong>
            ) : null}
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
