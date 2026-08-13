/** Auth status UI, mailbox helpers, and Google continue. */
export function attach(api) {
function emailDomain(email) {
  const address = api.normalizeEmail(email);
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
  const address = api.normalizeEmail(email);
  return address
    ? `Account created for ${address}. Check that exact inbox, including Spam and Promotions, to confirm your Synapse account.${mailboxClarity(address)}`
    : 'Account created. Check your email, including Spam and Promotions, to confirm your Synapse account.';
}

function showSignupConfirmationStatus(form, email) {
  const normalizedEmail = api.normalizeEmail(email);
  api.showAuthStatus(form, 'success', signupConfirmationMessage(normalizedEmail));
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
        api.showAuthStatus(form, 'error', error.message || 'Could not resend the confirmation email.');
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
  const normalizedEmail = api.normalizeEmail(email);
  api.showAuthStatus(
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
  const normalizedEmail = api.normalizeEmail(email);
  api.showAuthStatus(
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
        api.showAuthStatus(
          form,
          'success',
          result?.message || 'Confirmation email sent. Please check your inbox and spam folder.'
        );
      })
      .catch(error => {
        api.showAuthStatus(form, 'error', error.message || 'Could not resend the confirmation email.');
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
    api.showAuthStatus(form, 'error', result?.message || 'Supabase email confirmation appears disabled.');
    return true;
  }
  return false;
}

function showLocalDemoSignupAction(form, details) {
  api.showAuthStatus(form, 'warning', 'Local email delivery is not configured, so the confirmation email cannot be sent from localhost. Configure SYNAPSE_SMTP_HOST and SYNAPSE_SMTP_FROM_EMAIL to test real email.');
  const status = form?.querySelector?.('.auth-form-status');
  if (!status) return;
  const actions = document.createElement('div');
  actions.className = 'auth-status-actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'auth-status-button';
  button.textContent = 'Continue with local demo';
  button.addEventListener('click', () => {
    const existing = api.findAccountByEmail(details.email);
    if (existing) {
      showExistingAccountStatus(form, details.email);
      return;
    }
    const account = createAccount(details);
    api.setSession(account);
    api.showAuthStatus(form, 'success', 'Local demo account created. Email confirmation is skipped on localhost. Opening your workspace…');
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
  const normalizedEmail = api.normalizeEmail(email);
  const accounts = api.getAccounts();
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
  accounts.unshift(api.sanitizeLocalAccount(account));
  api.saveAccounts(accounts);
  return api.sanitizeLocalAccount(account);
}

function continueWithGoogle(button, rememberMe = false) {
  clearSocialAuthStatus(button);
  if (!api.realAuthEnabled()) {
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
    redirectTo: window.SynapseAuth?.absoluteAppUrl?.() || new URL(api.appEntryUrl(), window.location.href).toString()
  }).catch(error => {
    showSocialAuthStatus(button, 'error', error.message || 'Google sign-in could not start.');
    if (button) {
      button.disabled = wasDisabled;
      button.removeAttribute('aria-busy');
    }
  });
}

  Object.assign(api, {
    emailDomain,
    mailboxTargetForEmail,
    mailboxClarity,
    showResetMailboxAction,
    signupConfirmationMessage,
    showSignupConfirmationStatus,
    createStatusLink,
    showExistingAccountStatus,
    showPendingAccountStatus,
    showSignupAccountState,
    showLocalDemoSignupAction,
    clearAuthStatus,
    showSocialAuthStatus,
    clearSocialAuthStatus,
    createAccount,
    continueWithGoogle
  });
}
