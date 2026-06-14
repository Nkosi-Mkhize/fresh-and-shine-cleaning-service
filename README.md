# Fresh and Shine Cleaning Service Website

Modern website, booking flow, quote requests, customer account portal, and admin lead inbox for Fresh and Shine Cleaning Service.

## Run Locally

```bash
npm start
```

Open:

- Website: `http://localhost:4173`
- Booking: `http://localhost:4173/booking.html`
- Quote requests: `http://localhost:4173/quote.html`
- Client account: `http://localhost:4173/account.html`
- Admin inbox: `http://localhost:4173/admin.html`

Default admin token: `fresh-admin`

## What Works Now

- Public SEO pages for home, services, booking, quote, about, contact, privacy, and terms.
- Customer registration and login with email/password.
- Password reset request endpoint.
- Booking form with service, property type, date, time, recurring frequency, extras, payment preference, and estimate.
- Hotel/custom quote request form.
- Contact form.
- Customer dashboard with profile, bookings, saved locations, payment options, credits, vouchers, and referral concept.
- Admin inbox for bookings, quotes, contact messages, and notification records.
- Local JSON storage in the `data` folder.

## Notifications

Bookings, quotes, and contact messages are saved immediately. The server also queues notification records.

For real email notifications to `info@freshandshinecleaningservice.co.za`, configure:

- `RESEND_API_KEY`
- `NOTIFICATION_FROM`

For real SMS notifications to the private admin number, configure:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM`

The public website displays only the email address, not the admin phone number.

## Payments

The booking form now uses a card checkout form. In this local build it:

- Validates card number with the Luhn check.
- Validates expiry date and CVV.
- Creates a local payment authorization record.
- Marks the booking as `Paid`.
- Saves only brand and last four digits, never the full card number or CVV.

Use a payment-gateway test card for local testing, for example `4242 4242 4242 4242` with a future expiry and any 3-digit CVV.

For production, do not process raw card numbers on your server. Connect hosted/tokenized card fields from Yoco, PayFast, Stripe, or another PCI-compliant gateway, then confirm payment through the gateway callback before confirming the booking.

## Production Notes

Before going live, replace local JSON storage with a production database such as Supabase or PostgreSQL, configure real email/SMS/payment credentials, set a strong `ADMIN_TOKEN`, and deploy behind HTTPS.
