/* 
=============================================================================
  NEXUS GAMING - MAIN UI & INTERACTION CONTROLLER
  File: js/main.js
=============================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Navigation Hamburger Menu Toggle
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const navMenu = document.getElementById('nav-menu');

  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const isExpanded = navMenu.classList.contains('active');
      hamburgerBtn.setAttribute('aria-expanded', isExpanded);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburgerBtn.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });
  }

  // 2. Active Link Highlighting based on current path
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 3. FAQ Accordion Collapsible Items
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Close all other items for clean accordion effect
        faqItems.forEach(otherItem => otherItem.classList.remove('active'));

        // Toggle clicked item
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });

  // 4. Modal Dialog Controller (Login & Register Demo)
  const modalOverlay = document.getElementById('auth-modal');
  const openLoginBtns = document.querySelectorAll('.open-login-btn');
  const openRegisterBtns = document.querySelectorAll('.open-register-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalSubmitBtn = document.getElementById('modal-submit-btn');

  function openModal(mode) {
    if (!modalOverlay) return;
    if (mode === 'register') {
      if (modalTitle) modalTitle.textContent = 'Create Free Player Account';
      if (modalSubmitBtn) modalSubmitBtn.textContent = 'Register Now';
    } else {
      if (modalTitle) modalTitle.textContent = 'Welcome Back Player';
      if (modalSubmitBtn) modalSubmitBtn.textContent = 'Secure Login';
    }
    modalOverlay.classList.add('active');
  }

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  }

  openLoginBtns.forEach(btn => btn.addEventListener('click', () => openModal('login')));
  openRegisterBtns.forEach(btn => btn.addEventListener('click', () => openModal('register')));

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }

  // Prevent default form submit on demo form
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Frontend Demo Mode: Connect backend API endpoint here to process real user authentication.');
      closeModal();
    });
  }
});
