/** Signup form wiring. */
export function attach(api) {
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  let signupSubmitting = false;

  api.setupPasswordGuidance('signupPassword', 'signupPasswordStrength', 'signupPasswordRequirements');

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
        if (mapping) api.clearFieldError(mapping[0], mapping[1]);
        api.clearAuthStatus(signupForm);
      };
      field.addEventListener?.('input', clearSignupField);
      field.addEventListener?.('change', clearSignupField);
    });
  }

  // Form submission
  signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (signupSubmitting) return;
    api.clearAllErrors();
    api.clearAuthStatus(signupForm);

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
      api.markInvalid('firstName', 'firstNameError', 'First name is required');
      hasError = true;
    }

    // Validate last name
    if (!lastName) {
      api.markInvalid('lastName', 'lastNameError', 'Last name is required');
      hasError = true;
    }

    // Validate email
    if (!email) {
      api.markInvalid('signupEmail', 'signupEmailError', 'Email is required');
      hasError = true;
    } else if (!api.validateEmail(email)) {
      api.markInvalid('signupEmail', 'signupEmailError', 'Please enter a valid email address');
      hasError = true;
    }

    // Validate password
    if (!password) {
      api.markInvalid('signupPassword', 'signupPasswordError', 'Password is required');
      hasError = true;
    } else if (password.length < 8) {
      api.markInvalid('signupPassword', 'signupPasswordError', 'Password must be at least 8 characters');
      hasError = true;
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      api.markInvalid('signupPassword', 'signupPasswordError', 'Password must include at least one letter and one number');
      hasError = true;
    }

    // Validate confirm password
    if (!confirmPass) {
      api.markInvalid('confirmPassword', 'confirmPasswordError', 'Please confirm your password');
      hasError = true;
    } else if (password !== confirmPass) {
      api.markInvalid('confirmPassword', 'confirmPasswordError', 'Passwords do not match');
      hasError = true;
    }

    // Validate terms
    if (termsCheckbox && !termsCheckbox.checked) {
      api.showError('termsError', 'You must agree to the Terms and Privacy Policy');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (api.realAuthEnabled()) {
      signupSubmitting = true;
      api.setButtonLoading(signupForm, 'signupSpinner', true);
      api.showAuthStatus(signupForm, 'info', 'Connecting to Synapse Auth. The first local request may take a moment while the backend wakes up.');
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
          if (api.showSignupAccountState(signupForm, result, email)) {
            if (result?.state === 'created_confirmation_sent') {
              signupForm.reset();
            }
            return;
          }
          if (result?.session) {
            api.redirectToApp();
            return;
          }
          if (result?.ok) {
            api.showAuthStatus(signupForm, 'success', result.message || 'Account created. Check your email to confirm your Synapse account, then log in.');
            signupForm.reset();
            return;
          }
          api.showAuthStatus(signupForm, 'error', result?.message || 'Sign up failed.');
        })
        .catch(error => {
          if (error?.state === 'email_not_configured' && api.api.isLocalDevHost()) {
            api.showLocalDemoSignupAction(signupForm, { firstName, lastName, email, role, authProvider: 'email' });
            return;
          }
          if (error?.errors) {
            api.showSignupFieldErrors(error.errors);
          }
          if (!error?.errors || Object.keys(error.errors).length === 0) {
            api.markInvalid('signupEmail', 'signupEmailError', error.message || 'Sign up failed.');
          }
          api.showAuthStatus(signupForm, 'error', error.message || 'Sign up failed.');
        })
        .finally(() => {
          signupSubmitting = false;
          api.setButtonLoading(signupForm, 'signupSpinner', false);
        });
      return;
    }

    if (api.findAccountByEmail(email)) {
      api.markInvalid('signupEmail', 'signupEmailError', 'An account already exists for this email. Login instead.');
      return;
    }

    api.setButtonLoading(signupForm, 'signupSpinner', true);
    const account = api.createAccount({ firstName, lastName, email, role });
    api.setSession(account);
    api.redirectToApp();
  });

  // Google signup
  const googleSignupBtn = document.getElementById('googleSignupBtn');
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', function() {
      api.continueWithGoogle(googleSignupBtn);
    });
  }
}

}
