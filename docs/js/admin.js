let adminToken = localStorage.getItem("fs_admin_token") || "";

const tokenInput = document.querySelector("[data-admin-token]");
if (tokenInput) tokenInput.value = adminToken;

function row(record, type) {
  return `
    <tr>
      <td><strong>${record.reference}</strong><br><span class="badge">${type}</span></td>
      <td>${record.name || record.contactName || "-"}<br><small>${record.email}<br>${record.phone}</small></td>
      <td>${record.service || record.hotelName || "General enquiry"}<br><small>${record.propertyType || ""}</small></td>
      <td>${record.city || "-"}<br><small>${record.date || ""} ${record.time || ""}</small></td>
      <td>${record.status || "New"}</td>
      <td>${new Date(record.createdAt).toLocaleString("en-ZA")}</td>
    </tr>
  `;
}

async function loadAdmin() {
  const token = tokenInput.value.trim();
  localStorage.setItem("fs_admin_token", token);
  const message = document.querySelector("[data-admin-message]");
  const body = document.querySelector("[data-admin-body]");
  try {
    const response = await fetch(`/api/admin/records?token=${encodeURIComponent(token)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load records.");
    const rows = [
      ...(data.bookings || []).map((item) => row(item, "booking")),
      ...(data.quotes || []).map((item) => row(item, "quote")),
      ...(data.jobApplications || []).map((item) => row(item, "job application")),
      ...(data.contacts || []).map((item) => row(item, "contact"))
    ];
    body.innerHTML = rows.length ? rows.join("") : `<tr><td colspan="6">No records yet.</td></tr>`;
    showMessage(message, `Loaded ${rows.length} records.`);
  } catch (error) {
    showMessage(message, error.message, "error");
  }
}

document.querySelector("[data-admin-load]")?.addEventListener("click", loadAdmin);
if (adminToken) loadAdmin();
