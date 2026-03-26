# FreshSqueeze Sub Shop — Master Build Prompt (v3 + Learn Mode + Docker)

## Project Overview

Build a complete, deliberately vulnerable web application called **FreshSqueeze Sub Shop** for intermediate/advanced security training. The app contains one exploitable vulnerability per OWASP Top 10, three honeypot/gotcha scenarios, a student scorecard, and a global Learn Mode. It runs in Docker with a real Node.js + Express + SQLite backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 (Alpine) |
| Framework | Express.js |
| Database | SQLite via `better-sqlite3` |
| Frontend | Vanilla HTML/CSS/JS — no frameworks, no build step |
| Fonts | Google Fonts via CDN |
| Container | Docker + Docker Compose |
| Port | 3000 (mapped to host) |

**Dependencies (package.json):** `express`, `better-sqlite3`, `cors` — nothing else.

---

## Project File Structure

```
freshsqueeze/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── server.js                  # Express app — keep under 200 lines
├── db/
│   ├── schema.sql             # Table definitions
│   └── seed.js                # Seed script (node db/seed.js)
├── public/                    # Served as static root
│   ├── index.html             # Landing page + challenge board
│   ├── scorecard.html         # Student submission form
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   ├── main.js            # Global JS: learn mode toggle, nav, cart badge
│   │   └── learn-mode.js      # Learn mode engine (show/hide, hints, ELI5)
│   └── pages/
│       ├── menu.html          # A01 — Broken Access Control
│       ├── loyalty.html       # A02 — Cryptographic Failures
│       ├── search.html        # A03 — XSS / Injection
│       ├── order.html         # A04 — Insecure Design
│       ├── admin.html         # A05 — Security Misconfiguration
│       ├── recipes.html       # A06 — Vulnerable Components
│       ├── login.html         # A07 — Auth Failures
│       ├── cart.html          # A08 — Data Integrity Failures
│       ├── feedback.html      # A09 — Logging & Monitoring Failures
│       ├── suppliers.html     # A10 — SSRF
│       ├── sqli.html          # A03 (server-side) — Real SQL Injection
│       ├── idor.html          # A01 (server-side) — IDOR
│       ├── stored-xss.html    # A03 (server-side) — Stored XSS
│       ├── logs.html          # A09 — Live logging dashboard
│       └── phishing.html      # Honeypot 2 — Fake login page
└── README.md
```

---

## Database Schema (db/schema.sql)

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,         -- VULNERABLE: plaintext, intentional
  role TEXT DEFAULT 'customer'    -- values: customer, staff, admin
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  item TEXT NOT NULL,
  price REAL NOT NULL,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  secret TEXT                     -- VULNERABLE: hidden column, never shown in UI
);

CREATE TABLE admin_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note TEXT NOT NULL,             -- contains fake sensitive data (SSNs, card numbers)
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT,
  content TEXT,                   -- VULNERABLE: stored raw, rendered as innerHTML
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  user_input TEXT,                -- VULNERABLE: raw user input stored unredacted
  timestamp TEXT DEFAULT (datetime('now'))
);
```

**Seed data requirements (db/seed.js):**
- 10 users: mix of customer/staff/admin roles, plaintext passwords, realistic names
- 1 admin user: username `admin`, password `admin123`
- 20 orders spread across user IDs 1–10
- 12 products, 2 of which have a non-null `secret` column value
- 5 admin_notes containing fake sensitive strings (fake SSNs, fake card numbers, internal memos)
- 3 pre-seeded reviews (clean content, no XSS)
- Empty logs table

---

## Backend API (server.js)

### General Rules
- Inline comment every vulnerable line with `// VULNERABLE: [reason]`
- Intentionally omit: `helmet`, rate limiting, input sanitization, auth middleware
- CORS set to `*`
- Error responses must leak the full stack trace in development
- No session middleware — auth state is JWT-less tokens in localStorage (client-side only)

### Endpoints

