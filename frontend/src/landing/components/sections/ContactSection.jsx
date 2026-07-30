import { useState } from "react";
import { Lock, Mail, Send, UserRound } from "lucide-react";
import { GlassSurface, Magnet } from "../react-bits/index.js";

const CONTACT_KEY = "synapse.contact.inquiries.v1";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function saveLocalInquiry(payload) {
  const existing = JSON.parse(window.localStorage.getItem(CONTACT_KEY) || "[]");
  const safeExisting = Array.isArray(existing) ? existing : [];
  window.localStorage.setItem(CONTACT_KEY, JSON.stringify([
    { ...payload, savedAt: new Date().toISOString(), delivery: "local_pending" },
    ...safeExisting
  ].slice(0, 25)));
}

function contactEndpoint() {
  return String(window.SYNAPSE_CONTACT_ENDPOINT || document.body?.dataset?.contactEndpoint || "").trim();
}

export function ContactSection() {
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim().toLowerCase(),
      interest: String(data.get("interest") || "general").trim(),
      message: String(data.get("message") || "").trim(),
      company: String(data.get("company") || "").trim(),
      source: "synapse_landing_react"
    };

    const nextErrors = {};
    if (!payload.name) nextErrors.name = "Name is required.";
    if (!payload.email) nextErrors.email = "Email is required.";
    else if (!isValidEmail(payload.email)) nextErrors.email = "Please enter a valid email address.";
    if (!payload.message) nextErrors.message = "Message is required.";
    else if (payload.message.length < 12) nextErrors.message = "Please add a little more detail.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ type: "error", message: "Please fix the highlighted fields before sending." });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "info", message: "Sending your enquiry..." });
    try {
      const endpoint = contactEndpoint();
      if (payload.company || !endpoint) {
        saveLocalInquiry(payload);
        setStatus({
          type: endpoint ? "success" : "info",
          message: endpoint
            ? "Thanks, your enquiry has been recorded."
            : "Contact delivery is not configured in this browser session. Your enquiry was saved locally for launch testing only."
        });
        form.reset();
        return;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error) throw new Error(result.error || "Contact delivery failed.");
      setStatus({ type: "success", message: result.message || "Thanks, your enquiry has been received." });
      form.reset();
    } catch (error) {
      saveLocalInquiry(payload);
      setStatus({ type: "error", message: `${error.message || "Contact delivery failed."} Your enquiry was saved locally.` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section contact-section" id="contact">
      <div className="landing-container contact-grid">
        <div className="section-heading">
          <h2>Questions about launch, classrooms, or study workflows?</h2>
          <p>Send a concise note and the Synapse team can follow up about student access, deployments, or product feedback.</p>
          <div className="contact-promises">
            <span><Mail size={17} /> Response target: 1-2 business days after email delivery is configured.</span>
            <span><Lock size={17} /> Please do not include passwords, API keys, or sensitive student records.</span>
          </div>
        </div>

        <GlassSurface as="form" className="contact-form" id="contactForm" noValidate data-contact-form onSubmit={handleSubmit}>
          <input type="text" name="company" className="contact-honeypot" tabIndex="-1" autoComplete="off" aria-hidden="true" />
          <div className="form-row">
            <label>
              <span><UserRound size={16} /> Name</span>
              <input id="contactName" name="name" type="text" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby="contactNameError" />
              <small id="contactNameError">{errors.name}</small>
            </label>
            <label>
              <span><Mail size={16} /> Email</span>
              <input id="contactEmail" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby="contactEmailError" />
              <small id="contactEmailError">{errors.email}</small>
            </label>
          </div>
          <label>
            <span>What can we help with?</span>
            <select id="contactInterest" name="interest">
              <option value="general">General enquiry</option>
              <option value="student">Student access</option>
              <option value="school">School or classroom use</option>
              <option value="deployment">Deployment or integration</option>
              <option value="support">Support</option>
            </select>
          </label>
          <label>
            <span>Message</span>
            <textarea id="contactMessage" name="message" rows="5" minLength="12" placeholder="Tell us what you want Synapse to help with." aria-invalid={Boolean(errors.message)} aria-describedby="contactMessageError" />
            <small id="contactMessageError">{errors.message}</small>
          </label>
          <Magnet>
            <button type="submit" className="button button-primary button-wide" disabled={submitting}>
              <Send size={17} />
              {submitting ? "Sending..." : "Send Enquiry"}
            </button>
          </Magnet>
          {status && <div className={`contact-status ${status.type}`} id="contactStatus" role="status" aria-live="polite">{status.message}</div>}
        </GlassSurface>
      </div>
    </section>
  );
}
