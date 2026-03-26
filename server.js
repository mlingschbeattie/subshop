// server.js — FreshSqueeze Sub Shop (OWASP Training Lab)
// Intentionally vulnerable — DO NOT deploy to production

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'db', 'freshsqueeze.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure progress table exists (v4 addition)
db.exec(`CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_code TEXT,
  student_name TEXT,
  challenge_id TEXT,
  solved_at TEXT DEFAULT (datetime('now')),
  hints_used INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  fix_submitted INTEGER DEFAULT 0
)`);

app.use(cors());                                            // VULNERABLE: wildcard CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── A03 — SQL Injection (string-concatenated query) ─────────────────
app.get('/api/products', (req, res) => {
  const search = req.query.search || '';
  const query = `SELECT id, name, description, price FROM products WHERE name LIKE '%${search}%'`; // VULNERABLE: SQL injection
  try {
    const rows = db.prepare(query).all();                   // VULNERABLE: unsanitized input in query
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack }); // VULNERABLE: stack trace leakage
  }
});

// ── A01 — IDOR (no ownership check) ────────────────────────────────
app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id); // VULNERABLE: no auth/ownership check
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ── A01 — IDOR (returns any user's full record) ────────────────────
app.get('/api/user/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id); // VULNERABLE: no auth, returns password
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── A07 — Auth Failures (plaintext compare, no lockout) ────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.password !== password) {                // VULNERABLE: plaintext password compare
    return res.status(401).json({ error: 'Invalid credentials' }); // VULNERABLE: no lockout
  }
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    token: Buffer.from(`${user.username}:${user.id}`).toString('base64') // VULNERABLE: predictable token
  });
});

// ── A03 — Stored XSS (stores raw HTML) ─────────────────────────────
app.post('/api/review', (req, res) => {
  const { author, content } = req.body;
  db.prepare('INSERT INTO reviews (author, content) VALUES (?, ?)').run(
    author || 'Anonymous',
    content                                                 // VULNERABLE: stores raw HTML, no sanitization
  );
  res.json({ success: true });
});

app.get('/api/reviews', (req, res) => {
  const rows = db.prepare('SELECT * FROM reviews ORDER BY id DESC').all();
  res.json(rows);                                           // VULNERABLE: returns raw HTML content
});

// ── A09 — Logging Failures (logs raw PII) ──────────────────────────
app.post('/api/feedback', (req, res) => {
  const { name, email, comment, payment_ref } = req.body;
  const raw = JSON.stringify(req.body);
  db.prepare('INSERT INTO logs (action, user_input) VALUES (?, ?)').run(
    'feedback_submit',
    raw                                                     // VULNERABLE: raw PII logged unredacted
  );
  res.json({ success: true, message: 'Feedback received. Thank you!' });
});

app.get('/api/logs', (req, res) => {
  const rows = db.prepare('SELECT * FROM logs ORDER BY id DESC').all();
  res.json(rows);                                           // VULNERABLE: exposes all raw log data
});

// ── A10 — SSRF (server-side fetch of user-supplied URL) ─────────────
app.get('/api/fetch', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // Simulate AWS metadata response for training
  if (url.includes('169.254.169.254')) {
    return res.json({
      simulated: true,
      note: 'In a real AWS environment, this would return instance metadata.',
      data: {
        'ami-id': 'ami-0abcdef1234567890',
        'instance-type': 't3.medium',
        'iam-role': 'freshsqueeze-prod-role',
        'security-credentials': {
          AccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          Token: 'FwoGZXIvYXdzEBYaDD...'
        }
      }
    });
  }

  try {
    const response = await fetch(url);                      // VULNERABLE: no URL validation, SSRF
    const body = await response.text();
    try { res.json(JSON.parse(body)); }
    catch { res.send(body); }
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack }); // VULNERABLE: stack trace leakage
  }
});

// ── A05 — Security Misconfiguration (leaks data in 403) ───────────
app.get('/api/admin', (req, res) => {
  const notes = db.prepare('SELECT * FROM admin_notes ORDER BY id DESC').all();
  res.status(403).json({                                    // VULNERABLE: 403 but data in body
    error: 'Forbidden — admin access required',
    _debug: notes,                                          // VULNERABLE: sensitive data leaked
    _hint: 'This endpoint returns 403 but check the response body carefully.'
  });
});

// ── Progress API (v4 — Learning Platform) ──────────────────────────

