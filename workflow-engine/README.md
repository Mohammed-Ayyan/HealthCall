# CareOps AI — Healthcare Workflow Engine Backend

Core operational backend responsible for telephony event ingestion, departmental workflow routing, SLA enforcement, and multi-tier task escalation.

---

## 1. Module Overview & Tech Stack

- **Runtime**: Node.js (v20+ / v22+)
- **Language**: TypeScript (v5.7+) with strict type checking
- **Database**: PostgreSQL
- **ORM / Query Engine**: Prisma ORM (v5.22+)
- **Execution / Tooling**: `tsx`, `typescript`

```
workflow-engine/
├── prisma/
│   ├── migrations/
│   │   ├── 20261013120000_init_workflow_engine/
│   │   │   └── migration.sql       # Initial PostgreSQL DDL migration
│   │   └── migration_lock.toml     # Provider lock (postgresql)
│   ├── schema.prisma               # Relational data schema & models
│   └── seed.ts                     # Database seed (departments, employees, baseline task)
├── src/
│   ├── config/
│   │   └── env.ts                  # Typed environment configuration
│   ├── db/
│   │   └── client.ts               # PrismaClient singleton instance
│   ├── errors/
│   │   └── appError.ts             # Standardized operational error classes
│   ├── middleware/
│   │   ├── errorHandler.ts         # Centralized error handler returning structured JSON
│   │   └── validateRequest.ts      # Zod validation middleware for body/query/params
│   ├── modules/
│   │   └── calls/
│   │       ├── calls.validation.ts # Zod schemas for Call CRUD
│   │       ├── calls.repository.ts # Prisma repository data access layer
│   │       ├── calls.service.ts    # Business logic layer with pagination
│   │       ├── calls.controller.ts # HTTP controller handlers
│   │       └── calls.routes.ts     # Express routes under /api/v1/calls
│   ├── app.ts                      # Express application factory & middleware setup
│   ├── types/
│   │   └── index.ts                # Domain types, DTOs & Prisma re-exports
│   └── index.ts                    # Server entry point with HTTP listener
├── tests/
│   └── calls.test.ts               # Automated tests for Call CRUD & validation
├── .env.example                    # Environment template
├── package.json                    # Scripts & dependencies
└── tsconfig.json                   # Strict TS compiler configuration
```

---

## 2. Relational Database Architecture

### Data Models & Constraints

| Entity | Primary Key | Key Foreign Keys & Attributes | Indexes |
|---|---|---|---|
| **`Call`** | `id` (UUID) | `patient_name`, `patient_phone`, `patient_mrn` (optional), `transcript`, `summary`, `detected_intent`, `priority` (Enum), `sentiment` (Enum), `call_timestamp`, `created_at`, `updated_at` | Primary Key |
| **`Department`** | `id` (VarChar 50) | `name`, `manager_id` (FK -> `Employee.id`, SetNull on delete), timestamps | Primary Key |
| **`Employee`** | `id` (UUID) | `department_id` (FK -> `Department.id`), `full_name`, `email` (Unique), `role` (Enum), `is_active`, `active_tasks_count` (Default 0), timestamps | `department_id`, `email` (Unique) |
| **`Task`** | `id` (UUID) | `call_id` (FK -> `Call.id`, Cascade), `department_id` (FK -> `Department.id`), `assigned_employee_id` (FK -> `Employee.id`, SetNull), `title`, `description`, `status` (Enum), `priority` (Enum), `escalation_level` (Enum), timestamps & deadlines | `status`, `deadline_at`, `call_id`, `department_id`, `assigned_employee_id` |
| **`TaskNote`** | `id` (UUID) | `task_id` (FK -> `Task.id`, Cascade), `author_id` (FK -> `Employee.id`, SetNull), `note`, `created_at` | `task_id`, `author_id` |
| **`TaskTimeline`** | `id` (UUID) | `task_id` (FK -> `Task.id`, Cascade), `actor_id` (UUID optional), `event_type`, `message`, `metadata` (JSONB), `created_at` | `task_id`, `actor_id` |

### Enums
- **`Priority`**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **`Sentiment`**: `POSITIVE`, `NEUTRAL`, `NEGATIVE`, `CRITICAL`
- **`EmployeeRole`**: `STAFF`, `MANAGER`, `ADMINISTRATOR`
- **`TaskStatus`**: `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- **`EscalationLevel`**: `NONE`, `MANAGER`, `ADMINISTRATOR`

---

## 3. Environment Setup

Create `.env` inside `workflow-engine/` by copying the template:

```bash
cp .env.example .env
```

Set the database connection string:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careops_db?schema=public"
PORT=4000
NODE_ENV=development
```

