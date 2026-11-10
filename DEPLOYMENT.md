# Deployment Guide: Symposium

This guide provides two complete production deployment paths:
1. **Option 1: 100% Free Cloud Stack** (Render + Neon/Supabase + Vercel + Gemini Flash) — **Zero server cost, zero maintenance**.
2. **Option 2: Docker & Docker Compose** (VPS or Oracle Cloud Always Free VM) — **Full containerized stack with 1 command**.

---

## 🔑 1. Free AI Setup: Google Gemini Flash (Recommended for Production)

The backend natively supports **Google Gemini Flash / Flash-Lite** with automatic fallback to Ollama or built-in mock responses.

1. Go to [Google AI Studio](https://aistudio.google.com/) and click **Get API key** (completely free, no credit card required).
2. Copy your API key.
3. In your environment variables or `.env`, set:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   GEMINI_MODEL=gemini-1.5-flash
   ```
*(You can also use `gemini-2.0-flash` or `gemini-1.5-flash-8b`).*

---

## 🚀 Option 1: 100% Free Cloud Deployment (Zero Cost)

### Step 1: Free PostgreSQL Database (Neon or Supabase)
1. Sign up for free at [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Create a new database project named `symposium_portal`.
3. Copy your connection string. It will look like:
   ```
   postgresql://user:password@ep-xyz.region.neon.tech/symposium_portal?sslmode=require
   ```
4. For Spring Boot, format the JDBC URL as:
   ```
   jdbc:postgresql://ep-xyz.region.neon.tech/symposium_portal?sslmode=require
   ```
   *(Flyway migrations `V1` and `V2` will run automatically when the backend boots!)*

### Step 2: Deploy Spring Boot Backend to Render (Free)
1. Push your repository to GitHub or GitLab.
2. Sign up at [Render.com](https://render.com).
3. Click **New +** -> **Web Service**.
4. Connect your repository.
5. Configure the service:
   - **Name**: `symposium-backend`
   - **Language / Runtime**: **Docker**
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Context**: `backend`
   - **Instance Type**: **Free**
6. Add the following **Environment Variables**:
   - `DB_URL`: `jdbc:postgresql://<your-neon-host>/symposium_portal?sslmode=require`
   - `DB_USERNAME`: `<your-neon-user>`
   - `DB_PASSWORD`: `<your-neon-password>`
   - `JWT_SECRET`: `<generate-a-random-32+-character-string>`
   - `GEMINI_API_KEY`: `<your-gemini-api-key>`
   - `GEMINI_MODEL`: `gemini-1.5-flash`
   - `CORS_ORIGINS`: `https://<your-vercel-app>.vercel.app,http://localhost:5173`
7. Click **Create Web Service**.
8. Once deployed, Render will provide your public backend URL: `https://symposium-backend.onrender.com`.

### Step 3: Deploy Frontend to Vercel (Free)
1. Sign up at [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project** and import your repository.
3. Configure the build settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the **Environment Variable**:
   - `VITE_API_URL`: `https://symposium-backend.onrender.com/api`
5. Click **Deploy**.
6. Update the `CORS_ORIGINS` variable on Render to include your official Vercel domain.

---

## 🐳 Option 2: Docker & Docker Compose (VPS / Server / Local)

If you have a Linux VPS (DigitalOcean, Hetzner, AWS EC2, or Oracle Cloud Always-Free Compute VM):

### 1. Prerequisites
Ensure Docker and Docker Compose are installed:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

*(Tip: **Oracle Cloud Always Free** offers up to 4 ARM Ampere cores and 24 GB RAM free forever, which can easily run this entire Docker Compose stack).*

### 2. Configure Environment
Clone the repository and copy the environment file:
```bash
git clone <your-repo-url>
cd "Symposium"
cp .env.example .env
```

Edit `.env` with your secure credentials:
```bash
nano .env
```
Key variables to update:
```env
POSTGRES_PASSWORD=your_strong_db_password
JWT_SECRET=generate_a_random_32_character_secret
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Build & Run
Run the entire stack in detached mode:
```bash
docker compose up -d --build
```

### 4. Check Container Status & Logs
```bash
# Check running containers
docker compose ps

# View backend logs
docker compose logs -f backend

# View database logs
docker compose logs -f db
```

The services will be exposed at:
- **Frontend & App**: `http://<your-server-ip>` (Port 80)
- **Backend API**: `http://<your-server-ip>:8080/api`
- **PostgreSQL**: `localhost:5432`

---

## 🔒 Production Security Checklist
- [x] Change the default `JWT_SECRET` to a cryptographically secure random string with at least 32 characters.
- [x] Restrict `CORS_ORIGINS` to your production frontend domain.
- [x] Use SSL/TLS (`https://` and `sslmode=require`) for all external database connections.
- [x] Ensure file upload directory has write permissions and disk storage persistence.
