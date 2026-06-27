import crypto from "node:crypto";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 10000);
const tableName = process.env.AUTHME_TABLE || "authme";

if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
  throw new Error("AUTHME_TABLE muze obsahovat jen pismena, cisla a podtrzitko.");
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: true
});

const lpPool = process.env.LP_DB_NAME ? mysql.createPool({
  host: process.env.LP_DB_HOST || process.env.MYSQL_HOST,
  port: Number(process.env.LP_DB_PORT || process.env.MYSQL_PORT || 3306),
  user: process.env.LP_DB_USER || process.env.MYSQL_USER,
  password: process.env.LP_DB_PASSWORD || process.env.MYSQL_PASSWORD,
  database: process.env.LP_DB_NAME,
  waitForConnections: true,
  connectionLimit: 3,
  namedPlaceholders: true
}) : null;

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "32kb" }));
app.use(cors({
  origin(origin, callback) {
    const allowed = process.env.FRONTEND_ORIGIN || "https://aronis19.github.io";
    if (!origin || origin === allowed || origin.startsWith(`${allowed}/`)) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin blocked"));
  }
}));

const quote = (name) => `\`${String(name).replaceAll("`", "``")}\``;
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

function createAuthMeSha256(password) {
  const salt = crypto.randomBytes(12).toString("base64url").slice(0, 16);
  return `$SHA$${salt}$${sha256(`${sha256(password)}${salt}`)}`;
}

function verifyAuthMeSha256(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.startsWith("$SHA$")) return false;

  const parts = storedHash.split("$");
  if (parts.length !== 4 || !parts[2] || !parts[3]) return false;

  const expected = `$SHA$${parts[2]}$${sha256(`${sha256(password)}${parts[2]}`)}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number < 100000000000 ? number * 1000 : number;
}

function formatRankName(group) {
  const value = String(group || "hrac").replaceAll("_", " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseLuckPermsPrefix(permission) {
  const match = String(permission || "").match(/^prefix\.\d+\.(.+)$/);
  if (!match) return null;

  const raw = match[1];
  const iconMatch = raw.match(/%([^%]+)%/);

  return {
    raw,
    icon: iconMatch ? iconMatch[1] : null
  };
}

async function getLuckPermsProfile(uuid) {
  if (!lpPool || !uuid) {
    return {
      rank: "Hráč",
      rankPrefix: null,
      rankIcon: null,
      rankExpiresAt: null,
      rankPermanent: true
    };
  }

  try {
    const [players] = await lpPool.execute(
      "SELECT primary_group FROM luckperms_players WHERE uuid = :uuid LIMIT 1",
      { uuid }
    );

    const primaryGroup = players[0]?.primary_group || "default";

    const [temporaryGroups] = await lpPool.execute(
      `SELECT permission, expiry
       FROM luckperms_user_permissions
       WHERE uuid = :uuid
         AND value = 1
         AND permission LIKE 'group.%'
         AND expiry > UNIX_TIMESTAMP()
       ORDER BY expiry DESC
       LIMIT 1`,
      { uuid }
    );

    const temporaryGroup = temporaryGroups[0];
    const group = temporaryGroup
      ? String(temporaryGroup.permission).slice("group.".length)
      : primaryGroup;

    const rankExpiresAt = temporaryGroup
      ? normalizeMillis(temporaryGroup.expiry)
      : null;

    const [prefixRows] = await lpPool.execute(
      `SELECT permission
       FROM luckperms_group_permissions
       WHERE name = :groupName
         AND value = 1
         AND permission LIKE 'prefix.%'
       ORDER BY CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(permission, '.', 2), '.', -1) AS UNSIGNED) DESC
       LIMIT 1`,
      { groupName: group }
    );

    const prefix = parseLuckPermsPrefix(prefixRows[0]?.permission);

    return {
      rank: formatRankName(group),
      rankPrefix: prefix?.raw || null,
      rankIcon: prefix?.icon || null,
      rankExpiresAt,
      rankPermanent: !rankExpiresAt
    };
  } catch (error) {
    console.error("LuckPerms read failed:", error);

    return {
      rank: "Hráč",
      rankPrefix: null,
      rankIcon: null,
      rankExpiresAt: null,
      rankPermanent: true
    };
  }
}

async function getColumns() {
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${quote(tableName)}`);
  return new Set(rows.map((row) => row.Field));
}


