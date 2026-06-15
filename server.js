import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ENV = globalThis.process?.env || {};
const PORT = Number(ENV.PORT || 4173);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const ADMIN_EMAIL = "info@freshandshinecleaningservice.co.za";
const ADMIN_SMS = "+27769485673";
const ADMIN_TOKEN = ENV.ADMIN_TOKEN || "fresh-admin";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

const dataFiles = {
  users: path.join(DATA_DIR, "users.json"),
  sessions: path.join(DATA_DIR, "sessions.json"),
  bookings: path.join(DATA_DIR, "bookings.json"),
  quotes: path.join(DATA_DIR, "quotes.json"),
  contacts: path.join(DATA_DIR, "contacts.json"),
  payments: path.join(DATA_DIR, "payments.json"),
  notifications: path.join(DATA_DIR, "notifications.json")
};

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  Object.values(dataFiles).forEach((file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]\n", "utf8");
  });
}

function readJson(file) {
  ensureDataFiles();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeJson(file, value) {
  ensureDataFiles();
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((pair) => pair.length === 2)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function clean(value) {
  return String(value || "").trim();
}

function requireFields(payload, fields) {
  const missing = fields.filter((field) => !clean(payload[field]));
  if (missing.length) {
    const err = new Error(`Missing required field: ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const test = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(test.hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    company: user.company || "",
    newsletter: user.newsletter !== false,
    createdAt: user.createdAt
  };
}

function getSessionUser(req) {
  const sessionId = parseCookies(req).fs_session;
  if (!sessionId) return null;
  const sessions = readJson(dataFiles.sessions);
  const session = sessions.find((item) => item.id === sessionId && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  const users = readJson(dataFiles.users);
  return users.find((user) => user.id === session.userId) || null;
}

function createSession(userId) {
  const sessions = readJson(dataFiles.sessions);
  const session = {
    id: crypto.randomBytes(32).toString("hex"),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
  };
  sessions.push(session);
  writeJson(dataFiles.sessions, sessions);
  return session;
}

function loadPricingData() {
  return JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, "pricing.json"), "utf8"));
}

function pricingSelection(payload) {
  const data = loadPricingData();
  const serviceName = clean(payload.service);
  const optionLabel = clean(payload.priceOption);
  for (const group of data.groups) {
    const service = group.services.find((item) => item.name === serviceName);
    if (!service) continue;
    const option = service.options.find((item) => item.label === optionLabel);
    if (!option) {
      const err = new Error("Selected price option is not available for this service.");
      err.status = 400;
      throw err;
    }
    const quantity = Math.max(Number(payload.quantity || 1), 1);
    return {
      group: group.title,
      service: service.name,
      option: option.label,
      unit: option.unit || "",
      quantity,
      unitPrice: Number(option.price),
      total: Number(option.price) * quantity
    };
  }
  const err = new Error("Selected service is not available in the FreshAndShine pricelist.");
  err.status = 400;
  throw err;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function luhnValid(value) {
  const digits = onlyDigits(value);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function cardBrand(number) {
  const digits = onlyDigits(number);
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  return "Card";
}

function parseExpiry(expiry) {
  const match = String(expiry || "").trim().match(/^(\d{2})\s*\/?\s*(\d{2}|\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2].length === 2 ? `20${match[2]}` : match[2]);
  if (month < 1 || month > 12) return null;
  const expiresAt = new Date(year, month, 0, 23, 59, 59);
  if (expiresAt < new Date()) return null;
  return { month, year };
}

function validatePayment(payload, amount) {
  const method = clean(payload.paymentMethod) || "Card";
  const allowedMethods = ["Card", "Google Pay", "Apple Pay"];
  if (!allowedMethods.includes(method)) {
    const err = new Error("Selected payment method is not supported.");
    err.status = 402;
    throw err;
  }

  let brand = method;
  let last4 = "";
  let cardholder = "";

  if (method === "Card") {
    const payment = payload.card || {};
    requireFields(payment, ["cardName", "cardNumber", "cardExpiry", "cardCvv"]);
    const digits = onlyDigits(payment.cardNumber);
    const cvv = onlyDigits(payment.cardCvv);
    const expiry = parseExpiry(payment.cardExpiry);
    if (!luhnValid(digits)) {
      const err = new Error("Card number is invalid. Use a valid card number or gateway test card.");
      err.status = 402;
      throw err;
    }
    if (!expiry) {
      const err = new Error("Card expiry is invalid or expired.");
      err.status = 402;
      throw err;
    }
    if (cvv.length < 3 || cvv.length > 4) {
      const err = new Error("Card security code is invalid.");
      err.status = 402;
      throw err;
    }
    brand = cardBrand(digits);
    last4 = digits.slice(-4);
    cardholder = clean(payment.cardName);
  }

  const payments = readJson(dataFiles.payments);
  const paymentRecord = {
    id: crypto.randomUUID(),
    reference: reference("PAY"),
    amount,
    currency: "ZAR",
    status: "Paid",
    mode: method === "Card" ? "Local card checkout" : `Local ${method} checkout`,
    brand,
    last4,
    cardholder,
    createdAt: new Date().toISOString()
  };
  payments.unshift(paymentRecord);
  writeJson(dataFiles.payments, payments);
  return paymentRecord;
}

function reference(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function postJson(url, payload, headers = {}) {
  const body = JSON.stringify(payload);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body
  });
  return { ok: response.ok, status: response.status, text: await response.text() };
}

async function sendEmailNotification(subject, html) {
  if (!ENV.RESEND_API_KEY) {
    return { channel: "email", status: "queued", message: "RESEND_API_KEY is not configured." };
  }

  try {
    const result = await postJson(
      "https://api.resend.com/emails",
      {
        from: ENV.NOTIFICATION_FROM || "Fresh and Shine <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject,
        html
      },
      { Authorization: `Bearer ${ENV.RESEND_API_KEY}` }
    );
    return { channel: "email", status: result.ok ? "sent" : "failed", providerStatus: result.status, providerResponse: result.text.slice(0, 500) };
  } catch (error) {
    return { channel: "email", status: "failed", message: error.message };
  }
}

async function sendSmsNotification(message) {
  const sid = ENV.TWILIO_ACCOUNT_SID;
  const token = ENV.TWILIO_AUTH_TOKEN;
  const from = ENV.TWILIO_FROM;

  if (!sid || !token || !from) {
    return { channel: "sms", status: "queued", message: "Twilio environment variables are not configured." };
  }

  const params = new URLSearchParams({ To: ADMIN_SMS, From: from, Body: message });
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    return { channel: "sms", status: response.ok ? "sent" : "failed", providerStatus: response.status, providerResponse: (await response.text()).slice(0, 500) };
  } catch (error) {
    return { channel: "sms", status: "failed", message: error.message };
  }
}

function recordNotification(type, record, results) {
  const notifications = readJson(dataFiles.notifications);
  notifications.unshift({
    id: crypto.randomUUID(),
    type,
    recordId: record.id,
    reference: record.reference,
    toEmail: ADMIN_EMAIL,
    toSms: ADMIN_SMS,
    results,
    createdAt: new Date().toISOString()
  });
  writeJson(dataFiles.notifications, notifications);
}

async function notifyAdmin(type, record) {
  const subject = type === "booking" ? `New booking ${record.reference}` : type === "quote" ? `New quote request ${record.reference}` : `New website enquiry ${record.reference}`;
  const html = `
    <h1>${subject}</h1>
    <p><strong>Name:</strong> ${record.name || record.contactName}</p>
    <p><strong>Email:</strong> ${record.email}</p>
    <p><strong>Phone:</strong> ${record.phone}</p>
    <p><strong>Service:</strong> ${record.service || "Custom quotation"}</p>
    <p><strong>Property:</strong> ${record.propertyType || record.hotelName || "Not supplied"}</p>
    <p><strong>Date:</strong> ${record.date || "Not supplied"} ${record.time || ""}</p>
    <p><strong>Notes:</strong> ${record.notes || record.message || "None"}</p>
  `;
  const sms = `${subject}: ${record.name || record.contactName}, ${record.service || record.hotelName || "Custom request"}, ${record.phone}, ${record.email}`;
  const results = await Promise.all([sendEmailNotification(subject, html), sendSmsNotification(sms.slice(0, 1500))]);
  recordNotification(type, record, results);
}

async function handleApi(req, res, pathname) {
  try {
    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, service: "Fresh and Shine", time: new Date().toISOString() });
    }

    if (req.method === "GET" && pathname === "/api/me") {
      return sendJson(res, 200, { user: publicUser(getSessionUser(req)) });
    }

    if (req.method === "POST" && pathname === "/api/register") {
      const payload = await getBody(req);
      requireFields(payload, ["name", "email", "password"]);
      const users = readJson(dataFiles.users);
      const email = clean(payload.email).toLowerCase();
      if (users.some((user) => user.email === email)) return sendJson(res, 409, { error: "An account with this email already exists." });
      const password = hashPassword(payload.password);
      const user = {
        id: crypto.randomUUID(),
        name: clean(payload.name),
        email,
        phone: clean(payload.phone),
        company: clean(payload.company),
        newsletter: payload.newsletter !== false,
        salt: password.salt,
        passwordHash: password.hash,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      writeJson(dataFiles.users, users);
      const session = createSession(user.id);
      return sendJson(res, 201, { user: publicUser(user) }, { "Set-Cookie": `fs_session=${encodeURIComponent(session.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600` });
    }

    if (req.method === "POST" && pathname === "/api/login") {
      const payload = await getBody(req);
      requireFields(payload, ["email", "password"]);
      const email = clean(payload.email).toLowerCase();
      const user = readJson(dataFiles.users).find((item) => item.email === email);
      if (!user || !verifyPassword(payload.password, user)) return sendJson(res, 401, { error: "Invalid email or password." });
      const session = createSession(user.id);
      return sendJson(res, 200, { user: publicUser(user) }, { "Set-Cookie": `fs_session=${encodeURIComponent(session.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600` });
    }

    if (req.method === "POST" && pathname === "/api/logout") {
      const sessionId = parseCookies(req).fs_session;
      if (sessionId) writeJson(dataFiles.sessions, readJson(dataFiles.sessions).filter((session) => session.id !== sessionId));
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": "fs_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" });
    }

    if (req.method === "POST" && pathname === "/api/password-reset") {
      const payload = await getBody(req);
      requireFields(payload, ["email"]);
      const record = { id: crypto.randomUUID(), reference: reference("RESET"), email: clean(payload.email).toLowerCase(), createdAt: new Date().toISOString() };
      recordNotification("password-reset", record, [{ channel: "email", status: "queued", message: "Password reset email provider can be configured in production." }]);
      return sendJson(res, 200, { ok: true, message: "If that email exists, a reset link will be sent." });
    }

    if (req.method === "PATCH" && pathname === "/api/profile") {
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "Please log in first." });
      const payload = await getBody(req);
      const users = readJson(dataFiles.users);
      const index = users.findIndex((item) => item.id === user.id);
      users[index] = {
        ...users[index],
        name: clean(payload.name) || users[index].name,
        phone: clean(payload.phone),
        company: clean(payload.company),
        newsletter: payload.newsletter !== false,
        updatedAt: new Date().toISOString()
      };
      writeJson(dataFiles.users, users);
      return sendJson(res, 200, { user: publicUser(users[index]) });
    }

    if (req.method === "POST" && pathname === "/api/bookings") {
      const payload = await getBody(req);
      requireFields(payload, ["name", "email", "phone", "service", "priceOption", "quantity", "propertyType", "date", "time", "city"]);
      const user = getSessionUser(req);
      const pricing = pricingSelection(payload);
      const estimatedTotal = pricing.total;
      const paymentRecord = validatePayment(payload, estimatedTotal);
      const booking = {
        id: crypto.randomUUID(),
        reference: reference("FSB"),
        userId: user ? user.id : null,
        name: clean(payload.name),
        email: clean(payload.email).toLowerCase(),
        phone: clean(payload.phone),
        service: pricing.service,
        pricingCategory: pricing.group,
        priceOption: pricing.option,
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        priceUnit: pricing.unit,
        propertyType: clean(payload.propertyType),
        address: clean(payload.address),
        city: clean(payload.city),
        rooms: clean(payload.rooms),
        frequency: clean(payload.frequency) || "Once-off",
        date: clean(payload.date),
        time: clean(payload.time),
        paymentMethod: paymentRecord.brand === "Google Pay" || paymentRecord.brand === "Apple Pay" ? paymentRecord.brand : "Card",
        paymentStatus: "Paid",
        paymentReference: paymentRecord.reference,
        cardBrand: paymentRecord.brand,
        cardLast4: paymentRecord.last4,
        status: "New",
        estimatedTotal,
        notes: clean(payload.notes),
        createdAt: new Date().toISOString()
      };
      const bookings = readJson(dataFiles.bookings);
      bookings.unshift(booking);
      writeJson(dataFiles.bookings, bookings);
      await notifyAdmin("booking", booking);
      return sendJson(res, 201, { booking, message: "Booking received. Fresh and Shine will confirm availability and payment details shortly." });
    }

    if (req.method === "POST" && pathname === "/api/quotes") {
      const payload = await getBody(req);
      requireFields(payload, ["contactName", "email", "phone", "hotelName", "service", "priceOption", "quantity", "rooms", "frequency", "city"]);
      const pricing = pricingSelection(payload);
      const quote = {
        id: crypto.randomUUID(),
        reference: reference("FSQ"),
        contactName: clean(payload.contactName),
        email: clean(payload.email).toLowerCase(),
        phone: clean(payload.phone),
        hotelName: clean(payload.hotelName),
        service: pricing.service,
        pricingCategory: pricing.group,
        priceOption: pricing.option,
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        priceUnit: pricing.unit,
        estimatedTotal: pricing.total,
        propertyType: clean(payload.propertyType),
        rooms: clean(payload.rooms),
        frequency: clean(payload.frequency),
        city: clean(payload.city),
        services: Array.isArray(payload.services) ? payload.services.map(clean).filter(Boolean) : [],
        notes: clean(payload.notes),
        status: "New",
        createdAt: new Date().toISOString()
      };
      const quotes = readJson(dataFiles.quotes);
      quotes.unshift(quote);
      writeJson(dataFiles.quotes, quotes);
      await notifyAdmin("quote", quote);
      return sendJson(res, 201, { quote, message: "Quote request received. We will prepare a custom hospitality cleaning proposal." });
    }

    if (req.method === "POST" && pathname === "/api/contact") {
      const payload = await getBody(req);
      requireFields(payload, ["name", "email", "phone", "message"]);
      const contact = {
        id: crypto.randomUUID(),
        reference: reference("FSC"),
        name: clean(payload.name),
        email: clean(payload.email).toLowerCase(),
        phone: clean(payload.phone),
        message: clean(payload.message),
        status: "New",
        createdAt: new Date().toISOString()
      };
      const contacts = readJson(dataFiles.contacts);
      contacts.unshift(contact);
      writeJson(dataFiles.contacts, contacts);
      await notifyAdmin("contact", contact);
      return sendJson(res, 201, { contact, message: "Thanks. We received your message and will reply soon." });
    }

    if (req.method === "GET" && pathname === "/api/my-bookings") {
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: "Please log in first." });
      const bookings = readJson(dataFiles.bookings).filter((booking) => booking.userId === user.id || booking.email === user.email);
      return sendJson(res, 200, { bookings });
    }

    if (req.method === "GET" && pathname === "/api/admin/records") {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.searchParams.get("token") !== ADMIN_TOKEN) return sendJson(res, 401, { error: "Invalid admin token." });
      return sendJson(res, 200, {
        bookings: readJson(dataFiles.bookings),
        quotes: readJson(dataFiles.quotes),
        contacts: readJson(dataFiles.contacts),
        payments: readJson(dataFiles.payments),
        notifications: readJson(dataFiles.notifications)
      });
    }

    if (req.method === "PATCH" && pathname === "/api/admin/status") {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.searchParams.get("token") !== ADMIN_TOKEN) return sendJson(res, 401, { error: "Invalid admin token." });
      const payload = await getBody(req);
      const file = payload.type === "quote" ? dataFiles.quotes : payload.type === "contact" ? dataFiles.contacts : dataFiles.bookings;
      const rows = readJson(file);
      const index = rows.findIndex((row) => row.id === payload.id);
      if (index === -1) return sendJson(res, 404, { error: "Record not found." });
      rows[index].status = clean(payload.status) || rows[index].status;
      rows[index].updatedAt = new Date().toISOString();
      writeJson(file, rows);
      return sendJson(res, 200, { record: rows[index] });
    }

    return sendJson(res, 404, { error: "API route not found." });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || "Something went wrong." });
  }
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, pathname);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    const fallback = path.join(PUBLIC_DIR, "404.html");
    res.writeHead(404, { "Content-Type": CONTENT_TYPES[".html"] });
    res.end(fs.existsSync(fallback) ? fs.readFileSync(fallback) : "Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
  });
  fs.createReadStream(filePath).pipe(res);
}

ensureDataFiles();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url.pathname);
    return;
  }
  serveStatic(req, res, decodeURIComponent(url.pathname));
});

server.listen(PORT, () => {
  console.log(`Fresh and Shine website running at http://localhost:${PORT}`);
});