---

## 4. Setup, Migration & Seeding Commands

From within the `workflow-engine` directory:

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npm run db:generate
# Or: npx prisma generate
```

### 3. Run Database Migrations
To apply pending migrations to your PostgreSQL database:
```bash
# In development (with interactive migration tracker):
npm run db:migrate
# Or: npx prisma migrate dev

# In CI/CD or production environments:
npm run db:migrate:deploy
# Or: npx prisma migrate deploy
```

### 4. Seed the Database
Executes `prisma/seed.ts` to populate baseline departments and departmental staff:
```bash
npm run db:seed
# Or: npx tsx prisma/seed.ts
```

### 5. Inspect Data via Prisma Studio (Optional)
```bash
npm run db:studio
```

---

## 5. Seeded Baseline Entities

Running the seed script provisions:
- **Baseline Departments**:
  - `reception` — Reception Team (Manager: Mark Hansen)
  - `insurance` — Insurance Department (Manager: Michael Chang)
  - `customer_support` — Customer Support (Manager: David Ross)
  - `clinical_triage` — Clinical Triage (Manager: Dr. Robert Chen)
- **Default Employees** across all 3 roles (`STAFF`, `MANAGER`, `ADMINISTRATOR`) in each department.
- **End-to-End Exemplar Record**: An inbound urgent call, clinical triage task, nurse clinical note, and 3 timeline audit events demonstrating full relational integrity.

---

## 6. Phase 2: Call Management System (CRUD API)

### Endpoints

| Method | Endpoint | Description | Validation |
|---|---|---|---|
| `POST` | `/api/v1/calls` | Ingest and create a new Call record | Zod `createCallSchema` |
| `GET` | `/api/v1/calls` | List calls with pagination and filtering | `page`, `limit`, `patientPhone`, `detectedIntent`, `priority`, `sentiment` |
| `GET` | `/api/v1/calls/:id` | Retrieve single call with linked tasks | Valid UUID parameter |
| `PATCH` | `/api/v1/calls/:id` | Update call metadata | Valid UUID, at least 1 updatable field |
| `DELETE` | `/api/v1/calls/:id` | Delete call (cascades linked tasks) | Valid UUID parameter |
| `GET` | `/health` | Server health check | None |

### Running the Server & Tests

```bash
# Run tests
npm test

# Run development server
npm run dev

# Run production build
npm run build && npm start
```

---

## 7. Phase 3: Automatic Department Routing Engine

### Routing Rules Matrix

| Intent Category | Exemplar Intents | Target Department | Department ID | Default Priority | Target SLA Window |
|---|---|---|---|---|---|
| **Appointment** | `appointment`, `appointment_booking`, `reschedule`, `cancellation` | Reception Team | `reception` | `MEDIUM` | 4.0 hours |
| **Insurance** | `insurance`, `insurance_verification`, `prior_auth`, `claim_inquiry` | Insurance Department | `insurance` | `HIGH` | 2.0 hours |
| **Complaint / Billing** | `complaint`, `billing`, `billing_dispute`, `feedback` | Customer Support | `customer_support` | `MEDIUM` | 6.0 hours |
| **Emergency / Critical** | `emergency`, `critical_symptoms`, `triage`, `chest_pain` | Clinical Triage | `clinical_triage` | `URGENT` | 0.25 hours (15 min) |
| **Fallback** | Unrecognized / empty intents | Reception Team | `reception` | `HIGH` | 2.0 hours |

### Dry-Run Endpoint

- **Method**: `POST /api/v1/routing/evaluate`
- **Payload**:
  ```json
  {
    "intent": "appointment_booking",
    "priority": "MEDIUM",
    "sentiment": "NEUTRAL"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "matched_intent": "appointment",
    "department_id": "reception",
    "department_name": "Reception Team",
    "default_priority": "MEDIUM",
    "sla_hours": 4
  }
  ```

---

## 8. Phase 4: Action & Task Management Core

### Task State Machine Transition Rules

```
       ┌───────────┐
       │  PENDING  │──────────────┐
       └─────┬─────┘              │
             │                    │
             ▼                    ▼
       ┌───────────┐         ┌───────────┐
  ┌───►│ ASSIGNED  │────────►│ CANCELLED │ (Terminal)
  │    └─────┬─────┘         └───────────┘
  │          │ (requires          ▲   ▲
  │          │  assigned employee)│   │
  │          ▼                    │   │
  └─── ┌─────────────┐            │   │
       │ IN_PROGRESS │────────────┘   │
       └─────┬───────┘ (requires      │
             │          mandatory     │
             ▼          reason)       │
       ┌───────────┐                  │
       │ COMPLETED │──────────────────┘
       └───────────┘
        (Terminal)
