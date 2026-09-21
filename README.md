# Under The Influenza — API backend

This repository now includes a production-oriented Node.js API for the podcast company platform.

## Run locally

```bash
npm install
cp .env.example .env
# Change JWT_SECRET before using the application
npm run dev
```

Open http://localhost:3000. The API health check is available at http://localhost:3000/api/health.

## Included API capabilities

- SQLite persistence with WAL mode and foreign-key enforcement
- Password hashing (the server never stores plaintext passwords)
- OTP registration flow with expiry and one-time use
- JWT authentication and role checks
- Daily failed-login tracking and account lockout after three failures
- Login event records, audit logs, IP/user-agent capture, and security events
- Transaction creation plus mandatory approval by a different authorised user
- Internal messages
- Restricted invoice/document uploads (PDF, JPEG, PNG; 10 MB limit)
- Business-bank-link request boundary for a regulated banking provider
- WebAuthn integration boundary; raw fingerprint or face data is never accepted
- HTTP security headers, CORS, JSON limits, and rate limiting

## Important production notes

The current plain HTML interface remains a visual prototype and local demo. For deployment, update `script.js` to call the `/api` endpoints using the bearer token returned by login/register, rather than storing passwords and business records in `localStorage`. Do not expose `.env`, `storage/uti.sqlite`, or uploaded documents publicly.

`developmentOtp` is returned only outside production so local testing is possible. Configure an SMS provider and remove that development response before launch. Bank transactions must use a regulated provider's OAuth/API flow; never ask users to submit online-banking passwords to this application.

The seeded browser demo credentials are not backend credentials. Create a backend account using `/api/auth/request-otp`, then register with the returned local development OTP.
