/** Modals, navigation, and get-started actions. */
export function attach(api) {
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

  Object.assign(api, {
    openModal,
    closeModal
  });
}