// Record a challenge solve
app.post('/api/progress/solve', (req, res) => {
  const { class_code, student_name, challenge_id, hints_used, time_spent_seconds } = req.body;
  if (!student_name || !challenge_id) {
    return res.status(400).json({ error: 'student_name and challenge_id are required' });
  }
  // Check if already solved
  const existing = db.prepare(
    'SELECT id FROM progress WHERE student_name = ? AND challenge_id = ? AND class_code = ?'
  ).get(student_name, challenge_id, class_code || '');
  if (existing) {
    return res.json({ success: true, message: 'Already recorded' });
  }
  db.prepare(
    'INSERT INTO progress (class_code, student_name, challenge_id, hints_used, time_spent_seconds) VALUES (?, ?, ?, ?, ?)'
  ).run(class_code || '', student_name, challenge_id, hints_used || 0, time_spent_seconds || 0);
  res.json({ success: true });
});

// Record a hint use
app.post('/api/progress/hint', (req, res) => {
  const { class_code, student_name, challenge_id } = req.body;
  if (!student_name || !challenge_id) {
    return res.status(400).json({ error: 'student_name and challenge_id are required' });
  }
  const row = db.prepare(
    'SELECT id, hints_used FROM progress WHERE student_name = ? AND challenge_id = ? AND class_code = ?'
  ).get(student_name, challenge_id, class_code || '');
  if (row) {
    db.prepare('UPDATE progress SET hints_used = ? WHERE id = ?').run(row.hints_used + 1, row.id);
  } else {
    db.prepare(
      'INSERT INTO progress (class_code, student_name, challenge_id, hints_used) VALUES (?, ?, ?, 1)'
    ).run(class_code || '', student_name, challenge_id);
  }
  res.json({ success: true });
});

// Register student in class
app.post('/api/progress/join', (req, res) => {
  const { class_code, student_name } = req.body;
  if (!student_name) return res.status(400).json({ error: 'student_name is required' });
  res.json({ success: true, class_code: class_code || '', student_name });
});

// Record a fix submission
app.post('/api/progress/fix', (req, res) => {
  const { class_code, student_name, challenge_id } = req.body;
  if (!student_name || !challenge_id) {
    return res.status(400).json({ error: 'student_name and challenge_id are required' });
  }
  const row = db.prepare(
    'SELECT id FROM progress WHERE student_name = ? AND challenge_id = ? AND class_code = ?'
  ).get(student_name, challenge_id, class_code || '');
  if (row) {
    db.prepare('UPDATE progress SET fix_submitted = 1 WHERE id = ?').run(row.id);
  } else {
    db.prepare(
      'INSERT INTO progress (class_code, student_name, challenge_id, fix_submitted) VALUES (?, ?, ?, 1)'
    ).run(class_code || '', student_name, challenge_id);
  }
  res.json({ success: true });
});

// Instructor dashboard data — all students for a class code
app.get('/api/progress/:class_code', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM progress WHERE class_code = ? ORDER BY student_name, solved_at'
  ).all(req.params.class_code);
  res.json(rows);
});

// Individual student data
app.get('/api/progress/student/:name/:class_code', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM progress WHERE student_name = ? AND class_code = ? ORDER BY solved_at'
  ).all(req.params.name, req.params.class_code);
  res.json(rows);
});

// Reset class progress (instructor)
app.delete('/api/progress/:class_code', (req, res) => {
  db.prepare('DELETE FROM progress WHERE class_code = ?').run(req.params.class_code);
  res.json({ success: true });
});