| Method | Path | Vulnerability | OWASP |
|---|---|---|---|
| GET | `/api/products?search=` | String-concatenated SQL query | A03 |
| GET | `/api/orders/:id` | No ownership check — any ID works | A01 |
| GET | `/api/user/:id` | IDOR — returns any user's full record | A01 |
| POST | `/api/login` | Plaintext compare, no lockout | A07 |
| POST | `/api/review` | Stores raw HTML content, no sanitization | A03 |
| GET | `/api/reviews` | Returns all reviews including injected HTML | A03 |
| POST | `/api/feedback` | Logs raw user input including PII | A09 |
| GET | `/api/logs` | Returns full log table (raw input visible) | A09 |
| GET | `/api/fetch?url=` | Server-side fetch of user-supplied URL | A10 |
| GET | `/api/admin` | Returns 403 but leaks data in response body | A05 |

### SSRF Implementation Note
`/api/fetch?url=` must use Node's `fetch()` or `axios` to retrieve the URL server-side and return the response body. For demonstration, students can redirect it to `http://localhost:3000/api/admin` or `http://169.254.169.254/latest/meta-data/` (simulated — return a fake metadata response if the AWS metadata IP is requested).

---

## Frontend Challenge Pages

### Shared Page Template
Every page must include:
1. The shared `<header>` with the Learn Mode toggle
2. A `data-challenge` attribute on `<body>` (e.g. `data-challenge="a01"`)
3. Learn mode containers (hidden by default, revealed by learn-mode.js):
   - `.learn-banner` — context banner below header
   - `.learn-hints` — collapsible hint panel
   - `.learn-eli5` — ELI5 block at bottom of page
4. An HTML comment `<!-- HINT: [one-sentence clue] -->`
5. An HTML comment `<!-- OWASP: [ID] - [Name] -->`

---

### Challenge Pages — Vulnerabilities

**A01 — menu.html (Broken Access Control)**
- Display a public menu with 8 items
- 3 additional "staff-only" items hidden via `?role=staff` URL parameter
- Client-side JS checks `URLSearchParams` for role — no server validation
- Staff items include a "Secret Sauce Recipe" and discounted prices
- `<!-- HINT: Check what URL parameters this page accepts -->`

**A02 — loyalty.html (Cryptographic Failures)**
- Display a loyalty card with a "Member Token" shown on screen
- Token is a Base64-encoded string containing: `{"user":"admin","points":4200,"secret":"FLAG-CRYPTO-001"}`
- A "Decode Token" button that does nothing useful — the token is already on the page
- Also set a cookie named `session` with the same Base64 value (not HttpOnly, not Secure)
- `<!-- HINT: Base64 is encoding, not encryption. Try decoding that token. -->`

**A03 — search.html (DOM-based XSS)**
- A search input that filters sub menu items
- Results rendered via `element.innerHTML = userInput` — unsanitized
- Pre-populated with 10 menu items stored in a JS array
- Upgrade: also persist the last search term in `localStorage` and re-render on page load (simulating stored XSS behavior)
- `<!-- HINT: What happens if your search term contains HTML tags? -->`

**A04 — order.html (Insecure Design)**
- A sub order form: choose items, quantity, extras
- Final price calculated client-side and stored in a hidden `<input name="price">`
- The hidden input is visible in DevTools and editable
- On "Place Order" the form submits the price field as-is with no server validation
- `<!-- HINT: Inspect the form. Is the price field actually hidden from manipulation? -->`

**A05 — admin.html (Security Misconfiguration)**
- A page that looks like a protected staff panel
- The "access check" is pure client-side JavaScript:
  ```javascript
  // TODO: replace hardcoded credentials before launch
  const STAFF_PASSWORD = "freshjuice2024";
  ```
- Password prompt dialog; entering the hardcoded password reveals the panel
- Also include a "Download Staff Roster" button (Honeypot 1 — see Honeypots section)
- `<!-- HINT: View the page source. Authentication logic should never live in the browser. -->`

**A06 — recipes.html (Vulnerable Components)**
- Loads a fake library: `<script src="/js/lib/juice-parser-v0.3.2.js"></script>`
- Create that JS file — it's a fake "markdown-to-html" parser
- Include inside it:
  ```javascript
  // juice-parser v0.3.2 — DO NOT UPGRADE (breaks legacy menu format)
  // CVE-2019-11358: Prototype pollution via __proto__ key in parsed objects
  // See: https://security.snyk.io/vuln/SNYK-JS-JQUERY-174006
  ```
