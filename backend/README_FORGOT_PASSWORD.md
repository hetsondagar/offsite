# Forgot Password — API Usage (Postman / curl)

This document explains how to test the password reset flow implemented in the backend.

Important: All responses are JSON. Endpoints are available under both `/auth` and `/api/auth` (e.g., `/auth/forgot-password` and `/api/auth/forgot-password`).

---

## Environment

Set these environment variables (recommended via `.env` or your shell):

- `GMAIL_USER` — Gmail address (used to send email)
- `GMAIL_PASS` — Gmail App Password (required)
- `EMAIL_FROM` — optional; defaults to `GMAIL_USER`
- `PORT` — optional; defaults to `3000`

Note: The backend logs a warning if Gmail credentials are missing and attempts to send email will likely fail.

---

## 1) Request a password reset

Endpoint:

POST /auth/forgot-password

Request body (JSON):

{
  "email": "user@example.com"
}

Example curl:

curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

Expected response (always generic):

Status: 200

{
  "success": true,
  "message": "If the email exists, a reset link has been sent"
}

Notes:
- The API never reveals whether the email exists.
- If the email exists, the server generates a secure token (crypto.randomBytes), hashes it (SHA-256) and stores the hashed token + expiry (15 minutes) in the user document. The raw token is sent in the reset email link only.

---

## 2) Reset the password using the token

Endpoint:

POST /auth/reset-password/:token

Replace `:token` with the RAW token you received in the email.

Request body (JSON):

{
  "newPassword": "NewStrongPassword123"
}

Example curl (replace `<TOKEN_HERE>`):

curl -X POST http://localhost:3000/auth/reset-password/<TOKEN_HERE> \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"NewStrongPassword123"}'

Success response:

Status: 200

{
  "success": true,
  "message": "Password has been reset successfully"
}

If the token is invalid or expired, response example:

Status: 400

{
  "success": false,
  "message": "Reset token is invalid or has expired",
  "code": "INVALID_TOKEN"
}

Notes:
- The server hashes the token from the URL and looks for a user with matching hashed token and expiry > now.
- On success, the password is updated (existing pre-save hook hashes passwords with bcrypt) and the reset token fields are cleared (single-use).

---

## Tips for testing locally

- Create a test user via the signup endpoint first:

POST /auth/signup
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "Test User",
  "role": "engineer"
}

- For development use one of these options to inspect the reset email:
  - Configure `GMAIL_USER` and `GMAIL_PASS` and check the Gmail inbox.
  - Use a testing SMTP service like Mailtrap or MailHog and set `GMAIL_USER`/`GMAIL_PASS` accordingly.

- The server logs when the email is sent, but **the raw token is not logged** (for security). Use an SMTP testing inbox to view the link and copy the token.

---

If you want, I can add a Postman collection file (.json) with the above requests included. Would you like that? ✅
