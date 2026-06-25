(function () {
  const API_BASE = "https://zevyx-auth-api.onrender.com";
  const HCAPTCHA_SITE_KEY = "d8c0836c-7382-4bd2-b262-2ee86cf293b6";

  const inputClass = "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";
  const fieldClass = "group/field flex w-full gap-1 data-[invalid=true]:text-destructive flex-col [&>*]:w-full [&>.sr-only]:w-auto";
  const labelClass = "items-center text-sm font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50";
  const buttonClass = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full";
  const messageClass = "hidden rounded-md border px-3 py-2 text-sm leading-snug";

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function loadHcaptcha() {
    if (window.hcaptcha) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-zevyx-hcaptcha]");
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.zevyxHcaptcha = "true";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function renderCaptcha(container) {
    if (!container || container.dataset.widgetId) {
      return container ? container.dataset.widgetId : null;
    }

    await loadHcaptcha();
    const widgetId = window.hcaptcha.render(container, {
      sitekey: HCAPTCHA_SITE_KEY,
      theme: document.documentElement.classList.contains("dark") ? "dark" : "light"
    });
    container.dataset.widgetId = String(widgetId);
    return widgetId;
  }

  function getCaptchaToken(container) {
    if (!container || !window.hcaptcha || !container.dataset.widgetId) {
      return "";
    }
    return window.hcaptcha.getResponse(container.dataset.widgetId);
  }

  function resetCaptcha(container) {
    if (container && window.hcaptcha && container.dataset.widgetId) {
      window.hcaptcha.reset(container.dataset.widgetId);
    }
  }

  function showMessage(form, text, type) {
    const message = form.querySelector("[data-zevyx-message]");
    if (!message) {
      return;
    }

    message.textContent = text;
    message.className = `${messageClass} ${type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/40 bg-destructive/10 text-destructive"}`;
    message.classList.remove("hidden");
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) {
      return;
    }
    button.disabled = busy;
    button.dataset.originalText = button.dataset.originalText || button.textContent.trim();
    button.textContent = busy ? "Pracuju..." : button.dataset.originalText;
  }

  async function postJson(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || "Neco se nepovedlo.");
    }
    return data;
  }

  function makeField(id, label, type, placeholder, name, autocomplete) {
    return `
      <div role="group" data-slot="field" data-orientation="vertical" class="${fieldClass}" data-invalid="false">
        <label data-slot="field-label" class="${labelClass}" for="${id}">${label}</label>
        <input data-slot="input" class="${inputClass}" id="${id}" type="${type}" placeholder="${placeholder}" name="${name}" autocomplete="${autocomplete || ""}" />
      </div>
    `;
  }

  function buildRegisterPanel(panel) {
    if (panel.dataset.zevyxBuilt === "true") {
      return;
    }

    panel.dataset.zevyxBuilt = "true";
    panel.innerHTML = `
      <div data-slot="card" class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div data-slot="card-header" class="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 text-center">
          <div data-slot="card-title" class="font-semibold text-xl">Zaregistruj se na server</div>
          <div data-slot="card-description" class="text-muted-foreground text-sm">Vytvoř si účet pro přihlášení na Minecraft server</div>
        </div>
        <div data-slot="card-content" class="px-6">
          <form class="flex flex-col items-center gap-6" data-zevyx-form="register">
            ${makeField("register-username", "Herní jméno", "text", "Hrac", "username", "username")}
            ${makeField("register-email", "E-mailová adresa", "email", "hrac@email.cz", "email", "email")}
            ${makeField("register-password", "Heslo", "password", "••••••••••", "password", "new-password")}
            <div class="flex flex-col gap-2 items-center w-full"><div data-zevyx-captcha></div></div>
            <div data-zevyx-message class="${messageClass}"></div>
            <button data-slot="button" data-variant="default" data-size="default" class="${buttonClass}" type="submit">Zaregistrovat se</button>
          </form>
        </div>
      </div>
    `;
  }

  function setupTabs() {
    const loginTab = document.querySelector('[aria-controls="radix-_R_pbsnqlb_-content-sign-in"]');
    const registerTab = document.querySelector('[aria-controls="radix-_R_pbsnqlb_-content-sign-up"]');
    const loginPanel = document.querySelector("#radix-_R_pbsnqlb_-content-sign-in");
    const registerPanel = document.querySelector("#radix-_R_pbsnqlb_-content-sign-up");

    if (!loginTab || !registerTab || !loginPanel || !registerPanel) {
      return;
    }

    buildRegisterPanel(registerPanel);

    function activate(which) {
      const isRegister = which === "register";
      loginTab.setAttribute("aria-selected", String(!isRegister));
      registerTab.setAttribute("aria-selected", String(isRegister));
      loginTab.dataset.state = isRegister ? "inactive" : "active";
      registerTab.dataset.state = isRegister ? "active" : "inactive";
      loginPanel.dataset.state = isRegister ? "inactive" : "active";
      registerPanel.dataset.state = isRegister ? "active" : "inactive";
      loginPanel.hidden = isRegister;
      registerPanel.hidden = !isRegister;
      renderVisibleCaptchas();
    }

    if (loginTab.dataset.zevyxTabReady !== "true") {
      loginTab.dataset.zevyxTabReady = "true";
      loginTab.addEventListener("click", () => activate("login"));
    }

    if (registerTab.dataset.zevyxTabReady !== "true") {
      registerTab.dataset.zevyxTabReady = "true";
      registerTab.addEventListener("click", () => activate("register"));
    }
  }

  function setupLoginForm() {
    const form = document.querySelector("#radix-_R_pbsnqlb_-content-sign-in form");
    if (!form || form.dataset.zevyxReady) {
      return;
    }

    form.dataset.zevyxReady = "true";
    form.dataset.zevyxForm = "login";

    const captchaSlot = form.querySelector(".flex.flex-col.gap-2.items-center.w-full > div");
    if (captchaSlot) {
      captchaSlot.setAttribute("data-zevyx-captcha", "");
    }

    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.insertAdjacentHTML("beforebegin", `<div data-zevyx-message class="${messageClass}"></div>`);
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const captcha = form.querySelector("[data-zevyx-captcha]");
      const hcaptchaToken = getCaptchaToken(captcha);
      if (!hcaptchaToken) {
        showMessage(form, "Potvrd hCaptchu.", "error");
        return;
      }

      setBusy(form, true);
      try {
        const data = await postJson("/api/login", {
          identifier: form.querySelector('[name="identifier"]')?.value || "",
          password: form.querySelector('[name="password"]')?.value || "",
          hcaptchaToken
        });
        showMessage(form, data.message || "Prihlaseni probehlo.", "success");
      } catch (error) {
        showMessage(form, error.message, "error");
        resetCaptcha(captcha);
      } finally {
        setBusy(form, false);
      }
    });
  }

  function setupRegisterForm() {
    const form = document.querySelector('[data-zevyx-form="register"]');
    if (!form || form.dataset.zevyxReady) {
      return;
    }

    form.dataset.zevyxReady = "true";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const captcha = form.querySelector("[data-zevyx-captcha]");
      const hcaptchaToken = getCaptchaToken(captcha);
      if (!hcaptchaToken) {
        showMessage(form, "Potvrd hCaptchu.", "error");
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
        resetCaptcha(captcha);
      } catch (error) {
        showMessage(form, error.message, "error");
        resetCaptcha(captcha);
      } finally {
        setBusy(form, false);
      }
    });
  }

  function setupForgotForm() {
    const form = document.querySelector("form");
    if (!form || form.dataset.zevyxReady || !document.title.toLowerCase().includes("zapomen")) {
      return;
    }

    form.dataset.zevyxReady = "true";
    form.dataset.zevyxForm = "forgot";
    const captchaSlot = form.querySelector(".flex.flex-col.gap-2.items-center.w-full > div");
    if (captchaSlot) {
      captchaSlot.setAttribute("data-zevyx-captcha", "");
    }

    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.insertAdjacentHTML("beforebegin", `<div data-zevyx-message class="${messageClass}"></div>`);
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const captcha = form.querySelector("[data-zevyx-captcha]");
      const hcaptchaToken = getCaptchaToken(captcha);
      if (!hcaptchaToken) {
        showMessage(form, "Potvrd hCaptchu.", "error");
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
        resetCaptcha(captcha);
      } finally {
        setBusy(form, false);
      }
    });
  }

  function renderVisibleCaptchas() {
    document.querySelectorAll("[data-zevyx-captcha]").forEach((container) => {
      if (container.offsetParent !== null) {
        renderCaptcha(container).catch(() => {});
      }
    });
  }

  ready(() => {
    function boot() {
      setupTabs();
      setupLoginForm();
      setupRegisterForm();
      setupForgotForm();
      renderVisibleCaptchas();
    }

    boot();
    window.addEventListener("load", boot);
    setTimeout(boot, 500);
    setTimeout(boot, 1500);

    const observer = new MutationObserver(() => {
      window.clearTimeout(observer.timer);
      observer.timer = window.setTimeout(boot, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
