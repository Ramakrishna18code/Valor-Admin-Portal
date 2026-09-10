# Admin Portal: authentication and dashboard migration

- Branch: existing `master`, explicitly authorized after inspection found no local `main`. No branch creation/switch and no push.
- Scope completed: central backend-origin configuration (`VITE_API_BASE_URL`, fallback `http://localhost:8081`), strict `/api/v1` client, ApiResponse data unwrapping including null, safe status-specific errors, administrator login and reload validation, refresh rotation, logout, protected portal shell and dashboard totals.
- Routes: POST `/api/v1/auth/login/admin`, GET `/api/v1/me`, POST `/api/v1/auth/refresh`, POST `/api/v1/auth/logout`, GET `/api/v1/admin/dashboard/summary`.
- Sessions: one sessionStorage record per tab containing access/refresh tokens only; no persisted password or trusted stored role. Reload uses `/me`; only ADMIN/SUPER_ADMIN may enter. Retired localStorage token is removed. Closing the tab ends local persistence; storage unavailable falls back to memory. Protect the browser from script injection: browser-held tokens are accessible to same-origin JavaScript.
- Refresh: a shared in-flight promise handles concurrent 401 responses; late responses reuse an already rotated token. Eligible requests retry once. Refresh failure clears the session and returns to login. Cleared or replaced sessions cannot be resurrected by pending refresh; old-session requests cannot replay under a new login. A 403 shows access denied without clearing an otherwise valid session. Logout always clears locally and reports when server revocation cannot be confirmed.
- Dashboard: totalCustomers, totalLifts, totalRequests, pendingJobs, completedJobs, emergencyJobs, totalTechnicians, totalAmcs. Retained-record totals are not labeled as today's counts. Loading, empty, access-denied, error and retry states are explicit. No guessed lists, fabricated charts, names, trends, notifications, schedules or success fallbacks remain in the active shell/dashboard.
- Removed active behavior: prefilled login credentials, fictitious signed-in identity, `/api/auth/admin/login`, `/api/admin/me`, `/api/admin/dashboard/service-jobs`, old reports-summary calls, local-only logout and automatic logout on every 403.
- Deferred: service requests/emergency queues, scheduling, technician assignments, customers, buildings, lifts, AMC management, payments/invoices, stock/transactions, notifications, reports/exports, staff users, roles, audit and settings. Existing deferred source files remain in Git but are not imported by the active entry point; their legacy API assumptions are not migrated or usable. Navigation shows a deferred notice with no data fetching or mutations. Migrate each module against the frozen backend contract before reconnecting it.
- Tests: repository initially had no test framework/script. Added Node's built-in test runner with no new dependencies, plus Vite SSR/React server-render checks using existing dependencies. Covers URLs, envelopes/errors, roles, reload, refresh races/rotation/retry limits, logout, guard rendering and dashboard mapping/states.
- Validation: `npm test` - 25 passed, zero failures/skips; `npm run build` - passed. No lint or type-check commands/configuration exist in package.json; neither is claimed as passed. Final rerun passed the same 25 tests and production build. Active source/bundle scans found no obsolete auth/dashboard URLs, fabricated operational records, literal JWTs or active console logging.
- Original implementation validation used fake fetch responses and server-rendered views. The dated verification record below supersedes the original live-verification status.
- Safety: backend read-only contract/progress inspection only; no backend edits, database access, other client/technician/website changes, or root README edits. An unrelated README modification observed during work is preserved and excluded. No credentials/tokens committed; .env remains private and unchanged.


## Stage 1 verification - 10 September 2026

Portal implementation: `2749c60` on authorized `master`. Backend CORS implementation: `295d2ef` on `main`. No branch operations or push. This follow-up changes documentation only; no new application defect was confirmed.

### Observed live and manually confirmed evidence

