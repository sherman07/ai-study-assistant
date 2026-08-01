import { CheckCircle2 } from "lucide-react";
import { BorderGlow, CountUp, Magnet, SpotlightCard } from "../react-bits/index.js";
import { pricingPlans } from "../../data/landingContent.js";

function PricingCard({ plan, onGetStarted }) {
  const isFree = plan.price === 0;
  const content = (
    <SpotlightCard className={`pricing-card ${plan.recommended ? "recommended" : ""}`}>
      {plan.recommended && <span className="pricing-badge">Recommended</span>}
      <div className="pricing-header">
        <h3>{plan.name}</h3>
        <p>{plan.description}</p>
      </div>
      <div className="pricing-price">
        <span>$</span>
        <CountUp value={plan.price} decimals={2} />
      </div>
      <div className="pricing-credits">
        {plan.creditLabel || (
          <>
            <CountUp value={plan.credits} /> credits
          </>
        )}
      </div>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>
            <CheckCircle2 size={17} />
            {feature}
          </li>
        ))}
      </ul>
      <Magnet>
        {isFree ? (
          <button type="button" className="button button-secondary" data-action="get-started" onClick={onGetStarted}>
            Continue Free
          </button>
        ) : (
          <a className={`button ${plan.recommended ? "button-primary" : "button-secondary"}`} href="pricing.html">
            Upgrade to Pro
          </a>
        )}
      </Magnet>
    </SpotlightCard>
  );

  return plan.recommended ? <BorderGlow>{content}</BorderGlow> : content;
}

export function PricingSection({ onGetStarted }) {
  return (
    <section className="section pricing-section" id="pricing">
      <div className="landing-container">
        <div className="section-heading">
          <h2>Free to start, Pro when you need more.</h2>
          <p>Fresh AI credits every day. Free includes welcome credits; Pro unlocks 1,000 daily credits, Deep Study, and optional Boost packs. Payments use Stripe Checkout.</p>
        </div>

        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} onGetStarted={onGetStarted} />
          ))}
        </div>
      </div>
    </section>
  );
}
