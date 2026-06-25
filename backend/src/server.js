  }

  const parts = storedHash.split("$");
  if (parts.length !== 4 || !parts[2] || !parts[3]) {
    return false;
  }

  const expected = `$SHA$${parts[2]}$${sha256(`${sha256(password)}${parts[2]}`)}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

function offlineUuid(username) {
  const bytes = Buffer.from(`OfflinePlayer:${username}`, "utf8");
  const hash = crypto.createHash("md5").update(bytes).digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function pick(row, names) {
  for (const name of names) {
    if (row && row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }
  return null;
}

function normalizeMillis(value) {
  if (!value) {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }
  return number < 100000000000 ? number * 1000 : number;
}

async function getColumns() {
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${quote(tableName)}`);
  return new Set(rows.map((row) => row.Field));
}

function getClientIp(req) {
  return String(req.ip || req.headers["x-forwarded-for"] || "").split(",")[0].trim();
}

function cleanUsername(username) {
  return String(username || "").trim();
}

function cleanEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return value || null;
}

function validateUsername(username) {
  return /^[A-Za-z0-9_]{3,16}$/.test(username);
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 6 && password.length <= 128;
}

function validateEmail(email) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyHcaptcha(token, ip) {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    return true;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip || ""
  });

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  const result = await response.json();
  return Boolean(result.success);
}

async function findUser(columns, identifier) {
  const fields = [];
  const params = { identifier };

  for (const column of ["username", "realname", "email"]) {
    if (columns.has(column)) {
      fields.push(`LOWER(${quote(column)}) = LOWER(:identifier)`);
    }
  }

  if (fields.length === 0) {
    throw new Error("AuthMe tabulka nema username/realname/email sloupec.");
  }

  const wantedColumns = [
    "id", "username", "realname", "email", "password", "ip", "lastip", "regip",
    "regdate", "lastlogin", "hasSession", "isLogged", "totp", "uuid", "premiumUuid"
  ];
  const selectColumns = [...columns].filter((column) => wantedColumns.includes(column));
  const [rows] = await pool.execute(
    `SELECT ${selectColumns.map(quote).join(", ")} FROM ${quote(tableName)} WHERE ${fields.join(" OR ")} LIMIT 1`,
    params
  );

  return rows[0] || null;
}

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, error: "Databaze neodpovida." });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const username = cleanUsername(req.body.username || req.body.realname);
    const email = cleanEmail(req.body.email);
    const password = req.body.password;
    const ip = getClientIp(req);

    if (!validateUsername(username)) {
      return res.status(400).json({ ok: false, error: "Jmeno musi mit 3-16 znaku a muze obsahovat jen A-Z, 0-9 a _." });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ ok: false, error: "E-mail nema spravny format." });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ ok: false, error: "Heslo musi mit aspon 6 znaku." });
    }
    if (!await verifyHcaptcha(req.body.hcaptchaToken, ip)) {
      return res.status(400).json({ ok: false, error: "hCaptcha se nepodarila overit." });
    }

    const columns = await getColumns();
    const existing = await findUser(columns, username);
    if (existing) {
      return res.status(409).json({ ok: false, error: "Tenhle hrac uz je zaregistrovany." });
    }

    if (email && columns.has("email")) {
      const [emailRows] = await pool.execute(
        `SELECT ${columns.has("id") ? quote("id") : quote("username")} FROM ${quote(tableName)} WHERE LOWER(${quote("email")}) = LOWER(:email) LIMIT 1`,
        { email }
      );
      if (emailRows.length > 0) {
        return res.status(409).json({ ok: false, error: "Tenhle e-mail uz je pouzity." });
      }
    }

    const now = Date.now();
    const values = {
      username: username.toLowerCase(),
      realname: username,
      password: createAuthMeSha256(password),
      ip,
      regip: ip,
      lastip: ip,
      regdate: now,
      lastlogin: 0,
      email,
      isLogged: 0,
      hasSession: 0
    };

    const insertColumns = Object.keys(values).filter((column) => columns.has(column) && values[column] !== null);
    if (!insertColumns.includes("username") || !insertColumns.includes("password")) {
      return res.status(500).json({ ok: false, error: "AuthMe tabulka nema potrebne sloupce username/password." });
    }

    const placeholders = insertColumns.map((column) => `:${column}`).join(", ");
    await pool.execute(
      `INSERT INTO ${quote(tableName)} (${insertColumns.map(quote).join(", ")}) VALUES (${placeholders})`,
      Object.fromEntries(insertColumns.map((column) => [column, values[column]]))
    );

    return res.status(201).json({ ok: true, message: "Registrace hotova. Ted se muzes prihlasit na server." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: "Serverova chyba pri registraci." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.username || req.body.email || "").trim();
    const password = req.body.password;
    const ip = getClientIp(req);

    if (!identifier || !validatePassword(password)) {
      return res.status(400).json({ ok: false, error: "Vypln jmeno/e-mail a heslo." });
    }
    if (!await verifyHcaptcha(req.body.hcaptchaToken, ip)) {
      return res.status(400).json({ ok: false, error: "hCaptcha se nepodarila overit." });
    }

    const columns = await getColumns();
    const user = await findUser(columns, identifier);
    if (!user || !verifyAuthMeSha256(password, user.password)) {
      return res.status(401).json({ ok: false, error: "Spatne jmeno nebo heslo." });
    }

    return res.json({
      ok: true,
      message: "Prihlaseni probehlo.",
      user: {
        username: user.realname || user.username,
        email: user.email || null,
        uuid: pick(user, ["uuid", "premiumUuid"]) || offlineUuid(user.realname || user.username),
        rank: "Hrac",
        gems: 0,
        shards: 0,
        fragments: 0,
        ip: pick(user, ["lastip", "ip", "regip"]),
        firstLogin: normalizeMillis(user.regdate),
        lastLogin: normalizeMillis(user.lastlogin),
        playedTime: null,
        premium: Boolean(user.hasSession || user.isLogged),
        premiumToken: user.hasSession ? String(user.hasSession) : null
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: "Serverova chyba pri prihlaseni." });
  }
});

app.post("/api/forgot-password", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || req.body.username || "").trim();