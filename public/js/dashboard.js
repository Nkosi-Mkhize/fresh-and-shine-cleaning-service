let currentUser = null;

async function loadMe() {
  const response = await fetch("/api/me");
  const data = await response.json();
  if (!data.user) {
    location.href = "/account.html";
    return;
  }
  currentUser = data.user;
  document.querySelectorAll("[data-user-name]").forEach((node) => (node.textContent = currentUser.name));
  document.querySelectorAll("[data-user-email]").forEach((node) => (node.textContent = currentUser.email));
  document.querySelectorAll("[data-ref-code]").forEach((node) => (node.textContent = referralCode(currentUser)));
  const profileForm = document.querySelector("[data-profile-form]");
  if (profileForm) {
    profileForm.name.value = currentUser.name || "";
    profileForm.email.value = currentUser.email || "";
    profileForm.phone.value = currentUser.phone || "";
    profileForm.company.value = currentUser.company || "";
    profileForm.newsletter.checked = currentUser.newsletter !== false;
  }
}

function referralCode(user) {
  return `${(user.name || "FRESH").replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase()}${user.id.slice(0, 3).toUpperCase()}`;
}

function renderBookings(bookings) {
  const body = document.querySelector("[data-bookings-body]");
  const upcoming = document.querySelector("[data-upcoming-count]");
  if (!body) return;
  upcoming.textContent = bookings.filter((booking) => !["Completed", "Cancelled"].includes(booking.status)).length;
  if (!bookings.length) {
    body.innerHTML = `<tr><td colspan="6">No bookings yet. Start with a new cleaning booking.</td></tr>`;
    return;
  }
  body.innerHTML = bookings
    .map(
      (booking) => `
        <tr>
          <td><strong>${booking.reference}</strong><br><span class="badge">${booking.status}</span></td>
          <td>${booking.service}<br><small>${booking.propertyType}</small></td>
          <td>${booking.date}<br><small>${booking.time}</small></td>
          <td>${booking.city}</td>
          <td>R${Number(booking.estimatedTotal || 0).toLocaleString("en-ZA")}</td>
          <td>${booking.paymentStatus}</td>
        </tr>
      `
    )
    .join("");
}

async function loadBookings() {
  const response = await fetch("/api/my-bookings");
  const data = await response.json();
  renderBookings(data.bookings || []);
}

document.querySelectorAll("[data-dash-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-dash-tab]").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".dash-section").forEach((section) => section.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.dashTab}`)?.classList.add("active");
  });
});

document.querySelector("[data-profile-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector(".status-message");
  const payload = formToObject(form);
  payload.newsletter = form.newsletter.checked;
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) return showMessage(message, data.error || "Could not update profile.", "error");
  currentUser = data.user;
  showMessage(message, "Profile updated.");
});

document.querySelector("[data-location-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = formToObject(form);
  const locations = JSON.parse(localStorage.getItem("fs_locations") || "[]");
  locations.unshift({ ...payload, id: Date.now() });
  localStorage.setItem("fs_locations", JSON.stringify(locations));
  form.reset();
  renderLocations();
});

function renderLocations() {
  const target = document.querySelector("[data-locations-list]");
  if (!target) return;
  const locations = JSON.parse(localStorage.getItem("fs_locations") || "[]");
  target.innerHTML = locations.length
    ? locations.map((item) => `<div class="dash-card"><strong>${item.label}</strong><p>${item.address}, ${item.city}</p><span class="badge">${item.propertyType}</span></div>`).join("")
    : `<div class="dash-card"><strong>No saved locations</strong><p>Add a home, office, hotel, guesthouse, or Airbnb location to speed up your next booking.</p></div>`;
}

document.querySelector("[data-credit-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const amount = Number(form.amount.value);
  const message = form.querySelector(".status-message");
  if (amount < 20 || amount > 5000) return showMessage(message, "Please choose an amount between R20 and R5000.", "error");
  showMessage(message, "Credit purchase recorded. A payment link can be connected before launch.");
});

document.querySelector("[data-copy-ref]")?.addEventListener("click", async () => {
  const code = referralCode(currentUser);
  const link = `${location.origin}/booking.html?ref=${encodeURIComponent(code)}`;
  await navigator.clipboard.writeText(link);
  alert("Referral link copied.");
});

document.querySelector("[data-logout]")?.addEventListener("click", async () => {
  await postData("/api/logout", {});
  location.href = "/";
});

loadMe().then(() => {
  loadBookings();
  renderLocations();
});
