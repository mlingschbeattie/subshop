// learn-mode.js — FreshSqueeze Sub Shop Learn Mode Engine
// Manages: toggle state, hint progression, ELI5 panels, context banners

(function () {
  'use strict';

  const STORAGE_KEY = 'learnMode';
  const HINT_PREFIX = 'learnHints_';

  // ── Toggle Init ───────────────────────────────────────────────────
  function initToggle() {
    const btn = document.getElementById('learn-toggle');
    if (!btn) return;

    const active = localStorage.getItem(STORAGE_KEY) === 'true';
    applyState(active);

    btn.addEventListener('click', () => {
      const next = localStorage.getItem(STORAGE_KEY) !== 'true';
      localStorage.setItem(STORAGE_KEY, String(next));
      applyState(next);
    });
  }

  function applyState(active) {
    const btn = document.getElementById('learn-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('active', active);
    }
    document.body.classList.toggle('learn-active', active);
  }

  // ── Progressive Hints ─────────────────────────────────────────────
  function initHints() {
    const panel = document.querySelector('.learn-hints');
    if (!panel) return;

    const challenge = document.body.dataset.challenge || 'unknown';
    const storageKey = HINT_PREFIX + challenge;
    const hints = panel.querySelectorAll('.hint-item');
    const nextBtn = panel.querySelector('.hint-next-btn');
    const showAllBtn = panel.querySelector('.hint-show-all');
    const hintToggle = panel.querySelector('.hint-toggle-btn');

    if (!hints.length) return;

    // Restore revealed count
    let revealed = parseInt(localStorage.getItem(storageKey) || '0', 10);

    function updateHintVisibility() {
      hints.forEach((h, i) => {
        h.classList.toggle('hidden', i >= revealed);
      });
      if (nextBtn) nextBtn.classList.toggle('hidden', revealed >= hints.length);
      if (showAllBtn) showAllBtn.classList.toggle('hidden', revealed >= hints.length);
      localStorage.setItem(storageKey, String(revealed));
    }

    updateHintVisibility();

    // Toggle panel open/closed
    if (hintToggle) {
      const content = panel.querySelector('.hint-content');
      hintToggle.addEventListener('click', () => {
        const isOpen = content && !content.classList.contains('collapsed');
        if (content) content.classList.toggle('collapsed', isOpen);
        hintToggle.setAttribute('aria-expanded', String(!isOpen));
      });
    }

    // Show next hint
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (revealed < hints.length) {
          revealed++;
          updateHintVisibility();
        }
      });
    }

    // Show all (full walkthrough)
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        revealed = hints.length;
        updateHintVisibility();
        // Also reveal walkthrough block if present
        const walkthrough = panel.querySelector('.hint-walkthrough');
        if (walkthrough) walkthrough.classList.remove('hidden');
      });
    }
  }

  // ── Auto-Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initToggle();
    initHints();
  });

  // Expose for external use
  window.LearnMode = {
    isActive: () => localStorage.getItem(STORAGE_KEY) === 'true',
    toggle: () => {
      const next = localStorage.getItem(STORAGE_KEY) !== 'true';
      localStorage.setItem(STORAGE_KEY, String(next));
      applyState(next);
    }
  };
})();
