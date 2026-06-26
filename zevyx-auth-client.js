(function () {
  const API_BASE = "https://zevyx-auth-api.onrender.com";
  const HCAPTCHA_SITE_KEY = "d8c0836c-7382-4bd2-b262-2ee86cf293b6";
  const STORAGE_KEY = "zevyx-auth-user";

  const q = (s, r = document) => r.querySelector(s);

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function shell() {
    return `
      <main data-zevyx-app="true" class="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 text-foreground">
        <div class="flex w-full max-w-sm flex-col items-center gap-6">
          <img alt="Zevyx" width="240" height="135" style="color:transparent;max-width:260px;width:70%;height:auto" src="./zevyx_branding_logo_main.png">
          <div class="flex w-full flex-col gap-6">
            <div class="flex flex-col gap-2">
              <div class="bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg p-[3px] w-full">
                <button type="button" data-tab="login" class="h-[calc(100%-1px)] flex-1 rounded-md px-2 py-1 text-sm font-medium">Prihlasit se</button>
                <button type="button" data-tab="register" class="h-[calc(100%-1px)] flex-1 rounded-md px-2 py-1 text-sm font-medium">Zaregistrovat se</button>
              </div>
              <section data-panel="login"></section>
              <section data-panel="register" hidden></section>
            </div>
          </div>
          <div class="flex w-full flex-col gap-3">
            <div class="flex items-center gap-2 px-1">
              <div class="h-px flex-1 bg-border"></div>
              <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Potrebujes pomoc?</span>
              <div class="h-px flex-1 bg-border"></div>
            </div>
            <div class="grid w-full grid-cols-2 gap-3">
              <button type="button" class="group relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-[#5865F2] p-3 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4752C4] hover:shadow-lg hover:shadow-[#5865F2]/30 active:scale-[0.98]" onclick="window.open('https://discord.gg/zevyxeu', '_blank', 'noopener')">
                <svg xmlns="http://www.w3.org/2000/svg" class="relative h-5 w-5 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>
                <span class="text-[10px] font-bold uppercase">Discord</span>
              </button>
              <button type="button" class="group relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-secondary p-3 text-secondary-foreground border border-border transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/20 hover:shadow-lg active:scale-[0.98]" onclick="window.location.href='mailto:podpora@zevyx.eu'">
                <svg xmlns="http://www.w3.org/2000/svg" class="relative h-5 w-5 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
                <span class="text-[10px] font-bold uppercase">E-mail</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    `;
  }

function field(name, label, type, placeholder, autocomplete) {
  const isPassword = type === "password";

  return `
    <div class="flex w-full flex-col gap-1">
      <label class="text-sm font-medium" for="zevyx-${name}">${label}</label>
      <div class="${isPassword ? "relative" : ""}">
        <input id="zevyx-${name}" name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" class="placeholder:text-muted-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 ${isPassword ? "pr-10" : ""} text-base shadow-xs outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
        ${
          isPassword
            ? `<button type="button" data-password-toggle="zevyx-${name}" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground" aria-label="Zobrazit heslo">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
              </button>`
            : ""
        }
      </div>
    </div>
  `;
}

  function card(kind) {
    const login = kind === "login";
    return `
      <div class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div class="grid items-start gap-2 px-6 text-center">
          <div class="font-semibold text-xl">${login ? "Přihlášení na Info Panel" : "Registrace na Info Panel"}</div>
          <div class="text-muted-foreground text-sm">${login ? "Přihlas se pomocí údajů ze serveru." : "Vytvoř si účet pro MC Server & Info Panel."}</div>
        </div>
        <div class="px-6">
          <form data-auth-form="${kind}" class="flex flex-col items-center gap-6">
            ${
              login
                ? field("identifier", "E-mail nebo herní jméno", "text", "hráč@email.cz", "username") +
                  field("password", "Heslo", "password", "********", "current-password")
                : field("username", "Herní jméno", "text", "Hráč", "username") +
                  field("email", "E-mailová adresa", "email", "hráč@email.cz", "email") +
                  field("password", "Heslo", "password", "********", "new-password")
            }
            <div class="flex flex-col gap-2 items-center w-full"><div data-captcha></div></div>
            <div data-message class="hidden"></div>
            <button class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full" type="submit">
              ${login ? "Přihlásit se" : "Zaregistrovat se"}
            </button>
          </form>
        </div>
      </div>
    `;
  }

  function msg(form, text, type) {
    const box = q("[data-message]", form);
    if (!box) return;
    box.textContent = text;
    box.className = "w-full rounded-md border px-3 py-2 text-sm " + (
      type === "success"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-red-500/40 bg-red-500/10 text-red-300"
    );
  }

  async function post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || "Něco se nepovedlo.");
    return data;
  }

  function loadCaptcha() {
    if (window.hcaptcha) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const old = q("script[data-hcaptcha]");
      if (old) {
        old.addEventListener("load", resolve, { once: true });
        old.addEventListener("error", reject, { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.dataset.hcaptcha = "true";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function renderCaptcha(form) {
    const box = q("[data-captcha]", form);
    if (!box) return;
    if (box.dataset.widgetId && window.hcaptcha) return;

    try {
      await loadCaptcha();
      box.innerHTML = "";
      const id = window.hcaptcha.render(box, {
        sitekey: HCAPTCHA_SITE_KEY,
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light"
      });
      box.dataset.widgetId = String(id);
    } catch (e) {
      msg(form, "Captcha se nepodařila načíst. Zkus vypnout AdBlock nebo obnovit stránku.", "error");
    }
  }

  function token(form) {
    const box = q("[data-captcha]", form);
    if (!box || !window.hcaptcha || !box.dataset.widgetId) return "";
    return window.hcaptcha.getResponse(box.dataset.widgetId);
  }

  function resetCaptcha(form) {
    const box = q("[data-captcha]", form);
    if (box && window.hcaptcha && box.dataset.widgetId) window.hcaptcha.reset(box.dataset.widgetId);
  }

  function formatDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(d);
  }

  function profile(user) {
    const rows = [
      ["Herní Jméno", user.username || "-"],
      ["E-mailová Adresa", user.email || "Funkce zatím vypnuta."],
      ["UUID", user.uuid || "-"],
      ["Hodnost", `${esc(user.rank || "Hráč")} <span style="margin-left:6px;font-size:14px;font-weight:400;opacity:.8;color:#757575;">(${user.rankPermanent === false && user.rankExpiresAt ? "Dočasně do " + formatDate(user.rankExpiresAt) : "Trvale"})</span>`],
      ["IP Adresa", "********"],
      ["ZevyxCoiny", user.coins ?? 0],
      ["První Přihlášení", formatDate(user.firstLogin)],
      ["Poslední Přihlášení", formatDate(user.lastLogin)],
      ["Odehraný Čas", user.playedTime || "-"],
      ["Premium (Auto login)", user.premium ? `Zapnuto <span style="margin-left:6px;font-size:14px;font-weight:400;opacity:.8;color:#757575;">(${esc(user.uuid)})</span>` : "Vypnuto"]
    ];

    document.body.innerHTML = `
      <main class="bg-background min-h-svh text-foreground">
        <div class="border-b border-border px-5 py-4 text-sm text-muted-foreground">
          <span>Profil</span><span class="mx-2"> › </span><span class="font-semibold text-foreground">Informace</span>
          <button type="button" data-logout class="float-right rounded-md border border-border px-3 py-1 text-xs hover:bg-muted">Odhlásit</button>
        </div>
        <section class="p-5">
          <h1 class="mb-4 text-lg font-bold uppercase tracking-wide">Informace</h1>
          <div class="overflow-hidden rounded-lg border border-border bg-card">
            <table class="w-full border-collapse text-sm">
              <tbody>
                ${rows.map(([a, b]) => `
                  <tr class="border-b border-border last:border-b-0">
                    <th class="w-1/2 border-r border-border px-4 py-3 text-left font-bold">${esc(a)}</th>
                    <td class="px-4 py-3">${["Premium (Auto login)", "Hodnost"].includes(a) ? b : esc(b)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <h2 class="mb-4 mt-8 text-xl font-bold">Staff čeká na tvou odpověď.</h2>
          <div class="overflow-hidden rounded-lg border border-border bg-card">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-muted/40 text-muted-foreground">
                <tr><th class="px-4 py-3 text-left">Cislo</th><th class="px-4 py-3 text-left">Datum</th><th class="px-4 py-3 text-left">Typ</th><th class="px-4 py-3 text-left">Akce</th></tr>
              </thead>
              <tbody><tr><td class="px-4 py-6 text-muted-foreground" colspan="4">Zadne cekajici polozky.</td></tr></tbody>
            </table>
          </div>
        </section>
      </main>
    `;
    q("[data-logout]")?.addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); location.reload(); });
  }

  function setTab(name) {
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.dataset.active = String(active);
      tab.style.background = active ? "var(--background)" : "transparent";
      tab.style.color = active ? "var(--foreground)" : "";
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
      const form = q("form", panel);
      if (!panel.hidden && form) renderCaptcha(form);
    });
  }

  function bind() {
    const login = q('[data-auth-form="login"]');
    const register = q('[data-auth-form="register"]');

    login.addEventListener("submit", async (e) => {
      e.preventDefault();
      const captcha = token(login);
      if (!captcha) {
        msg(login, "Potvrď Captchu.", "error");
        await renderCaptcha(login);
        return;
      }
      const btn = q('button[type="submit"]', login);
      btn.disabled = true;
      try {
        const data = await post("/api/login", {
          identifier: q('[name="identifier"]', login).value,
          password: q('[name="password"]', login).value,
          hcaptchaToken: captcha
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user || {})); profile(data.user || {});
      } catch (err) {
        msg(login, err.message, "error");
        resetCaptcha(login);
      } finally {
        btn.disabled = false;
      }
    });

    register.addEventListener("submit", async (e) => {
      e.preventDefault();
      const captcha = token(register);
      if (!captcha) {
        msg(register, "Potvrď Captchu.", "error");
        await renderCaptcha(register);
        return;
      }
      const btn = q('button[type="submit"]', register);
      btn.disabled = true;
      try {
        const data = await post("/api/register", {
          username: q('[name="username"]', register).value,
          email: q('[name="email"]', register).value,
          password: q('[name="password"]', register).value,
          hcaptchaToken: captcha
        });
        msg(register, data.message || "Registrace hotová.", "success");
        register.reset();
        resetCaptcha(register);
      } catch (err) {
        msg(register, err.message, "error");
        resetCaptcha(register);
      } finally {
        btn.disabled = false;
      }
    });
  }

function boot() {
  const savedUser = localStorage.getItem(STORAGE_KEY);
  if (savedUser) {
    if (q("[data-logout]")) return;
    try { profile(JSON.parse(savedUser)); return; } catch { localStorage.removeItem(STORAGE_KEY); }
  }

  document.body.innerHTML = shell();
  q('[data-panel="login"]').innerHTML = card("login");
  q('[data-panel="register"]').innerHTML = card("register");

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;

      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.setAttribute("aria-label", visible ? "Zobrazit heslo" : "Skrýt heslo");
    });
  });

  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  });

  bind();
  setTab("login");
}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
