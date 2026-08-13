/** Forgot-password form wiring. */
export function attach(api) {
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
  const resetEmailInput = document.getElementById('resetEmail');
  try {
    const prefillEmail = api.normalizeEmail(new URLSearchParams(window.location.search || '').get('email'));
    if (resetEmailInput && prefillEmail) resetEmailInput.value = prefillEmail;
  } catch {
    // Ignore malformed query strings; the form validation will handle manual input.
  }

  forgotPasswordForm.addEventListener('submit', function(e) {
    e.preventDefault();
    api.clearAllErrors();
    api.clearAuthStatus(forgotPasswordForm);

    const email = document.getElementById('resetEmail').value.trim();
    
    let hasError = false;

    // Validate email
    if (!email) {
      api.markInvalid('resetEmail', 'resetEmailError', 'Email is required');
      hasError = true;
    } else if (!api.validateEmail(email)) {
      api.markInvalid('resetEmail', 'resetEmailError', 'Please enter a valid email address');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (api.realAuthEnabled()) {
      api.setButtonLoading(forgotPasswordForm, 'resetSpinner', true);
      window.SynapseAuth.resetPassword(email)
        .then(() => {
          const successDiv = document.getElementById('resetSuccess');
          if (successDiv) successDiv.classList.add('show');
          api.showResetMailboxAction(email);
          forgotPasswordForm.classList?.add('d-none');
          forgotPasswordForm.closest?.('.auth-card')?.classList.add('reset-complete');
        })
        .catch(error => {
          api.markInvalid('resetEmail', 'resetEmailError', error.message || 'Password reset failed.');
          api.showAuthStatus(forgotPasswordForm, 'error', error.message || 'Password reset failed.');
        })
        .finally(() => {
          api.setButtonLoading(forgotPasswordForm, 'resetSpinner', false);
        });
      return;
    }

    const account = api.findAccountByEmail(email);
    if (!account) {
      api.markInvalid('resetEmail', 'resetEmailError', 'No Synapse account exists for this email.');
      return;
    }

    api.setButtonLoading(forgotPasswordForm, 'resetSpinner', true);
    setTimeout(() => {
      api.writeJSONStorage('synapse.auth.reset.v1', {
        email: api.normalizeEmail(email),
        requestedAt: new Date().toISOString()
      });
      const successDiv = document.getElementById('resetSuccess');
      if (successDiv) {
        successDiv.classList.add('show');
      }
      api.showResetMailboxAction(email);
      forgotPasswordForm.classList?.add('d-none');
      forgotPasswordForm.closest?.('.auth-card')?.classList.add('reset-complete');
      api.setButtonLoading(forgotPasswordForm, 'resetSpinner', false);
    }, 1500);
  });
}

}
