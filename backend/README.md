# Backend

Spring Boot backend for the Knowledge Sharing Portal.

## Run

```powershell
mvn spring-boot:run
```

The backend expects PostgreSQL and runs Flyway migrations automatically.

Default configuration is in `src/main/resources/application.yml`; override values with environment variables.

## Main Environment Variables

```text
DB_URL=jdbc:postgresql://localhost:5432/knowledge_portal
DB_USERNAME=postgres
DB_PASSWORD=postgres
JWT_SECRET=change-this-development-secret-at-least-32-characters
UPLOAD_DIR=uploads
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
CORS_ORIGINS=http://localhost:5173
```

## Build

```powershell
mvn test
```