- The parser has an actual prototype pollution demo: parsing `{"__proto__":{"isAdmin":true}}` sets `isAdmin` on all objects
- A test input on the page lets students paste JSON and see the pollution happen in console
- `<!-- HINT: Check which external libraries this page loads and their version numbers -->`

**A07 — login.html (Auth Failures)**
- Login form that POSTs to `/api/login`
- After successful login, stores `{"username":"...","role":"...","token":"dXNlcjox"}` in `localStorage.user`
- The "token" is Base64 of `user:1` — changing it to `admin:1` and refreshing grants admin UI
- No account lockout — brute force is possible
- No CSRF protection
- Honeypot 2 "Forgot Password" link leads to phishing.html (see Honeypots)
- `<!-- HINT: What does the app store in localStorage after you log in? Can it be modified? -->`

**A08 — cart.html (Data Integrity Failures)**
- A shopping cart that stores items in `localStorage.cart` as a JSON array
- Each item has `{name, price, qty}` — price is client-controlled
- Cart total calculated from localStorage values with no server-side verification
- Add a fake "integrity checksum": `cart_hash = btoa(total)` stored in `localStorage.cart_hash`
- Students must: (1) edit the price in localStorage, (2) recalculate and update the hash
- `<!-- HINT: Open Application tab in DevTools. What's in localStorage? Is cart_hash actually secure? -->`

**A09 — feedback.html (Logging Failures)**
- A customer feedback form: name, email, comment, and a "Payment reference (optional)" field
- The payment reference field accepts and stores anything — credit card numbers, SSNs
- On submit, POSTs to `/api/feedback` which logs everything raw to the `logs` table
- No input validation, no PII detection, no redaction
- A subtle note: "Feedback is reviewed by our team" — implying logs are read
- `<!-- HINT: Submit sensitive-looking data. Then visit /pages/logs.html to see what was stored. -->`

**A10 — suppliers.html (SSRF)**
- A "Supplier Catalog" page that fetches supplier info from an external URL
- Input field: "Enter supplier API endpoint"
- On submit, sends to `/api/fetch?url=[input]` — server fetches the URL and returns response
- Demo targets for students:
  - `http://localhost:3000/api/admin` (access internal endpoint)
  - `http://localhost:3000/api/user/1` (access internal user data)
- `<!-- HINT: This page asks the SERVER to fetch a URL. What internal URLs could you target? -->`

**sqli.html — Server-Side SQL Injection**
- "Customer Lookup" search that calls `GET /api/products?search=`
- Server builds query via string concatenation — no parameterized queries
- Results shown in a styled table
- Students can run: `' OR '1'='1`, `' UNION SELECT id,note,created_at,null,null FROM admin_notes--`
- On successful UNION injection, admin_notes data appears in the results table
- `<!-- HINT: The search box talks to a real database. Try classic SQL injection syntax. -->`

**idor.html — Insecure Direct Object Reference**
- "My Orders" page — fetches `GET /api/orders/[id]` where ID starts at the logged-in user's value
- A visible order ID field the student can increment manually
- No ownership validation server-side — ID 1 through 20 all return data
- `<!-- HINT: Change the order ID in the request. Does the server check that order belongs to you? -->`

**stored-xss.html — Stored XSS**
- A "Leave a Review" form — POSTs to `/api/review`
- Reviews fetched from `/api/reviews` and rendered via `innerHTML`
- Pre-seeded clean reviews displayed on load; injected payload persists across page loads
- `<!-- HINT: Submit a review containing an HTML script tag. Reload the page. -->`

**logs.html — Logging Dashboard**
- Fetches and displays the full `logs` table from `/api/logs`
- Shows action, raw user_input, timestamp in a table
- The filter input is also vulnerable to XSS (rendered via innerHTML)
- `<!-- HINT: Look at what raw data was logged from the feedback form. PII is stored unredacted. -->`

---

## Honeypot / Gotcha Scenarios

### Honeypot 1 — Fake Malware Download (admin.html)
- A button: "📥 Export Staff Roster (.exe)"
- Clicking it triggers a full-screen dramatic overlay with:
  - Fake terminal output scrolling red text (file enumeration, encryption simulation)
  - Fake ransom note: "Your files have been encrypted. Send 0.5 BTC to..."
  - Countdown timer from 10 to 0
  - After countdown (or pressing Escape): overlay fades to a reveal screen
  - Reveal: "This was a simulation. In a real attack, that file would have deployed ransomware. Never download executables from admin panels — even ones you think you control."
