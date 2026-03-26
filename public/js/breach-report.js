// breach-report.js — Breach Report Modal (v4)
// Full-screen overlay with 3 panels + Fix It mode for all 13 challenges

(function () {
  'use strict';

  // ── Breach Report Data for All 13 Challenges ──────────────────────

  const BREACH_DATA = {
    'a01': {
      title: 'Broken Access Control',
      owasp: 'OWASP A01',
      confirmation: {
        summary: 'You accessed staff-only menu items by manipulating a URL parameter. In a real system, this exposed:',
        impacts: [
          'Internal pricing and cost data',
          'Staff-only product catalog with supplier info',
          'Hidden menu items not approved for public release'
        ],
        vector: 'Network',
        complexity: 'Low — no special tools required',
        privileges: 'None'
      },
      realWorld: {
        year: '2021',
        org: 'Parler (Social Media)',
        story: 'Researchers discovered that Parler\'s API used sequential IDs with no authorization checks. By incrementing the ID in the URL — the same technique you just used — they downloaded every public post, image, and video. Over 70TB of data was archived, including GPS coordinates from photos.',
        cost: 'Complete platform data exposure',
        result: 'Platform permanently taken offline'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Client-side role check only\nconst params = new URLSearchParams(window.location.search);\nconst role = params.get(\'role\');\nif (role === \'staff\') {\n  showStaffMenu();\n}',
        fixLabel: 'FIXED',
        fixCode: '// Server-side role enforcement\napp.get(\'/api/menu/staff\', authenticate, (req, res) => {\n  if (req.user.role !== \'staff\' && req.user.role !== \'admin\') {\n    return res.status(403).json({ error: \'Forbidden\' });\n  }\n  res.json(getStaffMenuItems());\n});',
        explanation: 'Why this works: Access control must be enforced on the server. The client can be manipulated by anyone — URL parameters, JavaScript variables, and DOM elements are all under the user\'s control.'
      },
      fixIt: {
        fileName: 'menu.html — client-side JS',
        vulnCode: '// Client-side only access control\nconst params = new URLSearchParams(window.location.search);\nconst role = params.get(\'role\');\nif (role === \'staff\') {\n  document.getElementById(\'staff-menu\').classList.remove(\'hidden\');\n}',
        challengeId: 'a01'
      }
    },

    'a02': {
      title: 'Cryptographic Failures',
      owasp: 'OWASP A02',
      confirmation: {
        summary: 'You decoded a Base64 loyalty token revealing plaintext PII. In a real system, this exposed:',
        impacts: [
          'Customer full name and email address',
          'Social Security Number (SSN)',
          'Credit card number in cleartext',
          'Internal reward point balance and tier status'
        ],
        vector: 'Network',
        complexity: 'Low — Base64 decode is a single function call',
        privileges: 'None — token was in page source'
      },
      realWorld: {
        year: '2019',
        org: 'Facebook',
        story: 'Facebook stored hundreds of millions of passwords in plaintext in internal logs. Employees could search through them. The issue persisted for years before discovery. Similarly, your loyalty token used Base64 encoding — which is not encryption — making the data readable by anyone.',
        cost: '$5 billion FTC fine',
        result: '600 million passwords exposed internally'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Base64 encoding is NOT encryption\nconst token = btoa(\n  JSON.stringify({ name, ssn, card, points })\n);',
        fixLabel: 'FIXED',
        fixCode: '// Use signed JWT with encrypted payload\nconst jwt = require(\'jsonwebtoken\');\nconst token = jwt.sign(\n  { userId: user.id, points: user.points },\n  process.env.JWT_SECRET,\n  { expiresIn: \'24h\' }\n);\n// Never include SSN or card numbers in tokens',
        explanation: 'Why this works: JWTs are cryptographically signed so tampering is detected. Sensitive PII (SSNs, card numbers) should never be stored in client-side tokens at all — reference them by ID on the server.'
      },
      fixIt: {
        fileName: 'server.js — token generation',
        vulnCode: '// Encoding is NOT encrypting\nconst token = Buffer.from(\n  JSON.stringify({ name: user.name, ssn: user.ssn, card: user.card })\n).toString(\'base64\');',
        challengeId: 'a02'
      }
    },

    'a03-dom': {
      title: 'Cross-Site Scripting (DOM XSS)',
      owasp: 'OWASP A03',
      confirmation: {
        summary: 'You injected executable JavaScript through the search field via innerHTML. In a real system, this could:',
        impacts: [
          'Steal session cookies and authentication tokens',
          'Redirect users to phishing pages',
          'Modify page content to display fake forms',
          'Keylog inputs on the current page'
        ],
        vector: 'Network',
        complexity: 'Low — basic HTML/JS knowledge',
        privileges: 'None'
      },
      realWorld: {
        year: '2018',
        org: 'British Airways',
        story: 'Attackers injected malicious JavaScript into the BA website payment page. For two weeks, every customer who entered their card details had them silently forwarded to an attacker-controlled server. 380,000 card numbers stolen via XSS.',
        cost: '£20 million GDPR fine',
        result: '380,000 payment cards compromised'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// User input rendered as HTML\nresultsDiv.innerHTML = \n  \'<p>Results for: \' + searchTerm + \'</p>\';',
        fixLabel: 'FIXED',
        fixCode: '// User input rendered as text only\nconst p = document.createElement(\'p\');\np.textContent = \'Results for: \' + searchTerm;\nresultsDiv.appendChild(p);',
        explanation: 'Why this works: textContent treats input as plain text, not HTML. The browser will never interpret angle brackets as markup. For rich content, use DOMPurify.sanitize() to strip dangerous tags.'
      },
      fixIt: {
        fileName: 'search.html — client-side JS',
        vulnCode: '// Dangerous: user input goes directly into HTML\ndocument.getElementById(\'results-area\').innerHTML = \n  \'<h3>Showing results for: \' + query + \'</h3>\' +\n  rows.map(r => \'<div>\' + r.name + \'</div>\').join(\'\');',
        challengeId: 'a03-dom'
      }
    },

    'a04': {
      title: 'Insecure Design',
      owasp: 'OWASP A04',
      confirmation: {
        summary: 'You modified the hidden price field and submitted an order at an attacker-controlled price. In a real system, this resulted in:',
        impacts: [
          'Financial loss — items purchased below cost',
          'Inventory manipulation without payment',
          'Revenue reporting discrepancies',
          'Potential fraud at scale via automation'
        ],
        vector: 'Network',
        complexity: 'Low — DevTools Element Inspector',
        privileges: 'None'
      },
      realWorld: {
        year: '2022',
        org: 'Multiple E-Commerce Platforms',
        story: 'A widespread attack pattern called "price manipulation" affected thousands of online stores. Attackers modified hidden form fields and API request bodies to change prices before checkout. One attacker ordered $50,000 of electronics for $0.01 each by intercepting and modifying POST requests.',
        cost: 'Millions in combined losses',
        result: 'Industry-wide shift to server-side price validation'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Price comes from the client form\napp.post(\'/api/order\', (req, res) => {\n  const { item, price, qty } = req.body;\n  // Trusts client-submitted price!\n  db.prepare(\'INSERT INTO orders...\').run(item, price, qty);\n});',
        fixLabel: 'FIXED',
        fixCode: '// Price looked up server-side\napp.post(\'/api/order\', (req, res) => {\n  const { item_id, qty } = req.body;\n  const product = db.prepare(\n    \'SELECT price FROM products WHERE id = ?\'\n  ).get(item_id);\n  if (!product) return res.status(404).json({ error: \'Not found\' });\n  db.prepare(\'INSERT INTO orders...\').run(item_id, product.price, qty);\n});',
        explanation: 'Why this works: The server looks up the real price from the database. The client only sends the item ID and quantity — values the server can validate. Never trust prices, totals, or calculations from the client.'
      },
      fixIt: {
        fileName: 'server.js — order endpoint',
        vulnCode: 'app.post(\'/api/order\', (req, res) => {\n  const { item, price, qty } = req.body;\n  // Uses client-submitted price\n  const total = price * qty;\n  db.prepare(\'INSERT INTO orders (item, price) VALUES (?, ?)\')\n    .run(item, price);\n  res.json({ success: true, total });\n});',
        challengeId: 'a04'
      }
    },

    'a05': {
      title: 'Security Misconfiguration',
      owasp: 'OWASP A05',
      confirmation: {
        summary: 'You found hardcoded credentials in JavaScript source code. In a real system, this exposed:',
        impacts: [
          'Admin panel access with full privileges',
          'Ability to view/modify all user accounts',
          'Database management access',
          'Internal API keys and service credentials'
        ],
        vector: 'Network',
        complexity: 'Low — View Page Source (Ctrl+U)',
        privileges: 'None'
      },
      realWorld: {
        year: '2021',
        org: 'Nissan North America',
        story: 'A Nissan Git server was left exposed with default credentials (admin/admin). Source code for mobile apps, internal tools, and market research was leaked. The same principle applies here — credentials hardcoded in client-side JavaScript are visible to every user.',
        cost: '20GB of proprietary source code leaked',
        result: 'Full internal codebase exposed publicly'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Credentials in client-side JavaScript\nconst STAFF_PASSWORD = \'SubShop2026!\';\n// Anyone who views page source sees this',
        fixLabel: 'FIXED',
        fixCode: '// Credentials on server only, via environment variables\n// .env file (never committed to git)\nADMIN_PASSWORD=$2b$10$...(bcrypt hash)\n\n// server.js\napp.post(\'/api/admin/login\', (req, res) => {\n  const match = bcrypt.compareSync(\n    req.body.password, process.env.ADMIN_PASSWORD\n  );\n  if (!match) return res.status(401).json({ error: \'Denied\' });\n});',
        explanation: 'Why this works: Secrets stay on the server and are loaded from environment variables. Passwords are stored as bcrypt hashes so even if the hash is leaked, the password can\'t be reversed.'
      },
      fixIt: {
        fileName: 'admin.html — client-side JS',
        vulnCode: '// Hardcoded password in JavaScript\nconst STAFF_PASSWORD = \'SubShop2026!\';\n\nfunction checkPassword(input) {\n  if (input === STAFF_PASSWORD) {\n    showAdminPanel();\n  }\n}',
        challengeId: 'a05'
      }
    },

    'a06': {
      title: 'Vulnerable & Outdated Components',
      owasp: 'OWASP A06',
      confirmation: {
        summary: 'You exploited a vulnerable third-party library (subutils v1.2.3) to achieve prototype pollution or RCE. In a real system, this enabled:',
        impacts: [
          'Remote code execution on the server',
          'Prototype pollution affecting all objects',
          'Privilege escalation via __proto__ manipulation',
          'Complete application takeover'
        ],
        vector: 'Network',
        complexity: 'Medium — requires knowledge of CVE',
        privileges: 'None'
      },
      realWorld: {
        year: '2021',
        org: 'Log4j (Log4Shell)',
        story: 'A single vulnerable Java library — Log4j — was embedded in millions of applications. CVE-2021-44228 allowed remote code execution by simply including a crafted string in any logged input. Attackers scanned the entire internet within hours. The technique is the same: find an outdated component, exploit its known CVE.',
        cost: 'Estimated $10+ billion in remediation',
        result: 'Most critical open-source vulnerability in history'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Using outdated library with known CVE\n<script src="js/subutils-1.2.3.min.js"></script>\n// CVE-2023-18912: eval() in parseJuice()',
        fixLabel: 'FIXED',
        fixCode: '// Update to patched version\n<script src="js/subutils-2.0.0.min.js"></script>\n// v2.0.0 removes eval(), uses JSON.parse()\n\n// Or remove dependency entirely:\nconst parseRecipe = (input) => {\n  try { return JSON.parse(input); }\n  catch { return null; }\n};',
        explanation: 'Why this works: Always use the latest patched version of your dependencies. Run npm audit regularly. If a library uses eval() on user input, replace it. No legitimate library needs eval().'
      },
      fixIt: {
        fileName: 'recipes.html — script include',
        vulnCode: '<!-- Vulnerable version with CVE-2023-18912 -->\n<script src="js/subutils-1.2.3.min.js"></script>\n\n// Library uses eval() internally:\nfunction parseJuice(input) {\n  return eval(\'(\' + input + \')\');\n}',
        challengeId: 'a06'
      }
    },

    'a07': {
      title: 'Identification & Authentication Failures',
      owasp: 'OWASP A07',
      confirmation: {
        summary: 'You forged an authentication token and/or logged in with weak credentials. In a real system, this exposed:',
        impacts: [
          'Full account takeover of any user',
          'Access to personal data, order history, payment info',
          'Ability to place orders as another user',
          'Admin account compromise via predictable tokens'
        ],
        vector: 'Network',
        complexity: 'Low — token format is username:id in Base64',
        privileges: 'None'
      },
      realWorld: {
        year: '2012',
        org: 'LinkedIn',
        story: '6.5 million password hashes were posted online. LinkedIn had used unsalted SHA-1 hashes — trivially crackable. Passwords were stored in a format nearly as weak as plaintext. Combined with the predictable token format you just exploited, this is a textbook authentication failure.',
        cost: '$1.25 million settlement',
        result: '117 million credentials exposed in follow-up breach'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Plaintext password compare, predictable token\nif (user.password !== password) return 401;\nconst token = btoa(user.username + \':\' + user.id);',
        fixLabel: 'FIXED',
        fixCode: 'const bcrypt = require(\'bcrypt\');\nconst jwt = require(\'jsonwebtoken\');\n\n// Hashed password comparison\nconst match = await bcrypt.compare(password, user.hash);\nif (!match) return res.status(401).json({ error: \'Invalid\' });\n\n// Signed JWT with expiry\nconst token = jwt.sign(\n  { sub: user.id }, process.env.JWT_SECRET,\n  { expiresIn: \'1h\' }\n);',
        explanation: 'Why this works: bcrypt is a one-way hash with built-in salt — even if the database leaks, passwords can\'t be reversed. JWTs are cryptographically signed, so forging a token requires the secret key.'
      },
      fixIt: {
        fileName: 'server.js — login endpoint',
        vulnCode: 'app.post(\'/api/login\', (req, res) => {\n  const { username, password } = req.body;\n  const user = db.prepare(\'SELECT * FROM users WHERE username = ?\').get(username);\n  if (!user || user.password !== password) {\n    return res.status(401).json({ error: \'Invalid credentials\' });\n  }\n  const token = Buffer.from(username + \':\' + user.id).toString(\'base64\');\n  res.json({ token });\n});',
        challengeId: 'a07'
      }
    },

    'a08': {
      title: 'Software & Data Integrity Failures',
      owasp: 'OWASP A08',
      confirmation: {
        summary: 'You modified cart prices in localStorage and bypassed the integrity checksum. In a real system, this resulted in:',
        impacts: [
          'Items purchased at attacker-defined prices',
          'Checksum bypassed — integrity validation defeated',
          'Payment processed for incorrect amount',
          'Complete trust model of the cart broken'
        ],
        vector: 'Local (Application tab)',
        complexity: 'Medium — requires understanding of checksum algorithm',
        privileges: 'None — localStorage is user-controlled'
      },
      realWorld: {
        year: '2020',
        org: 'SolarWinds',
        story: 'Attackers compromised the SolarWinds build pipeline and injected malware into a software update. 18,000 organizations installed the trojanized update because they trusted the integrity of the delivery pipeline. While different in scale, the principle is the same: if the client controls the data and the integrity check, both can be forged.',
        cost: '$40+ million in direct costs',
        result: 'US government agencies & Fortune 500 companies compromised'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Cart + checksum both in localStorage\nconst cart = { items: [...], checksum: \'abc123\' };\nlocalStorage.setItem(\'cart\', JSON.stringify(cart));\n// User can edit both values',
        fixLabel: 'FIXED',
        fixCode: '// Server-side cart with HMAC integrity\napp.post(\'/api/cart/checkout\', (req, res) => {\n  // Recalculate total from database prices\n  const cart = getSessionCart(req.session.id);\n  const total = cart.items.reduce((sum, item) => {\n    const product = db.prepare(\'SELECT price FROM products WHERE id = ?\')\n      .get(item.product_id);\n    return sum + product.price * item.qty;\n  }, 0);\n  processPayment(total);\n});',
        explanation: 'Why this works: The cart is stored server-side in a session. The client only sends product IDs and quantities. Prices are always looked up from the database at checkout time. The user can never control the price.'
      },
      fixIt: {
        fileName: 'cart.html — client-side JS',
        vulnCode: '// Both cart and checksum in localStorage\nfunction checkout() {\n  const cart = JSON.parse(localStorage.getItem(\'cart\'));\n  const total = cart.items.reduce((s, i) => s + i.price * i.qty, 0);\n  // Trusts client-side prices and checksum\n  fetch(\'/api/checkout\', {\n    method: \'POST\',\n    body: JSON.stringify({ items: cart.items, total })\n  });\n}',
        challengeId: 'a08'
      }
    },

    'a09': {
      title: 'Security Logging & Monitoring Failures',
      owasp: 'OWASP A09',
      confirmation: {
        summary: 'You submitted feedback containing a credit card pattern, and it was logged unredacted. In a real system, this exposed:',
        impacts: [
          'Credit card numbers in plaintext logs',
          'PII (names, emails) in log files',
          'Log files accessible to all developers',
          'Compliance violations (PCI-DSS, GDPR)'
        ],
        vector: 'Network',
        complexity: 'Low — just submit a form',
        privileges: 'None'
      },
      realWorld: {
        year: '2018',
        org: 'Twitter',
        story: 'Twitter discovered that a bug had been writing user passwords to an internal log in plaintext. Every password entered by every user was logged in a system file readable by engineers. Twitter forced 330 million password resets. The same principle applies: never log sensitive data without redaction.',
        cost: '330 million forced password resets',
        result: 'All user passwords exposed internally'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Logs raw user input including PII\napp.post(\'/api/feedback\', (req, res) => {\n  const raw = JSON.stringify(req.body);\n  db.prepare(\'INSERT INTO logs (action, user_input) VALUES (?, ?)\')\n    .run(\'feedback_submit\', raw);\n});',
        fixLabel: 'FIXED',
        fixCode: '// Redact PII before logging\nfunction redactPII(text) {\n  return text\n    .replace(/\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}/g, \'****-****-****-****\')\n    .replace(/\\d{3}-\\d{2}-\\d{4}/g, \'***-**-****\')\n    .replace(/[\\w.]+@[\\w.]+/g, \'[EMAIL REDACTED]\');\n}\n\napp.post(\'/api/feedback\', (req, res) => {\n  const safe = redactPII(JSON.stringify(req.body));\n  db.prepare(\'INSERT INTO logs (action, user_input) VALUES (?, ?)\')\n    .run(\'feedback_submit\', safe);\n});',
        explanation: 'Why this works: A redaction function masks sensitive patterns (card numbers, SSNs, emails) before they reach the log storage. Even if logs are leaked, no usable PII is exposed. This is required for PCI-DSS compliance.'
      },
      fixIt: {
        fileName: 'server.js — feedback endpoint',
        vulnCode: 'app.post(\'/api/feedback\', (req, res) => {\n  const { name, email, comment, payment_ref } = req.body;\n  const raw = JSON.stringify(req.body);\n  db.prepare(\'INSERT INTO logs (action, user_input) VALUES (?, ?)\')\n    .run(\'feedback_submit\', raw);\n  res.json({ success: true });\n});',
        challengeId: 'a09'
      }
    },

    'a10': {
      title: 'Server-Side Request Forgery (SSRF)',
      owasp: 'OWASP A10',
      confirmation: {
        summary: 'You used the supplier import endpoint to fetch internal resources. In a real system, this exposed:',
        impacts: [
          'AWS metadata including IAM credentials',
          'Internal API endpoints not exposed publicly',
          'Cloud service account tokens',
          'Internal network topology information'
        ],
        vector: 'Network',
        complexity: 'Low — just change the URL parameter',
        privileges: 'None'
      },
      realWorld: {
        year: '2019',
        org: 'Capital One',
        story: 'An attacker exploited an SSRF vulnerability in a misconfigured WAF to access the AWS metadata service (169.254.169.254). They retrieved IAM role credentials and used them to access S3 buckets containing 106 million credit applications. The exact technique you demonstrated — accessing internal URLs through a server-side fetch.',
        cost: '$80 million fine + $190 million settlement',
        result: '106 million credit card applications exposed'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Server fetches any URL the user provides\napp.get(\'/api/fetch\', async (req, res) => {\n  const url = req.query.url;\n  const response = await fetch(url);\n  res.send(await response.text());\n});',
        fixLabel: 'FIXED',
        fixCode: '// Allowlist validation before fetch\nconst ALLOWED_HOSTS = [\'api.suppliers.com\', \'feeds.foodservice.net\'];\n\napp.get(\'/api/fetch\', async (req, res) => {\n  const url = new URL(req.query.url);\n  if (!ALLOWED_HOSTS.includes(url.hostname)) {\n    return res.status(403).json({ error: \'Host not allowed\' });\n  }\n  if (url.hostname === \'localhost\' || url.hostname === \'127.0.0.1\'\n      || url.hostname.startsWith(\'169.254\')) {\n    return res.status(403).json({ error: \'Internal addresses blocked\' });\n  }\n  const response = await fetch(url.toString());\n  res.send(await response.text());\n});',
        explanation: 'Why this works: An allowlist restricts which external domains the server can contact. Internal and metadata addresses (localhost, 127.0.0.1, 169.254.*) are explicitly blocked. Only pre-approved supplier APIs can be reached.'
      },
      fixIt: {
        fileName: 'server.js — fetch endpoint',
        vulnCode: 'app.get(\'/api/fetch\', async (req, res) => {\n  const url = req.query.url;\n  if (!url) return res.status(400).json({ error: \'Missing url\' });\n  const response = await fetch(url); // No URL validation!\n  const body = await response.text();\n  res.send(body);\n});',
        challengeId: 'a10'
      }
    },

    'a03-sqli': {
      title: 'SQL Injection',
      owasp: 'OWASP A03',
      confirmation: {
        summary: 'You extracted data from the admin_notes table using a UNION SELECT injection. In a real system, this exposed:',
        impacts: [
          '5 admin notes containing PII',
          '1 corporate credit card number',
          '1 employee SSN',
          'Internal WiFi credentials'
        ],
        vector: 'Network',
        complexity: 'Low — no special tools required',
        privileges: 'None'
      },
      realWorld: {
        year: '2008',
        org: 'Heartland Payment Systems',
        story: 'SQL injection against a payment processor\'s web app exposed 130 MILLION credit card numbers. The attacker used the same technique you just demonstrated — injecting SQL through an input field to extract data from tables the application never intended to expose.',
        cost: '$140 million in settlements',
        result: 'Largest data breach in US history at the time'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: 'const query = `SELECT * FROM products\n  WHERE name LIKE \'%${search}%\'`;',
        fixLabel: 'FIXED',
        fixCode: 'db.prepare(\n  "SELECT * FROM products\n   WHERE name LIKE ?"\n).all(`%${search}%`)',
        explanation: 'Why this works: Parameterized queries send the SQL and the data separately. The database never interprets user input as SQL commands. The ? placeholder tells the database "this is data, not code."'
      },
      fixIt: {
        fileName: 'server.js — line 22',
        vulnCode: 'app.get(\'/api/products\', (req, res) => {\n  const search = req.query.search || \'\';\n  const query = `SELECT id, name, description, price FROM products WHERE name LIKE \'%${search}%\'`;\n  const rows = db.prepare(query).all();\n  res.json(rows);\n});',
        challengeId: 'a03-sqli'
      }
    },

    'a01-idor': {
      title: 'Insecure Direct Object Reference (IDOR)',
      owasp: 'OWASP A01',
      confirmation: {
        summary: 'You accessed orders belonging to other users by manipulating the order ID. In a real system, this exposed:',
        impacts: [
          'Other customers\' full order history',
          'Personal details: names, addresses, emails',
          'Payment information and amounts',
          'Ability to enumerate all orders in the system'
        ],
        vector: 'Network',
        complexity: 'Low — increment the ID number',
        privileges: 'None — endpoint has no authentication'
      },
      realWorld: {
        year: '2023',
        org: 'T-Mobile',
        story: 'T-Mobile\'s API allowed access to any customer\'s account data by changing the account ID in the request. Attackers systematically enumerated IDs and stole data from 37 million customers. The technique is identical to what you just did — changing a number in the URL to access someone else\'s data.',
        cost: '$350 million settlement',
        result: '37 million customer records exposed'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Returns any order — no ownership check\napp.get(\'/api/orders/:id\', (req, res) => {\n  const order = db.prepare(\n    \'SELECT * FROM orders WHERE id = ?\'\n  ).get(req.params.id);\n  res.json(order);\n});',
        fixLabel: 'FIXED',
        fixCode: '// Ownership check: only return if user owns the order\napp.get(\'/api/orders/:id\', authenticate, (req, res) => {\n  const order = db.prepare(\n    \'SELECT * FROM orders WHERE id = ? AND user_id = ?\'\n  ).get(req.params.id, req.user.id);\n  if (!order) return res.status(403).json({ error: \'Forbidden\' });\n  res.json(order);\n});',
        explanation: 'Why this works: The query includes AND user_id = ? to ensure the authenticated user can only access their own orders. Even if someone guesses another ID, they get a 403 Forbidden because the order doesn\'t belong to their session.'
      },
      fixIt: {
        fileName: 'server.js — orders endpoint',
        vulnCode: 'app.get(\'/api/orders/:id\', (req, res) => {\n  const order = db.prepare(\n    \'SELECT * FROM orders WHERE id = ?\'\n  ).get(req.params.id);\n  if (!order) return res.status(404).json({ error: \'Not found\' });\n  res.json(order);\n});',
        challengeId: 'a01-idor'
      }
    },

    'a03-stored-xss': {
      title: 'Stored Cross-Site Scripting',
      owasp: 'OWASP A03',
      confirmation: {
        summary: 'You injected persistent malicious content into the reviews database. In a real system, this means:',
        impacts: [
          'Every visitor who views the reviews page is attacked',
          'Stored payloads persist across page loads and sessions',
          'Can steal cookies/tokens from any visitor',
          'Can create fake login forms to harvest credentials'
        ],
        vector: 'Network',
        complexity: 'Low — just submit a review',
        privileges: 'None'
      },
      realWorld: {
        year: '2015',
        org: 'eBay',
        story: 'Attackers discovered that eBay product listings could contain active JavaScript. They injected scripts into listing descriptions that redirected buyers to phishing pages. Because the content was stored in eBay\'s database, every visitor to those listings was attacked — exactly the stored XSS pattern you just demonstrated.',
        cost: 'Unknown — affected millions of listings',
        result: 'Mass phishing via trusted e-commerce platform'
      },
      fix: {
        label: 'VULNERABLE',
        vulnCode: '// Raw HTML rendered from database\nreviews.forEach(r => {\n  reviewList.innerHTML += \n    `<div class="review">${r.content}</div>`;\n});',
        fixLabel: 'FIXED',
        fixCode: '// Safe text rendering\nreviews.forEach(r => {\n  const div = document.createElement(\'div\');\n  div.className = \'review\';\n  div.textContent = r.content;\n  reviewList.appendChild(div);\n});\n\n// Server-side: also sanitize on input\nconst sanitize = require(\'sanitize-html\');\nconst clean = sanitize(content, { allowedTags: [] });',
        explanation: 'Why this works: Defense in depth — sanitize on input (server strips HTML tags before storage) AND on output (use textContent instead of innerHTML). Even if one layer fails, the other protects users.'
      },
      fixIt: {
        fileName: 'stored-xss.html — review rendering',
        vulnCode: '// Renders stored reviews as raw HTML\nfunction renderReviews(reviews) {\n  const list = document.getElementById(\'review-list\');\n  list.innerHTML = reviews.map(r =>\n    `<div class="review-item">\n      <strong>${r.author}</strong>\n      <div>${r.content}</div>\n    </div>`\n  ).join(\'\');\n}',
        challengeId: 'a03-stored-xss'
      }
    }
  };

  // ── Modal Creation ──────────────────────────────────────────────

  function createModal(challengeId) {
    const data = BREACH_DATA[challengeId];
    if (!data) return;

    // Remove existing modal
    const existing = document.getElementById('breach-report-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'breach-report-modal';
    modal.className = 'breach-modal-overlay';
    modal.innerHTML = `
      <div class="breach-modal">
        <button class="breach-close" aria-label="Close">&times;</button>
        <div class="breach-tabs">
          <button class="breach-tab active" data-panel="0">🔴 Breach</button>
          <button class="breach-tab" data-panel="1">📰 Real World</button>
          <button class="breach-tab" data-panel="2">🔧 The Fix</button>
          <button class="breach-tab" data-panel="3">🛠️ Fix It</button>
        </div>

        <!-- Panel 0: Breach Confirmation -->
        <div class="breach-panel active" data-panel="0">
          <div class="breach-header">
            <span class="breach-indicator">🔴</span>
            <h2>VULNERABILITY CONFIRMED</h2>
          </div>
          <div class="breach-title-row">
            <span class="breach-vuln-name">${_esc(data.title)}</span>
            <span class="breach-owasp-tag">${_esc(data.owasp)}</span>
          </div>
          <p class="breach-summary">${_esc(data.confirmation.summary)}</p>
          <ul class="breach-impacts">
            ${data.confirmation.impacts.map(i => `<li>${_esc(i)}</li>`).join('')}
          </ul>
          <div class="breach-meta">
            <div><strong>Attack vector:</strong> ${_esc(data.confirmation.vector)}</div>
            <div><strong>Complexity:</strong> ${_esc(data.confirmation.complexity)}</div>
            <div><strong>Privileges required:</strong> ${_esc(data.confirmation.privileges)}</div>
          </div>
        </div>

        <!-- Panel 1: Real World Impact -->
        <div class="breach-panel" data-panel="1">
          <div class="breach-header">
            <span class="breach-indicator">📰</span>
            <h2>THIS HAS HAPPENED BEFORE</h2>
          </div>
          <div class="breach-real-world">
            <div class="breach-year">${_esc(data.realWorld.year)} — ${_esc(data.realWorld.org)}</div>
            <p>${_esc(data.realWorld.story)}</p>
            <div class="breach-meta">
              <div><strong>Cost:</strong> ${_esc(data.realWorld.cost)}</div>
              <div><strong>Result:</strong> ${_esc(data.realWorld.result)}</div>
            </div>
          </div>
        </div>

        <!-- Panel 2: The Fix -->
        <div class="breach-panel" data-panel="2">
          <div class="breach-header">
            <span class="breach-indicator">🔧</span>
            <h2>THE FIX</h2>
          </div>
          <div class="breach-fix-section">
            <div class="breach-code-label breach-vuln-label">${_esc(data.fix.label)}:</div>
            <pre class="breach-code breach-code-vuln">${_esc(data.fix.vulnCode)}</pre>
            <div class="breach-code-label breach-fix-label">${_esc(data.fix.fixLabel)}:</div>
            <pre class="breach-code breach-code-fix">${_esc(data.fix.fixCode)}</pre>
            <p class="breach-explanation">${_esc(data.fix.explanation)}</p>
          </div>
          <div class="breach-actions">
            <button class="btn btn-primary breach-try-fix" data-challenge="${_esc(challengeId)}">Try to Fix It →</button>
            <button class="btn btn-success breach-mark-complete" data-challenge="${_esc(challengeId)}">Mark Complete</button>
          </div>
        </div>

        <!-- Panel 3: Fix It Mode (rendered by fix-it.js) -->
        <div class="breach-panel" data-panel="3">
          <div class="breach-header">
            <span class="breach-indicator">🛠️</span>
            <h2>FIX IT MODE</h2>
          </div>
          <p class="breach-fix-intro">Edit the vulnerable function below. When you submit, we'll run the same attack payload against your fix.</p>
          <div class="breach-fix-file">${_esc(data.fixIt.fileName)}</div>
          <div id="fix-it-editor-container"></div>
          <div class="breach-fix-actions">
            <button class="btn btn-primary" id="fix-test-btn">Test My Fix</button>
          </div>
          <div id="fix-result" class="breach-fix-result">⏳ waiting...</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Tab switching
    modal.querySelectorAll('.breach-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.breach-tab').forEach(t => t.classList.remove('active'));
        modal.querySelectorAll('.breach-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        modal.querySelector(`.breach-panel[data-panel="${tab.dataset.panel}"]`).classList.add('active');
        // Initialize Fix It editor when tab 3 is opened
        if (tab.dataset.panel === '3' && typeof window.initFixItEditor === 'function') {
          window.initFixItEditor(challengeId, data.fixIt.vulnCode);
        }
      });
    });

    // Close button
    modal.querySelector('.breach-close').addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
      }
    });

    // "Try to Fix It" button
    modal.querySelector('.breach-try-fix').addEventListener('click', () => {
      modal.querySelectorAll('.breach-tab').forEach(t => t.classList.remove('active'));
      modal.querySelectorAll('.breach-panel').forEach(p => p.classList.remove('active'));
      modal.querySelector('.breach-tab[data-panel="3"]').classList.add('active');
      modal.querySelector('.breach-panel[data-panel="3"]').classList.add('active');
      if (typeof window.initFixItEditor === 'function') {
        window.initFixItEditor(challengeId, data.fixIt.vulnCode);
      }
    });

    // "Mark Complete" button
    modal.querySelector('.breach-mark-complete').addEventListener('click', () => {
      markChallengeComplete(challengeId);
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    });

    // Show with animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.classList.add('active');
      });
    });

    return modal;
  }

  function markChallengeComplete(challengeId) {
    // Add to completedChallenges
    if (window.Modules) {
      Modules.addCompletedChallenge(challengeId);
    }

    // POST to server
    const studentName = localStorage.getItem('studentName') || 'anonymous';
    const classCode = localStorage.getItem('classCode') || '';
    const times = JSON.parse(localStorage.getItem('challengeTimes') || '{}');
    const tokens = JSON.parse(localStorage.getItem('hintTokens') || '{}');
    const hintsUsed = tokens[challengeId] !== undefined ? (3 - tokens[challengeId]) : 0;

    fetch('/api/progress/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_code: classCode,
        student_name: studentName,
        challenge_id: challengeId,
        hints_used: hintsUsed,
        time_spent_seconds: times[challengeId] || 0
      })
    }).catch(() => {});

    // Trigger confetti
    spawnConfetti();

    // Show re-open button
    showViewReportButton(challengeId);

    // Refresh board if on challenges page
    if (typeof window.refreshBoard === 'function') {
      window.refreshBoard();
    }
    if (typeof window.renderModuleBoard === 'function') {
      window.renderModuleBoard();
    }
  }

  function showViewReportButton(challengeId) {
    if (document.getElementById('view-report-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'view-report-btn';
    btn.className = 'btn btn-danger';
    btn.style.cssText = 'position:fixed;bottom:2rem;right:2rem;z-index:9000;';
    btn.textContent = '🔴 View Report';
    btn.addEventListener('click', () => {
      createModal(challengeId);
    });
    document.body.appendChild(btn);
  }

  function spawnConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    const colors = ['#4ade80', '#f5a623', '#f87171', '#a78bfa', '#38bdf8', '#e8463a'];
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 0.5 + 's';
      piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      if (Math.random() > 0.5) piece.style.borderRadius = '50%';
      container.appendChild(piece);
    }
    setTimeout(() => container.remove(), 4000);
  }

  function _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Global trigger function ───────────────────────────────────────

  window.triggerBreachReport = function (challengeId) {
    // Check if already completed
    const completed = JSON.parse(localStorage.getItem('completedChallenges') || '[]');
    if (completed.includes(challengeId)) {
      showViewReportButton(challengeId);
      return;
    }
    createModal(challengeId);
  };

  // On page load, if challenge is already solved, show the view report button
  document.addEventListener('DOMContentLoaded', () => {
    const challengeId = document.body.dataset.challenge;
    if (!challengeId) return;
    const completed = JSON.parse(localStorage.getItem('completedChallenges') || '[]');
    if (completed.includes(challengeId)) {
      showViewReportButton(challengeId);
    }
  });

  // Expose for external use
  window.BreachReport = { BREACH_DATA, createModal, markChallengeComplete };
})();
