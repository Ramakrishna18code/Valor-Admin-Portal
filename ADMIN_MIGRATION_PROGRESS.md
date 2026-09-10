# Stage 3A local Postman verification kit - 11 September 2026

- Added postman/Valor_Admin_Portal_Stage3_Workflow_Local.postman_collection.json and matching .postman_environment.json. Local-development API verification ONLY; origin is restricted to http://localhost:8081. No browser/UI acceptance is claimed.
- Import both JSON files with Postman Import, select the LOCAL ONLY environment, retain baseUrl=http://localhost:8081 and the supplied local administrator email default (change privately if necessary), then enter the SUPER_ADMIN password only as a private local secret environment value. All session, ID and run-state fields must start blank; no manual ID input is needed. Do not export populated environments, save response examples, or share console/run/network captures containing secrets.
- Start the existing local backend yourself with appropriate private configuration. Prerequisites: an eligible active customer with an active building/lift chain and an active technician. Run the entire collection using Collection Runner, one iteration, sequential request order; do not use isolated Send or resume midway. The first request clears stale tokens, IDs, candidates, paging/history snapshots and runBlocked, and generates a unique visible runId. Existing credentials are preserved locally.
- Fifteen primary requests cover health, administrator login, current user, directories, live asset selection, retained request creation, filtered request listing, initial detail, assignment, assignment detail, admin status update, changed detail and final integrity. Customer directories and request lists automatically page; technician directory pages as needed. Customer/building selections may advance to a different live eligible candidate while finding a complete lift chain. No fake assets, typed IDs or fabricated backend responses are used.
- Login uses email/password. All operational requests use the shared local bearer environment variable. The only mutation routes are POST /api/v1/service-requests, POST /api/v1/service-requests/{id}/assignments and POST /api/v1/service-requests/{id}/status. The admin-authorized ASSIGNED -> ACCEPTED status action uses the status route, not technician-only acceptance. The request remains ACCEPTED for audit with three distinct history events. No report creation, deletion or completion is attempted.
- Assertions validate 200/success/status envelopes, positive returned IDs, customer-building-lift relationships, exact create fields, request/list/detail mappings, active assignment ownership, immutable unique history, exact event growth and status notes. Password/hash/token fields are forbidden in operational responses; session token fields are permitted only in authentication responses and stored privately. No script logs sensitive values. An additional anonymous GET /api/v1/me tests the 401 envelope. Live role-based 403 is intentionally not claimed with the SUPER_ADMIN-only kit; existing automated portal tests cover 403 handling.
- Every failed primary response assertion marks runBlocked and stops collection execution. Missing customers, technicians, buildings or lifts produces an actionable prerequisite assertion. Fix the prerequisite and restart at 01; do not continue manually. A failed run may already have created a retained audit request; no automatic rollback/deletion occurs. Selected IDs and history snapshots exist only in the local environment at runtime. Clear them and session tokens after verification if no longer needed.
- Validation: both JSON files parse, all 30 scripts parse, 15 expected requests use local /api/v1 paths, template runtime/secret values are blank, and all 15 post-response scripts passed a simulated HTTP-failure stop check. Full portal npm test: 58 passed, zero failures/skips; npm run build: passed. No new dependencies or application changes. The collection has NOT been run against live MySQL.
- Remaining browser acceptance: observe directory search/pagination/selection, dependent asset resets, create/assignment/status controls and confirmations, rendered history/report/nullable states, validation and forbidden/error behavior, request routing, refresh persistence and console errors in the actual portal. API success alone does not establish rendering, browser console state or UI controls.
- Only these two new templates and this progress document are included. Existing README.md and any user-owned Postman files are preserved; Backend, migrations/schema, databases, other clients and website were not modified. No push.

# Admin Portal Stage 3A implementation - 11 September 2026

- Branch: existing authorized master; no branch operations or push. Stage 1/2 acceptance remains unchanged. Stage 3A implementation is complete with automated validation; live browser/MySQL verification is pending.
- Authority: published backend contract at https://raw.githubusercontent.com/Ramakrishna18code/Valor-Backend/fad7b60/BACKEND_API_CONTRACT.md, corroborated with local read-only workflow DTO/service inspection. Backend files were not modified.
- Directory pickers: GET `/api/v1/admin/customers` and `/api/v1/admin/technicians`, q search, page, size=10, active=true. Profile IDs come only from selected returned rows, never normal manually typed ID inputs. Customer status must also be ACTIVE. Phone/address and unrelated personal details are not rendered. Selection resets dependent building/lift choices.
- Asset relationships: existing GET `/api/v1/buildings` and `/api/v1/lifts` through Stage 2 services. Creation limits choices to active buildings owned by the selected customer profile and active lifts belonging to the selected building. Backend remains responsible for final eligibility checks.

| Screen action | Endpoint |
|---|---|
| Request list, status/priority filters and pagination | GET /api/v1/service-requests |
| Request detail, active assignment, history and historical report | GET /api/v1/service-requests/{id} |
| Create request with selected customerProfileId and liftId | POST /api/v1/service-requests |
| Assign/reassign selected technicianProfileId | POST /api/v1/service-requests/{id}/assignments |
| Submit supported next status and notes | POST /api/v1/service-requests/{id}/status |

