// breach-detector.js — Solve Detection per Challenge (v4)
// Each challenge page registers a solve condition.
// When met, it calls window.triggerBreachReport(challengeId).

(function () {
  'use strict';

  const challengeId = document.body.dataset.challenge;
  if (!challengeId) return;

  // Debounce helper
  let _triggered = false;
  function trigger() {
    if (_triggered) return;
    _triggered = true;
    if (typeof window.triggerBreachReport === 'function') {
      window.triggerBreachReport(challengeId);
    }
  }

  // ── Detection per challenge ──────────────────────────────

  const detectors = {
    // menu.html — ?role=staff in URL AND staff items visible
    'a01': function () {
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      if (role === 'staff' || role === 'admin') {
        const staffSection = document.getElementById('staff-menu');
        if (staffSection && !staffSection.classList.contains('hidden')) {
          trigger();
          return;
        }
        // Poll for DOM change
        const obs = new MutationObserver(() => {
          const s = document.getElementById('staff-menu');
          if (s && !s.classList.contains('hidden')) { trigger(); obs.disconnect(); }
        });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true });
      }
    },

    // loyalty.html — atob() called or decode button clicked + token decoded
    'a02': function () {
      // Override atob to detect usage
      const _origAtob = window.atob;
      window.atob = function (str) {
        const result = _origAtob.call(window, str);
        // If decoding a loyalty token
        if (str.length > 20) trigger();
        return result;
      };
      // Also detect decode button
      document.addEventListener('click', function (e) {
        if (e.target && (e.target.id === 'decode-btn' || e.target.closest('#decode-btn'))) {
          setTimeout(trigger, 500);
        }
      });
    },

    // search.html — <script> or <img appears in rendered innerHTML output
    'a03-dom': function () {
      const obs = new MutationObserver(() => {
        const resultsArea = document.getElementById('search-results') || document.getElementById('results-area');
        if (!resultsArea) return;
        const html = resultsArea.innerHTML.toLowerCase();
        if (html.includes('<script') || html.includes('<img') || html.includes('onerror') || html.includes('onload')) {
          trigger();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    },

    // order.html — form submitted with price < 1.00
    'a04': function () {
      document.addEventListener('submit', function (e) {
        const priceField = document.querySelector('input[name="price"]') ||
                           document.getElementById('item-price');
        if (priceField) {
          const price = parseFloat(priceField.value);
          if (price < 1.00) trigger();
        }
      });
      // Also watch for fetch/XMLHttpRequest
      const _origFetch = window.fetch;
      window.fetch = function () {
        const args = arguments;
        if (args[1] && args[1].body) {
          try {
            const body = typeof args[1].body === 'string' ? JSON.parse(args[1].body) : args[1].body;
            if (body.price !== undefined && parseFloat(body.price) < 1.00) trigger();
          } catch (e) { /* ignore */ }
        }
        return _origFetch.apply(window, args);
      };
    },

    // admin.html — correct password entered OR STAFF_PASSWORD accessed
    'a05': function () {
      const obs = new MutationObserver(() => {
        const adminContent = document.getElementById('admin-content') || document.querySelector('.admin-section');
        if (adminContent && !adminContent.classList.contains('hidden') &&
            adminContent.style.display !== 'none') {
          trigger();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    },

    // recipes.html — isAdmin set to true via prototype pollution
    'a06': function () {
      // Poll for prototype pollution result
      setInterval(() => {
        if (({}).isAdmin === true || window.isAdmin === true) {
          trigger();
        }
        // Check if RCE demonstration succeeded
        const output = document.getElementById('rce-output') || document.getElementById('pollution-result');
        if (output && output.textContent.trim().length > 0) {
          trigger();
        }
      }, 1000);
    },

    // login.html — login succeeds with manipulated localStorage token
    'a07': function () {
      const obs = new MutationObserver(() => {
        const successBanner = document.querySelector('.alert-success') ||
                              document.querySelector('[data-auth-success]');
        if (successBanner) trigger();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      // Also detect successful API login
      const _origFetch = window.fetch;
      window.fetch = function () {
        const result = _origFetch.apply(window, arguments);
        result.then(r => {
          if (r.url && r.url.includes('/api/login') && r.ok) {
            trigger();
          }
        }).catch(() => {});
        return result;
      };
    },

    // cart.html — checkout attempted with total < $5.00 after localStorage edit
    'a08': function () {
      document.addEventListener('click', function (e) {
        if (e.target && (e.target.id === 'checkout-btn' || e.target.closest('#checkout-btn') ||
            e.target.textContent.toLowerCase().includes('checkout'))) {
          try {
            const cart = JSON.parse(localStorage.getItem('cart') || '{}');
            let total = 0;
            if (cart.items) {
              cart.items.forEach(item => { total += (item.price || 0) * (item.qty || 1); });
            }
            if (total < 5.00 && total > 0) trigger();
          } catch (e) { /* ignore */ }
        }
      });
    },

    // feedback.html — input matching credit card pattern submitted
    'a09': function () {
      document.addEventListener('submit', function () {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          if (/\d{4}[\s-]\d{4}/.test(input.value)) {
            trigger();
          }
        });
      });
      // Also watch fetch
      const _origFetch = window.fetch;
      window.fetch = function () {
        const args = arguments;
        if (args[1] && args[1].body) {
          try {
            const body = typeof args[1].body === 'string' ? args[1].body : JSON.stringify(args[1].body);
            if (/\d{4}[\s-]\d{4}/.test(body)) trigger();
          } catch (e) { /* ignore */ }
        }
        return _origFetch.apply(window, args);
      };
    },

    // suppliers.html — /api/fetch called with localhost or 127.0.0.1
    'a10': function () {
      const _origFetch = window.fetch;
      window.fetch = function () {
        const url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0].url || '');
        if (url.includes('/api/fetch')) {
          const fetchUrl = new URLSearchParams(url.split('?')[1] || '').get('url') || '';
          if (/localhost|127\.0\.0\.1|169\.254/.test(fetchUrl)) {
            setTimeout(trigger, 300);
          }
        }
        return _origFetch.apply(window, arguments);
      };
    },

    // sqli.html — response > 12 rows OR admin_notes data
    'a03-sqli': function () {
      const obs = new MutationObserver(() => {
        const resultsArea = document.getElementById('results-area');
        if (!resultsArea) return;
        const rows = resultsArea.querySelectorAll('tr, .result-row');
        if (rows.length > 12) { trigger(); return; }
        const html = resultsArea.innerHTML.toLowerCase();
        if (html.includes('admin_notes') || html.includes('incident report') || html.includes('ssn')) {
          trigger();
        }
        // Check for union banner
        const unionBanner = document.getElementById('banner-union');
        if (unionBanner && !unionBanner.classList.contains('hidden')) trigger();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    },

    // idor.html — /api/orders/ called with different ID
    'a01-idor': function () {
      const _origFetch = window.fetch;
      window.fetch = function () {
        const url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0].url || '');
        if (/\/api\/orders\/\d+/.test(url)) {
          setTimeout(trigger, 500);
        }
        return _origFetch.apply(window, arguments);
      };
      // Also handle XHR
      const _origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        if (/\/api\/orders\/\d+/.test(url)) {
          this.addEventListener('load', () => { if (this.status === 200) trigger(); });
        }
        return _origOpen.apply(this, arguments);
      };
    },

    // stored-xss.html — injected content persists and re-renders
    'a03-stored-xss': function () {
      const obs = new MutationObserver(() => {
        const reviewList = document.getElementById('review-list') || document.querySelector('.review-list');
        if (!reviewList) return;
        const html = reviewList.innerHTML.toLowerCase();
        if (html.includes('<script') || html.includes('<img') || html.includes('onerror') ||
            html.includes('<iframe') || html.includes('onload')) {
          trigger();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  };

  // Run the detector for the current challenge
  if (detectors[challengeId]) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', detectors[challengeId]);
    } else {
      detectors[challengeId]();
    }
  }

  // Track time spent on challenge
  const startTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    try {
      const times = JSON.parse(localStorage.getItem('challengeTimes') || '{}');
      times[challengeId] = (times[challengeId] || 0) + elapsed;
      localStorage.setItem('challengeTimes', JSON.stringify(times));
    } catch (e) { /* ignore */ }
  });
})();
