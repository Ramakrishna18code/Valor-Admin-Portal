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

Install frontend dependencies:

```powershell
npm install
```

Start the backend from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-backend-safe.ps1
```

If port `8081` is occupied, stop the process using that port or set a different `PORT` and update the frontend API URL.

Start the frontend in a second terminal:

```powershell
npm run dev
```

Open `http://localhost:5173`.

## Local admin login

- Email: `admin@valor.com`
- Password: `Admin@123`


Additional seeded admin account:

- Email: `ops@valor.com`
- Password: `Admin@123`

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

Copy `.env.example` to `.env` when a custom backend URL is required:

```env
VITE_API_BASE_URL=http://localhost:8081
```

In Vite development mode, the default API is `http://localhost:8081`. In a production build with no `VITE_API_BASE_URL`, the frontend uses the deployed Valor backend URL. For a separately hosted backend, set `VITE_API_BASE_URL` before running `npm run build`.

For the deployed Vercel frontend, set `VITE_API_BASE_URL` to `https://valor-backend-rk.onrender.com`. The value is the backend host root; do not append `/api`, because frontend API paths already include that prefix.

## Backend configuration

The backend reads environment variables from `application.properties`:

```env
PORT=8081
VALOR_JWT_SECRET=replace-with-a-long-random-secret
VALOR_JWT_EXPIRATION_HOURS=12
VALOR_CORS_ORIGINS=http://localhost:5173,http://localhost:4173
SPRING_DATASOURCE_URL=jdbc:h2:file:./data/valor;MODE=MySQL;AUTO_SERVER=TRUE
```

For production:

- Set a long random `VALOR_JWT_SECRET`.
- Set `VALOR_CORS_ORIGINS` to the exact deployed frontend origin(s).
- Use a persistent database location or MySQL connection.
- Serve the application through HTTPS.
- Change all seeded passwords before exposing the application publicly.

## Build and run production artifacts

Frontend:

```powershell
npm run build
npm run preview
```

Backend:

```powershell
cd Backend
mvn -q -DskipTests package
java -jar target\valor-admin-backend-1.0.0.jar
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

Check port `8081`, start the backend script, and confirm that `http://localhost:8081/api/auth/admin/login` is reachable. If using another port, update both `PORT` and `VITE_API_BASE_URL`.

## Verification commands

```powershell
npm run build
cd Backend
mvn -q -DskipTests package
```

Both commands should complete successfully before pushing or deploying.
