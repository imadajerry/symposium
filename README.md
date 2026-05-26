# Knowledge Sharing Portal

Full-stack learning portal with a React/Vite frontend and a Java Spring Boot backend. The app supports role-based access, subjects/classes, syllabus upload, Ollama-assisted content generation, subject Q&A, LLM dialogs, understanding analytics, and lightweight student peer threads.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Backend: Java 21, Spring Boot 3, Spring Security, JDBC
- Database: PostgreSQL with Flyway migrations
- LLM: Ollama-compatible local model API
- Auth: JWT bearer tokens
- File storage: local disk for v1

## Prerequisites

- Node.js and npm
- Java 21
- Maven 3.9+
- PostgreSQL 15+
- Ollama running locally if you want live LLM generation

## Backend Setup

Create a PostgreSQL database:

```powershell
createdb knowledge_portal
```

Run the backend:

```powershell
cd backend
mvn spring-boot:run
```

Default backend URL:

```text
http://localhost:8080/api
```

Useful environment variables:

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

Flyway creates the schema automatically on backend startup. Demo users are seeded when the database is empty:

```text
Student: alex@student.com / student123
Teacher: sarah@quickquery.com / teacher123
Admin: admin@quickquery.com / admin123
```

## Ollama Setup

Install/pull a model:

```powershell
ollama pull llama3.1
ollama serve
```

If Ollama is unavailable, syllabus processing still stores fallback generated content with `ready_for_review` status so the workflow remains testable.

## Frontend Setup

Install dependencies:

```powershell
cd frontend
npm install
```

Create `.env.development` or update the existing file:

```text
VITE_API_URL=http://localhost:8080/api
VITE_APP_ENV=development
VITE_ENABLE_DEBUG=true
```

Run the frontend:

```powershell
cd frontend
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

## Implemented Backend APIs

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/classes`
- `POST /api/classes`
- `GET /api/subjects`
- `POST /api/subjects`
- `POST /api/subjects/{subjectId}/enrollments`
- `POST /api/subjects/{subjectId}/syllabi`
- `GET /api/subjects/{subjectId}/syllabi`
- `POST /api/subjects/{subjectId}/materials`
- `GET /api/subjects/{subjectId}/materials`
- `GET /api/subjects/{subjectId}/generated-content`
- `PATCH /api/generated-content/{contentId}`
- `POST /api/syllabi/{syllabusId}/regenerate`
- `GET /api/subjects/{subjectId}/questions`
- `POST /api/subjects/{subjectId}/questions`
- `POST /api/questions/{questionId}/replies`
- `GET /api/subjects/{subjectId}/conversations`
- `POST /api/subjects/{subjectId}/conversations`
- `POST /api/conversations/{conversationId}/messages`
- `GET /api/peer-threads`
- `POST /api/peer-threads`
- `POST /api/peer-threads/{threadId}/replies`
- `POST /api/subjects/{subjectId}/understanding`
- `GET /api/subjects/{subjectId}/understanding/me`
- `GET /api/subjects/{subjectId}/analytics/understanding`

## Verification

Frontend type check:

```powershell
cd frontend
npx tsc -b
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Backend tests/build:

```powershell
cd backend
mvn test
```

## Current Limitations

- PDF and image text extraction are placeholders. Add Apache PDFBox and OCR when richer document ingestion is needed.
- LLM processing is synchronous for v1. Move syllabus processing to a background job queue before production use.
- Local disk file storage is suitable for development only.
- Peer threads are intentionally minimal and do not include advanced moderation or real-time updates.
- Generated content requires teacher approval before students see it as approved material.
