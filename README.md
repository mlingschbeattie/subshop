# 🥪 The Sub Shop

**OWASP Top 10 Security Training Lab** — A deliberately vulnerable web application for intermediate/advanced security training.

Every page hides a real, exploitable vulnerability mapped to the OWASP Top 10. Students find them using browser DevTools alone, document their findings on a built-in scorecard, and (optionally) use Learn Mode for guided discovery.

> **⚠️ For educational use only.** Do not deploy to production or expose to the internet.

---

## Quick Start

```bash
docker compose up --build
```

Open **http://localhost:3003** in your browser. That's it.

### Without Docker

```bash
npm install
node db/seed.js
node server.js
```

Server starts on port **3003**.

---

## Docker Architecture

The app is fully containerised. Here is how each piece fits together:

### `Dockerfile`
```
node:20-alpine  →  npm ci --omit=dev  →  COPY source  →  node db/seed.js  →  node server.js
```
- **Base image:** `node:20-alpine` — minimal Node.js 20 on Alpine Linux (~50 MB)
- **`npm ci --omit=dev`** — installs only production dependencies (`express`, `better-sqlite3`, `cors`); dev tools are excluded from the image
- **`COPY . .`** — copies all source files including `public/`, `db/`, and `server.js`
- **`RUN node db/seed.js`** — runs the database seeder at **build time**, creating `db/freshsqueeze.db` with all tables and sample data baked into the image layer
- **`CMD ["node", "server.js"]`** — starts the Express server on port 3003 when the container launches

### `docker-compose.yml`
| Setting | Purpose |
|---------|---------|
| `ports: "3001:3001"` | Maps host port 3001 to container port 3001 — open `http://localhost:3001` |
| `volumes: ./db/freshsqueeze.db:/app/db/freshsqueeze.db` | Mounts the SQLite database file from the host, so student-submitted data (reviews, feedback, logs) persists across container restarts |
| `environment: NODE_ENV=development` | Enables verbose error output and stack trace leakage (intentional for the training lab) |
| `restart: unless-stopped` | Container auto-restarts on crash — keeps the lab running |

### `server.js` (Express app)
- Opens `db/freshsqueeze.db` with `better-sqlite3` (synchronous SQLite driver)
- Serves `public/` as static files — all HTML pages are reachable at `localhost:3001/<path>`
- Exposes 10 vulnerable API endpoints (`/api/products`, `/api/orders/:id`, `/api/login`, etc.)
- Wildcard CORS enabled — any origin can call the API (intentional vulnerability: A05)

### Volume mount caveat
The seed runs at **image build time**, but the volume mount overlays the DB file at **container start time**. If `./db/freshsqueeze.db` does not yet exist on the host when you first run `docker compose up`, Docker creates an empty regular file there — which SQLite cannot open. The `--build` flag re-seeds the DB inside the image layer before the mount takes effect:

```bash
# Always use --build on first run or after resetting:
docker compose up --build

# To re-seed without rebuilding the whole image:
docker compose exec app node db/seed.js
```

---

## Challenge Index

| # | OWASP | Page | Vulnerability | Difficulty |
|---|-------|------|---------------|------------|
| 1 | A01 | `menu.html` | Broken Access Control — hidden staff items via URL parameter | Intermediate |
| 2 | A02 | `loyalty.html` | Cryptographic Failures — Base64 token exposes PII + cookie | Intermediate |
| 3 | A03 | `search.html` | XSS (DOM) — innerHTML + stored in localStorage | Intermediate |
| 4 | A04 | `order.html` | Insecure Design — client-side price in editable hidden field | Intermediate |
| 5 | A05 | `admin.html` | Security Misconfiguration — hardcoded credentials in JS source | Intermediate |
| 6 | A06 | `recipes.html` | Vulnerable Components — outdated library with prototype pollution CVE | Advanced |
| 7 | A07 | `login.html` | Auth Failures — plaintext passwords + forgeable token + no lockout | Advanced |
| 8 | A08 | `cart.html` | Data Integrity Failures — client-side cart with weak integrity checksum | Advanced |
| 9 | A09 | `feedback.html` | Logging Failures — PII logged in cleartext (see `logs.html`) | Advanced |
| 10 | A10 | `suppliers.html` | SSRF — server fetches user-supplied URL, target internal endpoints | Advanced |
| 11 | A03 | `sqli.html` | SQL Injection — server-side string-concatenated SQL query | Advanced |
| 12 | A01 | `idor.html` | IDOR — sequential order IDs with no ownership check | Intermediate |
| 13 | A03 | `stored-xss.html` | Stored XSS — reviews stored raw in DB, rendered as innerHTML | Advanced |

