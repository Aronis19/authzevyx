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
    const ip = getClientIp(req);

    if (!identifier) {
      return res.status(400).json({ ok: false, error: "Vypln e-mail nebo herni jmeno." });
    }
    if (!await verifyHcaptcha(req.body.hcaptchaToken, ip)) {
      return res.status(400).json({ ok: false, error: "hCaptcha se nepodarila overit." });
    }

    return res.json({
      ok: true,
      message: "Pokud ucet existuje, napis na podpora@zevyx.eu pro obnovu hesla."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: "Serverova chyba pri obnove hesla." });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Endpoint neexistuje." });
});

app.listen(port, () => {
  console.log(`Zevyx Auth API bezi na portu ${port}`);
});