function normalizeUuid(value) {
  const raw = String(value || "").trim().toLowerCase().replaceAll("-", "");

  if (!/^[0-9a-f]{32}$/.test(raw)) return null;

  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

let playtimeTableReady = null;

function ensurePlaytimeTable() {
  if (!playtimeTableReady) {
    playtimeTableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS zevyx_panel_playtime (
        uuid CHAR(36) NOT NULL PRIMARY KEY,
        username VARCHAR(16) NOT NULL,
        played_seconds BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch((error) => {
      playtimeTableReady = null;
      throw error;
    });
  }

  return playtimeTableReady;
}

function hasBridgeSecret(receivedSecret) {
  const expectedSecret = String(process.env.PANEL_BRIDGE_SECRET || "");

  if (!expectedSecret || !receivedSecret) return false;

  const expected = Buffer.from(expectedSecret);
  const received = Buffer.from(String(receivedSecret));

  return expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);
}

function formatPlayedTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  const parts = [];
  if (days) parts.push(`${days} d`);
  if (hours || days) parts.push(`${hours} h`);
  parts.push(`${minutes} min`);

  return parts.join(" ");
}

async function getSavedPlaytime(uuid) {
  const normalizedUuid = normalizeUuid(uuid);
  if (!normalizedUuid) return null;

  try {
    await ensurePlaytimeTable();

    const [rows] = await pool.execute(
      `SELECT played_seconds
       FROM zevyx_panel_playtime
       WHERE uuid = :uuid
       LIMIT 1`,
      { uuid: normalizedUuid }
    );

    return rows[0] ? formatPlayedTime(rows[0].played_seconds) : null;
  } catch (error) {
    console.error("Playtime read failed:", error);
    return null;
  }
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
  if (!secret) return true;
  if (!token) return false;

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

let panelSessionTableReady = null;

function ensurePanelSessionTable() {
  if (!panelSessionTableReady) {
    panelSessionTableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS zevyx_panel_sessions (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        uuid CHAR(36) NOT NULL,
        username VARCHAR(16) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX zevyx_panel_sessions_uuid (uuid),
        INDEX zevyx_panel_sessions_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch((error) => {
      panelSessionTableReady = null;
      throw error;
    });
  }

  return panelSessionTableReady;
}

async function createPanelSession({ uuid, username }) {
  await ensurePanelSessionTable();

  const token = crypto.randomBytes(32).toString("base64url");

  await pool.execute(
    `DELETE FROM zevyx_panel_sessions
     WHERE expires_at <= UTC_TIMESTAMP()`
  );

  await pool.execute(
    `INSERT INTO zevyx_panel_sessions
      (token_hash, uuid, username, expires_at)
     VALUES
      (:tokenHash, :uuid, :username, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))`,
    {
      tokenHash: sha256(token),
      uuid,
      username
    }
  );

  return token;
}

async function getPanelActor(req) {
  const authorization = String(req.get("authorization") || "");
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) return null;

  await ensurePanelSessionTable();

  const [sessions] = await pool.execute(
    `SELECT uuid, username
     FROM zevyx_panel_sessions
     WHERE token_hash = :tokenHash
       AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    {
      tokenHash: sha256(token)
    }
  );

  const session = sessions[0];

  if (!session) return null;

  let group = "default";

  if (lpPool) {
    try {
      const [players] = await lpPool.execute(
        `SELECT primary_group
         FROM luckperms_players
         WHERE uuid = :uuid
         LIMIT 1`,
        { uuid: session.uuid }
      );

      group = String(players[0]?.primary_group || "default").toLowerCase();
    } catch (error) {
      console.error("LuckPerms role check failed:", error);
    }
  }

  return {
    uuid: session.uuid,
    username: session.username,
    group,
    isStaff: group === "owner"
  };
}

let ticketTablesReady = null;

function ensureTicketTables() {
  if (!ticketTablesReady) {
    ticketTablesReady = Promise.all([
      pool.query(`
        CREATE TABLE IF NOT EXISTS zevyx_panel_tickets (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          owner_uuid CHAR(36) NOT NULL,
          owner_username VARCHAR(16) NOT NULL,
          type VARCHAR(32) NOT NULL,
          subject VARCHAR(120) NOT NULL,
          status VARCHAR(16) NOT NULL DEFAULT 'open',
          assigned_uuid CHAR(36) NULL,
          assigned_username VARCHAR(16) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP,
          INDEX zevyx_tickets_owner (owner_uuid),
          INDEX zevyx_tickets_status (status),
          INDEX zevyx_tickets_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),

      pool.query(`
        CREATE TABLE IF NOT EXISTS zevyx_panel_ticket_messages (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          ticket_id BIGINT UNSIGNED NOT NULL,
          author_uuid CHAR(36) NOT NULL,
          author_username VARCHAR(16) NOT NULL,
          author_role VARCHAR(16) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX zevyx_ticket_messages_ticket (ticket_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
    ]).catch((error) => {
      ticketTablesReady = null;
      throw error;
    });
  }

  return ticketTablesReady;
}

app.post("/api/tickets", async (req, res) => {
  let connection;

  try {
    const actor = await getPanelActor(req);

    if (!actor) {
      return res.status(401).json({
        ok: false,
        error: "Přihlášení vypršelo. Přihlas se znovu."
      });
    }

    const type = String(req.body.type || "").trim().toLowerCase();
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();

    if (!["general", "bug", "payment", "appeal", "other"].includes(type)) {
      return res.status(400).json({
        ok: false,
        error: "Vyber typ ticketu."
      });
    }

    if (subject.length < 4 || subject.length > 120) {
      return res.status(400).json({
        ok: false,
        error: "Název ticketu musí mít 4 až 120 znaků."
      });
    }

    if (message.length < 10 || message.length > 5000) {
      return res.status(400).json({
        ok: false,
        error: "Zpráva musí mít 10 až 5000 znaků."
      });
    }

    await ensureTicketTables();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [ticketResult] = await connection.execute(
      `INSERT INTO zevyx_panel_tickets
        (owner_uuid, owner_username, type, subject)
       VALUES
        (:ownerUuid, :ownerUsername, :type, :subject)`,
      {
        ownerUuid: actor.uuid,
        ownerUsername: actor.username,
        type,
        subject
      }
    );

    await connection.execute(
      `INSERT INTO zevyx_panel_ticket_messages
        (ticket_id, author_uuid, author_username, author_role, message)
       VALUES
        (:ticketId, :authorUuid, :authorUsername, 'player', :message)`,
      {
        ticketId: ticketResult.insertId,
        authorUuid: actor.uuid,
        authorUsername: actor.username,
        message
      }
    );

    await connection.commit();

    return res.status(201).json({
      ok: true,
      ticket: {
        id: ticketResult.insertId,
        type,
        subject,
        status: "open"
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Ticket create failed:", error);

    return res.status(500).json({
      ok: false,
      error: "Ticket se nepodařilo vytvořit."
    });
  } finally {
    connection?.release();
  }
});

app.get("/api/tickets/:ticketId", async (req, res) => {
  try {
    const actor = await getPanelActor(req);
    const ticketId = Number(req.params.ticketId);

    if (!actor) {
      return res.status(401).json({
        ok: false,
        error: "Přihlášení vypršelo. Přihlas se znovu."
      });
    }

    if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
      return res.status(400).json({
        ok: false,
        error: "Neplatné číslo ticketu."
      });
    }

    await ensureTicketTables();

    const [tickets] = await pool.execute(
      actor.isStaff
        ? `SELECT *
           FROM zevyx_panel_tickets
           WHERE id = :ticketId
           LIMIT 1`
        : `SELECT *
           FROM zevyx_panel_tickets
           WHERE id = :ticketId
             AND owner_uuid = :uuid
           LIMIT 1`,
      actor.isStaff
        ? { ticketId }
        : { ticketId, uuid: actor.uuid }
    );

    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket neexistuje nebo k němu nemáš přístup."
      });
    }

    const [messages] = await pool.execute(
      `SELECT
         id,
         author_uuid,
         author_username,
         author_role,
         message,
         created_at
       FROM zevyx_panel_ticket_messages
       WHERE ticket_id = :ticketId
       ORDER BY created_at ASC`,
      { ticketId }
    );

    return res.json({
      ok: true,
      isStaff: actor.isStaff,
      ticket,
      messages
    });
  } catch (error) {
    console.error("Ticket detail failed:", error);

    return res.status(500).json({
      ok: false,
      error: "Ticket se nepodařilo načíst."
    });
  }
});

app.post("/api/tickets/:ticketId/messages", async (req, res) => {
  try {
    const actor = await getPanelActor(req);
    const ticketId = Number(req.params.ticketId);
    const message = String(req.body.message || "").trim();

    if (!actor) {
      return res.status(401).json({
        ok: false,
        error: "Přihlášení vypršelo. Přihlas se znovu."
      });
    }

    if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
      return res.status(400).json({
        ok: false,
        error: "Neplatné číslo ticketu."
      });
    }

    if (message.length < 1 || message.length > 5000) {
      return res.status(400).json({
        ok: false,
        error: "Zpráva musí mít 1 až 5000 znaků."
      });
    }

    await ensureTicketTables();

    const [tickets] = await pool.execute(
      actor.isStaff
        ? `SELECT id, status
           FROM zevyx_panel_tickets
           WHERE id = :ticketId
           LIMIT 1`
        : `SELECT id, status
           FROM zevyx_panel_tickets
           WHERE id = :ticketId
             AND owner_uuid = :uuid
           LIMIT 1`,
      actor.isStaff
        ? { ticketId }
        : { ticketId, uuid: actor.uuid }
    );

    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket neexistuje nebo k němu nemáš přístup."
      });
    }

    if (ticket.status === "closed") {
      return res.status(409).json({
        ok: false,
        error: "Tento ticket je zavřený."
      });
    }

    await pool.execute(
      `INSERT INTO zevyx_panel_ticket_messages
        (ticket_id, author_uuid, author_username, author_role, message)
       VALUES
        (:ticketId, :authorUuid, :authorUsername, :authorRole, :message)`,
      {
        ticketId,
        authorUuid: actor.uuid,
        authorUsername: actor.username,
        authorRole: actor.isStaff ? "staff" : "player",
        message
      }
    );

    if (actor.isStaff) {
      await pool.execute(
        `UPDATE zevyx_panel_tickets
         SET
           updated_at = UTC_TIMESTAMP(),
           assigned_uuid = COALESCE(assigned_uuid, :assignedUuid),
           assigned_username = COALESCE(assigned_username, :assignedUsername)
         WHERE id = :ticketId`,
        {
          ticketId,
          assignedUuid: actor.uuid,
          assignedUsername: actor.username
        }
      );
    } else {
      await pool.execute(
        `UPDATE zevyx_panel_tickets
         SET updated_at = UTC_TIMESTAMP()
         WHERE id = :ticketId`,
        { ticketId }
      );
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Ticket message failed:", error);

    return res.status(500).json({
      ok: false,
      error: "Zprávu se nepodařilo odeslat."
    });
  }
});

app.post("/api/tickets/:ticketId/status", async (req, res) => {
  try {
    const actor = await getPanelActor(req);
    const ticketId = Number(req.params.ticketId);
    const status = String(req.body.status || "").trim().toLowerCase();

    if (!actor) {
      return res.status(401).json({
        ok: false,
        error: "Přihlášení vypršelo. Přihlas se znovu."
      });
    }

    if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
      return res.status(400).json({
        ok: false,
        error: "Neplatné číslo ticketu."
      });
    }

    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({
        ok: false,
        error: "Neplatný stav ticketu."
      });
    }

    await ensureTicketTables();

    const [tickets] = await pool.execute(
      actor.isStaff
        ? `SELECT id, owner_uuid
           FROM zevyx_panel_tickets
           WHERE id = :ticketId
           LIMIT 1`
        : `SELECT id, owner_uuid
           FROM zevyx_panel_tickets
           WHERE id = :ticketId
             AND owner_uuid = :uuid
           LIMIT 1`,
      actor.isStaff
        ? { ticketId }
        : { ticketId, uuid: actor.uuid }
    );

    if (!tickets[0]) {
      return res.status(404).json({
        ok: false,
        error: "Ticket neexistuje nebo k němu nemáš přístup."
      });
    }

    if (!actor.isStaff && status !== "closed") {
      return res.status(403).json({
        ok: false,
        error: "Ticket může znovu otevřít jen administrátor."
      });
    }

    await pool.execute(
      `UPDATE zevyx_panel_tickets
       SET status = :status,
           updated_at = UTC_TIMESTAMP()
       WHERE id = :ticketId`,
      { ticketId, status }
    );

    return res.json({ ok: true, status });
  } catch (error) {
    console.error("Ticket status change failed:", error);

    return res.status(500).json({
      ok: false,
      error: "Stav ticketu se nepodařilo změnit."
    });
  }
});

app.get("/api/tickets", async (req, res) => {
  try {
    const actor = await getPanelActor(req);

    if (!actor) {
      return res.status(401).json({
        ok: false,
        error: "Přihlášení vypršelo. Přihlas se znovu."
      });
    }

    await ensureTicketTables();

    const [tickets] = await pool.execute(
      actor.isStaff
        ? `SELECT
             id,
             owner_uuid,
             owner_username,
             type,
             subject,
             status,
             assigned_uuid,
             assigned_username,
             created_at,
             updated_at
           FROM zevyx_panel_tickets
           ORDER BY updated_at DESC`
        : `SELECT
             id,
             owner_uuid,
             owner_username,
             type,
             subject,
             status,
             assigned_uuid,
             assigned_username,
             created_at,
             updated_at
           FROM zevyx_panel_tickets
           WHERE owner_uuid = :uuid
           ORDER BY updated_at DESC`,
      actor.isStaff ? {} : { uuid: actor.uuid }
    );

    return res.json({
      ok: true,
      isStaff: actor.isStaff,
      tickets
    });
  } catch (error) {
    console.error("Ticket list failed:", error);

    return res.status(500).json({
      ok: false,
      error: "Tickety se nepodařilo načíst."
    });
  }
});

app.post("/api/refresh-profile", async (req, res) => {
  try {
    const uuid = String(req.body.uuid || "").trim();

    if (!uuid) {
      return res.status(400).json({
        ok: false,
        error: "Chybí UUID."
      });
    }

    const [luckPerms, playedTime] = await Promise.all([
      getLuckPermsProfile(uuid),
      getSavedPlaytime(uuid)
    ]);

    return res.json({
      ok: true,
      user: {
        rank: luckPerms.rank,
        rankExpiresAt: luckPerms.rankExpiresAt,
        rankPermanent: luckPerms.rankPermanent,
        rankPrefix: luckPerms.rankPrefix,
        rankIcon: luckPerms.rankIcon,
        playedTime
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Nepodařilo se aktualizovat profil."
    });
  }
});


app.post("/api/minecraft-playtime", async (req, res) => {
  try {
    if (!hasBridgeSecret(req.get("X-Zevyx-Bridge-Key"))) {
      return res.status(401).json({
        ok: false,
        error: "Neplatný bridge klíč."
      });
    }

    const uuid = normalizeUuid(req.body.uuid);
    const username = String(req.body.username || "").trim();
    const playedTimeSeconds = Math.floor(Number(req.body.playedTimeSeconds));

    if (
      !uuid ||
      !/^[A-Za-z0-9_]{3,16}$/.test(username) ||
      !Number.isFinite(playedTimeSeconds) ||
      playedTimeSeconds < 0
    ) {
      return res.status(400).json({
        ok: false,
        error: "Neplatná data z Minecraft serveru."
      });
    }

    await ensurePlaytimeTable();

    await pool.execute(
      `INSERT INTO zevyx_panel_playtime
        (uuid, username, played_seconds)
       VALUES
        (:uuid, :username, :playedTimeSeconds)
       ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        played_seconds = VALUES(played_seconds)`,
      { uuid, username, playedTimeSeconds }
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("Minecraft playtime sync failed:", error);

    return res.status(500).json({
      ok: false,
      error: "Nepodařilo se uložit odehraný čas."
    });
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

    const uuid = pick(user, ["uuid", "premiumUuid"]) || offlineUuid(user.realname || user.username);
    const luckPerms = await getLuckPermsProfile(uuid);
    const playedTime = await getSavedPlaytime(uuid);
    const sessionToken = await createPanelSession({
  uuid,
  username: user.realname || user.username
});

    return res.json({
      ok: true,
      message: "Přihlášení proběhlo.",
      user: {
        username: user.realname || user.username,
        sessionToken,
        email: user.email || null,
        uuid,
        rank: luckPerms.rank,
        rankExpiresAt: luckPerms.rankExpiresAt,
        rankPermanent: luckPerms.rankPermanent,
        rankPrefix: luckPerms.rankPrefix,
        rankIcon: luckPerms.rankIcon,
        gems: 0,
        shards: 0,
        fragments: 0,
        ip: pick(user, ["lastip", "ip", "regip"]),
        firstLogin: normalizeMillis(user.regdate),
        lastLogin: normalizeMillis(user.lastlogin),
        playedTime,
        premium: Boolean(user.hasSession || user.isLogged),
        premiumToken: user.hasSession ? String(user.hasSession) : null
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: "Serverova chyba pri prihlaseni." });
  }
});

app.post("/api/change-password", async (req, res) => {
  try {
    const username = cleanUsername(req.body.username);
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    if (!validateUsername(username)) {
      return res.status(400).json({
        ok: false,
        error: "Neplatné herní jméno."
      });
    }

    if (
      typeof currentPassword !== "string" ||
      currentPassword.length < 1 ||
      currentPassword.length > 128
    ) {
      return res.status(400).json({
        ok: false,
        error: "Zadej momentální heslo."
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        ok: false,
        error: "Nové heslo musí mít alespoň 6 znaků."
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        ok: false,
        error: "Nové heslo musí být jiné."
      });
    }

    const columns = await getColumns();
    const user = await findUser(columns, username);

    if (!user || !verifyAuthMeSha256(currentPassword, user.password)) {
      return res.status(401).json({
        ok: false,
        error: "Momentální heslo není správné."
      });
    }

    const updates = [
      `${quote("password")} = :passwordHash`
    ];

    if (columns.has("isLogged")) {
      updates.push(`${quote("isLogged")} = 0`);
    }

    if (columns.has("hasSession")) {
      updates.push(`${quote("hasSession")} = 0`);
    }

    await pool.execute(
      `UPDATE ${quote(tableName)}
       SET ${updates.join(", ")}
       WHERE LOWER(${quote("username")}) = LOWER(:username)
       LIMIT 1`,
      {
        username: user.username,
        passwordHash: createAuthMeSha256(newPassword)
      }
    );

    return res.json({
      ok: true,
      message: "Heslo bylo změněno. Na serveru se znovu přihlas."
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Serverová chyba při změně hesla."
    });
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