/* ==========================================
   Synapse Landing & Auth Pages JavaScript
   ========================================== */

(function() {
  'use strict';

  // ==========================================
  // Utility Functions
  // ==========================================
  
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

  function emailDomain(email) {
    const address = normalizeEmail(email);
    return address.includes('@') ? address.split('@').pop() : '';
  }

  function mailboxTargetForEmail(email) {
    const domain = emailDomain(email);
    const targets = {
      'gmail.com': { label: 'Open Gmail', href: 'https://mail.google.com/' },
      'googlemail.com': { label: 'Open Gmail', href: 'https://mail.google.com/' },
      '163.com': { label: 'Open 163 Mail', href: 'https://mail.163.com/' },
      '126.com': { label: 'Open 126 Mail', href: 'https://mail.126.com/' },
      'qq.com': { label: 'Open QQ Mail', href: 'https://mail.qq.com/' },
      'outlook.com': { label: 'Open Outlook', href: 'https://outlook.live.com/mail/' },
      'hotmail.com': { label: 'Open Outlook', href: 'https://outlook.live.com/mail/' },
      'icloud.com': { label: 'Open iCloud Mail', href: 'https://www.icloud.com/mail/' },
      'yahoo.com': { label: 'Open Yahoo Mail', href: 'https://mail.yahoo.com/' }
    };
    return targets[domain] || null;
  }

  function mailboxClarity(email) {
    const domain = emailDomain(email);
    if (!domain) return '';
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      return ' This is a Gmail address.';
    }
    return ` This is a ${domain} address, so it will not arrive in Gmail unless that mailbox forwards to Gmail.`;
  }

  function showResetMailboxAction(email) {
    const actions = document.getElementById('resetSuccessActions');
    const target = mailboxTargetForEmail(email);
    if (!actions || !target) return;
    actions.textContent = '';
    actions.appendChild(createStatusLink(target.label, target.href));
  }

  function signupConfirmationMessage(email) {
    const address = normalizeEmail(email);
    return address
      ? `Account created for ${address}. Check that exact inbox, including Spam and Promotions, to confirm your Synapse account.${mailboxClarity(address)}`
      : 'Account created. Check your email, including Spam and Promotions, to confirm your Synapse account.';
  }

  function showSignupConfirmationStatus(form, email) {
    const normalizedEmail = normalizeEmail(email);
    showAuthStatus(form, 'success', signupConfirmationMessage(normalizedEmail));
    const status = form?.querySelector?.('.auth-form-status');
    if (!status || !normalizedEmail || !window.SynapseAuth?.resendSignupConfirmation) return;

    const actions = document.createElement('div');
    actions.className = 'auth-status-actions';

    const resendButton = document.createElement('button');
    resendButton.type = 'button';
    resendButton.className = 'auth-status-button';
    resendButton.textContent = 'Resend Confirmation Email';
    resendButton.addEventListener('click', () => {
      resendButton.disabled = true;
      resendButton.textContent = 'Sending...';
      window.SynapseAuth.resendSignupConfirmation(normalizedEmail)
        .then(result => {
          showSignupConfirmationStatus(form, result?.email || normalizedEmail);
          const refreshedStatus = form?.querySelector?.('.auth-form-status');
          if (refreshedStatus?.firstChild) {
            refreshedStatus.firstChild.textContent = result?.message || 'Confirmation email sent. Please check your inbox and spam folder.';
          }
        })
        .catch(error => {
          showAuthStatus(form, 'error', error.message || 'Could not resend the confirmation email.');
        });
    });

    actions.appendChild(resendButton);
    const mailboxTarget = mailboxTargetForEmail(normalizedEmail);
    if (mailboxTarget) {
      actions.appendChild(createStatusLink(mailboxTarget.label, mailboxTarget.href));
    }
    actions.appendChild(createStatusLink('Go to Login', 'login.html'));
    status.appendChild(actions);
  }

  function createStatusLink(label, href) {
    const link = document.createElement('a');
    link.className = 'auth-status-button auth-status-link';
    link.href = href;
    link.textContent = label;
    return link;
  }

  function showExistingAccountStatus(form, email) {
    const normalizedEmail = normalizeEmail(email);
    showAuthStatus(
      form,
      'warning',
      normalizedEmail
        ? `An account already exists for ${normalizedEmail}. Please log in instead.`
        : 'An account already exists for this email. Please log in instead.'
    );
    const status = form?.querySelector?.('.auth-form-status');
    if (!status) return;
    const actions = document.createElement('div');
    actions.className = 'auth-status-actions';
    actions.appendChild(createStatusLink('Go to Login', 'login.html'));
    actions.appendChild(createStatusLink('Forgot Password', `forgot-password.html?email=${encodeURIComponent(normalizedEmail)}`));
    status.appendChild(actions);
  }

  function showPendingAccountStatus(form, email) {
    const normalizedEmail = normalizeEmail(email);
    showAuthStatus(
      form,
      'info',
      normalizedEmail
        ? `This email already has a pending account for ${normalizedEmail}. Check that inbox, including Spam and Promotions, or resend the confirmation email.${mailboxClarity(normalizedEmail)}`
        : 'This email already has a pending account. Please check your inbox, including Spam and Promotions, or resend the confirmation email.'
    );
    const status = form?.querySelector?.('.auth-form-status');
    if (!status) return;
    const actions = document.createElement('div');
    actions.className = 'auth-status-actions';

    const resendButton = document.createElement('button');
    resendButton.type = 'button';
    resendButton.className = 'auth-status-button';
    resendButton.textContent = 'Resend Confirmation Email';
    resendButton.disabled = !normalizedEmail || !window.SynapseAuth?.resendSignupConfirmation;
    resendButton.addEventListener('click', () => {
      resendButton.disabled = true;
      resendButton.textContent = 'Sending...';
      window.SynapseAuth.resendSignupConfirmation(normalizedEmail)
        .then(result => {
          showAuthStatus(
            form,
            'success',
            result?.message || 'Confirmation email sent. Please check your inbox and spam folder.'
          );
        })
        .catch(error => {
          showAuthStatus(form, 'error', error.message || 'Could not resend the confirmation email.');
        });
    });

    const changeEmailButton = document.createElement('button');
    changeEmailButton.type = 'button';
    changeEmailButton.className = 'auth-status-button';
    changeEmailButton.textContent = 'Change Email';
    changeEmailButton.addEventListener('click', () => {
      clearAuthStatus(form);
      const emailInput = document.getElementById('signupEmail');
      if (emailInput) {
        emailInput.focus();
        emailInput.select?.();
      }
    });

    actions.appendChild(resendButton);
    const mailboxTarget = mailboxTargetForEmail(normalizedEmail);
    if (mailboxTarget) {
      actions.appendChild(createStatusLink(mailboxTarget.label, mailboxTarget.href));
    }
    actions.appendChild(changeEmailButton);
    status.appendChild(actions);
  }

  function showSignupAccountState(form, result, fallbackEmail) {
    const state = result?.state || '';
    const email = result?.email || fallbackEmail;
    if (state === 'created_confirmation_sent') {
      showSignupConfirmationStatus(form, email);
      return true;
    }
    if (state === 'existing_confirmed') {
      showExistingAccountStatus(form, email);
      return true;
    }
    if (state === 'existing_unconfirmed') {
      showPendingAccountStatus(form, email);
      return true;
    }
    if (state === 'email_confirmation_disabled') {
      showAuthStatus(form, 'error', result?.message || 'Supabase email confirmation appears disabled.');
      return true;
    }
    return false;
  }

  function showLocalDemoSignupAction(form, details) {
    showAuthStatus(form, 'warning', 'Local email delivery is not configured, so the confirmation email cannot be sent from localhost. Configure SYNAPSE_SMTP_HOST and SYNAPSE_SMTP_FROM_EMAIL to test real email.');
    const status = form?.querySelector?.('.auth-form-status');
    if (!status) return;
    const actions = document.createElement('div');
    actions.className = 'auth-status-actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'auth-status-button';
    button.textContent = 'Continue with local demo';
    button.addEventListener('click', () => {
      const existing = findAccountByEmail(details.email);
      if (existing) {
        showExistingAccountStatus(form, details.email);
        return;
      }
      const account = createAccount(details);
      setSession(account);
      showAuthStatus(form, 'success', 'Local demo account created. Email confirmation is skipped on localhost. Opening your workspace…');
      window.setTimeout(redirectToApp, 250);
    });
    actions.appendChild(button);
    status.appendChild(actions);
  }

  function clearAuthStatus(form) {
    const status = form?.querySelector?.('.auth-form-status');
    if (status) {
      status.textContent = '';
      status.className = 'auth-form-status';
    }
  }

  function showSocialAuthStatus(button, type, message) {
    if (!button) {
      alert(message);
      return;
    }
    let status = button.parentElement?.querySelector?.('.auth-social-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'auth-form-status auth-social-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      button.insertAdjacentElement('afterend', status);
    }
    status.textContent = message;
    status.className = `auth-form-status auth-social-status show ${type}`;
  }

  function clearSocialAuthStatus(button) {
    const status = button?.parentElement?.querySelector?.('.auth-social-status');
    if (status) {
      status.textContent = '';
      status.className = 'auth-form-status auth-social-status';
    }
  }

  function createAccount({ firstName, lastName, email, role, authProvider = 'email' }) {
    const normalizedEmail = normalizeEmail(email);
    const accounts = getAccounts();
    const now = new Date().toISOString();
    const account = {
      id: `acct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      firstName: String(firstName || '').trim(),
      lastName: String(lastName || '').trim(),
      email: normalizedEmail,
      role: role || 'student',
      authProvider,
      authMode: 'local_demo',
      plan: 'Starter',
      credits: 500,
      createdAt: now,
      updatedAt: now
    };
    accounts.unshift(sanitizeLocalAccount(account));
    saveAccounts(accounts);
    return sanitizeLocalAccount(account);
  }

  function continueWithGoogle(button, rememberMe = false) {
    clearSocialAuthStatus(button);
    if (!realAuthEnabled()) {
      showSocialAuthStatus(
        button,
        'error',
        'Google sign-in is not configured yet. Add your public Supabase URL and anon key, then enable the Google provider in Supabase Auth.'
      );
      return;
    }

    const wasDisabled = Boolean(button?.disabled);
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    }

    window.SynapseAuth.signInWithGoogle({
      rememberMe,
      redirectTo: window.SynapseAuth?.absoluteAppUrl?.() || new URL(appEntryUrl(), window.location.href).toString()
    }).catch(error => {
      showSocialAuthStatus(button, 'error', error.message || 'Google sign-in could not start.');
      if (button) {
        button.disabled = wasDisabled;
        button.removeAttribute('aria-busy');
      }
    });
  }

  // ==========================================
  // Modal Functions
  // ==========================================
  
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const closeButton = modal.querySelector('button[data-close-modal]');
      if (closeButton && typeof closeButton.focus === 'function') {
        closeButton.focus();
      }
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  // ==========================================
  // Navigation
  // ==========================================
  
  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileToggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', function() {
      const navMenu = document.getElementById('navMenu');
      if (navMenu) {
        const isActive = navMenu.classList.toggle('active');
        mobileToggle.setAttribute('aria-expanded', String(isActive));
        mobileToggle.setAttribute('aria-label', isActive ? 'Close navigation menu' : 'Open navigation menu');
      }
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href.length > 1) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          const navMenu = document.getElementById('navMenu');
          if (navMenu?.classList.contains('active')) {
            navMenu.classList.remove('active');
            mobileToggle?.setAttribute('aria-expanded', 'false');
            mobileToggle?.setAttribute('aria-label', 'Open navigation menu');
          }
        }
      }
    });
  });

  document.querySelectorAll('[data-action="view-demo"]').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.getElementById('how-it-works');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ==========================================
  // Get Started Actions
  // ==========================================
  
  const getStartedButtons = document.querySelectorAll('[data-action="get-started"]');
  getStartedButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      openModal('authModal');
    });
  });

  // Modal close handlers
  const closeModalButtons = document.querySelectorAll('[data-close-modal]');
  closeModalButtons.forEach(button => {
    button.addEventListener('click', function() {
      closeModal('authModal');
    });
  });

  // Close modal on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal('authModal');
    }
  });

  // ==========================================
  // Login Form
  // ==========================================
  
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const rememberMeInput = loginForm.querySelector('input[name="remember"]');
    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginResume = document.getElementById('loginResume');
    const loginResumeEmail = document.getElementById('loginResumeEmail');
    const loginResumeContinue = document.getElementById('loginResumeContinue');
    const loginResumeSwitch = document.getElementById('loginResumeSwitch');
    const loginResumeForget = document.getElementById('loginResumeForget');
    let loginResumeTimer = null;

    function rememberedEmail() {
      const fromAuth = window.SynapseAuth?.getLastEmail?.() || '';
      if (fromAuth) return fromAuth;
      try {
        return normalizeEmail(window.localStorage.getItem(AUTH_LAST_EMAIL_KEY) || '');
      } catch {
        return '';
      }
    }

    function applyLoginPrefill() {
      let fromQuery = '';
      try {
        if (typeof URLSearchParams === 'function') {
          fromQuery = normalizeEmail(new URLSearchParams(window.location.search || '').get('email') || '');
        }
      } catch {}
      const email = fromQuery || rememberedEmail();
      if (loginEmailInput && email && !loginEmailInput.value) {
        loginEmailInput.value = email;
      }
      if (rememberMeInput && window.SynapseAuth?.getRememberMePreference) {
        rememberMeInput.checked = window.SynapseAuth.getRememberMePreference();
      } else if (rememberMeInput && !rememberMeInput.checked) {
        // Default to staying signed in on this device for returning users.
        rememberMeInput.checked = Boolean(email);
      }
      if (loginPasswordInput && email && typeof loginPasswordInput.focus === 'function') {
        window.setTimeout(() => loginPasswordInput.focus(), 0);
      }
    }

    function hideLoginResume() {
      if (loginResumeTimer) {
        window.clearTimeout(loginResumeTimer);
        loginResumeTimer = null;
      }
      if (loginResume) {
        loginResume.hidden = true;
        loginResume.classList.remove('is-visible');
      }
      loginForm.classList?.remove?.('is-resume-hidden');
    }

    function showLoginResume(session) {
      if (!loginResume || !session) return;
      const email = session.email || rememberedEmail() || 'your account';
      const name = session.displayName || session.firstName || '';
      if (loginResumeEmail) {
        loginResumeEmail.textContent = name ? `${name} · ${email}` : email;
      }
      loginResume.hidden = false;
      loginResume.classList.add('is-visible');
      loginForm.classList?.add?.('is-resume-hidden');
      showAuthStatus(loginForm, 'info', 'Welcome back — continuing to your workspace…');
      if (loginResumeTimer) window.clearTimeout(loginResumeTimer);
      loginResumeTimer = window.setTimeout(() => {
        redirectToApp();
      }, 900);
    }

    function prepareDifferentAccount() {
      hideLoginResume();
      clearAuthStatus(loginForm);
      if (loginEmailInput) {
        loginEmailInput.value = '';
        loginEmailInput.focus();
      }
      if (loginPasswordInput) loginPasswordInput.value = '';
      if (rememberMeInput) rememberMeInput.checked = false;
      window.SynapseAuth?.setRememberMePreference?.(false);
    }

    applyLoginPrefill();

    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    
    if (togglePassword && loginPasswordInput) {
      togglePassword.addEventListener('click', function() {
        const type = loginPasswordInput.type === 'password' ? 'text' : 'password';
        loginPasswordInput.type = type;
        this.setAttribute('aria-pressed', String(type === 'text'));
        this.setAttribute('aria-label', type === 'text' ? 'Hide password' : 'Show password');
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-eye');
          icon.classList.toggle('bi-eye-slash');
        }
      });
    }

    if (loginResumeContinue) {
      loginResumeContinue.addEventListener('click', function() {
        if (loginResumeTimer) window.clearTimeout(loginResumeTimer);
        redirectToApp();
      });
    }

    if (loginResumeSwitch) {
      loginResumeSwitch.addEventListener('click', function() {
        prepareDifferentAccount();
      });
    }

    if (loginResumeForget) {
      loginResumeForget.addEventListener('click', async function() {
        prepareDifferentAccount();
        window.SynapseAuth?.clearLastEmail?.();
        try { window.localStorage.removeItem(AUTH_LAST_EMAIL_KEY); } catch {}
        try {
          await window.SynapseAuth?.signOut?.();
        } catch (error) {
          console.warn('Could not clear remembered Synapse session:', error);
        }
        showAuthStatus(loginForm, 'info', 'Saved login details were cleared on this device.');
      });
    }

    // Resume a remembered session without asking for the password again.
    const resumeRememberedSession = () => {
      const auth = window.SynapseAuth;
      const sync = auth?.requireApiSession
        ? auth.requireApiSession()
        : (auth?.syncSessionFromProvider
          ? auth.syncSessionFromProvider()
          : Promise.resolve(auth?.getStoredSession?.() || null));
      sync
        .then(async session => {
          if (!session?.accountId && !session?.email) {
            applyLoginPrefill();
            return;
          }
          const token = auth?.accessToken ? await auth.accessToken() : session.accessToken;
          if (!token) {
            // Email-only ghosts used to auto-bounce forever between login and admin.
            applyLoginPrefill();
            showAuthStatus(loginForm, 'info', 'Please enter your password to continue.');
            return;
          }
          if (auth?.setLastEmail && session.email) {
            auth.setLastEmail(session.email);
          }
          if (loginEmailInput && session.email) loginEmailInput.value = session.email;
          if (rememberMeInput) rememberMeInput.checked = true;
          auth?.setRememberMePreference?.(true);
          showLoginResume(session);
        })
        .catch(error => {
          console.warn('Could not restore remembered Synapse login:', error);
          applyLoginPrefill();
        });
    };
    resumeRememberedSession();

    // Form submission
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      clearAllErrors();
      clearAuthStatus(loginForm);
      hideLoginResume();

      const email = loginEmailInput?.value.trim() || '';
      const password = loginPasswordInput?.value || '';
      const rememberMe = Boolean(rememberMeInput?.checked);
      
      let hasError = false;

      // Validate email
      if (!email) {
        markInvalid('loginEmail', 'emailError', 'Email is required');
        hasError = true;
      } else if (!validateEmail(email)) {
        markInvalid('loginEmail', 'emailError', 'Please enter a valid email address');
        hasError = true;
      }

      // Validate password
      if (!password) {
        markInvalid('loginPassword', 'passwordError', 'Password is required');
        hasError = true;
      }

      if (hasError) {
        return;
      }

      if (realAuthEnabled()) {
        setButtonLoading(loginForm, 'loginSpinner', true);
        window.SynapseAuth.setRememberMePreference?.(rememberMe);
        window.SynapseAuth.setLastEmail?.(email);
        window.SynapseAuth.signInEmail({ email, password, rememberMe })
          .then(() => {
            showAuthStatus(loginForm, 'success', rememberMe
              ? 'Signed in. Staying signed in on this device…'
              : 'Signed in. Redirecting…');
            redirectToApp();
          })
          .catch(error => {
            markInvalid('loginEmail', 'emailError', error.message || 'Login failed.');
            showAuthStatus(loginForm, 'error', error.message || 'Login failed.');
          })
          .finally(() => {
            setButtonLoading(loginForm, 'loginSpinner', false);
          });
        return;
      }

      const account = findAccountByEmail(email);
      if (!account) {
        markInvalid('loginEmail', 'emailError', 'No Synapse account exists for this email. Create one first.');
        return;
      }
      if (account.authProvider !== 'email') {
        markInvalid('loginPassword', 'passwordError', 'This account was created with Google. Continue with Google instead.');
        return;
      }
      setButtonLoading(loginForm, 'loginSpinner', true);
      window.SynapseAuth?.setRememberMePreference?.(rememberMe);
      window.SynapseAuth?.setLastEmail?.(email);
      try { window.localStorage.setItem(AUTH_LAST_EMAIL_KEY, normalizeEmail(email)); } catch {}
      setSession(account);
      redirectToApp();
    });

    // Google login
      const googleLoginBtn = document.getElementById('googleLoginBtn');
      if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function() {
        const rememberMe = Boolean(rememberMeInput?.checked);
        window.SynapseAuth?.setRememberMePreference?.(rememberMe);
        continueWithGoogle(googleLoginBtn, rememberMe);
        });
      }
  }

  // ==========================================
  // Signup Form
  // ==========================================
  
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    let signupSubmitting = false;

    setupPasswordGuidance('signupPassword', 'signupPasswordStrength', 'signupPasswordRequirements');

    // Toggle password visibility for signup
    const toggleSignupPassword = document.getElementById('toggleSignupPassword');
    const signupPassword = document.getElementById('signupPassword');
    
    if (toggleSignupPassword && signupPassword) {
      toggleSignupPassword.addEventListener('click', function() {
        const type = signupPassword.type === 'password' ? 'text' : 'password';
        signupPassword.type = type;
        this.setAttribute('aria-pressed', String(type === 'text'));
        this.setAttribute('aria-label', type === 'text' ? 'Hide password' : 'Show password');
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-eye');
          icon.classList.toggle('bi-eye-slash');
        }
      });
    }

    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (toggleConfirmPassword && confirmPassword) {
      toggleConfirmPassword.addEventListener('click', function() {
        const type = confirmPassword.type === 'password' ? 'text' : 'password';
        confirmPassword.type = type;
        this.setAttribute('aria-pressed', String(type === 'text'));
        this.setAttribute('aria-label', type === 'text' ? 'Hide confirmed password' : 'Show confirmed password');
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-eye');
          icon.classList.toggle('bi-eye-slash');
        }
      });
    }

    if (typeof signupForm.querySelectorAll === 'function') {
      signupForm.querySelectorAll('input, select').forEach(field => {
        const clearSignupField = () => {
          const key = field.name === 'email' ? 'email' : field.name;
          const mapping = signupFieldErrors[key];
          if (mapping) clearFieldError(mapping[0], mapping[1]);
          clearAuthStatus(signupForm);
        };
        field.addEventListener?.('input', clearSignupField);
        field.addEventListener?.('change', clearSignupField);
      });
    }

    // Form submission
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (signupSubmitting) return;
      clearAllErrors();
      clearAuthStatus(signupForm);

      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const role = document.getElementById('role').value;
      const password = document.getElementById('signupPassword').value;
      const confirmPass = document.getElementById('confirmPassword').value;
      const termsCheckbox = signupForm.querySelector('input[name="terms"]');
      
      let hasError = false;

      // Validate first name
      if (!firstName) {
        markInvalid('firstName', 'firstNameError', 'First name is required');
        hasError = true;
      }

      // Validate last name
      if (!lastName) {
        markInvalid('lastName', 'lastNameError', 'Last name is required');
        hasError = true;
      }

      // Validate email
      if (!email) {
        markInvalid('signupEmail', 'signupEmailError', 'Email is required');
        hasError = true;
      } else if (!validateEmail(email)) {
        markInvalid('signupEmail', 'signupEmailError', 'Please enter a valid email address');
        hasError = true;
      }

      // Validate password
      if (!password) {
        markInvalid('signupPassword', 'signupPasswordError', 'Password is required');
        hasError = true;
      } else if (password.length < 8) {
        markInvalid('signupPassword', 'signupPasswordError', 'Password must be at least 8 characters');
        hasError = true;
      } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        markInvalid('signupPassword', 'signupPasswordError', 'Password must include at least one letter and one number');
        hasError = true;
      }

      // Validate confirm password
      if (!confirmPass) {
        markInvalid('confirmPassword', 'confirmPasswordError', 'Please confirm your password');
        hasError = true;
      } else if (password !== confirmPass) {
        markInvalid('confirmPassword', 'confirmPasswordError', 'Passwords do not match');
        hasError = true;
      }

      // Validate terms
      if (termsCheckbox && !termsCheckbox.checked) {
        showError('termsError', 'You must agree to the Terms and Privacy Policy');
        hasError = true;
      }

      if (hasError) {
        return;
      }

      if (realAuthEnabled()) {
        signupSubmitting = true;
        setButtonLoading(signupForm, 'signupSpinner', true);
        showAuthStatus(signupForm, 'info', 'Connecting to Synapse Auth. The first local request may take a moment while the backend wakes up.');
        window.SynapseAuth.signUpEmail({
          firstName,
          lastName,
          email,
          role,
          password,
          confirmPassword: confirmPass,
          termsAccepted: Boolean(termsCheckbox && termsCheckbox.checked)
        })
          .then(result => {
            if (showSignupAccountState(signupForm, result, email)) {
              if (result?.state === 'created_confirmation_sent') {
                signupForm.reset();
              }
              return;
            }
            if (result?.session) {
              redirectToApp();
              return;
            }
            if (result?.ok) {
              showAuthStatus(signupForm, 'success', result.message || 'Account created. Check your email to confirm your Synapse account, then log in.');
              signupForm.reset();
              return;
            }
            showAuthStatus(signupForm, 'error', result?.message || 'Sign up failed.');
          })
          .catch(error => {
            if (error?.state === 'email_not_configured' && isLocalDevHost()) {
              showLocalDemoSignupAction(signupForm, { firstName, lastName, email, role, authProvider: 'email' });
              return;
            }
            if (error?.errors) {
              showSignupFieldErrors(error.errors);
            }
            if (!error?.errors || Object.keys(error.errors).length === 0) {
              markInvalid('signupEmail', 'signupEmailError', error.message || 'Sign up failed.');
            }
            showAuthStatus(signupForm, 'error', error.message || 'Sign up failed.');
          })
          .finally(() => {
            signupSubmitting = false;
            setButtonLoading(signupForm, 'signupSpinner', false);
          });
        return;
      }

      if (findAccountByEmail(email)) {
        markInvalid('signupEmail', 'signupEmailError', 'An account already exists for this email. Login instead.');
        return;
      }

      setButtonLoading(signupForm, 'signupSpinner', true);
      const account = createAccount({ firstName, lastName, email, role });
      setSession(account);
      redirectToApp();
    });

    // Google signup
    const googleSignupBtn = document.getElementById('googleSignupBtn');
    if (googleSignupBtn) {
      googleSignupBtn.addEventListener('click', function() {
        continueWithGoogle(googleSignupBtn);
      });
    }
  }

  // ==========================================
  // Forgot Password Form
  // ==========================================
  
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  if (forgotPasswordForm) {
    const resetEmailInput = document.getElementById('resetEmail');
    try {
      const prefillEmail = normalizeEmail(new URLSearchParams(window.location.search || '').get('email'));
      if (resetEmailInput && prefillEmail) resetEmailInput.value = prefillEmail;
    } catch {
      // Ignore malformed query strings; the form validation will handle manual input.
    }

    forgotPasswordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      clearAllErrors();
      clearAuthStatus(forgotPasswordForm);

      const email = document.getElementById('resetEmail').value.trim();
      
      let hasError = false;

      // Validate email
      if (!email) {
        markInvalid('resetEmail', 'resetEmailError', 'Email is required');
        hasError = true;
      } else if (!validateEmail(email)) {
        markInvalid('resetEmail', 'resetEmailError', 'Please enter a valid email address');
        hasError = true;
      }

      if (hasError) {
        return;
      }

      if (realAuthEnabled()) {
        setButtonLoading(forgotPasswordForm, 'resetSpinner', true);
        window.SynapseAuth.resetPassword(email)
          .then(() => {
            const successDiv = document.getElementById('resetSuccess');
            if (successDiv) successDiv.classList.add('show');
            showResetMailboxAction(email);
            forgotPasswordForm.classList?.add('d-none');
            forgotPasswordForm.closest?.('.auth-card')?.classList.add('reset-complete');
          })
          .catch(error => {
            markInvalid('resetEmail', 'resetEmailError', error.message || 'Password reset failed.');
            showAuthStatus(forgotPasswordForm, 'error', error.message || 'Password reset failed.');
          })
          .finally(() => {
            setButtonLoading(forgotPasswordForm, 'resetSpinner', false);
          });
        return;
      }

      const account = findAccountByEmail(email);
      if (!account) {
        markInvalid('resetEmail', 'resetEmailError', 'No Synapse account exists for this email.');
        return;
      }

      setButtonLoading(forgotPasswordForm, 'resetSpinner', true);
      setTimeout(() => {
        writeJSONStorage('synapse.auth.reset.v1', {
          email: normalizeEmail(email),
          requestedAt: new Date().toISOString()
        });
        const successDiv = document.getElementById('resetSuccess');
        if (successDiv) {
          successDiv.classList.add('show');
        }
        showResetMailboxAction(email);
        forgotPasswordForm.classList?.add('d-none');
        forgotPasswordForm.closest?.('.auth-card')?.classList.add('reset-complete');
        setButtonLoading(forgotPasswordForm, 'resetSpinner', false);
      }, 1500);
    });
  }

  // ==========================================
  // Contact Form
  // ==========================================

  const CONTACT_INQUIRIES_KEY = 'synapse.contact.inquiries.v1';

  function contactEndpoint() {
    const configured = String(
      window.SYNAPSE_CONTACT_ENDPOINT ||
      document.body?.dataset?.contactEndpoint ||
      ''
    ).trim();
    if (configured) return configured;

    const { protocol, hostname } = window.location;
    if (isLocalDevHost(hostname)) {
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
    const inquiries = readJSONStorage(CONTACT_INQUIRIES_KEY, []);
    const safeInquiries = Array.isArray(inquiries) ? inquiries : [];
    safeInquiries.unshift({
      ...payload,
      savedAt: new Date().toISOString(),
      delivery: 'local_pending'
    });
    return writeJSONStorage(CONTACT_INQUIRIES_KEY, safeInquiries.slice(0, 25));
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
      delivered: data.delivered !== false,
      message: data.message || 'Thanks, your enquiry has been received.'
    };
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      clearAllErrors();
      showContactStatus('info', 'Sending your enquiry...');

      const formData = new FormData(contactForm);
      const payload = {
        name: String(formData.get('name') || '').trim(),
        email: normalizeEmail(formData.get('email')),
        interest: String(formData.get('interest') || 'general').trim(),
        message: String(formData.get('message') || '').trim(),
        company: String(formData.get('company') || '').trim(),
        source: 'synapse_landing'
      };

      let hasError = false;
      if (!payload.name) {
        markInvalid('contactName', 'contactNameError', 'Name is required');
        hasError = true;
      }
      if (!payload.email) {
        markInvalid('contactEmail', 'contactEmailError', 'Email is required');
        hasError = true;
      } else if (!validateEmail(payload.email)) {
        markInvalid('contactEmail', 'contactEmailError', 'Please enter a valid email address');
        hasError = true;
      }
      if (!payload.message) {
        markInvalid('contactMessage', 'contactMessageError', 'Message is required');
        hasError = true;
      } else if (payload.message.length < 12) {
        markInvalid('contactMessage', 'contactMessageError', 'Please add a little more detail');
        hasError = true;
      }

      if (hasError) {
        showContactStatus('error', 'Please fix the highlighted fields before sending.');
        return;
      }

      setButtonLoading(contactForm, 'contactSpinner', true);
      try {
        const result = await sendContactInquiry(payload);
        const statusType = result.localOnly || result.delivered === false ? 'info' : 'success';
        showContactStatus(statusType, result.message);
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
        setButtonLoading(contactForm, 'contactSpinner', false);
      }
    });
  }

  // ==========================================
  // Mouse tracking for feature cards (3D effect)
  // ==========================================
  
  const featureCards = document.querySelectorAll('.landing-feature-card');
  featureCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });

  // ==========================================
  // Scroll Animations (Simple fade-in on scroll)
  // ==========================================
  
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    // Observe elements with data-aos attribute
    document.querySelectorAll('[data-aos]').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }

  // ==========================================
  // Voucher redemption should be connected when production checkout is added.
  // ==========================================
  
})();