- Existing centralized API/session handling provides envelopes, single-flight refresh, one retry, logout on failed refresh and distinct 401/403 handling. No duplicate fetch/token implementation or dependencies added. Failed loads clear results; failed mutations clear detail and require reload. No optimistic state changes or fabricated fallback records/counts.
- The documented transition graph filters UI actions only; backend responses determine actual status. PENDING assignment uses the assignment route, not a status shortcut. Admin ACCEPTED status uses the authorized status route, never the technician-only acceptance route. Reassignment and status writes require confirmation. Waiting/cancellation require notes; completion is offered only with a valid report tied to the accepted active assignment and is still validated by the backend. Advanced reassignment awaits technician acceptance before further progress.
- Request/report/assignment/history display whitelists response fields, handles null report/assignment/history, and preserves terminal reports. Reports are read-only. Directory and list stale requests are ignored after filter/navigation changes.
- Intentionally excluded: technician job routes, dedicated assignment acceptance endpoint, report creation/editing, notifications, emergency/dispatch/Kanban and all other deferred modules. Existing legacy module files remain unimported. No workflow staff-directory fallback or manually entered profile ID was connected.
- Validation: full `npm test` passed with 58 tests, zero failures/skips (41 existing plus 17 new workflow/API/view cases). `npm run build` passed. No lint/type-check scripts configured. Initial build detected non-UTF-8 encoding in the new component; corrected to UTF-8 and reran both commands successfully. Source scans found no obsolete workflow routes, direct fetch/session handling, token/password logging or technician-only route calls in the new active workflow code.
- Files: src/api/workflow.js, src/api/runtime.js, src/workflowModules.jsx, src/workflow.css, src/main.jsx, test/workflow.test.js, test/views.test.js and this progress record.
- Live verification: not performed. Tests use isolated fake transports and server-rendered React views; no claim of observed browser behavior or real-MySQL workflow success. Next: verify directory selection, retained request creation, assignment, status/history/report views against the running local backend before accepting Stage 3A live verification.
- Safety: unrelated README.md remains preserved/unstaged and excluded. No credentials, tokens, headers or private local records recorded. Backend, database schemas/migrations, valor_lift_db, Android, technician client/backend, website and other repositories were not modified; no database was accessed. No push.

## Historical Stage 1/2 records

Stage 2 statements deferring service workflow below describe that earlier stage; the Stage 3A implementation record above supersedes them for this scope only.

# Admin Portal Stage 2 implementation - 10 September 2026

- Branch: authorized `master`; no branch operations or push. Stage 1 remains accepted. Stage 2 implementation and live verification are complete; Stage 2 is accepted based on the user-confirmed manual observations recorded below.
- Scope: Buildings, Lifts, AMC contracts and backend-supported staff provisioning. Reuses the Stage 1 HTTP/session client; no duplicate token or refresh handling and no new dependencies.

| Screen action | Backend route (client adds `/api/v1`) |
|---|---|
| Buildings list/create | GET /buildings; POST /buildings |
| Buildings edit/deactivate | PUT /buildings/{id}; DELETE /buildings/{id} |
| Lifts list/create | GET /lifts; POST /lifts |
| Lifts edit/deactivate | PUT /lifts/{id}; DELETE /lifts/{id} |
| AMC list/create | GET /amc-contracts; POST /amc-contracts |
| AMC renewal | PUT /amc-contracts/{id}/renew |
| Staff creation/deactivation | POST /admin/users; DELETE /admin/users/{userId} |

