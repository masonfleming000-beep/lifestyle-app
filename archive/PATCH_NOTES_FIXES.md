# Navigation/Auth Stability Fixes

Implemented fixes for intermittent 502 errors and temporary signed-out state during page navigation.

## Changes made

1. **Shared database client**
   - Replaced per-request Postgres client creation with a shared singleton client in `src/lib/db.ts`.
   - Prevented `sql.end()` calls from closing the shared pool during normal request handling.

2. **More resilient session lookup**
   - Increased auth lookup timeout from 3000ms to 5000ms.
   - Added short-lived in-memory session caching and stale-cache fallback in `src/lib/auth.ts`.
   - Added cache invalidation on logout/session deletion/password reset.

3. **Reduced duplicate auth work per request**
   - `middleware` already loads the current user; API handlers now reuse `locals.currentUser` when available.
   - Updated `src/pages/api/me.ts` and `src/pages/api/state.ts` accordingly.

4. **Made `/api/me` lighter**
   - Removed internal HTTP fetch from `/api/me` to `/api/state`.
   - `/api/me` now reads profile state directly from the database.

5. **Reduced navigation-time write pressure**
   - Removed `beforeunload` persistence from shared page-state lifecycle and `src/pages/home.astro`.
   - Kept `pagehide`-based persistence and existing dedupe behavior.

6. **Stopped false signed-out UI on transient fetch failure**
   - Updated navbar auth loading behavior so a transient `/api/me` failure does not immediately flip the UI to logged out.

## Files changed
- `src/lib/db.ts`
- `src/lib/auth.ts`
- `src/pages/api/me.ts`
- `src/pages/api/state.ts`
- `src/lib/client/pageState.ts`
- `src/components/Navbar.astro`
- `src/pages/home.astro`

## Notes
- I could not run a full dependency-backed build in this environment because the project dependencies were not installed in the uploaded archive.
- The patch was applied carefully with code-level inspection and consistency checks.
