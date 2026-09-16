# Valor Admin Portal

Valor Admin Portal is a responsive operations workspace for Valor Lift Services. It provides secure admin authentication, service operations, field scheduling, asset management, notifications, settings, and payment operations backed by the canonical Valor API.

## Technology

- Frontend: React, Vite, Lucide icons, responsive CSS
- Backend: Java 21, Spring Boot 3.3, Spring Security, JWT, H2/MySQL-compatible persistence
- Authentication: email/password login with JWT
- Default local ports: frontend `5173`, backend `8081`

## Project structure

```text
src/
  main.jsx                 Application shell, routing, dashboard, login
  api/client.js            Authenticated canonical /api/v1 API client and session storage
  api/services.js          Auth, dashboard health, and summary methods
  api/*.js                 Customer, asset, workflow, visit, notification, and settings services
  customerModules.jsx      Customer management
  workflowModules.jsx      Service requests and emergency queue
  scheduleCalendar.jsx     Service Visit calendar and change-request handling
  technicianAssignments.jsx Technician assignment/reassignment
  settingsModule.jsx       Persisted Admin settings
  *.css                    Responsive page and component styles
```

## Requirements

- Node.js 20 or newer
- npm
- Java 21
- Maven 3.9 or newer

## Local development

Start the backend first from `D:\RKKKK\Valor-Backend`. It should be available
at `http://localhost:8081`.

Copy the frontend environment template once:

```powershell
Copy-Item .env.example .env
```

Install frontend dependencies:

```powershell
npm install
```

Start the frontend:

```powershell
cd D:\RKKKK\Valor-Admin-Portal
npm run dev
```

Open `http://localhost:5173`.

## Local admin login

Use the local SUPER_ADMIN account configured by the backend dev bootstrap. The
default email in the backend `.env.example` is `admin@valor.local`; the password
is your private local value in `D:\RKKKK\Valor-Backend\.env`.

## Frontend features

### Dashboard

- Live KPI and service-job responses from the backend
- Refresh and CSV export
- View, Edit, and Delete action menus
- Responsive detail and edit dialogs
- View-all navigation to operational modules

### Service Requests

- Live API table with pagination, status and priority filters
- Create, detail/read, technician assignment/reassignment, lifecycle status updates, request attachments, and customer feedback visibility
- Emergency queue uses the same page with emergency filtering
- Completion is backend-authoritative and requires a valid technician report; the Admin portal does not create technician reports

### Schedule

- Month calendar with day selection
- Add and edit scheduled visits using backend service requests and assigned technicians
- Technician selection uses the active accepted assignment for the selected service request
- Refresh and unscheduled-task support
- Responsive calendar and editor drawer

### Administration and assets

Customers, Buildings, Lifts, AMC Contracts, Service Requests, Emergency Queue,
Schedule/Service Visits, Technician Assignments, Notifications, Staff
provisioning, Settings, and Payments use canonical `/api/v1` backend services.

Customer creation sends the backend-supported identity and profile fields:
email or phone, temporary password, full name, alternate phone, company name,
and address. Building creation selects an active customer from the backend
customer directory instead of requiring a manually typed profile ID. AMC
creation selects a lift/customer context, uses the Basic Maintenance, Standard
AMC, or Premium AMC plan dropdown, defaults the start date to today, defaults
the end date to a 12-month term, and displays the backend-generated contract
number after save.

Invoices, Inventory, Inventory Transactions, Reports, Exports, Roles and
Permissions, and Audit Log remain deferred and are not connected to active
runtime APIs. The Payments module is preserved from Phase 1B.1 and remains
active.

### Settings

Settings can be loaded and saved through the backend. The page includes:

- Company and support contact details
- Timezone, currency, and date format
- Default visit duration and maintenance reminders
- Emergency response target
- Email and SMS notifications
- JWT-authenticated admin access
- Automatic service-request assignment

### Global controls