---

## Honeypots

The app contains **3 hidden gotcha scenarios** designed to catch careless or curious behavior. They are not listed in the challenge board — students discover them organically. Each one reveals a security lesson when triggered.

No spoilers here. Look for `<!-- HONEYPOT -->` comments if you're the instructor.

---

## Learn Mode

Toggle Learn Mode by clicking the **🎓 Learn** button in the navigation bar on any page.

When active, Learn Mode reveals:

- **Banner** — confirms Learn Mode is active with a brief description
- **Progressive Hints** — up to 4 hints per challenge, revealed one at a time
- **Full Walkthrough** — step-by-step exploit instructions (hidden until all hints are shown)
- **ELI5 Block** — plain-English explanation, analogy, and real-world breach example

Learn Mode state persists in `localStorage`. Hint progress is saved per-challenge.

---

## Scorecard

Open the **Scorecard** from the main navigation or at `/scorecard.html`.

Each of the 13 challenges has:
- ✅ Solved checkbox
- Vulnerability name (text input)
- Discovery method (dropdown)
- Attack vector (dropdown)
- Exploit description (textarea)
- Difficulty rating (★ 1–5)
- Learn Mode fields (visible only when Learn Mode is active)

The 3 honeypot/pitfall sections have similar fields for documenting what triggered them.

All data auto-saves to `localStorage` on every keystroke. Use **Calculate Score** to see your tally: `X / 13 challenges + Y / 3 bonus`.

### Instructor Mode

Append `?instructor=true` to the scorecard URL:

```
http://localhost:3001/scorecard.html?instructor=true
```

This unlocks an **Instructor View** panel at the top with:

1. **Class Code** — students set this on first visit (stored in localStorage)
2. **Export My Results** — downloads all answers as a JSON file
3. **Import Student Results** — upload one or more student JSON files to see a summary table:
   - Student name, challenges solved, most common discovery method, average difficulty rating

Everything is client-side — no backend required for the scorecard.

---

## Resetting

### Reset student progress (browser)
Click **Reset** on the challenge board, or clear `localStorage` in DevTools.

### Reset the database
```bash
# Docker
docker compose exec app node db/seed.js

# Local
node db/seed.js
```

This recreates all tables and re-seeds sample data (users, products, orders, admin notes, reviews).

---

## Solutions

> **🚨 Spoilers below.** Only expand these if you're the instructor or have already completed the challenge.

<details>
<summary><strong>Challenge 1 — Menu (A01: Broken Access Control)</strong></summary>

Add `?staff=true` to the menu URL. The page checks for a `staff` URL parameter and reveals hidden menu items with internal notes and pricing. No authentication is required.

**Fix:** Server-side role check before returning staff-only data.
</details>

<details>
<summary><strong>Challenge 2 — Loyalty (A02: Cryptographic Failures)</strong></summary>

The loyalty token displayed on the page is Base64-encoded. Decode it to reveal the user's full record including email, PII, and reward balance. A cookie named `loyaltyUser` is also set with the same base64 value.

**Fix:** Use opaque tokens, never encode sensitive data in client-readable tokens.
</details>

<details>
<summary><strong>Challenge 3 — Search (A03: XSS / DOM)</strong></summary>

The search bar renders results via `innerHTML` without sanitization. Enter `<img src=x onerror=alert('XSS')>` to execute arbitrary JavaScript. Search history is stored in `localStorage` and re-rendered on page load.

**Fix:** Use `textContent` instead of `innerHTML`, or sanitize input.
</details>

<details>
<summary><strong>Challenge 4 — Order (A04: Insecure Design)</strong></summary>

The order form includes a hidden field with the item price. Use DevTools to change the value before submitting. The client-side total recalculates from the hidden field with no server-side validation.

**Fix:** Never trust client-side pricing. Validate all values server-side.
</details>

<details>
<summary><strong>Challenge 5 — Admin (A05: Security Misconfiguration)</strong></summary>

View the page source or JavaScript to find hardcoded credentials (`SubShop2026!` / `LetMeIn#99`). The admin panel checks these client-side. There's also a `_debug` field returned by the `/api/admin` endpoint.

**Fix:** Never hardcode credentials. Use server-side auth with hashed passwords.
</details>

<details>
<summary><strong>Challenge 6 — Recipes (A06: Vulnerable Components)</strong></summary>

The page uses `juice-parser-v0.3.2.js`, a fake library with a known prototype pollution vulnerability (CVE-2019-11358 pattern). Call `JuiceParser.configure()` with a crafted object containing `__proto__` to pollute `Object.prototype`.

