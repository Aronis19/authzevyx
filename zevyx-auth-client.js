(function () {
  const API_BASE = "https://zevyx-auth-api.onrender.com";
  const HCAPTCHA_SITE_KEY = "d8c0836c-7382-4bd2-b262-2ee86cf293b6";

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
              <a class="flex flex-col items-center justify-center rounded-xl bg-[#5865F2] p-3 text-white" href="https://discord.gg/zevyxeu">
                <span class="text-[10px] font-bold uppercase">Discord</span>
              </a>
              <a class="flex flex-col items-center justify-center rounded-xl bg-secondary p-3 text-secondary-foreground border border-border" href="mailto:podpora@zevyx.eu">
                <span class="text-[10px] font-bold uppercase">E-mail</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    `;
  }

  function field(name, label, type, placeholder, autocomplete) {
    return `
      <div class="flex w-full flex-col gap-1">
        <label class="text-sm font-medium" for="zevyx-${name}">${label}</label>
        <input id="zevyx-${name}" name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" class="placeholder:text-muted-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
      </div>
    `;
  }

  function card(kind) {
    const login = kind === "login";
    return `
      <div class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div class="grid items-start gap-2 px-6 text-center">
          <div class="font-semibold text-xl">${login ? "Prihlas se do serveru" : "Zaregistruj se na server"}</div>
          <div class="text-muted-foreground text-sm">${login ? "Prihlas se svymi udaji ze serveru" : "Vytvor si ucet pro Minecraft server"}</div>
        </div>
        <div class="px-6">
          <form data-auth-form="${kind}" class="flex flex-col items-center gap-6">
            ${
              login
                ? field("identifier", "E-mailova adresa nebo herni jmeno", "text", "hrac@email.cz nebo hrac", "username") +
                  field("password", "Uzivatelske heslo", "password", "********", "current-password")
                : field("username", "Herni jmeno", "text", "Hrac", "username") +
                  field("email", "E-mailova adresa", "email", "hrac@email.cz", "email") +
                  field("password", "Heslo", "password", "********", "new-password")
            }
            <div class="flex flex-col gap-2 items-center w-full"><div data-captcha></div></div>
            <div data-message class="hidden"></div>
            <button class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full" type="submit">
              ${login ? "Prihlasit se" : "Zaregistrovat se"}
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
    if (!res.ok || data.ok === false) throw new Error(data.error || "Neco se nepovedlo.");
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
      msg(form, "Captcha se nepodarila nacist. Zkus vypnout AdBlock nebo obnovit stranku.", "error");
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
      ["Herni jmeno", user.username || "-"],
      ["E-mailova adresa", user.email || "-"],
      ["UUID", user.uuid || "-"],
      ["Hodnost", user.rank || "Hrac"],
      ["IP Adresa", "********"],
      ["Gemy", user.gems ?? 0],
      ["Shardy", user.shards ?? 0],
      ["Ulomky", user.fragments ?? 0],
      ["Prvni prihlaseni", formatDate(user.firstLogin)],
      ["Posledni prihlaseni", formatDate(user.lastLogin)],
      ["Odehrany cas", user.playedTime || "-"],
      ["Premium (Auto login)", user.premium ? "Zapnuto" : "Vypnuto"]
    ];

    document.body.innerHTML = `
      <main class="bg-background min-h-svh text-foreground">
        <div class="border-b border-border px-5 py-4 text-sm text-muted-foreground">
          <span>Profil</span><span class="mx-2">›</span><span class="font-semibold text-foreground">Informace</span>
          <button type="button" data-logout class="float-right rounded-md border border-border px-3 py-1 text-xs hover:bg-muted">Odhlasit</button>
        </div>
        <section class="p-5">
          <h1 class="mb-4 text-lg font-bold uppercase tracking-wide">Informace</h1>
          <div class="overflow-hidden rounded-lg border border-border bg-card">
            <table class="w-full border-collapse text-sm">
              <tbody>
                ${rows.map(([a, b]) => `
                  <tr class="border-b border-border last:border-b-0">
                    <th class="w-1/2 border-r border-border px-4 py-3 text-left font-bold">${esc(a)}</th>
                    <td class="px-4 py-3">${esc(b)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <h2 class="mb-4 mt-8 text-xl font-bold">Cekaji na tvou odpoved</h2>
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
    q("[data-logout]")?.addEventListener("click", () => location.reload());
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
        msg(login, "Potvrd hCaptchu.", "error");
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
        profile(data.user || {});
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
        msg(register, "Potvrd hCaptchu.", "error");
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
        msg(register, data.message || "Registrace hotova.", "success");
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
    document.body.innerHTML = shell();
    q('[data-panel="login"]').innerHTML = card("login");
    q('[data-panel="register"]').innerHTML = card("register");
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