```

| Source Status | Allowed Targets | Requirements / Invariants |
|---|---|---|
| `PENDING` | `ASSIGNED`, `CANCELLED` | Cannot skip to `IN_PROGRESS` or `COMPLETED`. |
| `ASSIGNED` | `IN_PROGRESS`, `CANCELLED`, `PENDING` | `IN_PROGRESS` requires an assigned employee. |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED` | `COMPLETED` requires an assigned employee; sets `completedAt`. |
| `COMPLETED` | *None* | Terminal state. No further transitions permitted. |
| `CANCELLED` | *None* | Terminal state. Requires a mandatory non-empty cancellation reason. |

### Task Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/tasks` | Create task linked to `callId` and `departmentId` |
| `GET` | `/api/v1/tasks` | List tasks with filters (`departmentId`, `assignedEmployeeId`, `status`, `priority`, `escalationLevel`, `isOverdue`) and pagination |
| `GET` | `/api/v1/tasks/:id` | Get full task details including department, assigned staff, notes, and audit timelines |
| `PATCH` | `/api/v1/tasks/:id/status` | Update task status with state machine governance (`{ status, reason?, actorId? }`) |
| `PATCH` | `/api/v1/tasks/:id/assign` | Assign, reassign, inter-department transfer, or auto-assign to least loaded employee |
| `PATCH` | `/api/v1/tasks/:id/priority` | Update task priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) with audit event |
| `POST` | `/api/v1/tasks/:id/notes` | Append internal operational note to task (`{ authorId, note }`) |
| `GET` | `/api/v1/tasks/:id/notes` | List chronological operational notes for task |

---

## 9. Phase 5: Employee Assignment, Transfer & Notes System

### Assignment & Transfer Governance
- **Department Boundary Enforcement**: Direct assignment requires the employee to belong to the task's current department.
- **Active Status Check**: Inactive employees cannot be assigned tasks.
- **Inter-Department Transfer**: Supports moving tasks between departments with optional reassignment or resetting to `PENDING`.
- **Auto-Assignment**: Deterministically discovers the active employee with the minimum `activeTasksCount` in the target department.
- **Atomic Concurrency Guarantee**: Decrementing previous employee workload and incrementing new employee workload occurs within an atomic database transaction.
- **Chronological Notes Ledger**: Appends internal clinical and operational notes linked to author employees and task timelines.

---

## 10. Phase 6: SLA Deadline Tracking Engine

### SLA Window Tiers by Priority
Dynamic deadline calculation automatically assigns task resolution windows upon creation or priority adjustment:

| Priority | SLA Window | Formula |
|---|---|---|
| `URGENT` | **15 minutes** | `createdAt + 15m` |
| `HIGH` | **2 hours** | `createdAt + 2h` |
| `MEDIUM` | **4 hours** | `createdAt + 4h` |
| `LOW` | **24 hours** | `createdAt + 24h` |

### Health Status State Matrix

| Health Status | Condition / Trigger | Task State |
|---|---|---|
| `ON_TRACK` | Active task with > 30 minutes remaining before deadline | Active (`PENDING`, `ASSIGNED`, `IN_PROGRESS`) |
| `NEAR_BREACH` | Active task with 0 to 30 minutes remaining before deadline | Active (`PENDING`, `ASSIGNED`, `IN_PROGRESS`) |
| `BREACHED` | Active task past its deadline (`referenceTime > deadlineAt`) | Active (`PENDING`, `ASSIGNED`, `IN_PROGRESS`) |
| `COMPLETED_ON_TIME` | Task completed before or precisely at deadline (`completedAt <= deadlineAt`) | Terminal (`COMPLETED`) |
| `COMPLETED_BREACHED` | Task completed after deadline (`completedAt > deadlineAt`) | Terminal (`COMPLETED`) |

### SLA Response Payload Structure
Appended to all `GET /api/v1/tasks` and `GET /api/v1/tasks/:id` responses:

```json
{
  "sla": {
    "createdAt": "2026-10-13T10:00:00.000Z",
    "assignedAt": "2026-10-13T10:05:00.000Z",
    "deadlineAt": "2026-10-13T12:00:00.000Z",
    "completedAt": null,
    "healthStatus": "ON_TRACK",
    "remainingMinutes": 60,
    "elapsedMinutes": 60
  }
}
```

### SLA Query Parameter Filtering
Filter active or completed tasks by real-time SLA health status:
- `GET /api/v1/tasks?slaStatus=ON_TRACK`
- `GET /api/v1/tasks?slaStatus=NEAR_BREACH`
- `GET /api/v1/tasks?slaStatus=BREACHED`