- Add `<!-- HONEYPOT 1: Social engineering + malicious download -->` comment

### Honeypot 2 — Phishing Page (login.html → phishing.html)
- "Forgot password? Reset here →" link on login.html points to `pages/phishing.html`
- phishing.html looks nearly identical to login.html but:
  - URL is noticeably different (phishing.html vs login.html)
  - Page title is "FreshSqueeze Account Recovery" (subtly different)
  - Form "captures" credentials into a visible `<div>` on submit: "✅ Credentials received: admin / [password]"
  - Then reveals: "You just submitted your credentials to a fake page. Always verify the URL before entering passwords. This is how phishing attacks work."
- Add `<!-- HONEYPOT 2: Phishing / credential harvesting -->` comment

### Honeypot 3 — Poisoned Cookie (loyalty.html)
- A "🎁 Claim Free Sub" button that sets `document.cookie = "admin_override=true; path=/"`
- Nothing visible happens immediately — the cookie is set silently
- On ANY subsequent page load across the app, a dismissable banner appears:
  ```
  ⚠️ SECURITY ALERT: Suspicious cookie detected — admin_override=true
  This action has been logged. [Dismiss]
  ```
- The banner is triggered by `main.js` checking for the cookie on every page load
- On dismiss: "Lesson: Cookies are not invisible. Servers can read every cookie you set. 
  Never assume a cookie modification goes unnoticed."
- Add `<!-- HONEYPOT 3: Cookie manipulation / false sense of invisibility -->` comment

---

## Learn Mode System

### The Toggle
- Persistent pill toggle in the top-right corner of every page header
- HTML: `<button id="learn-toggle" aria-pressed="false">🎓 Learn Mode</button>`
- State: `localStorage.setItem('learnMode', 'true'|'false')`
- On toggle: adds/removes class `learn-active` on `<body>`
- CSS: `body:not(.learn-active) .learn-only { display: none; }`
- Toggle glows green (CSS accent color) when active

### Per-Page Learn Mode Elements

**1. Context Banner** (`.learn-only .learn-banner`)
Injected just below the header. Format:
```html
<div class="learn-only learn-banner" data-owasp="A01">
  <span class="learn-tag">OWASP A01</span>
  <strong>Broken Access Control</strong>
  <span>"Users should only be able to access what they are explicitly permitted to."</span>
</div>
```

**2. Hint Panel** (`.learn-only .learn-hints`)
Progressive disclosure — do NOT show all hints at once:
- Rendered as a collapsible aside with a "💡 Need a hint?" toggle
- Contains 3–4 hints revealed one at a time via "Show next hint →" button
- A "🔓 Show full walkthrough" button at the end (reveals all steps)
- Hint state persists in `localStorage` per challenge

**3. ELI5 Block** (`.learn-only .learn-eli5`)
At the bottom of every page. Format:
```html
<div class="learn-only learn-eli5">
  <div class="eli5-icon">🦆</div>
  <div class="eli5-body">
    <p class="eli5-plain">[2-3 sentence plain English explanation]</p>
    <p class="eli5-analogy"><strong>Think of it like:</strong> [analogy]</p>
    <p class="eli5-real"><strong>Real world:</strong> [named breach or CVE, 1 sentence]</p>
  </div>
</div>
```

### Full Learn Mode Content

Write complete learn mode content for all 13 challenge pages:

