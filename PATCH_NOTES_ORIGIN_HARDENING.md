# Origin hardening patch

## What changed
- Fixed strict origin validation so it now safely supports:
  - `APP_URL` and `PUBLIC_APP_URL` as comma-separated lists
  - `ALLOWED_ORIGINS` as additional trusted web origins
  - reverse-proxy headers like `x-forwarded-host` and `x-forwarded-proto`
  - `Referer` fallback when browsers omit `Origin`
  - same-origin browser requests with missing `Origin` but `Sec-Fetch-Site: same-origin|none`
  - native app origins like `capacitor://localhost` and `ionic://localhost`
- Added structured rejection logging in middleware with `requestId` for production debugging.
- Kept CSRF protections in place by continuing to reject untrusted cross-origin POST/PUT/PATCH/DELETE requests.

## New optional env vars
- `NATIVE_ALLOWED_ORIGINS`
- `PUBLIC_NATIVE_ALLOWED_ORIGINS`

Example:
```env
ALLOWED_ORIGINS=https://hublifeapp.com,https://www.hublifeapp.com
NATIVE_ALLOWED_ORIGINS=capacitor://localhost,ionic://localhost
```

## Why this is safer than disabling origin checks
This patch broadens trust only to explicitly configured or same-origin cases and keeps clear rejection behavior for unknown origins.
