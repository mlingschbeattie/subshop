// fix-it.js — Fix It Mode with CodeMirror 5 (v4)
// Loaded via CDN, no build step. Pattern matching validation only — never eval().

(function () {
  'use strict';

  let cmEditor = null;
  let cmLoaded = false;
  let loadPromise = null;

  // Load CodeMirror 5 from CDN
  function loadCodeMirror() {
    if (loadPromise) return loadPromise;
    if (cmLoaded) return Promise.resolve();

    loadPromise = new Promise((resolve) => {
      // CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css';
      document.head.appendChild(link);

      const theme = document.createElement('link');
      theme.rel = 'stylesheet';
      theme.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/dracula.min.css';
      document.head.appendChild(theme);

      // JS
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js';
      script.onload = () => {
        const jsMode = document.createElement('script');
        jsMode.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js';
        jsMode.onload = () => {
          cmLoaded = true;
          resolve();
        };
        document.head.appendChild(jsMode);
      };
      document.head.appendChild(script);
    });

    return loadPromise;
  }

  // Initialize editor in the Fix It panel
  window.initFixItEditor = function (challengeId, vulnCode) {
    const container = document.getElementById('fix-it-editor-container');
    if (!container) return;

    // Don't re-initialize if already set up for this challenge
    if (container.dataset.initialized === challengeId) return;
    container.dataset.initialized = challengeId;
    container.innerHTML = '';

    loadCodeMirror().then(() => {
      if (!window.CodeMirror) {
        container.innerHTML = '<pre style="padding:1rem;color:#aaa;font-size:0.82rem;">' +
          vulnCode + '</pre><p style="color:#777;font-size:0.78rem;margin-top:0.5rem;">CodeMirror failed to load. Edit above and test.</p>';
        setupFallbackEditor(container, challengeId, vulnCode);
        return;
      }

      cmEditor = CodeMirror(container, {
        value: vulnCode,
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2,
        indentWithTabs: false,
        viewportMargin: Infinity
      });

      // Test button
      const testBtn = document.getElementById('fix-test-btn');
      if (testBtn) {
        testBtn.onclick = () => testFix(challengeId, cmEditor.getValue());
      }
    });
  };

  function setupFallbackEditor(container, challengeId, vulnCode) {
    const textarea = document.createElement('textarea');
    textarea.value = vulnCode;
    textarea.style.cssText = 'width:100%;min-height:200px;background:#0a0a0a;color:#f0ece4;border:1px solid #333;border-radius:6px;padding:1rem;font-family:"Space Mono",monospace;font-size:0.82rem;resize:vertical;';
    container.innerHTML = '';
    container.appendChild(textarea);

    const testBtn = document.getElementById('fix-test-btn');
    if (testBtn) {
      testBtn.onclick = () => testFix(challengeId, textarea.value);
    }
  }

  function testFix(challengeId, code) {
    const resultEl = document.getElementById('fix-result');
    if (!resultEl) return;

    resultEl.className = 'breach-fix-result';
    resultEl.textContent = '⏳ Testing your fix...';

    fetch('/api/fix/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, code })
    })
    .then(r => r.json())
    .then(data => {
      if (data.passed) {
        resultEl.className = 'breach-fix-result pass';
        resultEl.textContent = '✅ ' + data.message;

        // Record fix in progress
        const studentName = localStorage.getItem('studentName') || 'anonymous';
        const classCode = localStorage.getItem('classCode') || '';
        fetch('/api/progress/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class_code: classCode, student_name: studentName, challenge_id: challengeId })
        }).catch(() => {});

        // Store fix badge locally
        try {
          const fixes = JSON.parse(localStorage.getItem('fixBadges') || '[]');
          if (!fixes.includes(challengeId)) {
            fixes.push(challengeId);
            localStorage.setItem('fixBadges', JSON.stringify(fixes));
          }
        } catch (e) { /* ignore */ }
      } else {
        resultEl.className = 'breach-fix-result fail';
        resultEl.textContent = '❌ ' + data.message;
      }
    })
    .catch(() => {
      resultEl.className = 'breach-fix-result warn';
      resultEl.textContent = '⚠️ Could not reach the server. Try again.';
    });
  }
})();