- Direct HTTP: GET `http://localhost:8081/api/v1/health` returned 200, success=true, data.status=UP.
- Direct HTTP: OPTIONS `/api/v1/auth/login/admin` for POST/content-type returned 200 with the exact matching Access-Control-Allow-Origin for both `http://localhost:5173` and `http://127.0.0.1:5173`. An unapproved origin returned 403 without that header.
- Direct HTTP: unauthenticated GET `/api/v1/me` and `/api/v1/admin/dashboard/summary` each returned 401 with success=false and envelope status=401.
- User manually confirmed successful SUPER_ADMIN portal login from `http://localhost:5173` after restarting the backend with `295d2ef`, plus healthy backend and working CORS. No credential or token values are recorded.
- Browser discovery returned no available browsers. No authenticated browser traffic, reload, Back navigation or console output was independently observed in this follow-up. No authenticated API calls were replayed using credentials.

### Requested checks and evidence boundaries

| Check | Result and evidence |
|---|---|
| 1. Admin login path | Source and automated test confirm POST `/api/v1/auth/login/admin`; successful login manually confirmed. Exact successful browser request was not independently captured. |
| 2. Session profile path | Source/tests confirm GET `/api/v1/me`; unauthenticated live request correctly returns 401. Authenticated browser request still needs observation. |
| 3. Role guard | Automated ADMIN/SUPER_ADMIN admission and CUSTOMER/TECHNICIAN rejection pass. SUPER_ADMIN login manually confirmed; other live account roles not exercised. |
| 4. Reload restoration | Storage recreation and `/me` restoration tests pass. Actual browser reload remains manual. |
| 5. Dashboard endpoint | Active source/tests use only GET `/api/v1/admin/dashboard/summary`; no job-list or legacy summary fetch. Live authenticated network capture remains manual. |
| 6. Real dashboard values | Strict mapping of all eight backend counts, legitimate zero/empty rendering and no fabricated fallback verified by tests/source scan. Live screen-to-response comparison remains manual. |
| 7. Unauthenticated protection | Guard/server-render tests pass; live protected HTTP calls return 401. Browser login-screen transition remains manual. |
| 8. Refresh endpoint | Tests/source confirm POST `/api/v1/auth/refresh`; not replayed against the live account. |
| 9. Single-flight refresh | Concurrent and delayed 401 tests prove one rotation and one retry per request. Browser network observation remains manual. |
| 10. Failed refresh | Automated failure clears session/notifies guard; stale refresh cannot resurrect it. Actual browser transition remains manual. |
| 11. Logout | Automated POST `/api/v1/auth/logout`, current rotated refresh-token use and local cleanup pass. Live browser logout remains manual. |
| 12. Browser Back after logout | Not observed; cannot claim a pass from unit tests. Must confirm protected content cannot reappear after logout/Back/reload. |
| 13. 401 versus 403 | Automated 401 refresh/cleanup and 403 session-preserving access denial pass. Live unauthenticated 401 confirmed; live authenticated UI 403 remains manual. |
| 14. Active-source safety scan | No obsolete `/api/admin` calls, legacy auth/report URLs, prefilled credentials, hardcoded signed-in identity, legacy fabricated metrics, literal JWTs or console logging found. Deferred files are not imported. Browser console still needs observation. |
| 15. Portal validation | `npm test`: 25 passed, zero failures/skips. `npm run build`: passed. No configured lint/type-check command exists. |
| 16. Backend validation | No backend code changed after CORS commit, so Maven was not rerun. `295d2ef` already passed clean test and clean package with 100 tests, zero failures/errors/skips. |
| 17. Documentation | This record and backend REBUILD_PROGRESS.md distinguish direct HTTP, user observation, automated tests and remaining manual checks. |

### Acceptance and next step

The implementation commits are validated candidates for an explicitly authorized push; neither repository was pushed. Full browser acceptance is still pending: authenticated reload, actual role-account rejection, dashboard response/display agreement, refresh concurrency/failure, logout/Back, unauthorized UI behavior and application console/network checks. Complete these observations before declaring the live Stage 1 checklist fully passed or migrating Stage 2 modules.

All deferred modules remain deferred. README changes are preserved and excluded from commits. Backend code/configuration/migrations, databases, other clients and private environment values were not modified by this verification. Only public health/preflight and unauthenticated read requests were issued; no database was directly accessed or changed.
