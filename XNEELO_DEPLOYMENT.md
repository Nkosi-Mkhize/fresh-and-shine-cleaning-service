# Xneelo Deployment Notes

This site is now prepared for ordinary Xneelo Web Hosting with PHP and MySQL.

## Upload

Upload the contents of the `docs` folder to the domain's `public_html` folder.

## Configure The API

On the server, copy:

```text
public_html/api/config.example.php
```

to:

```text
public_html/api/config.php
```

Then fill in:

- Xneelo MySQL database host, database name, username, and password
- PayFast merchant ID
- PayFast merchant key
- PayFast passphrase if one is enabled in PayFast
- `sandbox` as `true` while testing, then `false` when going live
- `base_url` as the final HTTPS domain
- a private `admin_token`

Do not commit or publicly share `api/config.php`.

## Database

The PHP API creates the required tables automatically on first use if the database user has `CREATE TABLE` permission.

If you prefer manual setup, import `database/schema.sql` into the Xneelo MySQL database.

## PayFast URLs

Use these in PayFast if you need to set/confirm them manually:

```text
Return URL: https://freshandshinecleaningservice.co.za/payment-success.html
Cancel URL: https://freshandshinecleaningservice.co.za/payment-cancelled.html
Notify URL: https://freshandshinecleaningservice.co.za/api/payfast/itn
```

The site also sends these URLs dynamically with each payment request.

## Testing

1. Keep PayFast `sandbox` set to `true`.
2. Submit a booking from `booking.html`.
3. Confirm you are redirected to PayFast sandbox checkout.
4. Complete a sandbox payment.
5. Check the admin page using your `admin_token`.
6. Switch `sandbox` to `false` only after the full booking and PayFast ITN flow works.
