# Valor Admin Portal

Valor Admin Portal is a responsive operations workspace for Valor Lift Services. It provides secure admin authentication, service operations, field scheduling, asset management, finance, inventory, notifications, reports, settings, and audit-friendly administration.

## Technology

- Frontend: React, Vite, Lucide icons, responsive CSS
- Backend: Java 21, Spring Boot 3.3, Spring Security, JWT, H2/MySQL-compatible persistence
- Authentication: email/password login with JWT
- Default local ports: frontend `5173`, backend `8081`

## Project structure

```text
src/
  main.jsx                 Application shell, routing, dashboard, login
  api/client.js            Authenticated API client and session storage
  api/services.js          Auth, dashboard, and service-request API methods
  adminModules.jsx         Generic CRUD pages and settings administration
  serviceRequestsPage.jsx  Service request operations page
  scheduleCalendar.jsx     Calendar scheduling, drag/drop, and task editing
  dashboardActions.jsx     Dashboard View/Edit/Delete actions and CSV export
  *.css                    Responsive page and component styles
Backend/
  src/main/java/com/valor   Spring Boot application, security, API, persistence
  src/main/resources         Application properties
  pom.xml                   Maven build definition
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

- Live API table with search, pagination, status, priority, technician, and service-type filters
- Create, View, Edit, Assign, Start, Complete, and Delete operations
- Emergency queue uses the same page with emergency filtering
- CSV export and responsive mobile drawers
- Only one three-dot menu can be open at a time

### Schedule

- Month calendar with day selection
- Drag tasks between dates
- Add and edit scheduled tasks
- Refresh and unscheduled-task support
- Responsive calendar and editor drawer

### Administration and assets

Customers, Buildings, Lifts, AMC Contracts, Technicians, Payments, Inventory, Notifications, Admin Users, Roles, Invoices, Transactions, Exports, and Audit Log are connected to the generic CRUD API.

Editable modules provide responsive View, Edit, and Delete menus. Read-only modules provide View only. Buildings and lifts resolve related customer/building IDs to readable names.

### Settings

Settings can be loaded and saved through the backend. The page includes:

- Company and support contact details
- Timezone, currency, and date format
- Default visit duration and maintenance reminders
- Session timeout and emergency response target
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

Authentication:

- `POST /api/auth/admin/login`
- `GET /api/admin/me`

Operations:

- `GET/POST /api/service-requests`
- `GET/PUT/DELETE /api/service-requests/{id}`
- `PUT /api/service-requests/{id}/assign?technicianId={id}`
- `PUT /api/service-requests/{id}/start`
- `PUT /api/service-requests/{id}/complete`
- `GET /api/admin/dashboard/service-jobs`
- `GET/POST /api/schedule`
- `PUT/DELETE /api/schedule/{id}`

Generic resources use the same REST pattern:

```text
GET    /api/{resource}
POST   /api/{resource}
GET    /api/{resource}/{id}
PUT    /api/{resource}/{id}
DELETE /api/{resource}/{id}
```

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
