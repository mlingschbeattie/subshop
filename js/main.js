// The Sub Shop — Shared Utilities & Challenge Tracker
// OWASP Top 10 Training Lab

const CHALLENGES = [
  { id: 1,  owasp: 'A01', page: 'pages/menu.html',      name: 'Broken Access Control',     sub: 'Hidden admin items via URL param',         difficulty: 'intermediate' },
  { id: 2,  owasp: 'A02', page: 'pages/loyalty.html',   name: 'Cryptographic Failures',    sub: 'Base64 token exposes PII',                 difficulty: 'intermediate' },
  { id: 3,  owasp: 'A03', page: 'pages/search.html',    name: 'Injection',                 sub: 'DOM-based XSS via innerHTML',              difficulty: 'intermediate' },
  { id: 4,  owasp: 'A04', page: 'pages/order.html',     name: 'Insecure Design',           sub: 'Price set in editable hidden field',        difficulty: 'intermediate' },
  { id: 5,  owasp: 'A05', page: 'pages/admin.html',     name: 'Security Misconfiguration', sub: 'Credentials in JS comments',               difficulty: 'intermediate' },
  { id: 6,  owasp: 'A06', page: 'pages/recipes.html',   name: 'Vulnerable Components',     sub: 'Outdated library with known CVE',          difficulty: 'advanced'     },
  { id: 7,  owasp: 'A07', page: 'pages/login.html',     name: 'Auth Failures',             sub: 'Hardcoded creds + no lockout',             difficulty: 'advanced'     },
  { id: 8,  owasp: 'A08', page: 'pages/cart.html',      name: 'Data Integrity Failures',   sub: 'Cart total tampered via localStorage',     difficulty: 'advanced'     },
  { id: 9,  owasp: 'A09', page: 'pages/feedback.html',  name: 'Logging Failures',          sub: 'PII logged in cleartext to console',       difficulty: 'advanced'     },
  { id: 10, owasp: 'A10', page: 'pages/suppliers.html', name: 'SSRF',                      sub: 'Fetch URL taken from unvalidated input',   difficulty: 'advanced'     },
];

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem('subshop_progress') || '{}');
  } catch (e) {
    return {};
  }
}

function markComplete(challengeId) {
  const progress = getProgress();
  if (!progress[challengeId]) {
    progress[challengeId] = { completedAt: new Date().toISOString() };
    localStorage.setItem('subshop_progress', JSON.stringify(progress));
  }
  showCompletionToast(challengeId);

  // Refresh board counters if on index
  if (typeof refreshBoard === 'function') refreshBoard();
}

function showCompletionToast(challengeId) {
  const challenge = CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) return;

  // Remove any existing toast
  const existing = document.querySelector('.completion-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'completion-toast';
  const isRoot = !window.location.pathname.includes('/pages/');
  toast.innerHTML = `
    <strong>Challenge #${challengeId} Flagged ✓</strong>
    ${challenge.owasp} — ${challenge.name}
    <br><a href="${isRoot ? 'index.html' : '../index.html'}" style="margin-top:0.4rem;display:inline-block;">← Back to Board</a>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

function getCompletedCount() {
  return Object.keys(getProgress()).length;
}

function resetProgress() {
  localStorage.removeItem('subshop_progress');
  location.reload();
}

// Expose globally
window.SubShop = { CHALLENGES, getProgress, markComplete, getCompletedCount, resetProgress };

// ── Gotcha 3: Global cookie sentinel ─────────────────────────────────
// Fires on every page. If admin_override cookie is present and the page
// doesn't already have a dedicated #cookie-banner (loyalty.html), inject
// a fixed top-bar warning so the lesson follows the student site-wide.
(function detectAdminOverrideCookie() {
  const poisoned = document.cookie.split(';').some(c => c.trim().startsWith('admin_override='));
  if (!poisoned) return;
  if (document.getElementById('cookie-banner')) return; // loyalty.html handles its own
  const bar = document.createElement('div');
  bar.setAttribute('role', 'alert');
  bar.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:8888',
    'background:rgba(230,57,70,0.13)', 'border-bottom:2px solid #e63946',
    'padding:0.55rem 1.25rem', 'font-size:0.8rem',
    'display:flex', 'align-items:center', 'gap:0.75rem', 'flex-wrap:wrap',
  ].join(';');
  bar.innerHTML =
    '<strong style="color:#e63946;">' +
      '⚠ Suspicious cookie detected: <code style="font-size:0.85em;">admin_override=true</code>' +
      ' — this action was logged.' +
    '</strong>' +
    '<span style="color:#888;font-size:0.78rem;">' +
      'Your browser sends this cookie with every request. The server sees it.' +
    '</span>' +
    '<button onclick="this.parentElement.remove()" aria-label="Dismiss"' +
      ' style="margin-left:auto;background:none;border:none;color:#777;cursor:pointer;font-size:1.1rem;line-height:1;">' +
      '&times;' +
    '</button>';
  document.body.prepend(bar);
  // Nudge page content down so the nav isn't obscured
  document.body.style.paddingTop = 'calc(' + (document.body.style.paddingTop || '0px') + ' + 2.5rem)';
})();