**Fix:** Keep dependencies updated. Audit third-party libraries for known CVEs.
</details>

<details>
<summary><strong>Challenge 7 — Login (A07: Authentication Failures)</strong></summary>

Passwords are compared in plaintext. The JWT secret is visible in the page source. Authentication tokens are predictable base64-encoded strings. There's no account lockout after failed attempts.

**Fix:** Hash passwords (bcrypt), use strong JWT secrets, implement rate limiting and lockout.
</details>

<details>
<summary><strong>Challenge 8 — Cart (A08: Data Integrity Failures)</strong></summary>

The shopping cart is stored entirely client-side with a weak integrity checksum. Modify cart items and prices in `localStorage` or DevTools, then recalculate the checksum to bypass validation.

**Fix:** Server-side cart management with cryptographic integrity verification.
</details>

<details>
<summary><strong>Challenge 9 — Feedback (A09: Logging Failures)</strong></summary>

Submit feedback with PII (credit card numbers, SSNs). The feedback is logged in cleartext to the server. Visit `/pages/logs.html` to see all logged data including sensitive information with no redaction.

**Fix:** Redact or mask PII before logging. Restrict access to log data.
</details>

<details>
<summary><strong>Challenge 10 — Suppliers (A10: SSRF)</strong></summary>

The supplier lookup fetches a user-supplied URL server-side via `/api/fetch?url=`. Target internal endpoints like `http://169.254.169.254/latest/meta-data/` (simulated AWS metadata) or `http://localhost:3001/api/admin` to access internal resources.

**Fix:** Validate and whitelist allowed URL patterns. Block internal/private IP ranges.
</details>

<details>
<summary><strong>Challenge 11 — SQL Injection (A03: Injection)</strong></summary>

The product search at `/api/products?search=` uses string concatenation to build SQL. Use a UNION-based injection to extract data from other tables:

```
' UNION SELECT id, title, body, created_at, 'x' FROM admin_notes --
```

This leaks admin notes containing fake SSNs and credit card numbers.

**Fix:** Use parameterized queries / prepared statements.
</details>

<details>
<summary><strong>Challenge 12 — IDOR (A01: Broken Access Control)</strong></summary>

The order detail endpoint `/api/orders/:id` returns any order by ID with no ownership check. Iterate through sequential IDs (1, 2, 3…) to access other users' orders containing their names, addresses, and order details.

**Fix:** Verify the authenticated user owns the requested resource.
</details>

<details>
<summary><strong>Challenge 13 — Stored XSS (A03: Injection)</strong></summary>

Submit a review at `/api/review` containing HTML/JavaScript. The review is stored raw in the database. When rendered on the page via `innerHTML`, the script executes for every visitor.

```
<img src=x onerror=alert('Stored XSS')>
```

**Fix:** Sanitize HTML on input and output. Use `textContent` for rendering.
</details>

---

## Instructor Notes

### Suggested Classroom Flow

1. **Introduction (10 min)** — Explain the OWASP Top 10, demo the app, show the challenge board
2. **Independent Work (45-60 min)** — Students work through challenges at their own pace
3. **Learn Mode Discussion (15 min)** — Enable Learn Mode, walk through 2-3 challenges together
4. **Scorecard Review (15 min)** — Students present their most interesting finding
5. **Debrief (10 min)** — Discuss real-world implications, defensive strategies

### Discussion Questions per Challenge

| Challenge | Discussion Question |
|-----------|-------------------|
| Menu (A01) | How would you implement proper role-based access control? |
| Loyalty (A02) | What's the difference between encoding and encryption? When does each fail? |
| Search (A03) | What's the difference between DOM XSS and reflected XSS? |
| Order (A04) | Why can't you trust any data that comes from the client? |
| Admin (A05) | How do you manage secrets in a real application? |
| Recipes (A06) | How do you audit your dependencies? What tools exist? |
| Login (A07) | What makes a good authentication system? List the layers. |
| Cart (A08) | How do you ensure data integrity without trusting the client? |
| Feedback (A09) | What regulations govern PII in logs (GDPR, HIPAA, PCI-DSS)? |
| Suppliers (A10) | What is SSRF and why is it especially dangerous in cloud environments? |
| SQL Injection | Why are parameterized queries the gold standard? |
| IDOR | How does IDOR differ from other access control failures? |
| Stored XSS | Why is stored XSS more dangerous than reflected XSS? |

### Tips

- Have students work in pairs for richer discussion
- Advanced students can try chaining vulnerabilities (e.g., SSRF → admin endpoint → credential leak)
- Use the honeypots as surprise teaching moments — don't warn students about them
- Export student scorecards via Instructor Mode for grading
