# HealthCall (CareOps AI)

> **AI-Powered Healthcare Operations Intelligence Platform That Converts Patient Telephony & Clinical Conversations into Deterministic Hospital Workflows.**

HealthCall (CareOps AI) transforms chaotic, unstructured clinical phone calls, patient inquiries, and triage communications into structured, verified healthcare actions in real time. Designed for hospital command centers, physicians, intake coordinators, and operational administrators, HealthCall guarantees zero dropped patient commitments, instantaneous triage urgency rating, automated appointment scheduling, and continuous SLA compliance.

---

## Table of Contents
- [Problem Statement](#problem-statement)
- [Solution Architecture](#solution-architecture)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Prerequisites & System Requirements](#prerequisites--system-requirements)
- [Installation from Fresh Clone](#installation-from-fresh-clone)
- [Environment Variables Setup](#environment-variables-setup)
- [Single-Command Full-Stack Startup](#single-command-full-stack-startup)
- [Multi-Process Development Commands](#multi-process-development-commands)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Database Setup & Seed Data](#database-setup--seed-data)
- [1-Click Demo Profiles & Credentials](#1-click-demo-profiles--credentials)
- [Automated Testing, Linting & Build](#automated-testing-linting--build)
- [Project Structure](#project-structure)
- [Troubleshooting & Common Issues](#troubleshooting--common-issues)
- [Security & Privacy Governance](#security--privacy-governance)
- [Roadmap](#roadmap)

---

## Problem Statement

Modern healthcare facilities handle thousands of inbound phone calls, triage inquiries, and post-discharge consultations every day:

1. **Critical Information Trapped in Voice Audio**: Vital clinical details (such as post-operative fever, medication intolerances, or wound drainage) are buried inside lengthy voice conversations.
2. **Manual Documentation Bottlenecks**: Healthcare workers spend hours manually transcribing calls, leading to documentation backlogs, clinician burnout, and delayed care delivery.
3. **Dropped Commitments & Missed SLAs**: Verbal promises made over the phone (*"We will check with the doctor and call you back by noon"*) are frequently forgotten or lost in disconnected voicemail queues.
4. **Disjointed Departmental Handoffs**: Front desk intake, insurance prior-authorization desks, nursing triage, and clinical staff operate in silos without a centralized, synchronized operational ledger.

---

## Solution Architecture

HealthCall introduces an autonomous, real-time intelligence and workflow pipeline that captures and parses healthcare conversations into deterministic hospital outcomes:

- **Structured Clinical Summaries**: Auto-generates concise, medically grounded conversation summaries highlighting patient concerns and acute symptoms.
- **Transcript-Anchored Action Items**: Extracts explicit commitments and tasks verified against verbatim timestamps in patient speech.
- **Autonomous Department Routing**: Automatically classifies intents and dispatches tasks to the appropriate hospital division (Doctor Clinic, Front Desk Reception, Insurance Desk, or Review Queue).
- **End-to-End Workflow & SLA Management**: Synchronizes patient bookings, physician queues, and real-time operational metrics across an authenticated MongoDB backend.

```
Healthcare Conversation (Telephony Audio / Live Mic / Audio File Upload)
                                 ↓
           Faster-Whisper Dual-Channel Speech-to-Text
                                 ↓
            Ollama / Heuristic Clinical Extraction Engine
             (Symptoms, Chief Complaints, Urgency, Commitments)
                                 ↓
               Autonomous Role & Department Dispatch
     ┌───────────────────┬───────────────────┬───────────────────┐
     ▼                   ▼                   ▼                   ▼
Attending Doctor     Front Desk Intake   Prior-Auth Desk     Review Queue
 (Clinical Triage)   (Scheduling/Admin)    (Insurance)      (Fallback / Admin)
     └───────────────────┴───────────────────┴───────────────────┘
                                 ↓
           Real-Time MongoDB Persistence & Notification Dispatch
                                 ↓
         Live Solarpunk Hospital Dashboards (Next.js 16 App Router)
```

---

## Key Features

### 1. Telephony & AI Voice Intelligence Engine (FastAPI + Faster-Whisper + Ollama)
- **Live Call Simulator**: Interactive dual-channel call simulator with instant preset scenarios (Post-Op Emergency, Appointment Request, Insurance Verification, General Inquiry).
- **Microphone Recording & Audio File Upload**: Ingest `.wav`, `.mp3`, `.m4a`, `.ogg`, or `.flac` voice recordings directly in the browser.
- **Dynamic Local Inference**: Connects automatically to local Ollama models (`phi3:mini`, `qwen2.5:0.5b`, `llama3`) with automated, zero-latency clinical heuristic fallbacks.
- **Intelligent Role Routing**: Automatically assigns extracted tasks to Doctor (`URGENT`/`CLINICAL`), Receptionist (`SCHEDULING`/`ROUTINE`), Insurance Employee (`INSURANCE`/`FINANCIAL`), or Manager Review Queue with 5-minute duplicate task prevention.

### 2. Multi-Role Hospital Command Dashboards (Next.js 16 + Tailwind CSS)
- **Doctor / Clinician Station**: Live clinical queue populated directly from MongoDB appointments and incoming clinical call tasks, displaying assigned patient rosters, AI-synthesized chief complaints, triage urgency badges, and consultation trackers.
- **Reception & Intake Gateway**: Centralized front-desk intake ledger, doctor availability schedules, patient registration modals, and telephony action queues.
- **Insurance & Prior-Auth Desk**: Revenue cycle management view featuring prior-authorization ticket tracking, EDI clearinghouse status, and carrier compliance metrics.
- **Department Operations Manager Console**: Department-level oversight displaying active staff counts, team workload distribution, capacity metrics, and SLA escalation incident response.
- **Hospital Executive Master Console (Admin)**: Full governance suite with user provisioning, doctor profile creation, status toggling (Active/Suspended), and patient census analytics.
- **Patient Experience Portal**: Self-service portal where verified patients inspect their EHR medical records, schedule consultations with real database physicians, view doctor recommendations, and receive real-time appointment alerts.

### 3. Backend & Core Services (Node.js + Express + MongoDB)
- **Enterprise Authentication & JWT Engine**: Secure bcrypt password hashing, token validation, session persistence, and unified `/api/v1/auth/me` identity resolution.
- **Role-Based Access Control (RBAC)**: Strict server-side route guards enforcing granular permissions across 6 distinct hospital roles.
- **User Management System**: Complete administrative CRUD suite with role-scoping, department filters, and automatic doctor profile provisioning.
- **Live Appointment Engine**: End-to-end appointment lifecycle management (create, view, reschedule, cancel) connecting patients, physicians, and receptionists through MongoDB.
- **Task Management Engine**: Full MongoDB persistence for AI-extracted and manual clinical tasks (`/api/v1/tasks`, `/api/v1/tasks/from-call`).

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | **Next.js** | 16.4.0 (App Router) | Server-side rendering, layout primitives, dynamic routing |
| **UI Library** | **React** | 19.3.0 | Component rendering, hooks, concurrent features |
| **Styling** | **Tailwind CSS** | v4 | Modern styling tokens, responsive glassmorphism theme |
| **Icons & Motion** | **Lucide React / Framer Motion** | Latest | Clinical iconography, micro-interactions, smooth animations |
| **Charts** | **Recharts** | 3.10+ | Operational charts (Area, Donut, Bar) for hospital telemetry |
| **Backend Runtime** | **Node.js** | v20+ / v22+ | Asynchronous event-driven server runtime |
| **API Framework** | **Express.js** | 4.21+ | RESTful API routing, controller architecture, middleware pipeline |
| **Primary Database** | **MongoDB** | 6.0+ / 7.0+ | Document-oriented NoSQL database for healthcare records & tasks |
| **ODM / Modeling** | **Mongoose** | 8.8+ | Schema validation, relationships, compound indexes |
| **AI Runtime** | **Python** | 3.10+ / 3.11+ | Python backend running FastAPI |
| **AI Framework** | **FastAPI + Uvicorn** | 0.110+ | Asynchronous high-performance REST API for AI models |
| **Transcription** | **Faster-Whisper** | Latest | Dual-channel clinical speech-to-text transcription |
| **LLM Inference** | **Ollama** | Latest | Local, privacy-preserving LLM inference (`phi3:mini`, `llama3`) |
| **Workflow Engine** | **Prisma ORM + PostgreSQL** | 5.22+ | Relational telephony call event logs and SLA state tracking |
| **Containerization** | **Docker & Docker Compose** | v2+ | Multi-service orchestration |

---

## Prerequisites & System Requirements

Before running HealthCall locally, ensure you have the following installed:

1. **Node.js**: `v20.x` or `v22.x` ([Download Node.js](https://nodejs.org/))
2. **Python**: `3.10` or `3.11` ([Download Python](https://www.python.org/downloads/))
3. **MongoDB**: Local MongoDB community service (`mongodb://127.0.0.1:27017`) or Docker
4. **Git**: Git command-line client
5. *(Optional for Docker setup)*: **Docker Desktop** (Engine 24+ & Docker Compose v2+)
6. *(Optional for local AI LLM)*: **Ollama** ([Download Ollama](https://ollama.ai/)) - run `ollama pull phi3:mini`

---

## Installation from Fresh Clone

```bash
# 1. Clone the repository
git clone https://github.com/Mohammed-Ayyan/HealthCall.git
cd HealthCall

# 2. Run the automated full-stack dependency installer
npm run setup:all
```

The `npm run setup:all` command automatically installs:
- Root frontend dependencies (`npm install`)
- Backend dependencies (`npm install --prefix backend`)
- AI Engine Python packages (`cd ai-engine && pip install -r requirements.txt`)

---

## Environment Variables Setup

The repository includes pre-configured `.env.example` templates across all subprojects. 

### 1. Root / Frontend Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your Supabase credentials (for optional database features):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_anon_key_here
```

### 2. Backend Configuration
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Default local settings:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=mongodb://127.0.0.1:27017/careops
JWT_SECRET=careops_production_grade_jwt_secret_token_2026
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

### 3. AI Engine Configuration
Copy `ai-engine/.env.example` to `ai-engine/.env`:
```bash
cp ai-engine/.env.example ai-engine/.env
```
Default local settings:
```env
HOST=127.0.0.1
PORT=8000
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=phi3:mini
```

> [!WARNING]
> **Never commit real `.env` or `.env.local` files** containing real API keys, production tokens, or private database credentials to Git. All environment files are protected by `.gitignore`.

---

## Single-Command Full-Stack Startup

HealthCall supports zero-friction, one-command initialization across all operating systems:

### Option 1: Native Windows One-Click
Double-click `start.bat` or run in terminal:
```cmd
start.bat
```

### Option 2: Native macOS / Linux One-Click
```bash
chmod +x start.sh
./start.sh
```

### Option 3: Cross-Platform via npm
```bash
npm run dev:all
```
This launches the Backend (port 5000), AI Engine (port 8000), and Next.js Frontend (port 3000) concurrently in a single terminal with color-coded process logs.

---

## Multi-Process Development Commands

If you prefer running services in separate terminal windows:

```bash
# Terminal 1 - Express Backend & MongoDB Services
cd backend
npm run dev
# Running on http://localhost:5000

# Terminal 2 - FastAPI AI Engine
cd ai-engine
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
# Running on http://127.0.0.1:8000 (API Docs at http://127.0.0.1:8000/api/v1/docs)

# Terminal 3 - Next.js Frontend
npm run dev
# Running on http://localhost:3000
```

---

## Docker Compose Deployment

To run the complete production container stack (MongoDB, Backend, AI Engine, Frontend) in Docker:

```bash
docker compose up --build
```

Access services once the containers are healthy:
* **Web Application**: [http://localhost:3000](http://localhost:3000)
* **Backend API Health**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)
* **AI Engine Swagger Docs**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

To stop the containers:
```bash
docker compose down
```

---

## Database Setup & Seed Data

The backend includes an automatic seeding system that runs on startup whenever MongoDB collections are empty:

1. **Automatic Seeding**: Launching the backend (`node server.js` or `npm run dev`) automatically creates the core departments, doctor profiles, and demo users if they do not already exist.
2. **Manual Seeding**: To reset and re-seed the database at any time:
```bash
npm run seed
# or: cd backend && node scripts/seedDatabase.js
```

### Clean Real-Data Architecture
All hardcoded mock action items and fake calls have been completely removed. Dashboards remain clean on initialization and populate **only** when real calls are simulated, audio files are uploaded, or voice is recorded.

---

## 1-Click Demo Profiles & Credentials

For instant exploration and testing, click any demo profile button on the `/auth/login` page:

| Role | Demo Email | Password | Target Dashboard |
|---|---|---|---|
| **Doctor** (Attending Physician) | `dr.rahul@metrohealth.eco` | `password123` | `/doctor/dashboard` |
| **Receptionist** (Intake Lead) | `clara.o@metrohealth.eco` | `password123` | `/reception/dashboard` |
| **Patient** (EHR Care Recipient) | `rahul.sharma@email.com` | `password123` | `/patient/dashboard` |
| **Insurance** (Prior-Auth Desk) | `marcus.s@metrohealth.eco` | `password123` | `/insurance/dashboard` |
| **Department Manager** (Ops Lead) | `eleanor.v@metrohealth.eco` | `password123` | `/manager/dashboard` |
| **Hospital Admin** (Executive) | `admin@metrohealth.eco` | `password123` | `/admin/dashboard` |

---

## Automated Testing, Linting & Build

HealthCall features comprehensive automated test coverage across both Node.js and Python services:

```bash
# 1. Run Backend Unit & Integration Tests (122 tests)
cd backend
npm test

# 2. Run AI Engine Pytest Suite (118 tests)
cd ai-engine
pytest

# 3. Run Frontend Linter
npm run lint

# 4. Compile Production Frontend Bundle
npm run build
```

---

## Project Structure

```
HealthCall/
├── .agents/                             # Agent guidelines and Antigravity skills
├── .env.example                         # Root environment variable template
├── .gitignore                           # Git ignore configuration
├── Dockerfile                           # Frontend multi-stage Docker container
├── README.md                            # Complete platform documentation
├── ai-engine/                           # FastAPI AI Intelligence & Audio Engine (Port 8000)
│   ├── app/                             # Core FastAPI application
│   │   ├── api/v1/                      # Endpoints: /transcribe, /extract, /health
│   │   ├── core/                        # Configuration & logging settings
│   │   ├── models/                      # Pydantic schemas (TranscriptRequest, IntentOutput)
│   │   └── services/                    # Faster-Whisper & Ollama clinical intelligence
│   ├── tests/                           # 118 automated pytest test suites
│   ├── Dockerfile                       # AI Engine Docker container
│   ├── requirements.txt                 # Python dependencies
│   └── .env.example                     # AI Engine environment template
├── backend/                             # Express.js Core Healthcare Backend (Port 5000)
│   ├── appointments/                    # Appointment lifecycle controllers & routes
│   ├── auth/                            # Authentication controllers, service, JWT
│   ├── config/                          # MongoDB connection & role definitions
│   ├── doctors/                         # Physician roster controllers & availability
│   ├── middleware/                      # JWT auth verification, RBAC guards, errors
│   ├── models/                          # Mongoose models: User, Doctor, Patient, Appointment, Task
│   ├── patients/                        # Patient management endpoints & MRN generation
│   ├── scripts/                         # Database initialization & seed scripts
│   ├── tasks/                           # Task ingestion, clinical routing & duplicate prevention
│   ├── tests/                           # 122 automated unit & integration tests
│   ├── users/                           # User governance controllers & endpoints
│   ├── server.js                        # HTTP server entry point
│   ├── Dockerfile                       # Backend Docker container
│   ├── package.json                     # Backend dependencies & test scripts
│   └── .env.example                     # Backend environment template
├── docker-compose.yml                   # Multi-container Docker Compose definition
├── docs/                                # Technical specifications & architectural diagrams
├── public/                              # Static media assets & solarpunk illustrations
├── src/                                 # Next.js 16 Frontend Application (Port 3000)
│   ├── app/                             # Next.js App Router (Multi-role dashboards)
│   │   ├── admin/dashboard/             # Hospital executive master console
│   │   ├── auth/login/                  # Role-based login gateway with 1-click profiles
│   │   ├── doctor/dashboard/            # Physician clinical queue
│   │   ├── insurance/dashboard/         # Prior-authorization & RCM desk
│   │   ├── manager/dashboard/           # Department operations command
│   │   ├── patient/dashboard/           # Patient self-service experience portal
│   │   └── reception/dashboard/         # Front-desk intake & scheduling
│   ├── features/                        # Role-specific components & services
│   │   ├── ai-intelligence/             # Live Call Simulator & audio upload components
│   │   ├── doctor/                      # Doctor queue table, patient brief modal
│   │   ├── insurance/                   # Claims ledger & timeline visualizer
│   │   ├── platform/                    # Global authContext, sessionStore, api clients
│   │   └── workflow/                    # Kanban boards & dynamic task services
│   ├── shared/                          # Reusable UI primitives (Buttons, Cards, Modals)
│   └── utils/supabase/                  # Supabase client helpers & session middleware
├── start.bat                            # Windows 1-click full-stack launcher
├── start.sh                             # macOS / Linux 1-click full-stack launcher
└── workflow-engine/                     # Relational Telephony Event Engine (Prisma/PostgreSQL)
```

---

## Troubleshooting & Common Issues

### 1. Port Collisions (Port 3000, 5000, or 8000 already in use)
- **Port 3000**: Another Next.js or Node process is running. Terminate it or set `PORT=3001` in your environment.
- **Port 5000**: Another backend service is bound. Check with `netstat -ano | findstr 5000` (Windows) or `lsof -i :5000` (macOS/Linux) and terminate the process.
- **Port 8000**: AI Engine port collision. Change `PORT=8001` in `ai-engine/.env` and update `AI_ENGINE_URL` in `backend/.env`.

### 2. MongoDB Connection Refused (`connect ECONNREFUSED 127.0.0.1:27017`)
- Ensure your MongoDB community service is running:
  - Windows: Open Services (`services.msc`) and verify `MongoDB Server` is Started.
  - Linux: `sudo systemctl status mongod` (or `sudo systemctl start mongod`).
  - Docker: `docker run -d -p 27017:27017 --name mongodb mongo:7`

### 3. Python Virtual Environment / Module Not Found in `ai-engine`
- Ensure Python 3.10+ is installed:
  ```bash
  cd ai-engine
  python -m venv .venv
  # Windows:
  .venv\Scripts\activate
  # macOS/Linux:
  source .venv/bin/activate
  pip install -r requirements.txt
  ```

### 4. Ollama Model Not Installed
- If you wish to use local Ollama LLM extraction instead of the built-in clinical heuristic fallback:
  ```bash
  ollama serve
  ollama pull phi3:mini
  ```
  If Ollama is not running, the AI Engine gracefully falls back to deterministic rule-based clinical NLP.

---

## Security & Privacy Governance

1. **Zero Secret Leakage**: All API keys, database credentials, and session secrets are stored in `.env` files protected by `.gitignore`. Real credentials are never checked into source control.
2. **Cryptographic Authentication**: All user passwords stored in MongoDB are hashed using `bcryptjs` with salt rounds.
3. **Role-Based Access Control (RBAC)**: All API routes strictly validate the JWT bearer token and enforce user role permissions via server-side middleware.
4. **Data Isolation**: Patients can only query their own medical records (`/api/v1/patients/me`). Requests to other patient records are denied with `403 Forbidden`.
5. **Simulated Clinical Data**: All clinical data in the demo platform is synthesized and privacy-compliant for development and evaluation.

---

## Roadmap

1. **AI Telephony Streaming (Q1 2027)**: WebRTC/SIP trunk ingestion for automated two-channel patient call transcription via Whisper-v3.
2. **Clinical Entity Recognition**: Fine-tuned BioBERT / ClinicalNLP pipeline to extract ICD-10 diagnosis codes and CPT procedural codes from speech.
3. **Autonomous Prior-Authorization Bridges**: Direct HL7 / FHIR integration to dispatch extracted surgical requests straight to major insurance clearinghouses.
4. **Predictive Hospital Load Analytics**: Time-series forecasting for emergency intake surges and clinician capacity balancing.
