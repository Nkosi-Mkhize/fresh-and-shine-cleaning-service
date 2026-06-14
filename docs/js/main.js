const iconPaths = {
  sparkle: '<path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3z"/><path d="M19 15l.8 2.4L22 18l-2.2.6L19 21l-.8-2.4L16 18l2.2-.6L19 15z"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  bed: '<path d="M4 11V5a2 2 0 0 1 2-2h6a4 4 0 0 1 4 4v4"/><path d="M4 11h16a2 2 0 0 1 2 2v6M4 11v8M2 19h20"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/><path d="M17 9h3v12M8 7h2M8 11h2M8 15h2M13 7h1M13 11h1M13 15h1M3 21h18"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/>',
  mop: '<path d="M14 3l7 7"/><path d="M12 5l7 7"/><path d="M3 21l8-8 4 4-8 4H3z"/><path d="M11 13l3-3"/>',
  wallet: '<path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13"/><path d="M16 13h.01"/>',
  gift: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14"/><path d="M12 7H8.5a2.5 2.5 0 1 1 2.2-3.7L12 7zM12 7h3.5a2.5 2.5 0 1 0-2.2-3.7L12 7z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  location: '<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/>',
  broom: '<path d="M14 4l6 6"/><path d="M12 6l6 6"/><path d="M4 21c3-1 6-1 9 0l4-8-5-5-8 13z"/><path d="M8 17l5 2"/>',
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  check: '<path d="M20 6L9 17l-5-5"/>'
};

function svgIcon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.sparkle}</svg>`;
}

document.querySelectorAll("[data-icon]").forEach((node) => {
  node.innerHTML = svgIcon(node.dataset.icon);
});

const header = document.querySelector(".site-header");
document.querySelector("[data-mobile-toggle]")?.addEventListener("click", () => {
  header?.classList.toggle("open");
});

const activePath = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav-links a").forEach((link) => {
  const linkPath = link.getAttribute("href")?.split("/").pop() || "index.html";
  if (linkPath === activePath) link.setAttribute("aria-current", "page");
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll("[data-animate]").forEach((node) => observer.observe(node));

function showMessage(target, text, type = "success") {
  if (!target) return;
  target.textContent = text;
  target.className = `status-message show ${type}`;
}

async function postData(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function formToObject(form) {
  const data = new FormData(form);
  const payload = {};
  data.forEach((value, key) => {
    if (payload[key]) {
      payload[key] = Array.isArray(payload[key]) ? [...payload[key], value] : [payload[key], value];
    } else {
      payload[key] = value;
    }
  });
  return payload;
}

document.querySelectorAll("[data-contact-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = form.querySelector(".status-message");
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const result = await postData("/api/contact", formToObject(form));
      showMessage(message, result.message);
      form.reset();
    } catch (error) {
      showMessage(message, error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
});
