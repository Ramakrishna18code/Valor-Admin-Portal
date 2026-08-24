# Valor Admin Backend

Spring Boot 3 REST API for the Valor Lift Services admin portal.

## Local development

Requirements: Java 21 and Maven 3.9+.

```bash
cd Backend
mvn spring-boot:run
```

The default development profile uses a file-backed H2 database at `Backend/data/valor`, so the portal works without installing MySQL. The same service accepts a MySQL JDBC URL through `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_DRIVER`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD`.

URLs:

- Health: `http://localhost:8081/api/health`
- Swagger: `http://localhost:8080/swagger-ui.html`
- H2 console (development only): `http://localhost:8080/h2-console`

Seeded admin login:

```text
Email: admin@valor.com
Password: Admin@123
```

The API returns the documented `{ success, message, data, timestamp, status }` wrapper. Admin JWTs are role-scoped (`ADMIN` or `SUPER_ADMIN`), passwords are BCrypt-hashed, and password fields are removed from all response DTOs. Change the seeded credentials and `VALOR_JWT_SECRET` before production use.


## Admin OTP verification

Admin sign-in is two-step: POST /api/admin/auth/login validates the password and creates a five-minute, single-use OTP challenge. The browser must then call POST /api/admin/auth/verify-otp with the challenge ID and six-digit code before a JWT is issued. OTP values are hashed at rest, never returned to the browser, and locked after five failed attempts. Configure an email/SMS/security provider to deliver the code. For local-only testing, set VALOR_OTP_DEV_MODE=true; this prints the code to the backend console and must remain false in production.
