# Lifestyle App hardening notes

## What was added in this patch

- Private-beta allowlist via `INVITE_ONLY=true` and `ALLOWED_SIGNUP_EMAILS`
- Stronger password validation (12-128 chars, no spaces, no email in password)
- Global security middleware for:
  - security headers
  - `X-Robots-Tag: noindex`
  - same-origin mutation checks
  - auth gate for private pages
- Basic in-memory rate limiting for login, signup, and Google auth
- Safer `/api/state` validation and payload size cap
- Safer nutrition detail proxy that only allows `nutritionvalue.org`
- Removed verbose session logging
- Shorter default session TTL (14 days instead of 30)

## Render settings to change now

### App service env vars
Add these on Render for `lifestyle-app`:

- `PUBLIC_APP_URL=https://lifestyle-app-sbjx.onrender.com`
- `APP_URL=https://lifestyle-app-sbjx.onrender.com`
- `INVITE_ONLY=true`
- `ALLOWED_SIGNUP_EMAILS=mason.fleming000@gmail.com`
- `ALLOWED_ORIGINS=https://lifestyle-app-sbjx.onrender.com`
- `SESSION_TTL_DAYS=14`
- `HOST=lifestyle-app-sbjx.onrender.com`

Keep existing values for:

- `DATABASE_URL`
- `SESSION_COOKIE_NAME`
- `PUBLIC_GOOGLE_CLIENT_ID`

### Database networking
Your database currently allows inbound traffic from `0.0.0.0/0`.
Change that now.

Recommended:
- remove `0.0.0.0/0`
- use the internal database URL from the Render app only
- if you need local SQL access temporarily, add only your current IP/CIDR, not the whole internet

## Limits of this patch

- Rate limiting is in-memory, so it is best on a single instance and not ideal for horizontal scaling
- There is not yet email verification or MFA
- There is not yet account lockout persistence in the database
- There is not yet secure native storage because Capacitor is not added yet

## Next security upgrades after this

1. Email verification before first login
2. Reset-password flow with one-time tokens
3. Persistent DB-backed rate limiting / audit log table
4. Optional MFA for admin accounts
5. Capacitor secure storage + native deep-link hardening
