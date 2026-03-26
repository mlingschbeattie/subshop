// db/seed.js — FreshSqueeze Sub Shop database seeder
// Run: node db/seed.js

const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'freshsqueeze.db');

// Remove existing DB for clean seed (skip if file is locked by a running server)
if (fs.existsSync(DB_PATH)) {
  try {
    fs.unlinkSync(DB_PATH);
  } catch (e) {
    if (e.code === 'EBUSY' || e.code === 'EPERM') {
      console.warn('Warning: DB file is locked by another process — seeding into existing file.');
    } else {
      throw e;
    }
  }
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Run schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// ── Users (10 total: 7 customers, 2 staff, 1 admin) ────────────────
const insertUser = db.prepare(
  'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
);
const users = [
  ['admin',       'admin@freshsqueeze.local',   'admin123',       'admin'],    // VULNERABLE: plaintext
  ['jworker',     'jenny.w@freshsqueeze.local',  'staffPass!',     'staff'],
  ['mramirez',    'mike.r@freshsqueeze.local',   'letmein2024',    'staff'],
  ['alice_c',     'alice.chen@gmail.com',         'password1',      'customer'],
  ['bob_jones',   'bob.jones@yahoo.com',          'qwerty',         'customer'],
  ['carla99',     'carla.m@outlook.com',          'carla1999',      'customer'],
  ['dave_dev',    'dave.d@proton.me',             'hunter2',        'customer'],
  ['elena_f',     'elena.f@hotmail.com',          'sunshine',       'customer'],
  ['frank_g',     'frank.garcia@gmail.com',       '123456',         'customer'],
  ['hannah_h',    'hannah.h@icloud.com',          'p@ssw0rd',       'customer'],
];
users.forEach(u => insertUser.run(...u));

// ── Products (12 subs, 2 with secret column) ────────────────────────
const insertProduct = db.prepare(
  'INSERT INTO products (name, description, price, secret) VALUES (?, ?, ?, ?)'
);
const products = [
  ['Classic Italian',       'Salami, ham, provolone, lettuce, tomato, oil & vinegar',  12.99, null],
  ['Turkey Club',           'Smoked turkey, bacon, swiss, avocado, chipotle aioli',    13.49, null],
  ['Philly Cheesesteak',    'Shaved ribeye, provolone, sautéed onions & peppers',      14.99, null],
  ['Veggie Delight',        'Roasted peppers, hummus, cucumber, feta, mixed greens',   10.99, null],
  ['Meatball Parm',         'Housemade meatballs, marinara, fresh mozzarella',         13.99, null],
  ['Shrimp Po\'Boy',        'Fried gulf shrimp, remoulade, shredded lettuce, tomato',  15.49, null],
  ['BBQ Pulled Pork',       'Slow-smoked pork, tangy slaw, pickles, brioche roll',     14.49, null],
  ['Caprese Panini',        'Fresh mozzarella, tomato, basil, balsamic glaze',         11.99, null],
  ['Buffalo Chicken Wrap',  'Crispy chicken, buffalo sauce, ranch, celery slaw',       12.49, null],
  ['Tuna Melt',             'Albacore tuna salad, aged cheddar, sourdough, griddled',  11.49, null],
  ['Secret Sauce Sub',      'House special — ask staff for details',                   16.99, 'FLAG-PRODUCT-001: Internal recipe ID #7742, supplier cost $2.10'],
  ['Manager\'s Reserve',    'Limited edition — staff selection only',                   19.99, 'FLAG-PRODUCT-002: Markup is 847%. Do not show customers.'],
];
products.forEach(p => insertProduct.run(...p));

// ── Orders (20, spread across users 1–10) ───────────────────────────
const insertOrder = db.prepare(
  'INSERT INTO orders (user_id, item, price, status) VALUES (?, ?, ?, ?)'
);
const orderData = [
  [4,  'Classic Italian',      12.99, 'completed'],
  [4,  'Turkey Club',          13.49, 'completed'],
  [5,  'Philly Cheesesteak',   14.99, 'completed'],
  [6,  'Veggie Delight',       10.99, 'pending'],
  [7,  'Meatball Parm',        13.99, 'completed'],
  [7,  'Classic Italian',      12.99, 'completed'],
  [8,  'Shrimp Po\'Boy',       15.49, 'pending'],
  [9,  'Turkey Club',          13.49, 'completed'],
  [10, 'BBQ Pulled Pork',      14.49, 'completed'],
  [4,  'Buffalo Chicken Wrap', 12.49, 'pending'],
  [5,  'Tuna Melt',            11.49, 'completed'],
  [6,  'Caprese Panini',       11.99, 'completed'],
  [1,  'Manager\'s Reserve',   19.99, 'completed'],
  [2,  'Secret Sauce Sub',     16.99, 'completed'],
  [3,  'Classic Italian',      12.99, 'pending'],
  [8,  'Veggie Delight',       10.99, 'completed'],
  [9,  'Meatball Parm',        13.99, 'completed'],
  [10, 'Philly Cheesesteak',   14.99, 'pending'],
  [5,  'BBQ Pulled Pork',      14.49, 'completed'],
  [7,  'Caprese Panini',       11.99, 'completed'],
];
orderData.forEach(o => insertOrder.run(...o));

// ── Admin Notes (5, with fake sensitive data) ────────────────────────
const insertNote = db.prepare('INSERT INTO admin_notes (note) VALUES (?)');
const notes = [
  'Employee SSN backup — Jenny Walker: 078-05-1120 (DO NOT share externally)',
  'Corporate card on file: 4532-8901-2345-6789 exp 08/27 — use for supplier payments only',
  'WiFi password for back office: FreshSqueeze!2024 — rotate quarterly',
  'Supplier contract renewal: Coastal Seafood, acct #CS-4402, discount code BULKFISH30',
  'Incident report 2024-03-15: Customer [elena_f] reported unauthorized charge of $847.00 on acct ending 6789. Refund pending.',
];
notes.forEach(n => insertNote.run(n));

// ── Reviews (3, clean content — no XSS) ─────────────────────────────
const insertReview = db.prepare(
  'INSERT INTO reviews (author, content) VALUES (?, ?)'
);
const reviews = [
  ['Alice C.',   'Best subs in town! The Classic Italian is my go-to. Fresh bread every time.'],
  ['Bob J.',     'Great lunch spot. The Philly Cheesesteak is legit — real ribeye, not that processed stuff.'],
  ['Carla M.',   'Love the veggie options. The Caprese Panini with fresh basil is chef\'s kiss. 🤌'],
];
reviews.forEach(r => insertReview.run(...r));

// ── Logs table starts empty ─────────────────────────────────────────
// (populated at runtime by /api/feedback)

db.close();
console.log('✅ Database seeded successfully at', DB_PATH);
console.log('   Users:      ', users.length);
console.log('   Products:   ', products.length);
console.log('   Orders:     ', orderData.length);
console.log('   Admin Notes:', notes.length);
console.log('   Reviews:    ', reviews.length);
