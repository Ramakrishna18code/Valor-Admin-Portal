FROM node:22-alpine AS frontend-build

WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS backend-build

WORKDIR /workspace
COPY Backend/pom.xml Backend/pom.xml
COPY Backend/src Backend/src
COPY --from=frontend-build /workspace/dist Backend/src/main/resources/static
RUN mvn -q -f Backend/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=backend-build /workspace/Backend/target/valor-admin-backend-1.0.0.jar app.jar

EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]