// FreshSqueeze Sub Shop — Shared Utilities & Challenge Tracker
// OWASP Top 10 Training Lab (v3)

const CHALLENGES = [
  { id: 1,  owasp: 'A01', page: 'pages/menu.html',        name: 'Broken Access Control',     sub: 'Hidden staff items via URL parameter',                difficulty: 'intermediate' },
  { id: 2,  owasp: 'A02', page: 'pages/loyalty.html',     name: 'Cryptographic Failures',    sub: 'Base64 token exposes PII + cookie',                   difficulty: 'intermediate' },
  { id: 3,  owasp: 'A03', page: 'pages/search.html',      name: 'XSS (DOM)',                 sub: 'DOM-based XSS via innerHTML + stored in localStorage', difficulty: 'intermediate' },
  { id: 4,  owasp: 'A04', page: 'pages/order.html',       name: 'Insecure Design',           sub: 'Client-side price in editable hidden field',           difficulty: 'intermediate' },
  { id: 5,  owasp: 'A05', page: 'pages/admin.html',       name: 'Security Misconfiguration', sub: 'Hardcoded credentials in JavaScript source',           difficulty: 'intermediate' },
  { id: 6,  owasp: 'A06', page: 'pages/recipes.html',     name: 'Vulnerable Components',     sub: 'Outdated library with prototype pollution CVE',        difficulty: 'advanced'     },
  { id: 7,  owasp: 'A07', page: 'pages/login.html',       name: 'Auth Failures',             sub: 'Plaintext passwords + forgeable token + no lockout',   difficulty: 'advanced'     },
  { id: 8,  owasp: 'A08', page: 'pages/cart.html',        name: 'Data Integrity Failures',   sub: 'Client-side cart with weak integrity checksum',        difficulty: 'advanced'     },
  { id: 9,  owasp: 'A09', page: 'pages/feedback.html',    name: 'Logging Failures',          sub: 'PII logged in cleartext — check /pages/logs.html',    difficulty: 'advanced'     },
  { id: 10, owasp: 'A10', page: 'pages/suppliers.html',   name: 'SSRF',                      sub: 'Server fetches user-supplied URL — target internals',  difficulty: 'advanced'     },
  { id: 11, owasp: 'A03', page: 'pages/sqli.html',        name: 'SQL Injection',             sub: 'Server-side string-concatenated SQL query',            difficulty: 'advanced'     },
  { id: 12, owasp: 'A01', page: 'pages/idor.html',        name: 'IDOR',                      sub: 'Sequential order IDs with no ownership check',         difficulty: 'intermediate' },
  { id: 13, owasp: 'A03', page: 'pages/stored-xss.html',  name: 'Stored XSS',               sub: 'Reviews stored raw in DB, rendered as innerHTML',      difficulty: 'advanced'     },
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

  // v4: Sync to module system completedChallenges
  if (window.Modules) {
    const idMap = {1:'a01',2:'a02',3:'a03-dom',4:'a04',5:'a05',6:'a06',7:'a07',8:'a08',9:'a09',10:'a10',11:'a03-sqli',12:'a01-idor',13:'a03-stored-xss'};
    const strId = idMap[challengeId];
    if (strId) Modules.addCompletedChallenge(strId);
  }

  // Refresh board counters if on index
  if (typeof refreshBoard === 'function') refreshBoard();
  if (typeof renderModuleBoard === 'function') renderModuleBoard();
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
    <br><a href="${isRoot ? 'challenges.html' : '/challenges.html'}" style="margin-top:0.4rem;display:inline-block;">← Back to Board</a>
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

// ── Index page board rendering ──────────────────────────────────────
function _renderBoard() {
  const grid = document.getElementById('challenge-grid');
  if (!grid) return;
  const progress = getProgress();
  grid.innerHTML = CHALLENGES.map(ch => {
    const done = !!progress[ch.id];
    return `<a href="${ch.page}" class="challenge-card${done ? ' completed' : ''}">
      <div class="card-owasp">${ch.owasp} &middot; #${ch.id}</div>
      <div class="card-title">${ch.name}</div>
      <div class="card-sub">${ch.sub}</div>
      <span class="difficulty ${ch.difficulty}">${ch.difficulty}</span>
    </a>`;
  }).join('');
}

function _updateStats() {
  // v4: Count completed from both legacy progress and new completedChallenges
  let completed = getCompletedCount();
  // Also check completedChallenges (v4 module system)
  try {
    const v4 = JSON.parse(localStorage.getItem('completedChallenges') || '[]');
    if (v4.length > completed) completed = v4.length;
  } catch (e) { /* ignore */ }

  const total     = CHALLENGES.length;
  const pct       = total > 0 ? Math.round(completed / total * 100) : 0;
  const el = id => document.getElementById(id);
  if (el('stat-completed')) el('stat-completed').textContent = completed;
  if (el('stat-total'))     el('stat-total').textContent     = total;
  if (el('stat-pct'))       el('stat-pct').textContent       = pct + '%';
  if (el('score-fill'))     el('score-fill').style.width     = pct + '%';
}

function refreshBoard() { _renderBoard(); _updateStats(); }
window.refreshBoard = refreshBoard;

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('challenge-grid')) {
    _renderBoard();
    _updateStats();
  }
});

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
    '<strong style="color:#e8463a;">' +
      '⚠️ SECURITY ALERT: Suspicious cookie detected — <code style="font-size:0.85em;">admin_override=true</code>' +
      ' — this action has been logged.' +
    '</strong>' +
    '<span style="color:#888;font-size:0.78rem;">' +
      'Cookies are not invisible. Servers read every cookie you set. Never assume a cookie modification goes unnoticed.' +
    '</span>' +
    '<button aria-label="Dismiss"' +
      ' style="margin-left:auto;background:none;border:none;color:#777;cursor:pointer;font-size:1.1rem;line-height:1;">' +
      '&times;' +
    '</button>';
  bar.querySelector('button').addEventListener('click', function() { bar.remove(); });
  document.body.prepend(bar);
  // Nudge page content down so the nav isn't obscured
  document.body.style.paddingTop = 'calc(' + (document.body.style.paddingTop || '0px') + ' + 2.5rem)';
})();
