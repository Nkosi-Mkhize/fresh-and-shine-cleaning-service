const tabs = document.querySelectorAll(".tab");
const forms = document.querySelectorAll(".auth-form");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    forms.forEach((form) => form.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}`)?.classList.add("active");
  });
});

document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector(".status-message");
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    await postData("/api/login", formToObject(form));
    location.href = "dashboard.html";
  } catch (error) {
    showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-register-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector(".status-message");
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    await postData("/api/register", formToObject(form));
    location.href = "dashboard.html";
  } catch (error) {
    showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-reset-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector(".status-message");
  try {
    const result = await postData("/api/password-reset", formToObject(form));
    showMessage(message, result.message);
  } catch (error) {
    showMessage(message, error.message, "error");
  }
});

document.querySelector("[data-google-login]")?.addEventListener("click", () => {
  alert("Google sign-in needs a Google OAuth client ID before launch. Email login is fully functional in this local build.");
});
