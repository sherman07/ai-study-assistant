/** Email/password form helpers and local session utilities. */
export function attach(api) {
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isPrivateIpv4Host(hostname) {
  const value = String(hostname || "").toLowerCase();
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return false;
  const nums = parts.map(Number);
  if (nums.some(num => num < 0 || num > 255)) return false;
  return nums[0] === 10
    || (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31)
    || (nums[0] === 192 && nums[1] === 168);
}

function isLocalDevHost(hostname) {
  const value = String(hostname || "").toLowerCase();
  return value === "localhost" || value === "127.0.0.1" || value === "::1" || value === "[::1]" || isPrivateIpv4Host(value);
}

function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
  }
}

function hideError(elementId) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('show');
  }
}

function clearAllErrors() {
  const errors = document.querySelectorAll('.auth-error');
  errors.forEach(error => {
    error.textContent = '';
    error.classList.remove('show');
  });
  document.querySelectorAll('[aria-invalid="true"]').forEach(field => {
    field.setAttribute('aria-invalid', 'false');
  });
}

function markInvalid(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  if (field && typeof field.setAttribute === 'function') {
    field.setAttribute('aria-invalid', 'true');
  }
  showError(errorId, message);
}

const signupFieldErrors = {
  firstName: ['firstName', 'firstNameError'],
  lastName: ['lastName', 'lastNameError'],
  email: ['signupEmail', 'signupEmailError'],
  role: ['role', null],
  password: ['signupPassword', 'signupPasswordError'],
  confirmPassword: ['confirmPassword', 'confirmPasswordError'],
  terms: [null, 'termsError']
};

function showSignupFieldErrors(errors = {}) {
  Object.entries(errors || {}).forEach(([name, message]) => {
    const mapping = signupFieldErrors[name];
    if (!mapping || !message) return;
    const [fieldId, errorId] = mapping;
    if (fieldId && errorId) markInvalid(fieldId, errorId, message);
    else if (errorId) showError(errorId, message);
  });
}

function clearFieldError(fieldId, errorId) {
  if (fieldId) {
    const field = document.getElementById(fieldId);
    if (field && typeof field.setAttribute === 'function') {
      field.setAttribute('aria-invalid', 'false');
    }
  }
  if (errorId) hideError(errorId);
}

function appEntryUrl() {
  const path = window.location.pathname || '';
  if (/\/frontend(?:\/|$)/i.test(path)) {
    return 'index.html';
  }
  return 'frontend/index.html';
}

const AUTH_ACCOUNTS_KEY = 'synapse.auth.accounts.v1';
const AUTH_SESSION_KEY = 'synapse.auth.session.v1';
const AUTH_LAST_EMAIL_KEY = 'synapse.auth.lastEmail.v1';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function readJSONStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (error) {
    console.warn(`Could not read ${key}:`, error);
    return fallback;
  }
}

function writeJSONStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save ${key}:`, error);
    return false;
  }
}

function sanitizeLocalAccount(account) {
  const safe = { ...(account || {}) };
  delete safe.password;
  delete safe.passwordHash;
  delete safe.password_hash;
  delete safe.credential;
  delete safe.credentialHash;
  delete safe.salt;
  safe.email = normalizeEmail(safe.email);
  safe.authMode = safe.authMode || 'local_demo';
  return safe;
}

function saveAccounts(accounts) {
  const safeAccounts = (Array.isArray(accounts) ? accounts : []).map(sanitizeLocalAccount);
  return writeJSONStorage(AUTH_ACCOUNTS_KEY, safeAccounts);
}

function getAccounts() {
  const accounts = readJSONStorage(AUTH_ACCOUNTS_KEY, []);
  if (!Array.isArray(accounts)) return [];
  const safeAccounts = accounts.map(sanitizeLocalAccount);
  if (JSON.stringify(accounts) !== JSON.stringify(safeAccounts)) {
    saveAccounts(safeAccounts);
  }
  return safeAccounts;
}

function displayNameFor(account) {
  return [account?.firstName, account?.lastName].filter(Boolean).join(' ').trim() || account?.email || 'Synapse Student';
}

function publicSessionFor(account) {
  return {
    accountId: account.id,
    email: account.email,
    displayName: displayNameFor(account),
    firstName: account.firstName || '',
    lastName: account.lastName || '',
    role: account.role || 'student',
    plan: account.plan || 'Starter',
    credits: Number(account.credits || 500),
    authProvider: account.authProvider || 'email',
    authMode: account.authMode || 'local_demo',
    createdAt: account.createdAt || new Date().toISOString(),
    signedInAt: new Date().toISOString()
  };
}

function setSession(account) {
  const session = publicSessionFor(account);
  if (window.SynapseAuth?.saveSession) {
    window.SynapseAuth.saveSession(session);
  } else {
    writeJSONStorage(AUTH_SESSION_KEY, session);
  }
  try {
    window.localStorage.setItem(AUTH_LAST_EMAIL_KEY, account.email || '');
  } catch {
    // Storage may be unavailable in rare private browsing modes.
  }
}

function findAccountByEmail(email) {
  const normalized = normalizeEmail(email);
  return getAccounts().find(account => normalizeEmail(account.email) === normalized) || null;
}

function setButtonLoading(form, spinnerId, isLoading) {
  const submitButton = form?.querySelector('button[type="submit"]');
  const spinner = document.getElementById(spinnerId);
  if (submitButton && spinner) {
    submitButton.classList.toggle('loading', isLoading);
    submitButton.disabled = Boolean(isLoading);
    submitButton.setAttribute('aria-busy', String(Boolean(isLoading)));
    const label = submitButton.querySelector('span');
    if (label) {
      if (isLoading) {
        label.dataset.defaultLabel = label.textContent;
        label.textContent = spinnerId === 'signupSpinner' ? 'Sending confirmation…' : 'Signing in…';
      } else if (label.dataset.defaultLabel) {
        label.textContent = label.dataset.defaultLabel;
        delete label.dataset.defaultLabel;
      }
    }
  }
}

function redirectToApp() {
  const params = new URLSearchParams(window.location.search || '');
  const next = window.SynapseAuth?.safeReturnPath?.(params.get('next') || params.get('redirect') || '')
    || '';
  if (next) {
    window.location.href = new URL(next, window.location.origin).toString();
    return;
  }
  window.location.href = window.SynapseAuth?.absoluteAppUrl?.() || appEntryUrl();
}

function realAuthEnabled() {
  return Boolean(window.SynapseAuth?.isConfigured?.());
}

function isLocalDevHost() {
  const hostname = String(window.location?.hostname || '').toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') return true;
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return false;
  const numbers = parts.map(Number);
  return numbers[0] === 10
    || (numbers[0] === 172 && numbers[1] >= 16 && numbers[1] <= 31)
    || (numbers[0] === 192 && numbers[1] === 168);
}

function showAuthStatus(form, type, message) {
  if (!form) return;
  let status = form.querySelector('.auth-form-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'auth-form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) form.insertBefore(status, submitButton);
    else form.appendChild(status);
  }
  status.textContent = message;
  status.className = `auth-form-status show ${type}`;
}

function passwordChecks(password) {
  const value = String(password || '');
  return {
    length: value.length >= 8,
    letter: /[A-Za-z]/.test(value),
    number: /\d/.test(value)
  };
}

function updatePasswordGuidance(input, strength, requirements) {
  if (!input || !strength || !requirements) return;
  const checks = passwordChecks(input.value);
  const score = Object.values(checks).filter(Boolean).length;
  const label = strength.querySelector('.password-strength-label');
  const track = strength.querySelector('.password-strength-track span');
  const labels = ['waiting', 'weak', 'fair', 'strong'];

  strength.setAttribute('data-strength', labels[score]);
  strength.classList.toggle('has-value', Boolean(input.value));
  if (label) label.textContent = `Password strength: ${labels[score]}`;
  if (track) track.style.width = `${(score / 3) * 100}%`;

  requirements.querySelectorAll('[data-rule]').forEach(rule => {
    const key = rule.getAttribute('data-rule');
    const met = Boolean(checks[key]);
    rule.classList.toggle('is-met', met);
    rule.classList.toggle('is-missing', !met);
    const icon = rule.querySelector('i');
    if (icon) icon.className = met ? 'bi bi-check-circle-fill' : 'bi bi-circle';
  });
}

function setupPasswordGuidance(inputId, strengthId, requirementsId) {
  const input = document.getElementById(inputId);
  const strength = document.getElementById(strengthId);
  const requirements = document.getElementById(requirementsId);
  if (!input || !strength || !requirements) return;
  const refresh = () => updatePasswordGuidance(input, strength, requirements);
  input.addEventListener('input', refresh);
  refresh();
}

  Object.assign(api, {
    validateEmail,
    isPrivateIpv4Host,
    isLocalDevHost,
    showError,
    hideError,
    clearAllErrors,
    markInvalid,
    showSignupFieldErrors,
    clearFieldError,
    appEntryUrl,
    normalizeEmail,
    readJSONStorage,
    writeJSONStorage,
    sanitizeLocalAccount,
    saveAccounts,
    getAccounts,
    displayNameFor,
    publicSessionFor,
    setSession,
    findAccountByEmail,
    setButtonLoading,
    redirectToApp,
    realAuthEnabled,
    isLocalDevHost,
    showAuthStatus,
    passwordChecks,
    updatePasswordGuidance,
    setupPasswordGuidance
  });
}
