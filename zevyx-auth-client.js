      registerTab.dataset.state = isRegister ? "active" : "inactive";
      loginPanel.dataset.state = isRegister ? "inactive" : "active";
      registerPanel.dataset.state = isRegister ? "active" : "inactive";
      loginPanel.hidden = isRegister;
      registerPanel.hidden = !isRegister;
      renderVisibleCaptchas();
    }

    loginTab.addEventListener("click", () => activate("login"));
    registerTab.addEventListener("click", () => activate("register"));
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
    setupTabs();
    setupLoginForm();
    setupRegisterForm();
    setupForgotForm();
    renderVisibleCaptchas();
  });
})();
