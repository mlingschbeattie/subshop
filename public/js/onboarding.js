// onboarding.js — Student Onboarding Flow (v4)
// First-visit welcome modal on challenges.html

(function () {
  'use strict';

  function shouldShowOnboarding() {
    return !localStorage.getItem('studentName') &&
           window.location.pathname.includes('challenges');
  }

  function showOnboarding() {
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-modal">
        <h1 class="onboarding-title">Welcome to The <em>Sub</em> Shop Security Lab</h1>
        <p class="onboarding-text">
          You've been hired as a junior security auditor.
          The CTO suspects a breach. Your job is to find
          every vulnerability and document the damage.
        </p>
        <div class="onboarding-form">
          <div>
            <label for="onboard-name">Your name</label>
            <input type="text" id="onboard-name" placeholder="Enter your name" autocomplete="name" required>
          </div>
          <div>
            <label for="onboard-class">Class code <span style="font-weight:400;color:#555;">(optional)</span></label>
            <input type="text" id="onboard-class" placeholder="e.g. SUB-A1B2" autocomplete="off">
            <div class="onboarding-hint">Get this from your instructor</div>
          </div>
          <button class="btn btn-primary btn-lg onboarding-submit" id="onboard-submit">Begin Audit →</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('active');
        document.getElementById('onboard-name').focus();
      });
    });

    // Submit handler
    document.getElementById('onboard-submit').addEventListener('click', submit);
    document.getElementById('onboard-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    document.getElementById('onboard-class').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    function submit() {
      const name = document.getElementById('onboard-name').value.trim();
      if (!name) {
        document.getElementById('onboard-name').style.borderColor = '#e8463a';
        document.getElementById('onboard-name').focus();
        return;
      }

      const classCode = document.getElementById('onboard-class').value.trim();

      localStorage.setItem('studentName', name);
      if (classCode) {
        localStorage.setItem('classCode', classCode);
        // Register with server
        fetch('/api/progress/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class_code: classCode, student_name: name })
        }).catch(() => {});
      }

      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (shouldShowOnboarding()) {
      showOnboarding();
    }
  });
})();
