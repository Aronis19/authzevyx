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
                <button type="button" data-tab="login" class="h-[calc(100%-1px)] flex-1 rounded-md px-2 py-1 text-sm font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">Přihlásit se</button>
                <button type="button" data-tab="register" class="h-[calc(100%-1px)] flex-1 rounded-md px-2 py-1 text-sm font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">Zaregistrovat se</button>
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
<button
  class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full"
  style="cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,filter .2s ease"
  onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 18px rgba(0,0,0,.22)'"
  onmouseleave="this.style.transform='';this.style.boxShadow=''"
  onmousedown="this.style.transform='scale(.98)'"
  onmouseup="this.style.transform='translateY(-2px)'"
  type="submit"
>
  ${
    login
      ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="m22 2-7 20-4-9-9-4Z"/>
           <path d="M22 2 11 13"/>
         </svg>
         <span>Přihlásit se</span>`
: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
     <path d="m22 2-7 20-4-9-9-4Z"/>
     <path d="M22 2 11 13"/>
   </svg>
   <span>Zaregistrovat se</span>`
  }
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
async function refreshSavedUser(user) {
  if (!user?.uuid) return user;

  try {
    const data = await post("/api/refresh-profile", {
      uuid: user.uuid
    });

    return {
      ...user,
      ...data.user
    };
  } catch {
    return user;
  }
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
  const savedTheme = localStorage.getItem("zevyx-auth-theme");

  if (savedTheme) {
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  } else if (!document.documentElement.classList.contains("dark")) {
    document.documentElement.classList.add("dark");
  }

  const username = user.username || "Hráč";
  const avatarUrl = `https://visage.surgeplay.com/face/256/${encodeURIComponent(username)}`;
  const ipAddress = user.ip || "-";

  const rows = [
    ["Herní Jméno", user.username || "-"],
    ["E-mailová Adresa", user.email || "Funkce zatím vypnuta."],
    ["UUID", user.uuid || "-"],
    ["Hodnost", `${esc(user.rank || "Hráč")} <span style="margin-left:6px;font-size:14px;font-weight:400;opacity:.8;color:#757575;">(${user.rankExpiresAt ? "Dočasně do " + formatDate(user.rankExpiresAt) : "Trvale"})</span>`],
["IP Adresa", `
  <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
    <span data-ip-value>${ipAddress === "-" ? "-" : "**.***.**.**"}</span>

    <button
      type="button"
      data-ip-toggle
      aria-label="Zobrazit IP adresu"
      style="border:0;background:transparent;color:var(--dash-muted);cursor:pointer;padding:2px;display:flex"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
  </div>
`],
    ["ZevyxCoiny", user.coins ?? 0],
    ["První Přihlášení", formatDate(user.firstLogin)],
    ["Poslední Přihlášení", formatDate(user.lastLogin)],
    ["Odehraný Čas", user.playedTime || "-"],
    ["Premium (Auto login)", user.premium ? `Zapnuto <span style="margin-left:6px;font-size:14px;font-weight:400;opacity:.8;color:#757575;">(${esc(user.uuid)})</span>` : "Vypnuto"]
  ];

  document.body.innerHTML = `
    <style>
      [data-zevyx-dashboard] {
        --dash-bg: #09090b;
        --dash-panel: #101012;
        --dash-panel-hover: #1b1b1f;
        --dash-border: #27272a;
        --dash-text: #f4f4f5;
        --dash-muted: #a1a1aa;
        --dash-active: #242428;

        min-height: 100svh;
        display: grid;
        grid-template-columns: 164px minmax(0, 1fr);
        background: var(--dash-bg);
        color: var(--dash-text);
        font-family: inherit;
      }

      html:not(.dark) [data-zevyx-dashboard] {
        --dash-bg: #fafafa;
        --dash-panel: #ffffff;
        --dash-panel-hover: #f1f1f3;
        --dash-border: #e4e4e7;
        --dash-text: #18181b;
        --dash-muted: #71717a;
        --dash-active: #ededf0;
      }

      .dash-sidebar {
        position: sticky;
        top: 0;
        height: 100svh;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--dash-border);
        background: var(--dash-panel);
        overflow: hidden;
      }

      .dash-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 44px;
        padding: 0 12px;
        border-bottom: 1px solid var(--dash-border);
        font-size: 12px;
        font-weight: 800;
      }

.dash-brand img {
  width: 42px;
  height: 42px;
  object-fit: contain;
  object-position: left center;
  filter: brightness(1.35) saturate(1.2);
}

      .dash-nav {
        padding: 12px 8px;
        overflow-y: auto;
      }

      .dash-nav-title {
        margin: 8px 5px 5px;
        color: var(--dash-muted);
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .05em;
      }

      .dash-nav-button {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 0;
        border-radius: 7px;
        padding: 7px 8px;
        background: transparent;
        color: var(--dash-text);
        text-align: left;
        font: inherit;
        font-size: 11px;
        font-weight: 650;
        cursor: pointer;
        transition: background .16s ease, transform .16s ease;
      }

      .dash-nav-button:hover {
        background: var(--dash-panel-hover);
        transform: translateX(2px);
      }

      .dash-nav-button.active {
        background: var(--dash-active);
      }

      .dash-nav-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dash-muted);
}

.dash-nav-icon svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

      .dash-account-wrap {
        position: relative;
        margin-top: auto;
        padding: 10px 12px 14px;
        border-top: 1px solid var(--dash-border);
      }

      .dash-account {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 9px;
        border: 0;
        border-radius: 8px;
        padding: 8px;
        background: var(--dash-panel-hover);
        color: var(--dash-text);
        font: inherit;
        cursor: pointer;
        transition: transform .16s ease, background .16s ease;
      }

      .dash-account:hover {
        background: var(--dash-active);
        transform: translateY(-1px);
      }

      .dash-avatar {
        width: 28px;
        height: 28px;
        border-radius: 5px;
        image-rendering: pixelated;
      }

      .dash-account-name {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left;
        font-size: 11px;
        font-weight: 800;
      }

      .dash-chevron {
        width: 15px;
        color: var(--dash-muted);
        transition: transform .18s ease;
      }

.dash-menu {
  position: absolute;
  bottom: 68px;
  left: 12px;
  right: 12px;
  width: auto;
  overflow: hidden;
  border: 1px solid var(--dash-border);
  border-radius: 10px;
  background: var(--dash-panel);
  box-shadow: 0 16px 35px rgba(0, 0, 0, .35);
  z-index: 20;

  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(9px) scale(.985);
  transform-origin: bottom left;
  transition:
    opacity .18s ease,
    transform .22s cubic-bezier(.22, .61, .36, 1),
    visibility 0s linear .22s;
}

.dash-menu.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0) scale(1);
  transition:
    opacity .18s ease,
    transform .22s cubic-bezier(.22, .61, .36, 1);
}

      .dash-menu-head {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 12px;
        border-bottom: 1px solid var(--dash-border);
        font-size: 12px;
        font-weight: 800;
      }

      .dash-menu-button {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 9px;
        border: 0;
        padding: 10px 12px;
        background: transparent;
        color: var(--dash-text);
        font: inherit;
        font-size: 12px;
        text-align: left;
        cursor: pointer;
        transition: background .16s ease;
      }

      .dash-menu-button:hover {
        background: var(--dash-panel-hover);
      }

.dash-menu-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dash-muted);
}

.dash-menu-icon svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

      .dash-main {
        min-width: 0;
      }

      .dash-header {
        display: flex;
        align-items: center;
        min-height: 44px;
        padding: 0 20px;
        border-bottom: 1px solid var(--dash-border);
        color: var(--dash-muted);
        font-size: 11px;
      }

      .dash-content {
        padding: 20px;
      }

      .dash-title {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .dash-card {
        overflow: hidden;
        border: 1px solid var(--dash-border);
        border-radius: 8px;
        background: var(--dash-panel);
      }

.dash-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.dash-table th,
.dash-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--dash-border);
}

.dash-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
}

.dash-profile-table th {
  width: 50%;
  border-right: 1px solid var(--dash-border);
  text-align: left;
  font-weight: 500;
}

.dash-profile-table td {
  text-align: left;
  color: var(--dash-text);
}

.dash-profile-table tr:last-child th,
.dash-profile-table tr:last-child td {
  border-bottom: 0;
}

.dash-section-title {
  margin: 22px 0 10px;
  font-size: 20px;
  font-weight: 900;
}

@media (min-width: 761px) {
  [data-zevyx-dashboard] {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .dash-brand,
  .dash-header {
    min-height: 64px;
    height: 64px;
    padding-left: 18px;
    padding-right: 18px;
  }

  .dash-brand {
    gap: 10px;
    font-size: 16px;
  }

.dash-brand img {
  width: 48px;
  height: 48px;
}

  .dash-nav {
    padding: 16px 12px;
  }

  .dash-nav-title {
    margin: 10px 6px 7px;
    font-size: 11px;
  }

  .dash-nav-button {
    gap: 10px;
    padding: 10px;
    border-radius: 8px;
    font-size: 14px;
  }

  .dash-nav-button.active {
    background: transparent;
    box-shadow: inset 0 0 0 1px #3f3f46;
  }

  .dash-nav-icon {
    width: 16px;
  }

  .dash-account-wrap {
    padding: 14px 14px 16px;
  }

  .dash-account {
    gap: 11px;
    padding: 10px;
    border-radius: 10px;
  }

  .dash-avatar {
    width: 34px;
    height: 34px;
  }

  .dash-account-name {
    font-size: 14px;
  }

  .dash-menu {
    bottom: 78px;
    left: 14px;
    right: 14px;
    width: auto;
  }

  .dash-menu-head,
  .dash-menu-button {
    font-size: 14px;
  }

  .dash-menu-button {
    padding: 12px 14px;
  }

  .dash-header {
    font-size: 14px;
  }

  .dash-content {
    padding: 28px;
  }

  .dash-title {
    margin-bottom: 16px;
    font-size: 18px;
  }

  .dash-table {
    font-size: 14px;
  }

  .dash-table th,
  .dash-table td {
    padding: 12px 16px;
  }

  .dash-section-title {
    margin: 28px 0 14px;
    font-size: 20px;
  }
}

.mobile-bottom-nav,
.mobile-sheet,
.mobile-sheet-backdrop {
  display: none;
}

@media (max-width: 760px) {
.mobile-sheet.is-open {
  transform: translateY(0);
}

html.dark .mobile-sheet-row,
html.dark .mobile-account-card {
  background: #171719;
  border-color: #303034;
  box-shadow: 0 1px 0 rgba(255, 255, 255, .02);
}

.mobile-sheet-backdrop {
  position: fixed;
  z-index: 90;
  inset: 0;
  display: block;
  visibility: hidden;
  opacity: 0;
  background: rgba(0, 0, 0, .72);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  transition: opacity .22s ease, visibility 0s linear .22s;
}

.mobile-sheet-backdrop.is-open {
  visibility: visible;
  opacity: 1;
  transition: opacity .22s ease;
}

.mobile-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 14px;
  font-size: 16px;
  font-weight: 800;
}

.mobile-sheet-head button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dash-muted);
  font-size: 24px;
  cursor: pointer;
}

.mobile-bottom-nav button small {
  font-size: 10px;
  font-weight: 600;
}

.mobile-bottom-nav button.is-active {
  color: var(--dash-text);
}
  [data-zevyx-dashboard] {
    grid-template-columns: 1fr;
  }

  .dash-sidebar {
    display: none;
  }

  .dash-header {
    min-height: 58px;
    padding: 0 18px;
  }

  .dash-content {
    padding: 24px 18px 96px;
  }

  .dash-table {
    font-size: 10px;
  }

.mobile-bottom-nav {
  position: fixed;
  z-index: 80;
  bottom: 0;
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: 72px;
  border-top: 1px solid var(--dash-border);
  background: rgba(10, 10, 12, .96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.mobile-sheet {
  position: fixed;
  z-index: 100;
  bottom: 0;
  left: 0;
  right: 0;
  display: block;
  max-height: 82svh;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid rgba(255,255,255,.08);
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  background: var(--dash-bg);
  box-shadow: 0 -18px 40px rgba(0, 0, 0, .45);
  transform: translateY(110%);
  transition: transform .28s cubic-bezier(.22, .61, .36, 1);
}

.mobile-sheet-row,
.mobile-account-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 58px;
  margin-bottom: 10px;
  padding: 0 14px;
  border: 1px solid var(--dash-border);
  border-radius: 14px;
  background: var(--dash-panel);
  color: var(--dash-text);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  box-sizing: border-box;
}

.mobile-bottom-nav svg,
.mobile-sheet-row svg {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mobile-bottom-nav button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--dash-muted);
  font: inherit;
  cursor: pointer;
  transition: color .18s ease, transform .18s ease;
}

.mobile-sheet-row span {
  width: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dash-muted);
  flex: 0 0 22px;
}

html:not(.dark) .mobile-bottom-nav {
  background: rgba(255, 255, 255, .92);
}

html:not(.dark) .mobile-sheet {
  background: #ffffff;
  border-color: rgba(0, 0, 0, .08);
}

html:not(.dark) .mobile-sheet-row,
html:not(.dark) .mobile-account-card {
  background: #ffffff;
  border-color: #d9d9de;
  box-shadow: 0 1px 0 rgba(0, 0, 0, .03);
  color: #111827;
}

html:not(.dark) .mobile-sheet-head {
  color: #111827;
}

html:not(.dark) .mobile-sheet-head button {
  color: #6b7280;
}

html:not(.dark) .mobile-bottom-nav button {
  color: #6b7280;
}

html:not(.dark) .mobile-bottom-nav button.is-active {
  color: #111827;
}

html:not(.dark) .mobile-sheet-row span,
html:not(.dark) .mobile-sheet-row svg {
  color: #6b7280;
}

html:not(.dark) .mobile-account-card strong {
  color: #111827;
}

  .mobile-sheet-row {
    cursor: pointer;
    transition: background .18s ease, border-color .18s ease, transform .18s ease;
  }

  .mobile-sheet-row:active {
    transform: scale(.99);
  }

@media (hover: hover) {
  html.dark .mobile-sheet-row:not(.mobile-logout):hover {
    background: #222225;
    border-color: #414146;
  }

  html:not(.dark) .mobile-sheet-row:not(.mobile-logout):hover {
    background: #eeeeF0;
    border-color: #c7c7ce;
  }

  html.dark .mobile-sheet-row.mobile-logout:hover {
    background: rgba(153, 27, 27, .42);
    border-color: rgba(248, 113, 113, .55);
  }

  html:not(.dark) .mobile-sheet-row.mobile-logout:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }
}

  .mobile-sheet-row span {
    width: 22px;
    color: var(--dash-muted);
    font-size: 20px;
    text-align: center;
    flex: 0 0 22px;
  }

  .mobile-account-card {
    justify-content: flex-start;
    min-height: 70px;
  }

  .mobile-account-card .dash-avatar {
    width: 38px;
    height: 38px;
  }

  .mobile-account-card strong {
    font-size: 14px;
  }

  .mobile-logout {
    border-color: rgba(239, 68, 68, .28);
    background: rgba(127, 29, 29, .22);
    color: #f87171;
  }

  .mobile-logout span {
    color: #f87171;
  }
}

.dash-loader {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
  width: 100%;
  height: 3px;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  transition: opacity .2s ease;
}

.dash-loader::before {
  content: "";
  display: block;
  width: 42%;
  height: 100%;
  background: #00b3ff;
  box-shadow: 0 0 12px rgba(0, 179, 255, .9);
  transform: translateX(-115%);
  will-change: transform;
}

.dash-loader.is-loading {
  opacity: 1;
}

.dash-loader.is-loading::before {
  animation: dash-loader-move .85s cubic-bezier(.22, .61, .36, 1) infinite;
}

@keyframes dash-loader-move {
  from {
    transform: translateX(-115%);
  }

  to {
    transform: translateX(355%);
  }
}

    </style>

    <div class="dash-loader" data-top-loader></div>


    <main data-zevyx-dashboard>
      <aside class="dash-sidebar">
        <div class="dash-brand">
          <img src="./zevyxlogo_small.png" alt="">
          <span>ZEVYX</span>
        </div>

        <nav class="dash-nav">
  <div class="dash-nav-title">Profil</div>

  <button type="button" class="dash-nav-button active" data-page-open="info">
    <span class="dash-nav-icon">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>
    </span>
    Informace
  </button>

<button type="button" class="dash-nav-button" data-page-open="username">
  <span class="dash-nav-icon">
    <svg viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.2 16z"/><path d="m14.5 6.5 3 3"/></svg>
  </span>
  Změna herního jména
</button>

  <button type="button" class="dash-nav-button" data-page-open="password">
    <span class="dash-nav-icon">
      <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
    </span>
    Změna hesla
  </button>

  <button type="button" class="dash-nav-button">
    <span class="dash-nav-icon">
      <svg viewBox="0 0 24 24"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-8"/><path d="M22 19V3"/></svg>
    </span>
    Statistiky
  </button>

  <div class="dash-nav-title" style="margin-top:18px">Podpora</div>

  <button type="button" class="dash-nav-button">
    <span class="dash-nav-icon">
      <svg viewBox="0 0 24 24"><path d="M5 4h14v12H9l-4 4z"/><path d="M8 8h8"/><path d="M8 12h5"/></svg>
    </span>
    Vytvořit ticket
  </button>

  <button type="button" class="dash-nav-button">
    <span class="dash-nav-icon">
      <svg viewBox="0 0 24 24"><path d="M5 4h14v12H9l-4 4z"/><path d="M8 8h8"/><path d="M8 12h8"/></svg>
    </span>
    Moje tickety
  </button>
</nav>

        <div class="dash-account-wrap" data-user-menu-wrap>
          <div class="dash-menu" data-user-menu>
            <div class="dash-menu-head">
              <img class="dash-avatar" src="${avatarUrl}" alt="">
              <span>${esc(username)}</span>
            </div>

<button type="button" class="dash-menu-button" data-theme-toggle>
  <span class="dash-menu-icon">
    <svg viewBox="0 0 24 24">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>
    </svg>
  </span>
  Přepnout motiv
</button>

<button type="button" class="dash-menu-button" data-logout>
  <span class="dash-menu-icon">
    <svg viewBox="0 0 24 24">
      <path d="M10 17l5-5-5-5"/>
      <path d="M15 12H3"/>
      <path d="M21 3v18H10"/>
    </svg>
  </span>
  Odhlásit se
</button>

</div>

          <button type="button" class="dash-account" data-user-menu-toggle>
            <img class="dash-avatar" src="${avatarUrl}" alt="">
            <span class="dash-account-name">${esc(username)}</span>
            <svg class="dash-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m7 15 5-5 5 5"/>
            </svg>
          </button>
        </div>
      </aside>

      <div class="dash-main">
        <header class="dash-header">
          <span>Profil</span>
          <span style="margin:0 8px">›</span>
          <strong style="color:var(--dash-text)">Informace</strong>
        </header>

        <section class="dash-content">
          <h1 class="dash-title">Informace</h1>

          <div class="dash-card">
            <table class="dash-table dash-profile-table">
              <tbody>
                ${rows.map(([a, b]) => `
                  <tr>
                    <th>${esc(a)}</th>
                    <td>${["Premium (Auto login)", "Hodnost", "IP Adresa"].includes(a) ? b : esc(b)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <h2 class="dash-section-title">Čekají na tvou odpověď</h2>

          <div class="dash-card">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Cislo</th>
                  <th>Datum</th>
                  <th>Typ</th>
                  <th>Akce</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="4" style="color:var(--dash-muted);padding:18px 10px">
                    Žádné čekající položky.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>

<nav class="mobile-bottom-nav" aria-label="Mobilní navigace">
  <button type="button" class="is-active" data-mobile-sheet-open="profile">
    <span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/>
        <path d="M4 20a8 8 0 0 1 16 0"/>
      </svg>
    </span>
    <small>Profil</small>
  </button>

  <button type="button" data-mobile-sheet-open="support">
    <span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M4 12h16"/>
        <path d="M4 6h16"/>
        <path d="M4 18h10"/>
      </svg>
    </span>
    <small>Podpora</small>
  </button>

  <button type="button" data-mobile-sheet-open="account">
    <span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20a8 8 0 0 1 16 0"/>
      </svg>
    </span>
    <small>Účet</small>
  </button>
</nav>

    <div class="mobile-sheet-backdrop" data-mobile-sheet-backdrop></div>

<section class="mobile-sheet" data-mobile-sheet="profile">
  <div class="mobile-sheet-head">
    <strong>Profil</strong>
    <button type="button" data-mobile-sheet-close>×</button>
  </div>

  <button type="button" class="mobile-sheet-row" data-mobile-sheet-close data-page-open="info">
    <span>
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20a8 8 0 0 1 16 0"/>
      </svg>
    </span>
    Informace
  </button>

  <button type="button" class="mobile-sheet-row" data-page-open="username">
    <span>
      <svg viewBox="0 0 24 24">
        <path d="m4 20 4.2-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.2 16z"/>
        <path d="m14.5 6.5 3 3"/>
      </svg>
    </span>
    Změna herního jména
  </button>

  <button type="button" class="mobile-sheet-row" data-page-open="password">
    <span>
      <svg viewBox="0 0 24 24">
        <rect x="5" y="10" width="14" height="10" rx="2"/>
        <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
      </svg>
    </span>
    Změna hesla
  </button>

  <button type="button" class="mobile-sheet-row">
    <span>
      <svg viewBox="0 0 24 24">
        <path d="M4 19V9"/>
        <path d="M10 19V5"/>
        <path d="M16 19v-8"/>
        <path d="M22 19V3"/>
      </svg>
    </span>
    Statistiky
  </button>
</section>

<section class="mobile-sheet" data-mobile-sheet="support">
  <div class="mobile-sheet-head">
    <strong>Podpora</strong>
    <button type="button" data-mobile-sheet-close>×</button>
  </div>

  <button type="button" class="mobile-sheet-row">
    <span>
      <svg viewBox="0 0 24 24">
        <path d="M5 4h14v12H9l-4 4z"/>
        <path d="M8 8h8"/>
        <path d="M8 12h5"/>
      </svg>
    </span>
    Moje tickety
  </button>

  <button type="button" class="mobile-sheet-row">
    <span>
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8"/>
        <path d="M12 8v8"/>
        <path d="M8 12h8"/>
      </svg>
    </span>
    Vytvořit ticket
  </button>
</section>

<section class="mobile-sheet" data-mobile-sheet="account">
  <div class="mobile-sheet-head">
    <strong>Účet</strong>
    <button type="button" data-mobile-sheet-close>×</button>
  </div>

  <div class="mobile-account-card">
    <img class="dash-avatar" src="${avatarUrl}" alt="">
    <strong>${esc(username)}</strong>
  </div>

  <button type="button" class="mobile-sheet-row" data-mobile-theme-toggle>
    <span>
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2"/>
        <path d="M12 20v2"/>
        <path d="M4.93 4.93l1.41 1.41"/>
        <path d="M17.66 17.66l1.41 1.41"/>
        <path d="M2 12h2"/>
        <path d="M20 12h2"/>
        <path d="M4.93 19.07l1.41-1.41"/>
        <path d="M17.66 6.34l1.41-1.41"/>
      </svg>
    </span>
    Přepnout motiv
  </button>

  <button type="button" class="mobile-sheet-row mobile-logout" data-mobile-logout>
    <span>
      <svg viewBox="0 0 24 24">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <path d="M16 17l5-5-5-5"/>
        <path d="M21 12H9"/>
      </svg>
    </span>
    Odhlásit se
  </button>
</section>
  `;

  const toggle = q("[data-user-menu-toggle]");
  const menu = q("[data-user-menu]");
  const menuWrap = q("[data-user-menu-wrap]");
const mobileBackdrop = q("[data-mobile-sheet-backdrop]");
const mobileSheets = [...document.querySelectorAll("[data-mobile-sheet]")];
const mobileButtons = [...document.querySelectorAll("[data-mobile-sheet-open]")];

const closeMobileSheets = () => {
  mobileSheets.forEach((sheet) => sheet.classList.remove("is-open"));
  mobileBackdrop?.classList.remove("is-open");
};

mobileButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.mobileSheetOpen;

    closeMobileSheets();

    q(`[data-mobile-sheet="${target}"]`)?.classList.add("is-open");
    mobileBackdrop?.classList.add("is-open");

    mobileButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
  });
});

document.querySelectorAll("[data-mobile-sheet-close]").forEach((button) => {
  button.addEventListener("click", closeMobileSheets);
});

mobileBackdrop?.addEventListener("click", closeMobileSheets);

const showUsernamePage = () => {
  const loader = q("[data-top-loader]");

  loader?.classList.add("is-loading");
  closeMobileSheets();

  window.setTimeout(() => {
  document.body.dataset.zevyxPage = "username";
    q(".dash-header").innerHTML = `
      <span>Profil</span>
      <span style="margin:0 8px">›</span>
      <strong style="color:var(--dash-text)">Změna herního jména</strong>
    `;

    q(".dash-content").innerHTML = `
      <h1 class="dash-title">Změna herního jména</h1>

      <div class="dash-card" style="padding:18px">
        <strong>Tato funkce je nedostupná.</strong>
      </div>
    `;

    document.querySelectorAll(".dash-nav-button").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.pageOpen === "username"
      );
    });

    loader?.classList.remove("is-loading");
  }, 450);
};

const showPasswordPage = () => {
  const loader = q("[data-top-loader]");

  loader?.classList.add("is-loading");
  closeMobileSheets();

  window.setTimeout(() => {
    document.body.dataset.zevyxPage = "password";

    q(".dash-header").innerHTML = `
      <span>Profil</span>
      <span style="margin:0 8px">›</span>
      <strong style="color:var(--dash-text)">Změna hesla</strong>
    `;

    q(".dash-content").innerHTML = `
<h1 class="dash-title">ZMĚNA HESLA</h1>

      <form data-change-password-form style="display:flex;flex-direction:column;gap:12px">
        <label style="font-size:12px;font-weight:700">
          Momentální heslo
          <input
            type="password"
            name="currentPassword"
            placeholder="********"
            autocomplete="current-password"
            style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid var(--dash-border);border-radius:7px;background:var(--dash-panel);color:var(--dash-text);font:inherit;box-sizing:border-box"
          >
        </label>

        <label style="font-size:12px;font-weight:700">
          Nové heslo
          <input
            type="password"
            name="newPassword"
            placeholder="********"
            autocomplete="new-password"
            style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid var(--dash-border);border-radius:7px;background:var(--dash-panel);color:var(--dash-text);font:inherit;box-sizing:border-box"
          >
        </label>

        <label style="font-size:12px;font-weight:700">
          Potvrdit nové heslo
          <input
            type="password"
            name="confirmPassword"
            placeholder="********"
            autocomplete="new-password"
            style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid var(--dash-border);border-radius:7px;background:var(--dash-panel);color:var(--dash-text);font:inherit;box-sizing:border-box"
          >
        </label>

        <div data-password-message></div>

<button
  type="submit"
  style="
    width:100%;
    border:1px solid #ffffff;
    border-radius:10px;
    padding:12px 14px;
    background:#ffffff;
    color:#111827;
    font:inherit;
    font-weight:700;
    cursor:pointer;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    box-sizing:border-box;
    transition:transform .18s ease, box-shadow .18s ease, filter .18s ease;
  "
  onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 18px rgba(255,255,255,.18)'"
  onmouseleave="this.style.transform='';this.style.boxShadow=''"
  onmousedown="this.style.transform='scale(.98)'"
  onmouseup="this.style.transform='translateY(-2px)'"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
  <span>Změnit heslo</span>
</button>
      </form>
    `;

    document.querySelectorAll(".dash-nav-button").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.pageOpen === "password"
      );
    });

    loader?.classList.remove("is-loading");
const passwordForm = q("[data-change-password-form]");

passwordForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const currentPassword = q('[name="currentPassword"]', passwordForm).value;
  const newPassword = q('[name="newPassword"]', passwordForm).value;
  const confirmPassword = q('[name="confirmPassword"]', passwordForm).value;
  const message = q("[data-password-message]");

  if (!currentPassword || !newPassword || !confirmPassword) {
    message.textContent = "Vyplň všechna pole.";
    message.style.color = "#f87171";
    return;
  }

  if (newPassword !== confirmPassword) {
    message.textContent = "Nová hesla se neshodují.";
    message.style.color = "#f87171";
    return;
  }

  message.textContent = "Hesla souhlasí.";
  message.style.color = "#4ade80";
});
  }, 450);
};

document.querySelectorAll('[data-page-open="password"]').forEach((button) => {
  button.addEventListener("click", showPasswordPage);
});

document.querySelectorAll('[data-page-open="username"]').forEach((button) => {
  button.addEventListener("click", showUsernamePage);
});

document.querySelectorAll('[data-page-open="info"]').forEach((button) => {
  button.addEventListener("click", () => {
    const loader = q("[data-top-loader]");

    loader?.classList.add("is-loading");
    closeMobileSheets();

    window.setTimeout(() => {
      document.body.dataset.zevyxPage = "info";
      profile(user);
    }, 450);
  });
});

const ipToggle = q("[data-ip-toggle]");
const ipValue = q("[data-ip-value]");

const eyeIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
`;

const eyeOffIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="m2 2 20 20"/>
    <path d="M6.71 6.71C4.93 7.9 3.44 9.7 2.56 11.65a1 1 0 0 0 0 .7C4.07 15.77 7.72 18 12 18c1.34 0 2.62-.22 3.8-.63"/>
    <path d="M10.73 5.08C11.15 5.03 11.57 5 12 5c4.85 0 8.99 3.03 10.5 7.3a1 1 0 0 1 0 .7c-.43 1.21-1.12 2.31-2 3.24"/>
    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/>
  </svg>
`;

let ipVisible = false;

ipToggle?.addEventListener("click", () => {
  if (ipAddress === "-") return;

  ipVisible = !ipVisible;

  ipValue.textContent = ipVisible ? ipAddress : "**.***.**.**";
  ipToggle.innerHTML = ipVisible ? eyeOffIcon : eyeIcon;

  ipToggle.setAttribute(
    "aria-label",
    ipVisible ? "Skrýt IP adresu" : "Zobrazit IP adresu"
  );
});

const setMenuOpen = (open) => {
  menu?.classList.toggle("is-open", open);
  toggle?.setAttribute("aria-expanded", String(open));
};

toggle?.addEventListener("click", () => {
  setMenuOpen(!menu?.classList.contains("is-open"));
});

document.addEventListener("click", (event) => {
  if (menuWrap && !menuWrap.contains(event.target)) {
    setMenuOpen(false);
  }
});

document.querySelectorAll("[data-theme-toggle], [data-mobile-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    q("[data-top-loader]")?.classList.add("is-loading");

    setTimeout(() => {
      const darkNow = !document.documentElement.classList.contains("dark");

      document.documentElement.classList.toggle("dark", darkNow);
      localStorage.setItem("zevyx-auth-theme", darkNow ? "dark" : "light");

      profile(user);
    }, 250);
  });
});

document.querySelectorAll("[data-logout], [data-mobile-logout]").forEach((button) => {
  button.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
});

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

  try {
    const cachedUser = JSON.parse(savedUser);

    profile(cachedUser);

const updateProfile = async () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const oldUser = JSON.parse(saved);
    const freshUser = await refreshSavedUser(oldUser);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));

    const changed =
      freshUser.rank !== oldUser.rank ||
      freshUser.rankExpiresAt !== oldUser.rankExpiresAt ||
      freshUser.rankPermanent !== oldUser.rankPermanent ||
      freshUser.playedTime !== oldUser.playedTime;

if (
  changed &&
  document.body.dataset.zevyxPage !== "username" &&
  document.body.dataset.zevyxPage !== "password"
) {
  profile(freshUser);
}
  } catch {

  }
};

updateProfile();
setInterval(updateProfile, 1000);

return;

    return;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

  document.body.innerHTML = shell();
  q('[data-panel="login"]').innerHTML = card("login");
  q('[data-panel="register"]').innerHTML = card("register");

document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  const eyeIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `;

  const eyeOffIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m2 2 20 20"/>
      <path d="M6.71 6.71C4.93 7.9 3.44 9.7 2.56 11.65a1 1 0 0 0 0 .7C4.07 15.77 7.72 18 12 18c1.34 0 2.62-.22 3.8-.63"/>
      <path d="M10.73 5.08C11.15 5.03 11.57 5 12 5c4.85 0 8.99 3.03 10.5 7.3a1 1 0 0 1 0 .7c-.43 1.21-1.12 2.31-2 3.24"/>
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/>
    </svg>
  `;

  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;

    const willShowPassword = input.type === "password";

    input.type = willShowPassword ? "text" : "password";
    button.innerHTML = willShowPassword ? eyeOffIcon : eyeIcon;
    button.setAttribute(
      "aria-label",
      willShowPassword ? "Skrýt heslo" : "Zobrazit heslo"
    );
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
