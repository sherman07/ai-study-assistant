/** Contact form wiring. */
export function attach(api) {
const CONTACT_INQUIRIES_KEY = 'synapse.contact.inquiries.v1';

function contactEndpoint() {
  const configured = String(
    window.SYNAPSE_CONTACT_ENDPOINT ||
    document.body?.dataset?.contactEndpoint ||
    ''
  ).trim();
  if (configured) return configured;

  const { protocol, hostname } = window.location;
  if (api.api.isLocalDevHost(hostname)) {
    return `${protocol}//127.0.0.1:8001/contact`;
  }
  return '';
}

function showContactStatus(type, message) {
  const status = document.getElementById('contactStatus');
  if (!status) return;
  status.textContent = message;
  status.className = `landing-contact-status show ${type}`;
}

function saveLocalContactInquiry(payload) {
  const inquiries = api.readJSONStorage(CONTACT_INQUIRIES_KEY, []);
  const safeInquiries = Array.isArray(inquiries) ? inquiries : [];
  safeInquiries.unshift({
    ...payload,
    savedAt: new Date().toISOString(),
    delivery: 'local_pending'
  });
  return api.writeJSONStorage(CONTACT_INQUIRIES_KEY, safeInquiries.slice(0, 25));
}

async function sendContactInquiry(payload) {
  if (payload.company) {
    return { ok: true, message: 'Thanks, your enquiry has been received.' };
  }

  const endpoint = contactEndpoint();
  if (!endpoint) {
    saveLocalContactInquiry(payload);
    return {
      ok: true,
      localOnly: true,
      message: 'Thanks, your enquiry has been saved for launch testing. Configure SYNAPSE_CONTACT_ENDPOINT before accepting live public submissions.'
    };
  }

  if (typeof window.fetch !== 'function') {
    throw new Error('Contact delivery requires a browser with fetch support.');
  }

  const response = await window.fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error || `Contact request failed with status ${response.status}.`);
  }
  return {
    ok: true,
    message: data.message || 'Thanks, your enquiry has been received.'
  };
}

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    api.clearAllErrors();
    showContactStatus('info', 'Sending your enquiry...');

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: api.normalizeEmail(formData.get('email')),
      interest: String(formData.get('interest') || 'general').trim(),
      message: String(formData.get('message') || '').trim(),
      company: String(formData.get('company') || '').trim(),
      source: 'synapse_landing'
    };

    let hasError = false;
    if (!payload.name) {
      api.markInvalid('contactName', 'contactNameError', 'Name is required');
      hasError = true;
    }
    if (!payload.email) {
      api.markInvalid('contactEmail', 'contactEmailError', 'Email is required');
      hasError = true;
    } else if (!api.validateEmail(payload.email)) {
      api.markInvalid('contactEmail', 'contactEmailError', 'Please enter a valid email address');
      hasError = true;
    }
    if (!payload.message) {
      api.markInvalid('contactMessage', 'contactMessageError', 'Message is required');
      hasError = true;
    } else if (payload.message.length < 12) {
      api.markInvalid('contactMessage', 'contactMessageError', 'Please add a little more detail');
      hasError = true;
    }

    if (hasError) {
      showContactStatus('error', 'Please fix the highlighted fields before sending.');
      return;
    }

    api.setButtonLoading(contactForm, 'contactSpinner', true);
    try {
      const result = await sendContactInquiry(payload);
      showContactStatus(result.localOnly ? 'info' : 'success', result.message);
      if (!result.localOnly) {
        contactForm.reset();
      }
    } catch (error) {
      saveLocalContactInquiry(payload);
      showContactStatus(
        'error',
        `${error.message || 'Contact delivery failed.'} The enquiry was saved locally so you can retry after configuring the endpoint.`
      );
    } finally {
      api.setButtonLoading(contactForm, 'contactSpinner', false);
    }
  });
}

  Object.assign(api, {
    contactEndpoint,
    showContactStatus,
    saveLocalContactInquiry,
    sendContactInquiry
  });
}
