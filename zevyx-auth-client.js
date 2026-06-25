
  function getCaptchaToken(form) {
    const el = $("[data-captcha]", form);
    if (!el || !window.hcaptcha || !el.dataset.widgetId) return "";
    return window.hcaptcha.getResponse(el.dataset.widgetId);
  }

  function resetCaptcha(form) {
    const el = $("[data-captcha]", form);
    if (el && window.hcaptcha && el.dataset.widgetId) {
      window.hcaptcha.reset(el.dataset.widgetId);
    }
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date);
  }

  function renderProfile(user) {
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
                ${rows.map(([label, value]) => `
                  <tr class="border-b border-border last:border-b-0">
                    <th class="w-1/2 border-r border-border px-4 py-3 text-left font-bold">${escapeHtml(label)}</th>
                    <td class="px-4 py-3">${escapeHtml(value)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <h2 class="mb-4 mt-8 text-xl font-bold">Cekaji na tvou odpoved</h2>
          <div class="overflow-hidden rounded-lg border border-border bg-card">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-muted/40 text-muted-foreground">
                <tr>
                  <th class="px-4 py-3 text-left">Cislo</th>
                  <th class="px-4 py-3 text-left">Datum</th>
                  <th class="px-4 py-3 text-left">Typ</th>
                  <th class="px-4 py-3 text-left">Akce</th>
                </tr>
              </thead>
              <tbody><tr><td class="px-4 py-6 text-muted-foreground" colspan="4">Zadne cekajici polozky.</td></tr></tbody>
            </table>
          </div>
        </section>
      </main>
    `;
    $("[data-logout]")?.addEventListener("click", () => location.reload());
  }

  function setTab(active) {
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.dataset.active = String(tab.dataset.tab === active);
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== active;
      const form = $("form", panel);
      if (!panel.hidden && form) renderCaptcha(form);
    });
  }

  function bindForms() {
    const loginForm = $('[data-auth-form="login"]');
    const registerForm = $('[data-auth-form="register"]');

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const token = getCaptchaToken(loginForm);
      if (!token) {
        showMessage(loginForm, "Potvrd hCaptchu.", "error");
        await renderCaptcha(loginForm);
        return;
      }

      const button = $('button[type="submit"]', loginForm);
      button.disabled = true;
      try {
        const data = await postJson("/api/login", {
          identifier: loginForm.identifier.value,
          password: loginForm.password.value,
          hcaptchaToken: token
        });
        renderProfile(data.user || {});
      } catch (error) {
        showMessage(loginForm, error.message, "error");
        resetCaptcha(loginForm);
      } finally {
        button.disabled = false;
      }
    });

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const token = getCaptchaToken(registerForm);
      if (!token) {
        showMessage(registerForm, "Potvrd hCaptchu.", "error");
        await renderCaptcha(registerForm);
        return;
      }

      const button = $('button[type="submit"]', registerForm);
      button.disabled = true;
      try {
        const data = await postJson("/api/register", {
          username: registerForm.username.value,
          email: registerForm.email.value,
          password: registerForm.password.value,
          hcaptchaToken: token
        });
        showMessage(registerForm, data.message || "Registrace hotova.", "success");
        registerForm.reset();
        resetCaptcha(registerForm);
      } catch (error) {
        showMessage(registerForm, error.message, "error");
        resetCaptcha(registerForm);
      } finally {
        button.disabled = false;
      }
    });
  }

  function boot() {
    if ($("[data-zevyx-app]") && $('[data-auth-form="login"]') && $('[data-auth-form="register"]')) return;
    document.body.innerHTML = appShell();
    $('[data-panel="login"]').innerHTML = formCard("login");
    $('[data-panel="register"]').innerHTML = formCard("register");
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.addEventListener("click", () => setTab(tab.dataset.tab));
    });
    bindForms();
    setTab("login");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("load", boot);
  setTimeout(boot, 250);
  setTimeout(boot, 750);
  setTimeout(boot, 1500);
  setTimeout(boot, 3000);

  const watchdog = setInterval(() => {
    boot();
    if ($("[data-zevyx-app]") && $('[data-auth-form="login"]') && $('[data-auth-form="register"]')) {
      clearInterval(watchdog);
    }
  }, 500);
})();
