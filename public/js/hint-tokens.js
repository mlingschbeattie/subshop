// hint-tokens.js — Hint Token Economy (v4)
// Replaces binary show/hide hints with a 3-token progressive system

(function () {
  'use strict';

  const TOKENS_KEY = 'hintTokens';
  const WALKTHROUGH_KEY = 'walkthroughUsed';

  function getTokens(challengeId) {
    try {
      const all = JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}');
      return all[challengeId] !== undefined ? all[challengeId] : 3;
    } catch (e) {
      return 3;
    }
  }

  function setTokens(challengeId, count) {
    try {
      const all = JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}');
      all[challengeId] = count;
      localStorage.setItem(TOKENS_KEY, JSON.stringify(all));
    } catch (e) { /* ignore */ }
  }

  function isWalkthroughUsed(challengeId) {
    try {
      const all = JSON.parse(localStorage.getItem(WALKTHROUGH_KEY) || '{}');
      return !!all[challengeId];
    } catch (e) {
      return false;
    }
  }

  function markWalkthroughUsed(challengeId) {
    try {
      const all = JSON.parse(localStorage.getItem(WALKTHROUGH_KEY) || '{}');
      all[challengeId] = true;
      localStorage.setItem(WALKTHROUGH_KEY, JSON.stringify(all));
    } catch (e) { /* ignore */ }
  }

  function getSolveQuality(challengeId) {
    const tokens = getTokens(challengeId);
    const walkthrough = isWalkthroughUsed(challengeId);
    if (walkthrough) return { label: 'Assisted', icon: '◎', stars: 0 };
    if (tokens >= 3) return { label: 'Gold', icon: '⭐⭐⭐', stars: 3 };
    if (tokens === 2) return { label: 'Silver', icon: '⭐⭐', stars: 2 };
    if (tokens === 1) return { label: 'Bronze', icon: '⭐', stars: 1 };
    return { label: 'Completed', icon: '✓', stars: 0 };
  }

  function recordHintUse(challengeId) {
    const studentName = localStorage.getItem('studentName') || 'anonymous';
    const classCode = localStorage.getItem('classCode') || '';
    fetch('/api/progress/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_code: classCode,
        student_name: studentName,
        challenge_id: challengeId
      })
    }).catch(() => {});
  }

  // Upgrade the existing hint panels with token economy
  function upgradeHintPanel() {
    const panel = document.querySelector('.learn-hints');
    if (!panel) return;

    const challengeId = document.body.dataset.challenge;
    if (!challengeId) return;

    const hints = panel.querySelectorAll('.hint-item');
    const nextBtn = panel.querySelector('.hint-next-btn');
    const showAllBtn = panel.querySelector('.hint-show-all');
    if (!hints.length) return;

    let tokens = getTokens(challengeId);
    const HINT_PREFIX = 'learnHints_';
    let revealed = parseInt(localStorage.getItem(HINT_PREFIX + challengeId) || '0', 10);

    // Create token display
    const tokenDisplay = document.createElement('div');
    tokenDisplay.className = 'hint-tokens-display';
    updateTokenDisplay();

    // Insert before hints
    const hintContent = panel.querySelector('.hint-content');
    if (hintContent) {
      hintContent.insertBefore(tokenDisplay, hintContent.firstChild);
    }

    // Replace the next button behavior
    if (nextBtn) {
      const newBtn = document.createElement('button');
      newBtn.className = 'hint-spend-btn';
      newBtn.textContent = 'Spend a token for the next hint →';
      nextBtn.parentNode.replaceChild(newBtn, nextBtn);

      newBtn.addEventListener('click', () => {
        if (tokens <= 0 || revealed >= hints.length) return;
        tokens--;
        setTokens(challengeId, tokens);
        revealed++;
        localStorage.setItem(HINT_PREFIX + challengeId, String(revealed));
        updateHints();
        updateTokenDisplay();
        recordHintUse(challengeId);
      });
    }

    // Replace show all button
    if (showAllBtn) {
      const newShowAll = document.createElement('button');
      newShowAll.className = 'hint-walkthrough-btn';
      newShowAll.innerHTML = '📖 Show full walkthrough';
      showAllBtn.parentNode.replaceChild(newShowAll, showAllBtn);

      if (tokens > 0 && !isWalkthroughUsed(challengeId)) {
        newShowAll.style.display = 'none';
      }

      newShowAll.addEventListener('click', () => {
        markWalkthroughUsed(challengeId);
        revealed = hints.length;
        localStorage.setItem(HINT_PREFIX + challengeId, String(revealed));
        updateHints();
        updateTokenDisplay();
        const walkthrough = panel.querySelector('.hint-walkthrough');
        if (walkthrough) walkthrough.classList.remove('hidden');
      });
    }

    function updateHints() {
      hints.forEach((h, i) => {
        h.classList.toggle('hidden', i >= revealed);
      });
      const spendBtn = panel.querySelector('.hint-spend-btn');
      if (spendBtn) {
        spendBtn.classList.toggle('hidden', revealed >= hints.length);
        spendBtn.disabled = tokens <= 0;
        if (tokens <= 0) {
          spendBtn.textContent = 'No tokens remaining';
        }
      }
      const wtBtn = panel.querySelector('.hint-walkthrough-btn');
      if (wtBtn && tokens <= 0) {
        wtBtn.style.display = '';
      }
    }

    function updateTokenDisplay() {
      const coins = '🪙'.repeat(Math.max(0, tokens));
      const emptyCoins = '  '.repeat(Math.max(0, 3 - tokens));
      tokenDisplay.innerHTML = `
        <span>${coins}${emptyCoins}</span>
        <span class="hint-token-count">${tokens} token${tokens !== 1 ? 's' : ''} remaining</span>
      `;
    }

    updateHints();
  }

  // Run after learn-mode.js has initialized
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(upgradeHintPanel, 100);
    });
  } else {
    setTimeout(upgradeHintPanel, 100);
  }

  window.HintTokens = {
    getTokens,
    setTokens,
    getSolveQuality,
    isWalkthroughUsed
  };
})();