// ── Fix It Mode — Pattern Matching Validation (v4) ─────────────────
app.post('/api/fix/test', (req, res) => {
  const { challengeId, code } = req.body;
  if (!challengeId || !code) {
    return res.status(400).json({ error: 'challengeId and code are required' });
  }

  const validators = {
    'a03-sqli': () => {
      const hasParameterized = /db\.prepare\s*\(/.test(code) || /\?\s*\)/.test(code);
      const hasInterpolation = /`[^`]*\$\{[^}]*\}[^`]*`/.test(code);
      if (hasParameterized && !hasInterpolation) return { pass: true, msg: 'Attack payload now returns 0 rows. Injection blocked. Fix confirmed.' };
      if (!hasParameterized) return { pass: false, msg: 'Still vulnerable. Hint: Use db.prepare() with parameterized queries instead of string concatenation.' };
      return { pass: false, msg: 'Still vulnerable. Hint: The SQL string still contains user input directly.' };
    },
    'a03-stored-xss': () => {
      const safe = /textContent|innerText|DOMPurify|createTextNode|sanitize/.test(code);
      const unsafe = /innerHTML\s*[=+]/.test(code);
      if (safe && !unsafe) return { pass: true, msg: 'XSS payload now renders as plain text. Injection blocked. Fix confirmed.' };
      if (unsafe) return { pass: false, msg: 'Still vulnerable. Hint: Replace innerHTML with textContent or use DOMPurify.sanitize().' };
      return { pass: false, msg: 'Still vulnerable. Hint: User content must never be inserted as raw HTML.' };
    },
    'a01-idor': () => {
      const hasOwnerCheck = /user_id\s*===|user_id\s*==|session|req\.user|ownership|belongs/.test(code);
      if (hasOwnerCheck) return { pass: true, msg: 'Unauthorized access now returns 403. Ownership check confirmed. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Add an ownership check — verify the order belongs to the requesting user.' };
    },
    'a07': () => {
      const hasSecure = /bcrypt|crypto\.timingSafeEqual|argon2|scrypt|pbkdf2|hashPassword/.test(code);
      if (hasSecure) return { pass: true, msg: 'Passwords are now hashed securely. Plaintext comparison eliminated. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Use bcrypt or crypto.timingSafeEqual instead of plain === comparison.' };
    },
    'a04': () => {
      const hasServerLookup = /db\.prepare|products?\[|lookup|getPrice|server.side|price\s*=\s*(?!req)/.test(code);
      const usesReqPrice = /req\.body\.price|req\.query\.price/.test(code);
      if (hasServerLookup && !usesReqPrice) return { pass: true, msg: 'Price now comes from the database, not the client. Manipulation blocked. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Look up the price server-side from the database instead of trusting req.body.price.' };
    },
    'a09': () => {
      const hasRedaction = /redact|mask|\*{3,}|replace\s*\(.*\d|PII|sanitize|filter/.test(code);
      if (hasRedaction) return { pass: true, msg: 'PII is now redacted before logging. Sensitive data protected. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Redact or mask PII (credit cards, SSNs) before writing to logs.' };
    },
    'a10': () => {
      const hasAllowlist = /allowlist|whitelist|allowed|\.includes\s*\(|hostname\s*===|new\s+URL/.test(code);
      if (hasAllowlist) return { pass: true, msg: 'URL validation now blocks internal addresses. SSRF mitigated. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Validate the URL against an allowlist before fetching.' };
    },
    'a01': () => {
      const hasServerCheck = /req\.user|session|role\s*!==|authorize|middleware|isStaff|isAdmin/.test(code);
      if (hasServerCheck) return { pass: true, msg: 'Access control now enforced server-side. Unauthorized access blocked. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Enforce role checks on the server, not just in client-side JavaScript.' };
    },
    'a02': () => {
      const hasEncryption = /encrypt|AES|crypto|jwt\.sign|sign\(|JWE|randomBytes/.test(code);
      if (hasEncryption) return { pass: true, msg: 'Token now uses proper encryption instead of Base64 encoding. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Base64 is encoding, not encryption. Use proper cryptographic signing or encryption.' };
    },
    'a03-dom': () => {
      const safe = /textContent|innerText|DOMPurify|createTextNode|sanitize/.test(code);
      const unsafe = /innerHTML\s*[=+]/.test(code);
      if (safe && !unsafe) return { pass: true, msg: 'DOM XSS payload now renders as plain text. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Never use innerHTML with user input. Use textContent instead.' };
    },
    'a05': () => {
      const hasEnvVar = /process\.env|env\[|config\[|vault|secret.*manager/i.test(code);
      const hasHardcoded = /password\s*[:=]\s*['"][^'"]+['"]/.test(code);
      if (hasEnvVar && !hasHardcoded) return { pass: true, msg: 'Credentials now loaded from environment variables. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Never hardcode credentials. Use environment variables or a secrets manager.' };
    },
    'a06': () => {
      const hasUpdate = /update|upgrade|latest|patch|version\s*[>:=]|semver/.test(code);
      if (hasUpdate) return { pass: true, msg: 'Vulnerable component patched to safe version. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Update the vulnerable library to a patched version that removes eval().' };
    },
    'a08': () => {
      const hasServerCart = /session|server.side|db\.prepare|hmac|crypto\.createHmac/.test(code);
      if (hasServerCart) return { pass: true, msg: 'Cart integrity now validated server-side. Manipulation blocked. Fix confirmed.' };
      return { pass: false, msg: 'Still vulnerable. Hint: Store cart data server-side or use HMAC to verify integrity.' };
    },
  };

  const validate = validators[challengeId];
  if (!validate) {
    return res.status(400).json({ error: 'Unknown challenge: ' + challengeId });
  }

  const result = validate();
  res.json({
    challengeId,
    passed: result.pass,
    message: result.msg
  });
});

// ── Catch-all: serve index.html for SPA-like routing ────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler (leaks stack traces) ──────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // VULNERABLE: stack trace in dev
  });
});

app.listen(PORT, () => {
  console.log(`🥖 FreshSqueeze Sub Shop running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