- Top search opens a working search field and routes service searches to Service Requests
- Notifications button opens Notifications
- User menu displays the signed-in account and securely logs out

## API configuration

The portal reads the backend origin from `.env` through Vite:

```env
VITE_API_BASE_URL=http://localhost:8081
```

In Vite development mode, the client also falls back to `http://localhost:8081`
if `VITE_API_BASE_URL` is omitted. Set `VITE_API_BASE_URL` before running
`npm run build` when targeting a separately hosted backend.

For the deployed Vercel frontend, set `VITE_API_BASE_URL` to `https://valor-backend-rk.onrender.com`. The value is the backend host root; do not append `/api`, because frontend API paths already include that prefix.

## Backend configuration

Backend configuration lives in `D:\RKKKK\Valor-Backend\.env`. For local
development, keep `CORS_ALLOWED_ORIGINS` aligned with the portal origin
`http://localhost:5173`.

## Build and run production artifacts

Frontend:

```powershell
npm run build
npm run preview
```

Backend:

```powershell
cd D:\RKKKK\Valor-Backend
mvn test
```

Set deployment environment variables before starting the backend. Build the frontend again whenever `VITE_API_BASE_URL` changes because Vite embeds that value at build time.

## Main API endpoints

The active portal client uses the canonical backend contract in
`D:\RKKKK\Valor-Backend\BACKEND_API_CONTRACT.md`. `VITE_API_BASE_URL` is the
backend origin only; `src/api/client.js` appends `/api/v1`.

Key active groups:

- `POST /api/v1/auth/login/admin`
- `GET /api/v1/me`
- `GET /api/v1/health`
- `GET /api/v1/admin/dashboard/summary`
- `/api/v1/admin/customers/**`
- `/api/v1/buildings`, `/api/v1/lifts`, `/api/v1/amc-contracts`
- `/api/v1/service-requests/**`
- `/api/v1/admin/service-visits/**`
- `/api/v1/admin/visit-change-requests/**`
- `/api/v1/admin/settings`
- `/api/v1/notifications`
- `/api/v1/payments`, `/api/v1/payments/{id}/refunds`
- `/api/v1/admin/payments/reconciliation`

## Phase 1B payments

The active Payments module is wired to the Phase 1B backend APIs. It lists
backend payment records, shows invoice and Razorpay identifiers, requests full or
partial refunds, reloads refund status from the backend, and displays basic
reconciliation issues. Refunds remain backend/gateway authoritative; the UI does
not mark a payment refunded just because an admin clicked the refund action.

Live browser workflow verification against a signed-in admin account was not
completed in this checkpoint because no browser surface was available to the
automation tool. Automated tests, production build, dev-server HTTP load,
backend health, admin login, dashboard summary, customer paging, and settings
read probes passed against the local backend.

## Troubleshooting

### Access denied after pushing or redeploying

1. Log out, or clear the old local token in the browser console:

   ```js
   localStorage.removeItem('valor_access_token')
   ```

2. Sign in again.
3. Confirm the account role is `ADMIN` or `SUPER_ADMIN`.
4. Confirm the deployed frontend was built with `VITE_API_BASE_URL=https://valor-backend-rk.onrender.com`.
5. Confirm the backend `VALOR_CORS_ORIGINS` contains the deployed frontend origin.
6. Hard-refresh the browser after deployment.

The backend normalizes both `ADMIN`/`SUPER_ADMIN` and `ROLE_ADMIN`/`ROLE_SUPER_ADMIN` JWT role formats. Invalid or forbidden frontend sessions are cleared automatically so the user can sign in again.

### Backend appears offline

Check port `8081`, start the backend from `D:\RKKKK\Valor-Backend`, and confirm
that `http://localhost:8081/api/v1/health` is reachable. If using another port,
update both backend `PORT` and portal `VITE_API_BASE_URL`.

## Verification commands

```powershell
npm run build
cd D:\RKKKK\Valor-Backend
mvn test
```

Both commands should complete successfully before pushing or deploying.
