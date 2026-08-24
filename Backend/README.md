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


## Admin authentication

Admin sign-in validates the email and password, then returns a JWT for the active admin account.
