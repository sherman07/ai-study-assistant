/** Login form wiring. */
export function attach(api) {
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
      return api.normalizeEmail(window.localStorage.getItem(AUTH_LAST_EMAIL_KEY) || '');
    } catch {
      return '';
    }
  }

  function applyLoginPrefill() {
    let fromQuery = '';
    try {
      if (typeof URLSearchParams === 'function') {
        fromQuery = api.normalizeEmail(new URLSearchParams(window.location.search || '').get('email') || '');
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
    api.showAuthStatus(loginForm, 'info', 'Welcome back — continuing to your workspace…');
    if (loginResumeTimer) window.clearTimeout(loginResumeTimer);
    loginResumeTimer = window.setTimeout(() => {
      api.redirectToApp();
    }, 900);
  }

  function prepareDifferentAccount() {
    hideLoginResume();
    api.clearAuthStatus(loginForm);
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
      api.redirectToApp();
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
      api.showAuthStatus(loginForm, 'info', 'Saved login details were cleared on this device.');
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
          api.showAuthStatus(loginForm, 'info', 'Please enter your password to continue.');
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
    api.clearAllErrors();
    api.clearAuthStatus(loginForm);
    hideLoginResume();

    const email = loginEmailInput?.value.trim() || '';
    const password = loginPasswordInput?.value || '';
    const rememberMe = Boolean(rememberMeInput?.checked);
    
    let hasError = false;

    // Validate email
    if (!email) {
      api.markInvalid('loginEmail', 'emailError', 'Email is required');
      hasError = true;
    } else if (!api.validateEmail(email)) {
      api.markInvalid('loginEmail', 'emailError', 'Please enter a valid email address');
      hasError = true;
    }

    // Validate password
    if (!password) {
      api.markInvalid('loginPassword', 'passwordError', 'Password is required');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (api.realAuthEnabled()) {
      api.setButtonLoading(loginForm, 'loginSpinner', true);
      window.SynapseAuth.setRememberMePreference?.(rememberMe);
      window.SynapseAuth.setLastEmail?.(email);
      window.SynapseAuth.signInEmail({ email, password, rememberMe })
        .then(() => {
          api.showAuthStatus(loginForm, 'success', rememberMe
            ? 'Signed in. Staying signed in on this device…'
            : 'Signed in. Redirecting…');
          api.redirectToApp();
        })
        .catch(error => {
          api.markInvalid('loginEmail', 'emailError', error.message || 'Login failed.');
          api.showAuthStatus(loginForm, 'error', error.message || 'Login failed.');
        })
        .finally(() => {
          api.setButtonLoading(loginForm, 'loginSpinner', false);
        });
      return;
    }

    const account = api.findAccountByEmail(email);
    if (!account) {
      api.markInvalid('loginEmail', 'emailError', 'No Synapse account exists for this email. Create one first.');
      return;
    }
    if (account.authProvider !== 'email') {
      api.markInvalid('loginPassword', 'passwordError', 'This account was created with Google. Continue with Google instead.');
      return;
    }
    api.setButtonLoading(loginForm, 'loginSpinner', true);
    window.SynapseAuth?.setRememberMePreference?.(rememberMe);
    window.SynapseAuth?.setLastEmail?.(email);
    try { window.localStorage.setItem(AUTH_LAST_EMAIL_KEY, api.normalizeEmail(email)); } catch {}
    api.setSession(account);
    api.redirectToApp();
  });

  // Google login
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', function() {
      const rememberMe = Boolean(rememberMeInput?.checked);
      window.SynapseAuth?.setRememberMePreference?.(rememberMe);
      api.continueWithGoogle(googleLoginBtn, rememberMe);
      });
    }
}

}