| Page | OWASP | ELI5 Plain | Analogy | Real World Example |
|---|---|---|---|---|
| menu.html | A01 | Access controls that only exist in the browser can be bypassed by anyone who looks at the URL | A "Staff Only" door that's just labeled, not locked | 2021 Parler breach — sequential API IDs with no auth checks exposed 70TB of user data |
| loyalty.html | A02 | Base64 is not encryption — it's just encoding. Anyone who sees the string can decode it | Writing a secret in pig latin and calling it a code | 2019 Facebook stored hundreds of millions of passwords in plaintext internal logs |
| search.html | A03 | When user input is placed directly into HTML without sanitization, it can become executable code | Passing someone a note that turns into a loudspeaker announcement | 2005 Samy worm — a MySpace XSS spread to 1 million users in 20 hours |
| order.html | A04 | If the price is calculated and stored in the browser, the user controls the price | A price tag you're allowed to write on yourself before checkout | 2020 multiple e-commerce sites exploited via hidden form field price manipulation |
| admin.html | A05 | Credentials hardcoded in JavaScript are visible to anyone who views the source | A combination lock with the code written on a sticky note on the door | 2021 Twitch source code leak exposed hardcoded AWS credentials |
| recipes.html | A06 | Using outdated libraries means inheriting their unpatched vulnerabilities | Taking expired medication because "it probably still works" | CVE-2019-11358 — jQuery prototype pollution affecting thousands of sites |
| login.html | A07 | When tokens are stored client-side and not validated server-side, users can forge their own identity | A bouncer who accepts any ID as long as it has the right format | 2012 LinkedIn breach — 6.5M unsalted SHA-1 password hashes cracked within hours |
| cart.html | A08 | Data that travels through the client can be tampered with before it reaches the server | Changing your receipt yourself before paying at the register | 2014 multiple retailers exploited via client-side price manipulation in cart flows |
| feedback.html | A09 | If the app logs raw user input without redacting PII, sensitive data accumulates silently | A security camera recording everything including people's PIN entries | 2017 Uber breach — logs contained unredacted credentials and PII for 57M users |
| suppliers.html | A10 | When a server fetches URLs on behalf of users, attackers can redirect it to internal systems | Tricking someone's assistant into calling your competitors and reading back the answers | 2019 Capital One breach — SSRF via misconfigured AWS metadata endpoint exposed 100M records |
| sqli.html | A03 | SQL injection lets attackers rewrite the database query the server is about to run | Slipping extra instructions into a written order form mid-sentence | 2008 Heartland Payment Systems — SQL injection exposed 130M credit card numbers |
| idor.html | A01 | When object IDs are sequential and unvalidated, users can access other people's records by guessing | Trying locker number 101 when you only own locker 100 | 2021 Instagram API exposed private user data via sequential account IDs |
| stored-xss.html | A03 | Stored XSS means the malicious script is saved in the database and runs for every user who loads the page | Leaving a trap in the guestbook that activates every time someone reads it | 2005 Samy worm / 2018 British Airways — stored XSS used to exfiltrate 500K customer payment records |

### Progressive Hints (write 3–4 per page)

**Example — sqli.html:**
1. "The search box sends your input to a backend database query."
2. "Try entering a single quote `'` and see if you get an error."
3. "The query uses string concatenation. Try `' OR '1'='1` to return all rows."
4. "To extract data from other tables, try a UNION SELECT statement."
[Full walkthrough]: "Enter `' UNION SELECT id, note, created_at, null, null FROM admin_notes--` in the search box. The admin_notes table contents will appear in the results."

Write equivalent hint sets for all 13 pages.

---

## Scorecard (scorecard.html)

### Layout
- Single static file, no backend
- Dark theme matching main app
- Feels like an "official security audit form"
- Print-friendly (clean `@media print` styles)

### Per-Challenge Section (repeat × 13)
```
[OWASP ID badge] [Challenge Name]          [✅ Solved checkbox]

Vulnerability found:        [text input]
How did you find it?        [dropdown: Source Code / HTML Comments | DevTools Console | 
                             URL Manipulation | localStorage / Cookies | Network Tab | 
                             API / Server Response | Other]
Attack vector:              [dropdown: Client-Side | API | Database | Server]
What did you exploit?       [textarea]
Difficulty felt:            [★☆☆☆☆ — radio 1–5]

[Learn mode only] What did you learn in your own words?   [textarea, .learn-only]
[Learn mode only] Completed in learn mode?                [checkbox, .learn-only]
```

### Bonus Section — Honeypots
Three additional entries (Honeypot 1, 2, 3) with:
- What triggered it
- What the lesson was
- [checkbox] Found it

### Footer
- Student name field
- Date (auto-filled: `new Date().toLocaleDateString()`)
- "Calculate Score" button → tallies solved + bonus → shows `X / 13 challenges + Y / 3 bonus`
- Score persists in `localStorage.scorecard`
- "Reset All" button (with confirmation dialog)
- All form state autosaved to `localStorage` on every `input` event

