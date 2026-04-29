# SWIFT — Confirmation Credit

Full-stack application: **NestJS backend** + **Angular 19 (Nx) frontend** + **PostgreSQL (AWS RDS)**.

---

## Table of Contents

- [Quick Start (Local Dev)](#quick-start-local-dev)
- [Docker Deployment (AWS EC2 Windows Server 2025)](#docker-deployment-aws-ec2-windows-server-2025)
- [How File Ingestion Works](#how-file-ingestion-works)
- [API Endpoints](#api-endpoints)
- [Folder Configuration](#folder-configuration)
- [Sample MT910 File](#sample-mt910-file)

---

## Quick Start (Local Dev)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in DB credentials and folder paths
npm run start:dev
# → http://localhost:3000
```

### 2. Frontend

```bash
cd frontend
npm install
npx nx serve mt910-app
# → http://localhost:4200
```

> The Angular dev server proxies `/api` → `http://localhost:3000`.

---

## Docker Deployment (AWS EC2 Windows Server 2025)

### Prerequisites

- AWS EC2 instance running **Windows Server 2025**
- **Docker Desktop** installed on the instance
- EC2 Security Group with inbound rules:

  | Port | Source | Purpose |
  |------|--------|---------|
  | 3389 | Your IP | RDP access |
  | 80 | 0.0.0.0/0 | HTTP (Angular frontend) |

- RDS Security Group allowing port **5432** from the EC2 instance's private IP

---

### Step 1 — Install Docker on EC2

RDP into the EC2 instance, open **PowerShell as Administrator**:

```powershell
# Option A — Chocolatey
choco install docker-desktop -y

# Option B — winget
winget install Docker.DockerDesktop
```

Restart the server after installation. Open Docker Desktop and ensure it is running in **Linux containers** mode (default).

---

### Step 2 — Copy Project Files to EC2

From your **local machine**, transfer the project:

```powershell
# Using SCP
scp -r .\swift-confirmation-credit ec2-user@<EC2-PUBLIC-IP>:C:\apps\

# Or zip and upload via RDP clipboard / S3
```

---

### Step 3 — Configure Environment

On the EC2 instance:

```powershell
cd C:\apps\swift-confirmation-credit

# Create .env from template
copy .env.example .env
notepad .env
```

Edit `.env` with your real values:

```dotenv
DB_HOST=database-1.ca1g6eaey1j8.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_NAME=postgres

# Windows paths for file ingestion folders
INPUT_FOLDER=D:/config/mt
PROCESSED_FOLDER=D:/config/mt/processed
REJECTED_FOLDER=D:/config/mt/rejected
```

> ⚠️ Use **forward slashes** (`/`) in Docker volume paths even on Windows.

Create the host folders that Docker will mount:

```powershell
New-Item -ItemType Directory -Force -Path "D:\config\mt"
New-Item -ItemType Directory -Force -Path "D:\config\mt\processed"
New-Item -ItemType Directory -Force -Path "D:\config\mt\rejected"
```

---

### Step 4 — Build and Start Containers

```powershell
cd C:\apps\swift-confirmation-credit
docker compose up -d --build
```

This will:
1. Build the **NestJS backend** image (Node 20 Alpine, multi-stage)
2. Build the **Angular frontend** image (Nx production build → nginx Alpine)
3. Start both containers connected on an internal network
4. Mount the host folders into the backend container

---

### Step 5 — Verify Deployment

```powershell
# Check both containers are running
docker compose ps

# Watch live logs
docker compose logs -f

# Test backend API
curl http://localhost/api/mt910/messages

# Open in browser
start http://<EC2-PUBLIC-IP>
```

Expected output of `docker compose ps`:

```
NAME               STATUS          PORTS
swift-backend      Up              (internal)
swift-frontend     Up              0.0.0.0:80->80/tcp
```

---

### Container Architecture

```
EC2 Windows Server 2025
└── Docker (Linux containers)
      ├── swift-frontend  [nginx:alpine]
      │     ├── Serves Angular static files on port 80
      │     └── Proxies /api/* → swift-backend:3000
      │
      └── swift-backend   [node:alpine]
            ├── NestJS REST API on port 3000 (internal only)
            ├── Connects to AWS RDS PostgreSQL
            └── Mounts host folders:
                  D:\config\mt          → /data/input
                  D:\config\mt\processed → /data/processed
                  D:\config\mt\rejected  → /data/rejected
```

---

### Useful Docker Commands

```powershell
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart services
docker compose restart

# Rebuild after code changes
docker compose up -d --build

# View backend logs
docker compose logs backend -f

# View frontend logs
docker compose logs frontend -f

# Open a shell inside the backend container
docker exec -it swift-backend sh
```

---

### Updating the Application

```powershell
cd C:\apps\swift-confirmation-credit

# Pull latest code (if using Git)
git pull

# Rebuild and restart
docker compose up -d --build
```

---

## How File Ingestion Works

1. Drop any `.txt` MT910 file into the **Input Folder** (`D:\config\mt`)
2. The backend file watcher detects the new file (500ms debounce)
3. File is **validated** — must contain `:20:` and `:32A:` fields
4. If valid → parsed, saved to PostgreSQL, moved to **Processed Folder**
5. If invalid or duplicate → moved to **Rejected Folder** with a log warning
6. Folder paths can be changed at runtime via the ⚙️ **Settings** button in the UI

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/mt910/messages` | List with filters: `search`, `currency`, `dateFrom`, `dateTo`, `page`, `limit` |
| GET | `/api/mt910/messages/:id` | Single message detail |
| DELETE | `/api/mt910/messages/:id` | Delete a message |
| GET | `/api/mt910/filters/meta` | Available currencies, min/max dates |
| GET | `/api/mt910/settings/folders` | Get current folder configuration |
| POST | `/api/mt910/settings/folders` | Update folder paths (restarts watcher) |

---

## Folder Configuration

Folder paths are stored in the database and can be changed live from the UI:

1. Click the ⚙️ **Settings** button in the top-right of the page
2. Update the **Input**, **Processed**, and **Rejected** folder paths
3. Click **Save & Apply** — the file watcher restarts automatically with the new paths

---

## Sample MT910 File

```
{1:F01BANKUS33AXXX0000000000}{2:I910BANKGB33XXXXN}{4:
:20:20231015-REF001
:21:RELATED-001
:25:GB29NWBK60161331926819
:32A:231015GBP150000,00
:50K:/GB29NWBK60161331926819
ORDERING CUSTOMER NAME
:52A:AAAAGB2L
:56A:BBBBGB22
:72:/ACC/ACCOUNT INFORMATION
-}
```