- Asset forms whitelist backend DTO fields; preserve customerProfileId/buildingId during editing and reject ownership transfer. Lift requests contain no customerId. Optional values and dates remain nullable; healthScore is an integer 0-100. List requests reject malformed/null envelopes rather than inventing empty success; actual empty arrays show an empty state.
- Asset writes require ADMIN/SUPER_ADMIN in the portal. Deactivation requires explicit confirmation, waits for the backend and reloads authoritative rows; no optimistic removal or physical deletion claim. Errors clear visible list data and display validation/forbidden/backend states with retry. Backend authorization remains authoritative.
- AMC status, covered, asOfDate and dates are displayed directly from responses; no client-calculated authoritative coverage. Create and renewal schemas differ. Renewal start must follow the existing end date and end must not precede start. No unsupported AMC delete/edit endpoint is exposed.
- Staff screen requires SUPER_ADMIN. Creatable roles are ADMIN and TECHNICIAN; ADMIN omits profile fields. Technician fields follow the frozen contract: nullable employeeId/assignedArea/specialization, availability AVAILABLE/BUSY/OFF_DUTY/ON_LEAVE, default AVAILABLE when omitted. Form guidance requests these fields where available without inventing stricter backend requirements. Password is masked, never persisted/rendered in results and cleared on submission; response projection whitelists safe staff fields.
- Missing capabilities: no staff list/search/detail GET endpoint, no staff edit/reactivation, and no admin customer-directory GET endpoint in the frozen contract. Staff directory UI is explicitly disabled; deactivation requires a known staff user ID. Building creation uses a known customer profile ID; lift/AMC parent IDs come from the supported asset lists. Backend validates existence and active state. These lookup limitations do not silently trigger guessed requests.
- Removed active assumptions: legacy generic module wiring (/api/amcs, /api/admin, /api/customers), mock/fallback records, duplicate lift customer ownership, unsupported staff directory and unrestricted role selection. Retired adminModules.jsx remains unimported; it is not a fallback. The shell/style is retained, with focused form/table/error styling.
- Tests: full `npm test` passed with 41 tests, zero failures/skips (25 existing plus 16 Stage 2 cases). `npm run build` passed. No lint/type-check scripts are configured. Existing Node test runner and Vite server-render tests were reused. Coverage includes list/create/update/deactivate, AMC renewal, constraints/nulls, shared envelopes/401 refresh/403 errors, confirmations, staff constraints and password exclusion, and active-source regression scans.
- Files: src/api/assets.js, src/api/runtime.js, src/assetModules.jsx, src/assetModules.css, src/main.jsx, test/assets.test.js, test/views.test.js, and this record.
- Live verification: completed manually by the user against the running local backend and MySQL development database; see the acceptance record below. Automated tests use fake transport responses and server-rendered views and are separate evidence.
- Deferred: customer management/directory, service workflow/emergency/schedule, technician assignments, notifications, payments/invoices, inventory, reports/exports, roles/audit/settings and all unsupported staff capabilities. No deferred module was connected to guessed routes.
- Safety: README.md remains preserved/unstaged and excluded. Backend contract/progress/DTO sources were read only to reconcile exact supported fields. No backend changes, migration/database access, Android/technician/website changes or secret values committed.

## Stage 2 live verification accepted - 10 September 2026

Implementation: `6be90d4` on authorized `master`. The user confirmed these live browser results; this documentation follow-up does not claim independent browser observation by the assistant.

- Buildings: list, create, update and disposable deletion passed.
- Lifts: list, create, update and disposable deletion passed.
- AMC contracts: list, create and renewal passed.
- Staff: technician creation and deactivation passed; the password was not displayed after creation.
- The retained Building -> Lift -> AMC chain remained visible after page refresh. Retained/disposable IDs were not supplied and are not invented or required for this acceptance record.
- All observed API requests used `/api/v1` and returned successful responses. No red browser-console application errors were observed.
- The endpoint mapping above identifies the implemented operations. No additional live negative-case, concurrent-refresh or unsupported-action checks are claimed beyond the user's observations and existing automated coverage.
- Validation baseline remains 41 passing portal tests and a passing production build from the implementation commit. Tests/build were not rerun for this documentation-only change.
- No code defect was reported and no code fix was needed. Stage 2 live acceptance is complete. Unsupported staff directory/search/detail/edit/reactivation and other deferred modules remain outside this stage.
- Push readiness: implementation and this documentation commit are ready for an explicitly authorized push of `master`; no push was performed. No later stage was started.
- This follow-up changes only this progress document. The unrelated unstaged README.md modification is preserved and excluded. No backend, database, migration or other client repository was accessed or modified; `valor_lift_db` was untouched. No passwords, tokens, OTPs, headers or other credentials are recorded.

## Historical Stage 1 records

The earlier Stage 2-not-started statements below describe prior acceptance checkpoints and are superseded by the Stage 2 implementation record above.

# Admin Portal Stage 1 accepted - 10 September 2026

Final acceptance is based on the user's manual browser observations and the existing automated coverage, explicitly accepted as sufficient by the user.

- Manually confirmed: SUPER_ADMIN login succeeded; page refresh retained authentication; authenticated GET `/api/v1/me` and GET `/api/v1/admin/dashboard/summary` succeeded; dashboard rendered backend-provided data; logout cleared access to the authenticated session; browser console contained no red application errors.
- Automated coverage accepted: single-flight refresh, failed-refresh cleanup, ADMIN/SUPER_ADMIN admission, rejection of other roles, and distinct 401/403 handling. Portal: 25 tests passed and production build passed. Backend CORS commit: 100 tests passed and Maven package passed.
- Status: Stage 1 accepted. No further browser observation is an acceptance blocker under the user's decision. This does not claim separately observed Back-button behavior or live refresh-race testing; those earlier evidence boundaries remain historical facts.
- No new tests, API requests, source changes or database access were required for this documentation-only acceptance. No credentials, tokens or sensitive values recorded.
- Stage 2 has not begun. Deferred modules remain deferred. Push requires explicit authorization; nothing was pushed.

## Historical verification record

The final acceptance above supersedes the pending-check statements in the earlier evidence matrix below.

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

Stage 1 is now accepted based on the final manual observations and automated coverage stated above. Both repositories are ready for an explicitly authorized push. Stage 2 remains unstarted and deferred until separately requested.

All deferred modules remain deferred. README changes are preserved and excluded from commits. Backend code/configuration/migrations, databases, other clients and private environment values were not modified by this verification. Only public health/preflight and unauthenticated read requests were issued; no database was directly accessed or changed.