### Instructor Mode (`?instructor=true`)
- Unlocks a collapsible "Instructor View" at top of scorecard
- Students set a class code on first visit (prompt dialog → stored in `localStorage.classCode`)
- "Export My Results" button → downloads a JSON blob of all answers + classCode
- "Import Student Results" file input → accepts the JSON blob and renders a summary table:
  - Columns: Student name, challenges solved, most common discovery method, avg difficulty rating
  - One row per imported JSON file
- All client-side — no backend required

---

## Docker Setup

### Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN node db/seed.js
EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./db/freshsqueeze.db:/app/db/freshsqueeze.db
    environment:
      - NODE_ENV=development
    restart: unless-stopped
```

**Volume mount note:** The SQLite DB file is bind-mounted so student actions (reviews, feedback, logs) persist across container restarts during a session. Remove the volume for a clean reset.

### Running the App
```bash
# Build and start
docker compose up --build

# Reset database (wipes all student-submitted data, re-seeds)
docker compose down && docker compose up --build --force-recreate

# Access
open http://localhost:3000
```

---

## Design System

### Aesthetic
- Dark, editorial — feels like a real premium sub shop site, not a training scaffold
- Students should not immediately know it's vulnerable
- Branding: "FreshSqueeze Sub Shop" — Est. 2024 · Artisan · Cold Press

### CSS Variables
```css
--bg: #0d0d0d;
--surface: #161616;
--surface2: #1f1f1f;
--border: #2a2a2a;
--accent: #f5a623;        /* warm orange — brand color */
--accent2: #e8463a;       /* red — danger/exploit reveal */
--accent3: #4ade80;       /* green — learn mode active */
--text: #f0ece4;
--text-muted: #7a7a7a;
--font-display: 'Bebas Neue', sans-serif;
--font-body: 'DM Sans', sans-serif;
--font-mono: 'Space Mono', monospace;
--learn-accent: #38bdf8;  /* sky blue — learn mode elements only */
```

### Learn Mode Visual Language
- Learn mode elements use `--learn-accent` (sky blue) as their border/icon color
- Visually distinct from the dark hacker aesthetic — feels friendlier, softer
- ELI5 blocks use `font-weight: 300` for body text (lighter, more approachable)
- Hint panels slide in with a CSS `max-height` transition (no JS animation needed)

### Responsive
- Mobile-friendly below 768px
- Challenge grid: 3 columns desktop → 2 tablet → 1 mobile
- All pages functional on mobile (challenges exploitable via mobile DevTools or desktop browser)

---

## README.md

Generate a complete README with:

1. **Overview** — what the app is and its educational purpose
2. **Quick Start** — `docker compose up --build` → open localhost:3000
3. **Challenge Index** — table of all 13 challenges with OWASP ID, page, vulnerability name, difficulty
4. **Honeypots** — listed without spoilers ("3 hidden gotcha scenarios")
5. **Learn Mode** — how to toggle it, what it shows
6. **Scorecard** — how to use it, instructor mode instructions
7. **Resetting** — how to wipe student data and re-seed
8. **Solutions** (spoiler-tagged with `<details>` blocks) — full exploit walkthrough per challenge
9. **Instructor Notes** — suggested classroom flow, discussion questions per challenge

---

## Implementation Rules & Constraints

1. **Every vulnerable line** must have an inline `// VULNERABLE: [reason]` comment
2. **Every HTML page** must have `<!-- HINT: ... -->` and `<!-- OWASP: ... -->` comments
3. **Every honeypot** must have `<!-- HONEYPOT [N]: ... -->` comment
4. **Learn mode elements** must use `class="learn-only"` — toggled by a single CSS class on `<body>`
5. **No frameworks** on the frontend — vanilla JS only
6. **No ORM** on the backend — raw SQL queries (`better-sqlite3` synchronous API)
7. **server.js must stay under 200 lines** — routes only, no business logic sprawl
8. **Vulnerabilities must be exploitable without special tools** — browser DevTools only (except sqli.html which may use curl or Burp)
9. **The app must look like a real sub shop** — branding, product photos (use emoji as placeholders), nav, footer
10. **Docker must work with a single command**: `docker compose up --build`

---

*End of master prompt. This is a single source of truth — do not merge with previous v1/v2 prompts.*
