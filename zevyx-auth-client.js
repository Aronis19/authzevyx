        <div class="border-b border-border px-5 py-4 text-sm text-muted-foreground">
          <span>Profil</span><span class="mx-2">›</span><span class="font-semibold text-foreground">Informace</span>
          <button type="button" data-zevyx-logout class="float-right rounded-md border border-border px-3 py-1 text-xs hover:bg-muted">Odhlasit</button>
        </div>
        <section class="p-5">
          <h1 class="mb-4 text-lg font-bold uppercase tracking-wide">Informace</h1>
          <div class="overflow-hidden rounded-lg border border-border bg-card">
            <table class="w-full border-collapse text-sm">
              <tbody>
                ${rows.map(([label, value]) => `
                  <tr class="border-b border-border last:border-b-0">
                    <th class="w-1/2 border-r border-border px-4 py-3 text-left font-bold">${escapeHtml(label)}</th>
                    <td class="px-4 py-3">${String(value).includes("<span") ? value : escapeHtml(value)}</td>
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
              <tbody>
                <tr><td class="px-4 py-6 text-muted-foreground" colspan="4">Zadne cekajici polozky.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    `;

    document.querySelector("[data-zevyx-logout]")?.addEventListener("click", () => location.reload());
  }

  function setupLoginForm() {
    const form = document.querySelector("#radix-_R_pbsnqlb_-content-sign-in form");
    if (!form) return;

    normalizeLoginForm(form);
    renderCaptcha(form);

    if (form.dataset.zevyxSubmitReady === "true") return;
    form.dataset.zevyxSubmitReady = "true";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const hcaptchaToken = captchaToken(form);
      if (!hcaptchaToken) {
        showMessage(form, "Potvrd hCaptchu.", "error");
        await renderCaptcha(form);
        return;
      }

      setBusy(form, true);
      try {
        const data = await postJson("/api/login", {
          identifier: form.querySelector('[name="identifier"]')?.value || "",
          password: form.querySelector('[name="password"]')?.value || "",
          hcaptchaToken
        });
        renderProfile(data.user || {});
      } catch (error) {
        showMessage(form, error.message, "error");
        resetCaptcha(form);
      } finally {
        setBusy(form, false);
      }
    }, true);
  }

  function setupRegisterForm() {
    const form = document.querySelector('[data-zevyx-form="register"]');
    if (!form) return;

    renderCaptcha(form);

    if (form.dataset.zevyxSubmitReady === "true") return;
    form.dataset.zevyxSubmitReady = "true";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const hcaptchaToken = captchaToken(form);
      if (!hcaptchaToken) {
        showMessage(form, "Potvrd hCaptchu.", "error");
        await renderCaptcha(form);
        return;
      }

      setBusy(form, true);
      try {
        const data = await postJson("/api/register", {
          username: form.querySelector('[name="username"]')?.value || "",
          email: form.querySelector('[name="email"]')?.value || "",
          password: form.querySelector('[name="password"]')?.value || "",
          hcaptchaToken
        });
        showMessage(form, data.message || "Registrace hotova.", "success");
        form.reset();
        resetCaptcha(form);
      } catch (error) {
        showMessage(form, error.message, "error");
        resetCaptcha(form);
      } finally {
        setBusy(form, false);
      }
    }, true);
  }

  function setupForgotForm() {
    const form = document.querySelector("form");
    if (!form || !document.title.toLowerCase().includes("zapomen")) return;

    normalizeLoginForm(form);
    renderCaptcha(form);

    if (form.dataset.zevyxSubmitReady === "true") return;
    form.dataset.zevyxSubmitReady = "true";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const hcaptchaToken = captchaToken(form);
      if (!hcaptchaToken) {
        showMessage(form, "Potvrd hCaptchu.", "error");
        await renderCaptcha(form);
        return;
      }

      setBusy(form, true);
      try {
        const data = await postJson("/api/forgot-password", {
          identifier: form.querySelector('[name="email"]')?.value || "",
          hcaptchaToken
        });
        showMessage(form, data.message || "Hotovo.", "success");
      } catch (error) {
        showMessage(form, error.message, "error");
        resetCaptcha(form);
      } finally {
        setBusy(form, false);
      }
    }, true);
  }

  function boot() {
    setupTabs();
    setupLoginForm();
    setupRegisterForm();
    setupForgotForm();
  }

  onReady(() => {
    boot();
    window.addEventListener("load", boot);
    setTimeout(boot, 300);
    setTimeout(boot, 1200);

    const observer = new MutationObserver(() => {
      clearTimeout(observer.timer);
      observer.timer = setTimeout(boot, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
