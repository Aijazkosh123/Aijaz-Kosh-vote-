import express from "express";
import path from "path";
import { Database } from "sqlite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";

// Dynamically load sqlite3 to prevent crashes in environments without binary support (like Vercel)
let sqlite3: any = null;

const JWT_SECRET = process.env.JWT_SECRET || "kosh-vote-jwt-secret-key-123456";
const PORT = 3000;

interface AuthRequest extends express.Request {
  user?: {
    id: number;
    email: string;
    is_admin: number;
  };
}

// Global DB Connection Reference
let db: any;

// A robust pure-JS in-memory database mock for environments where sqlite3 native driver fails (like Vercel)
function createMemoryDb() {
  const store: Record<string, any[]> = {
    users: [],
    services: [],
    orders: [],
    payments: [],
    settings: []
  };

  // Seed default settings
  store.settings.push({ key: "jazzcash_number", value: "03077321978" });
  store.settings.push({ key: "jazzcash_name", value: "KoSh Vote Software" });
  store.settings.push({ key: "system_api_key", value: "DEFAULT_SYSTEM_API_KEY" });
  store.settings.push({ key: "easypaisa_number", value: "03077321978" });
  store.settings.push({ key: "easypaisa_name", value: "KoSh Vote Software" });
  store.settings.push({ key: "smm_api_url", value: "https://perfectsmm.com/api/v2" });
  store.settings.push({ key: "support_number", value: "03077321978" });

  // Seed default users
  store.users.push({
    id: 1,
    name: "Admin Kosh",
    email: "03077321978",
    password: "", // Hashed below
    balance: 0.0,
    is_admin: 1,
    is_blocked: 0,
    last_seen: 0,
    api_key: ""
  });

  // Seed default services
  const defaultServices = [
    { id: 1, name: "WhatsApp Poll/Group Vote (Option A)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000, upstream_service_id: "" },
    { id: 2, name: "WhatsApp Poll/Group Vote (Option B)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000, upstream_service_id: "" },
    { id: 3, name: "WhatsApp Poll/Group Vote (Option C)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000, upstream_service_id: "" },
    { id: 4, name: "WhatsApp Poll/Group Vote (Option D)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000, upstream_service_id: "" },
    { id: 5, name: "WhatsApp Poll/Group Vote (Option E)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000, upstream_service_id: "" },
    { id: 6, name: "WhatsApp Instant Link Click", category: "WhatsApp Web", price_per_k: 180.0, min_qty: 500, max_qty: 50000, upstream_service_id: "" },
    { id: 7, name: "Instagram Real Followers", category: "Instagram Services", price_per_k: 120.0, min_qty: 100, max_qty: 100000, upstream_service_id: "" },
    { id: 8, name: "TikTok High Quality Likes", category: "TikTok Services", price_per_k: 95.0, min_qty: 100, max_qty: 50000, upstream_service_id: "" },
    { id: 9, name: "YouTube Lifetime Views", category: "YouTube Services", price_per_k: 450.0, min_qty: 500, max_qty: 100000, upstream_service_id: "" },
  ];
  store.services = defaultServices;

  // Pre-hash passwords
  bcrypt.hash("admin123", 10).then(h => { store.users[0].password = h; });

  return {
    async exec(sql: string) {
      return;
    },
    async get(sql: string, params: any[] = []) {
      const query = sql.toLowerCase();
      if (query.includes("select * from users where email =")) {
        const email = params[0] || (sql.match(/'([^']+)'/)?.[1] || "").toLowerCase().trim();
        return store.users.find(u => u.email === email);
      }
      if (query.includes("select * from users where id =") || query.includes("select id, name, email")) {
        const id = params[0] || parseInt(sql.match(/\d+/)?.[0] || "0");
        return store.users.find(u => u.id === id);
      }
      if (query.includes("select * from settings where key =")) {
        const key = params[0] || sql.match(/'([^']+)'/)?.[1];
        return store.settings.find(s => s.key === key);
      }
      if (query.includes("select * from services where id =")) {
        const id = params[0] || parseInt(sql.match(/\d+/)?.[0] || "0");
        return store.services.find(s => s.id === id);
      }
      if (query.includes("select count(*) as count from users where last_seen >")) {
        const cutoff = params[0];
        const count = store.users.filter(u => u.last_seen > cutoff).length;
        return { count };
      }
      if (query.includes("select * from payments where trx_id =")) {
        const trxId = params[0];
        return store.payments.find(p => p.trx_id === trxId);
      }
      if (query.includes("select count(*)")) {
        const table = sql.match(/from\s+(\w+)/i)?.[1]?.toLowerCase();
        return { count: store[table || ""]?.length || 0 };
      }
      return null;
    },
    async all(sql: string, params: any[] = []) {
      const query = sql.toLowerCase();
      if (query.includes("from services")) {
        return store.services;
      }
      if (query.includes("from settings")) {
        if (query.includes("in ('jazzcash_number'")) {
          return store.settings.filter(s => ["jazzcash_number", "jazzcash_name", "easypaisa_number", "easypaisa_name", "support_number"].includes(s.key));
        }
        return store.settings;
      }
      if (query.includes("from orders")) {
        let list = store.orders;
        if (query.includes("where user_id =")) {
          const userId = params[0] || parseInt(sql.match(/user_id\s*=\s*(\d+)/i)?.[1] || "0");
          list = store.orders.filter(o => o.user_id === userId);
        }
        return list.map(o => {
          const service = store.services.find(s => s.id === o.service_id);
          const user = store.users.find(u => u.id === o.user_id);
          return {
            ...o,
            service_name: service ? service.name : "SMM Service",
            service_category: service ? service.category : "SMM Category",
            user_name: user ? user.name : "User",
            user_mobile: user ? user.email : ""
          };
        });
      }
      if (query.includes("from payments")) {
        let list = store.payments;
        if (query.includes("where user_id =")) {
          const userId = params[0] || parseInt(sql.match(/user_id\s*=\s*(\d+)/i)?.[1] || "0");
          list = store.payments.filter(p => p.user_id === userId);
        }
        return list.map(p => {
          const user = store.users.find(u => u.id === p.user_id);
          return {
            ...p,
            user_name: user ? user.name : "User",
            user_mobile: user ? user.email : ""
          };
        });
      }
      if (query.includes("from users")) {
        return store.users.map(u => ({
          ...u,
          mobile: u.email
        }));
      }
      return [];
    },
    async run(sql: string, params: any[] = []) {
      const query = sql.toLowerCase();
      if (query.includes("insert into users")) {
        const name = params[0];
        const email = params[1];
        const password = params[2];
        const last_seen = params[3];
        const newUser = {
          id: store.users.length + 1,
          name,
          email,
          password,
          balance: 0,
          api_key: "",
          is_admin: 0,
          is_blocked: 0,
          last_seen
        };
        store.users.push(newUser);
        return { lastID: newUser.id };
      }
      if (query.includes("insert into orders")) {
        const userId = params[0];
        const serviceId = params[1];
        const link = params[2];
        const votingOption = params[3];
        const quantity = params[4];
        const charge = params[5];
        const created_at = params[6];
        const newOrder = {
          id: store.orders.length + 1,
          user_id: userId,
          service_id: serviceId,
          link,
          voting_option: votingOption,
          quantity,
          charge,
          status: "Pending",
          created_at,
          api_order_id: "",
          api_response: ""
        };
        store.orders.push(newOrder);
        return { lastID: newOrder.id };
      }
      if (query.includes("insert into payments")) {
        const userId = params[0];
        const amount = params[1];
        const trxId = params[2];
        const screenshot = params[3];
        const created_at = params[4];
        const newPayment = {
          id: store.payments.length + 1,
          user_id: userId,
          amount,
          trx_id: trxId,
          screenshot,
          status: "Pending",
          created_at
        };
        store.payments.push(newPayment);
        return { lastID: newPayment.id };
      }
      if (query.includes("update users set")) {
        if (query.includes("last_seen =") && query.includes("where id =")) {
          const lastSeen = params[0];
          const id = params[1];
          const u = store.users.find(x => x.id === id);
          if (u) u.last_seen = lastSeen;
        } else if (query.includes("api_key =") && query.includes("where id =")) {
          const apiKey = params[0];
          const id = params[1];
          const u = store.users.find(x => x.id === id);
          if (u) u.api_key = apiKey;
        } else if (query.includes("balance =") && query.includes("where id =")) {
          const balance = params[0];
          const id = params[1];
          const u = store.users.find(x => x.id === id);
          if (u) u.balance = balance;
        } else if (query.includes("is_blocked =") && query.includes("where id =")) {
          const isBlocked = params[0];
          const id = params[1];
          const u = store.users.find(x => x.id === id);
          if (u) u.is_blocked = isBlocked;
        } else if (query.includes("password =") && query.includes("where id =")) {
          const password = params[0];
          const id = params[1];
          const u = store.users.find(x => x.id === id);
          if (u) u.password = password;
        }
        return { changes: 1 };
      }
      if (query.includes("update orders set")) {
        if (query.includes("status =") && query.includes("where id =")) {
          const status = params[0];
          const id = params[1];
          const o = store.orders.find(x => x.id === id);
          if (o) o.status = status;
        }
        return { changes: 1 };
      }
      if (query.includes("update payments set")) {
        if (query.includes("status =") && query.includes("where id =")) {
          const status = params[0];
          const id = params[1];
          const p = store.payments.find(x => x.id === id);
          if (p) p.status = status;
        }
        return { changes: 1 };
      }
      if (query.includes("update settings set value =")) {
        const value = params[0];
        const key = params[1];
        const s = store.settings.find(x => x.key === key);
        if (s) {
          s.value = value;
        } else {
          store.settings.push({ key, value });
        }
        return { changes: 1 };
      }
      if (query.includes("delete from services where id =")) {
        const id = params[0] || parseInt(sql.match(/\d+/)?.[0] || "0");
        store.services = store.services.filter(s => s.id !== id);
        return { changes: 1 };
      }
      if (query.includes("insert into services")) {
        const name = params[0];
        const category = params[1];
        const price_per_k = params[2];
        const min_qty = params[3];
        const max_qty = params[4];
        const upstream_service_id = params[5] || "";
        const newService = {
          id: store.services.length + 1,
          name,
          category,
          price_per_k,
          min_qty,
          max_qty,
          upstream_service_id
        };
        store.services.push(newService);
        return { lastID: newService.id };
      }
      if (query.includes("update services set")) {
        const id = params[params.length - 1];
        const s = store.services.find(x => x.id === id);
        if (s) {
          if (params.length === 5) {
            s.price_per_k = params[0];
            s.min_qty = params[1];
            s.max_qty = params[2];
            s.upstream_service_id = params[3];
          } else {
            s.name = params[0];
            s.category = params[1];
            s.price_per_k = params[2];
            s.min_qty = params[3];
            s.max_qty = params[4];
            s.upstream_service_id = params[5];
          }
        }
        return { changes: 1 };
      }
      return { changes: 0 };
    }
  };
}

async function initDb() {
  if (!sqlite3) {
    try {
      sqlite3 = (await import("sqlite3")).default;
    } catch (err: any) {
      console.warn("[Database] Native sqlite3 module failed to load. Falling back to pure-JS database engine.");
    }
  }

  if (sqlite3) {
    try {
      const { open } = await import("sqlite");
      const dbPath = process.env.VERCEL ? "/tmp/data.db" : "./data.db";
      db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });
      console.log("[Database] Initialized real SQLite database at:", dbPath);
    } catch (err) {
      console.error("[Database] Failed to open real SQLite db, loading memory-DB:", err);
      db = createMemoryDb();
      return;
    }
  } else {
    db = createMemoryDb();
    return;
  }

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      balance REAL DEFAULT 0.0,
      api_key TEXT DEFAULT '',
      is_admin INTEGER DEFAULT 0,
      is_blocked INTEGER DEFAULT 0,
      last_seen INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_per_k REAL NOT NULL,
      min_qty INTEGER DEFAULT 100,
      max_qty INTEGER DEFAULT 50000
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      link TEXT NOT NULL,
      voting_option TEXT DEFAULT '',
      quantity INTEGER NOT NULL,
      charge REAL NOT NULL,
      status TEXT DEFAULT 'Pending',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      trx_id TEXT NOT NULL UNIQUE,
      screenshot TEXT,
      status TEXT DEFAULT 'Pending',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default settings
  const jazzCashNum = await db.get("SELECT * FROM settings WHERE key = 'jazzcash_number'");
  if (!jazzCashNum) {
    await db.run("INSERT INTO settings (key, value) VALUES ('jazzcash_number', '03077321978')");
    await db.run("INSERT INTO settings (key, value) VALUES ('jazzcash_name', 'KoSh Vote Software')");
    await db.run("INSERT INTO settings (key, value) VALUES ('system_api_key', 'DEFAULT_SYSTEM_API_KEY')");
  }

  // Seed Easypaisa and SMM settings
  const easypaisaNum = await db.get("SELECT * FROM settings WHERE key = 'easypaisa_number'");
  if (!easypaisaNum) {
    await db.run("INSERT INTO settings (key, value) VALUES ('easypaisa_number', '03077321978')");
  }
  const easypaisaName = await db.get("SELECT * FROM settings WHERE key = 'easypaisa_name'");
  if (!easypaisaName) {
    await db.run("INSERT INTO settings (key, value) VALUES ('easypaisa_name', 'KoSh Vote Software')");
  }
  const smmApiUrl = await db.get("SELECT * FROM settings WHERE key = 'smm_api_url'");
  if (!smmApiUrl) {
    await db.run("INSERT INTO settings (key, value) VALUES ('smm_api_url', 'https://perfectsmm.com/api/v2')");
    await db.run("INSERT INTO settings (key, value) VALUES ('support_number', '03077321978')");
  }

  // Apply migrations safely
  try {
    await db.exec("ALTER TABLE services ADD COLUMN upstream_service_id TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await db.exec("ALTER TABLE orders ADD COLUMN api_order_id TEXT DEFAULT ''");
  } catch (e) {}
  try {
    await db.exec("ALTER TABLE orders ADD COLUMN api_response TEXT DEFAULT ''");
  } catch (e) {}

  // Clean up any old demo user
  try {
    await db.run("DELETE FROM users WHERE email = 'user@kosh.com'");
  } catch (e) {}

  // Seed Admin
  const adminUser = await db.get("SELECT * FROM users WHERE email = '03077321978'");
  if (!adminUser) {
    const hashedAdminPass = await bcrypt.hash("admin123", 10);
    await db.run(`
      INSERT INTO users (name, email, password, balance, is_admin)
      VALUES ('Admin Kosh', '03077321978', ?, 15000.0, 1)
    `, [hashedAdminPass]);
  }

  // Seed WhatsApp voting services + general SMM services
  const serviceCount = await db.get("SELECT count(*) as count FROM services");
  if (serviceCount && (serviceCount as any).count === 0) {
    const defaultServices = [
      { name: "WhatsApp Poll/Group Vote (Option A)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000 },
      { name: "WhatsApp Poll/Group Vote (Option B)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000 },
      { name: "WhatsApp Poll/Group Vote (Option C)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000 },
      { name: "WhatsApp Poll/Group Vote (Option D)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000 },
      { name: "WhatsApp Poll/Group Vote (Option E)", category: "WhatsApp Polling", price_per_k: 1800.0, min_qty: 10, max_qty: 25000 },
      { name: "WhatsApp Instant Link Click", category: "WhatsApp Web", price_per_k: 180.0, min_qty: 500, max_qty: 50000 },
      { name: "Instagram Real Followers", category: "Instagram Services", price_per_k: 120.0, min_qty: 100, max_qty: 100000 },
      { name: "TikTok High Quality Likes", category: "TikTok Services", price_per_k: 95.0, min_qty: 100, max_qty: 50000 },
      { name: "YouTube Lifetime Views", category: "YouTube Services", price_per_k: 450.0, min_qty: 500, max_qty: 100000 },
    ];

    for (const s of defaultServices) {
      await db.run(`
        INSERT INTO services (name, category, price_per_k, min_qty, max_qty)
        VALUES (?, ?, ?, ?, ?)
      `, [s.name, s.category, s.price_per_k, s.min_qty, s.max_qty]);
    }
  }

  // Automatically update existing SMM services to use 1.8 Rs/vote (1800/K) and min_qty 10 on startup
  try {
    await db.run(`
      UPDATE services
      SET price_per_k = 1800.0, min_qty = 10
      WHERE name LIKE '%WhatsApp Poll/Group Vote%'
    `);
  } catch (e) {}

  console.log("SQLite Database initialized & seeded successfully.");
}

// Authentication Middleware
function authenticateToken(req: AuthRequest, res: express.Response, next: express.NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token is missing" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: "Token is invalid or expired" });
      return;
    }
    req.user = user as { id: number; email: string; is_admin: number };
    next();
  });
}

// Admin Check Middleware
function requireAdmin(req: AuthRequest, res: express.Response, next: express.NextFunction): void {
  if (!req.user || req.user.is_admin !== 1) {
    res.status(403).json({ error: "Requires administrator privileges" });
    return;
  }
  next();
}

const app = express();
app.use(express.json({ limit: "25mb" })); // Large payload for screenshots (base64)

// Middleware to ensure DB is initialized on every request (crucial for Serverless environments like Vercel)
app.use(async (req, res, next) => {
  if (!db) {
    try {
      await initDb();
    } catch (err: any) {
      console.error("Database initialization failed:", err);
      res.status(500).json({ error: "Internal Database Error: " + err.message });
      return;
    }
  }
  next();
});

async function startServer() {

  // --- API ROUTES ---

  // Auth: Signup (Mobile Number)
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, mobile, password } = req.body;
      if (!name || !mobile || !password) {
        res.status(400).json({ error: "Please fill out all fields" });
        return;
      }

      const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [mobile.trim()]);
      if (existingUser) {
        res.status(400).json({ error: "Mobile number is already in use" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.run(`
        INSERT INTO users (name, email, password, balance, is_admin, is_blocked, last_seen)
        VALUES (?, ?, ?, 0.0, 0, 0, ?)
      `, [name.trim(), mobile.trim(), hashedPassword, Date.now()]);

      const userId = result.lastID;
      const token = jwt.sign({ id: userId, email: mobile.trim(), is_admin: 0 }, JWT_SECRET, { expiresIn: "7d" });

      res.status(201).json({
        token,
        user: { id: userId, name: name.trim(), mobile: mobile.trim(), balance: 0.0, is_admin: 0 }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth: Login (Mobile Number)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { mobile, password } = req.body;
      if (!mobile || !password) {
        res.status(400).json({ error: "Mobile number and password are required" });
        return;
      }

      const user = await db.get("SELECT * FROM users WHERE email = ?", [mobile.trim()]);
      if (!user) {
        res.status(401).json({ error: "Invalid mobile number or password" });
        return;
      }

      if (user.is_blocked === 1) {
        res.status(403).json({ error: "Your account has been suspended by the administrator." });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ error: "Invalid mobile number or password" });
        return;
      }

      // Update online status heartbeat
      await db.run("UPDATE users SET last_seen = ? WHERE id = ?", [Date.now(), user.id]);

      const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.email,
          balance: user.balance,
          is_admin: user.is_admin,
          api_key: user.api_key
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth: Forgot Password (Simulated reset via Mobile)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { mobile, newPassword } = req.body;
      if (!mobile) {
        res.status(400).json({ error: "Mobile number is required" });
        return;
      }

      const user = await db.get("SELECT * FROM users WHERE email = ?", [mobile.trim()]);
      if (!user) {
        res.status(404).json({ error: "No account found with this mobile number" });
        return;
      }

      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);
        res.json({ message: "Password has been successfully updated. You can now login." });
      } else {
        // Return verification challenge
        res.json({
          message: "Account verified. Please specify your new password below.",
          canReset: true
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User details
  app.get("/api/user/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await db.get("SELECT id, name, email, balance, is_admin, is_blocked, api_key FROM users WHERE id = ?", [req.user?.id]);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (user.is_blocked === 1) {
        res.status(403).json({ error: "Your account is suspended." });
        return;
      }

      // Heartbeat
      await db.run("UPDATE users SET last_seen = ? WHERE id = ?", [Date.now(), user.id]);

      res.json({
        id: user.id,
        name: user.name,
        mobile: user.email,
        balance: user.balance,
        is_admin: user.is_admin,
        is_blocked: user.is_blocked,
        api_key: user.api_key
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update user API key
  app.post("/api/user/update-api-key", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { api_key } = req.body;
      await db.run("UPDATE users SET api_key = ? WHERE id = ?", [api_key || "", req.user?.id]);
      res.json({ message: "SMM API Key updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User: Change Password
  app.post("/api/user/change-password", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Please provide current and new passwords" });
        return;
      }

      const user = await db.get("SELECT password FROM users WHERE id = ?", [req.user?.id]);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.user?.id]);
      res.json({ message: "Password updated successfully!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch all services
  app.get("/api/services", async (req, res) => {
    try {
      const services = await db.all("SELECT * FROM services ORDER BY category, name");
      res.json(services);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch public settings for deposit guides
  app.get("/api/settings/public", async (req, res) => {
    try {
      const dbSettings = await db.all("SELECT key, value FROM settings WHERE key IN ('jazzcash_number', 'jazzcash_name', 'easypaisa_number', 'easypaisa_name', 'support_number')");
      const mapped = dbSettings.reduce((acc: any, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Online active users count (last 2 minutes)
  app.get("/api/stats/online", async (req, res) => {
    try {
      const cutoff = Date.now() - 2 * 60 * 1000;
      const onlineResult = await db.get("SELECT count(*) as count FROM users WHERE last_seen > ?", [cutoff]);
      // Admin should be online, plus any guest heartbeat or other users
      res.json({ onlineUsers: Math.max(1, (onlineResult as any).count || 1) });
    } catch (err: any) {
      res.json({ onlineUsers: 1 });
    }
  });

  // User: Place Order
  app.post("/api/orders/new", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { serviceId, link, votingOption, quantity } = req.body;
      if (!serviceId || !link || !quantity) {
        res.status(400).json({ error: "Required fields are missing: service, link, quantity." });
        return;
      }

      const qty = parseInt(quantity);
      if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ error: "Quantity must be a positive integer" });
        return;
      }

      const service = await db.get("SELECT * FROM services WHERE id = ?", [serviceId]);
      if (!service) {
        res.status(404).json({ error: "Service not found" });
        return;
      }

      if (qty < service.min_qty || qty > service.max_qty) {
        res.status(400).json({ error: `Quantity must be between ${service.min_qty} and ${service.max_qty}` });
        return;
      }

      // Calculate total charge
      const charge = (service.price_per_k / 1000.0) * qty;

      // Check balance
      const user = await db.get("SELECT balance FROM users WHERE id = ?", [req.user?.id]);
      if (!user || user.balance < charge) {
        res.status(400).json({ error: `Insufficient balance! Order costs Rs. ${charge.toFixed(2)}, but your balance is Rs. ${user ? user.balance.toFixed(2) : '0.00'}.` });
        return;
      }

      // Deduct balance
      await db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [charge, req.user?.id]);

      // Create Order (votingOption is stored e.g. 'A', 'B', 'C', 'D', 'E' or empty)
      const result = await db.run(`
        INSERT INTO orders (user_id, service_id, link, voting_option, quantity, charge, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
      `, [req.user?.id, serviceId, link, votingOption || "", qty, charge, Date.now()]);

      const newOrder = await db.get(`
        SELECT o.*, s.name as service_name, s.category as service_category
        FROM orders o
        JOIN services s ON o.service_id = s.id
        WHERE o.id = ?
      `, [result.lastID]);

      res.status(201).json({
        message: "Order placed successfully! System has registered your auto order and notified the admin.",
        order: newOrder
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User: Fetch personal orders
  app.get("/api/orders/my", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orders = await db.all(`
        SELECT o.*, s.name as service_name, s.category as service_category
        FROM orders o
        JOIN services s ON o.service_id = s.id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
      `, [req.user?.id]);
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User: Submit Trx deposit
  app.post("/api/payments/deposit", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { amount, trxId, screenshot } = req.body;
      if (!amount || !trxId) {
        res.status(400).json({ error: "Amount and Transaction ID are required" });
        return;
      }

      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        res.status(400).json({ error: "Amount must be a positive number" });
        return;
      }

      // Check duplicate Trx ID
      const duplicate = await db.get("SELECT * FROM payments WHERE trx_id = ?", [trxId.trim()]);
      if (duplicate) {
        res.status(400).json({ error: "Transaction ID already submitted. Please do not re-submit duplicate requests." });
        return;
      }

      await db.run(`
        INSERT INTO payments (user_id, amount, trx_id, screenshot, status, created_at)
        VALUES (?, ?, ?, ?, 'Pending', ?)
      `, [req.user?.id, amt, trxId.trim(), screenshot || null, Date.now()]);

      res.status(201).json({ message: "Deposit request submitted successfully! Pending admin approval." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User: My Payments
  app.get("/api/payments/my", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const payments = await db.all("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC", [req.user?.id]);
      res.json(payments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // --- ADMIN ROUTES ---

  // Get settings
  app.get("/api/admin/settings", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const settings = await db.all("SELECT * FROM settings");
      const mapped = settings.reduce((acc: any, cur) => {
        acc[cur.key] = cur.value;
        return acc;
      }, {});
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Settings
  app.post("/api/admin/settings/update", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { settings } = req.body; // Key-Value pair map
      if (!settings) {
        res.status(400).json({ error: "No settings provided" });
        return;
      }

      for (const [key, value] of Object.entries(settings)) {
        await db.run(`
          INSERT INTO settings (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `, [key, String(value)]);
      }

      res.json({ message: "Settings updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin check balance all & user list control
  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await db.all(`
        SELECT id, name, email as mobile, balance, api_key, is_admin, is_blocked, last_seen
        FROM users
        ORDER BY is_admin DESC, name ASC
      `);
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin add balance
  app.post("/api/admin/users/add-balance", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userId, amount } = req.body;
      const amt = parseFloat(amount);
      if (isNaN(amt)) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      const targetUser = await db.get("SELECT name, balance FROM users WHERE id = ?", [userId]);
      if (!targetUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      await db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amt, userId]);
      res.json({ message: `Successfully adjusted balance for ${targetUser.name} by Rs. ${amt.toFixed(2)}.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin block/unblock user
  app.post("/api/admin/users/block", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userId, isBlocked } = req.body;
      await db.run("UPDATE users SET is_blocked = ? WHERE id = ?", [isBlocked ? 1 : 0, userId]);
      res.json({ message: `User status changed to ${isBlocked ? 'Blocked' : 'Active'}.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin remove user
  app.post("/api/admin/users/delete", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await db.get("SELECT is_admin FROM users WHERE id = ?", [userId]);
      if (user && user.is_admin === 1) {
        res.status(400).json({ error: "Cannot delete administrator accounts!" });
        return;
      }

      // Delete payments, orders, and user
      await db.run("DELETE FROM payments WHERE user_id = ?", [userId]);
      await db.run("DELETE FROM orders WHERE user_id = ?", [userId]);
      await db.run("DELETE FROM users WHERE id = ?", [userId]);

      res.json({ message: "User and all associated orders/payments removed permanently." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin approve/reject pending payment
  app.get("/api/admin/payments", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payments = await db.all(`
        SELECT p.*, u.name as user_name, u.email as user_mobile
        FROM payments p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `);
      res.json(payments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/payments/approve", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { paymentId } = req.body;
      const payment = await db.get("SELECT * FROM payments WHERE id = ?", [paymentId]);

      if (!payment) {
        res.status(404).json({ error: "Payment request not found" });
        return;
      }

      if (payment.status !== "Pending") {
        res.status(400).json({ error: "This payment request has already been processed" });
        return;
      }

      // Approve: credit user and change status
      await db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [payment.amount, payment.user_id]);
      await db.run("UPDATE payments SET status = 'Approved' WHERE id = ?", [paymentId]);

      res.json({ message: "Payment request approved and credit added to user account." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/payments/reject", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { paymentId } = req.body;
      const payment = await db.get("SELECT * FROM payments WHERE id = ?", [paymentId]);

      if (!payment) {
        res.status(404).json({ error: "Payment request not found" });
        return;
      }

      if (payment.status !== "Pending") {
        res.status(400).json({ error: "This payment request has already been processed" });
        return;
      }

      await db.run("UPDATE payments SET status = 'Rejected' WHERE id = ?", [paymentId]);
      res.json({ message: "Payment request has been rejected." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin orders
  app.get("/api/admin/orders", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const orders = await db.all(`
        SELECT o.*, s.name as service_name, s.category as service_category, u.name as user_name, u.email as user_mobile
        FROM orders o
        JOIN services s ON o.service_id = s.id
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `);
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/orders/update-status", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { orderId, status } = req.body;
      await db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
      res.json({ message: `Order status updated to ${status}.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin update service price/limit/upstream id
  app.post("/api/admin/services/update", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { serviceId, price_per_k, min_qty, max_qty, upstream_service_id } = req.body;
      await db.run(`
        UPDATE services
        SET price_per_k = ?, min_qty = ?, max_qty = ?, upstream_service_id = ?
        WHERE id = ?
      `, [parseFloat(price_per_k), parseInt(min_qty), parseInt(max_qty), upstream_service_id || "", serviceId]);
      res.json({ message: "Service pricing and SMM upstream details updated successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // Admin: Reset User Password
  app.post("/api/admin/users/reset-password", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) {
        res.status(400).json({ error: "User ID and new password are required" });
        return;
      }
      if (typeof newPassword !== 'string' || newPassword.length < 4) {
        res.status(400).json({ error: "Password must be at least 4 characters" });
        return;
      }
      const targetUser = await db.get("SELECT name FROM users WHERE id = ?", [userId]);
      if (!targetUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
      res.json({ message: "Password reset done" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin deduct/remove balance
  app.post("/api/admin/users/deduct-balance", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userId, amount } = req.body;
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        res.status(400).json({ error: "Invalid amount. Must be a positive number." });
        return;
      }

      const targetUser = await db.get("SELECT name, balance FROM users WHERE id = ?", [userId]);
      if (!targetUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      await db.run("UPDATE users SET balance = MAX(0.0, balance - ?) WHERE id = ?", [amt, userId]);
      res.json({ message: `Successfully deducted Rs. ${amt.toFixed(2)} from ${targetUser.name}'s balance.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin send order to Upstream SMM API
  app.post("/api/admin/orders/send-upstream", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { orderId } = req.body;
      
      const order = await db.get("SELECT * FROM orders WHERE id = ?", [orderId]);
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const service = await db.get("SELECT * FROM services WHERE id = ?", [order.service_id]);
      if (!service) {
        res.status(404).json({ error: "Associated service not found" });
        return;
      }

      if (!service.upstream_service_id) {
        res.status(400).json({ error: "SMM Upstream Service ID is not configured for this service catalog item yet. Please set it in Service Prices tab." });
        return;
      }

      // Fetch Upstream URL and Key from settings
      const smmUrlSetting = await db.get("SELECT value FROM settings WHERE key = 'smm_api_url'");
      const smmKeySetting = await db.get("SELECT value FROM settings WHERE key = 'system_api_key'");

      const apiUrl = smmUrlSetting ? smmUrlSetting.value : "";
      const apiKey = smmKeySetting ? smmKeySetting.value : "";

      if (!apiUrl || !apiKey || apiKey === "DEFAULT_SYSTEM_API_KEY") {
        res.status(400).json({ error: "Upstream SMM Panel API settings are incomplete or not set yet. Please configure them in Settings tab." });
        return;
      }

      // Prepare payload to SMM Panel (usually based on key, action, service, link, quantity)
      const params = new URLSearchParams();
      params.append("key", apiKey);
      params.append("action", "add");
      params.append("service", service.upstream_service_id);
      params.append("link", order.link);
      params.append("quantity", String(order.quantity));

      console.log(`Sending order #${orderId} to upstream SMM: ${apiUrl} with service ID ${service.upstream_service_id}`);

      // Call the external SMM panel API
      const upstreamRes = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const responseText = await upstreamRes.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        // Not a JSON response
      }

      // If successful standard SMM API returns e.g. { order: 12345 } or { order: "12345" }
      if (responseJson && responseJson.order) {
        const upstreamOrderId = String(responseJson.order);
        await db.run(
          "UPDATE orders SET api_order_id = ?, api_response = ?, status = 'In Progress' WHERE id = ?",
          [upstreamOrderId, JSON.stringify(responseJson), orderId]
        );
        res.json({
          success: true,
          message: `Order sent successfully to SMM Panel! Upstream Order ID: #${upstreamOrderId}`,
          apiOrderId: upstreamOrderId,
          apiResponse: responseJson
        });
      } else {
        // Log SMM Panel error
        const errMsg = responseJson && responseJson.error ? responseJson.error : responseText || "Unknown SMM response";
        await db.run(
          "UPDATE orders SET api_response = ? WHERE id = ?",
          [`Error: ${errMsg}`.substring(0, 500), orderId]
        );
        res.status(400).json({
          error: `Upstream SMM Panel returned an error: ${errMsg}`
        });
      }

    } catch (err: any) {
      res.status(500).json({ error: `Network/API connection failure: ${err.message}` });
    }
  });


  // --- DEV & ASSETS / SPA FALLBACK ---

  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[KoSh Vote Software Server] Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((error) => {
  console.error("Failed to start KoSh Vote Software Server:", error);
});

export default app;
