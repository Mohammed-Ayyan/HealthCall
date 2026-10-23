# CareOps AI — Healthcare Workflow and Task Management Engine

## 1. Overview & Purpose
The **Healthcare Workflow and Task Management Engine** provides an enterprise-grade operational backbone for the CareOps AI platform. In modern hospital operations, incoming patient inquiries, post-discharge instructions, medical record requests, and clinical escalations require coordinated collaboration across disparate departments (Reception, Clinical Team, Insurance, Billing, and Executive Administration).

This module delivers:
- **MongoDB Persistence**: Strict data modeling with indexing on departmental queues, assignees, patient records, and priorities.
- **Strict Role-Based Access Control (RBAC)**: Complete isolation ensuring patients view only their own records, clinicians inspect clinical queues, and managers maintain departmental oversight.
- **Deterministic State Machine**: Lifecycle validation preventing invalid state transitions (`CREATED` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED` → `CLOSED`).
- **Real-Time Frontend Bridge**: Seamless integration powering doctor follow-ups, front-desk intake actions, executive team capacity metrics, and Kanban workflow management.
- **AI-Ready Metadata Hooks**: Direct schema support for auto-generated tasks extracted from telephony and ambient call recordings (`createdByType: AI_SYSTEM`, `aiMetadata: { callId, transcriptSnippet, confidenceScore }`).

---

## 2. Architecture & Data Flow

```
[Inbound Patient Call / Intake]
             │
             ▼
[AI Extraction / Staff Entry]
             │
             ▼
POST /api/v1/tasks ──────► [Task Controller & Validator]
                                     │
                                     ▼
                          [Task Service (RBAC & State Machine)]
                                     │
                                     ▼
                              [MongoDB Tasks]
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
[Doctor Portal]              [Reception Portal]           [Manager Console]
Clinical Follow-ups         Front-Desk Call Actions      Team Capacity & SLA
```

---

## 3. Database Model: Task Schema

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | `String` | Yes | Concise operational title (3-200 chars). |
| `description` | `String` | No | Operational details, instructions, or notes. |
| `department` | `Enum` | Yes | `RECEPTION`, `CLINICAL`, `INSURANCE`, `ADMINISTRATION`. |
| `priority` | `Enum` | Yes | `LOW`, `MEDIUM`, `HIGH`, `URGENT` (Default: `MEDIUM`). |
| `status` | `Enum` | Yes | `CREATED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED` (Default: `CREATED`). |
| `patientId` | `ObjectId` | No | Foreign reference to `Patient` collection. |
| `createdBy` | `ObjectId` | No | Foreign reference to `User` who authored the task. |
| `createdByType` | `Enum` | Yes | `USER`, `AI_SYSTEM`, `SYSTEM` (Default: `USER`). |
| `assignedTo` | `ObjectId` | No | Foreign reference to `User` assigned to execute the task. |
| `dueDate` | `Date` | No | SLA commitment deadline timestamp. |
| `aiMetadata` | `Mixed` | No | Call ID, evidence quote, confidence, and telemetry. |
| `createdAt` | `Date` | Auto | Timestamp of task initiation. |
| `updatedAt` | `Date` | Auto | Timestamp of last status or delegation update. |

### Indexes
1. Compound Department & Status: `{ department: 1, status: 1 }`
2. Assignee & Status: `{ assignedTo: 1, status: 1 }`
3. Patient & Priority: `{ patientId: 1, priority: 1 }`
4. Created By: `{ createdBy: 1 }`
5. SLA Due Date: `{ dueDate: 1 }`

---

## 4. State Machine & Lifecycle Transitions

```
               ┌──────────────┐
               │   CREATED    │
               └──────┬───────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
  ┌──────────────┐          ┌──────────────┐
  │   ASSIGNED   │          │ IN_PROGRESS  │
  └──────┬───────┘          └──────┬───────┘
         │                         │
         └────────────┬────────────┘
                      ▼
               ┌──────────────┐
               │  COMPLETED   │
               └──────┬───────┘
                      ▼
               ┌──────────────┐
               │    CLOSED    │  (Terminal / Archive)
               └──────────────┘
```

### Transition Validation Rules
- `CREATED` can move to: `ASSIGNED`, `IN_PROGRESS`, `CLOSED`.
- `ASSIGNED` can move to: `IN_PROGRESS`, `ASSIGNED` (reassignment), `CLOSED`.
- `IN_PROGRESS` can move to: `COMPLETED`, `CLOSED`.
- `COMPLETED` can move to: `CLOSED`.
- `CLOSED` is terminal; only `ADMIN` can reopen to `IN_PROGRESS`.
- Direct jump from `CREATED` to `COMPLETED` is rejected (HTTP 400).

---

## 5. API Endpoints Specification

Base path: `/api/v1/tasks` (Protected by `authMiddleware`)

### 1. Create Task
- **Endpoint**: `POST /api/v1/tasks`
- **Allowed Roles**: `ADMIN`, `DEPARTMENT_MANAGER`, `RECEPTIONIST`, `DOCTOR`, `INSURANCE_EMPLOYEE`
- **Payload**:
  ```json
  {
    "title": "Post-op incision check & fever evaluation",
    "description": "Patient reported 100.8°F temp after appendectomy",
    "department": "CLINICAL",
    "priority": "HIGH",
    "patientId": "6acea83403ac5bd985e80b64",
    "assignedTo": "6acea83403ac5bd985e80b65",
    "dueDate": "2026-10-15T10:00:00.000Z"
  }
  ```
- **Response** (HTTP 201):
  ```json
  {
    "success": true,
    "task": {
      "id": "6acea83403ac5bd985e80b70",
      "title": "Post-op incision check & fever evaluation",
      "status": "ASSIGNED",
      "department": "CLINICAL",
      "priority": "HIGH",
      "assignedTo": { "id": "...", "name": "Dr. Ayyan Khan", "role": "DOCTOR" },
      "patientId": { "id": "...", "name": "Rahul Sharma", "mrn": "MRN-884920" }
    }
  }
  ```

### 2. List Tasks
- **Endpoint**: `GET /api/v1/tasks`
- **Allowed Roles**: All authenticated roles (Strictly scoped by RBAC)
- **Query Params**: `?status=IN_PROGRESS&department=CLINICAL&priority=HIGH&search=cardiac`
- **Response** (HTTP 200):
  ```json
  {
    "success": true,
    "count": 4,
    "tasks": [ ... ]
  }
  ```

### 3. Get Single Task
- **Endpoint**: `GET /api/v1/tasks/:id`
- **Allowed Roles**: `ADMIN`, or requester must be within the department, assigned to task, or the linked patient.

### 4. Assign Task
- **Endpoint**: `PATCH /api/v1/tasks/:id/assign`
- **Allowed Roles**: `ADMIN`, `DEPARTMENT_MANAGER` (Manager bounded to own department)
- **Payload**:
  ```json
  { "assignedTo": "6acea83403ac5bd985e80b65" }
  ```

### 5. Update Task Status
- **Endpoint**: `PATCH /api/v1/tasks/:id/status`
- **Allowed Roles**: `ADMIN`, `DEPARTMENT_MANAGER`, `DOCTOR`, `RECEPTIONIST`, `INSURANCE_EMPLOYEE`
- **Payload**:
  ```json
  { "status": "IN_PROGRESS" }
  ```

### 6. Delete / Close Task
- **Endpoint**: `DELETE /api/v1/tasks/:id`
- **Allowed Roles**: `ADMIN`, `DEPARTMENT_MANAGER` (Soft-closes task to `CLOSED`).

---

## 6. RBAC Permission & Visibility Matrix

| Role | View Scope | Create Tasks | Assign Staff | Update Status | Close / Delete |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Admin** | Universal (All Departments) | All | All Staff | Yes | Yes |
| **Department Manager** | Own Department Queue | Own Dept | Own Dept Staff | Yes | Own Dept |
| **Doctor** | Clinical Team + Assigned | Clinical / Reception | No | Clinical / Assigned | No |
| **Receptionist** | Reception Queue + Assigned | Reception / Clinical | No | Reception / Assigned | No |
| **Insurance Employee** | Insurance Queue + Assigned | Insurance | No | Insurance / Assigned | No |
| **Patient** | Own Created / Own Patient ID | No (403) | No (403) | No (403) | No (403) |

---

## 7. Frontend Integration Layer

The frontend connects directly to the Task Engine via [`apiTaskService.ts`](file:///c:/Users/sumiy/OneDrive/Desktop/web%20development/HackSprint-HealthCall/src/features/platform/tasks/apiTaskService.ts):

1. **Operational Actions Kanban Board (`/actions`)**:
   - Live synchronization across columns: Pending Triage, Assigned to Staff, In Active Progress, and Completed.
   - Interactive staff assignment modal powered by real User Management API.
2. **Physician Station (`/doctor/dashboard`)**:
   - Follow-up management tab backed by `GET /api/v1/tasks?department=CLINICAL`.
   - Dynamic clinical status updates synced to MongoDB.
3. **Front Desk Gateway (`/reception/dashboard`)**:
   - Reception AI Call Actions queue connected to `GET /api/v1/tasks?department=RECEPTION`.
4. **Operations Command Nexus (`/manager/dashboard`)**:
   - Live employee capacity calculation based on active tasks per assignee.
   - Escalation command card displaying breached SLA tasks.
5. **Patient Portal (`/patient/dashboard`)**:
   - Patient operational requests table populated with role-scoped patient tasks.

---

## 8. AI Call Intelligence Integration Hooks

The Task Management Engine is designed for downstream integration with the AI Call Intelligence module:
- **`createdByType: "AI_SYSTEM"`**: Flags automated tasks extracted from conversation audio without requiring human triage.
- **`aiMetadata`**: Structured dictionary capturing:
  ```json
  {
    "callId": "call-live-098",
    "callerPhone": "+15553498812",
    "transcriptSnippet": "I need a cardiology checkup because my blood pressure was high.",
    "intent": "APPOINTMENT_REQUEST",
    "confidenceScore": 0.96,
    "sentiment": "Anxious",
    "triageUrgency": "HIGH"
  }
  ```
- **Autonomous Routing**: Tasks created by the AI engine route directly into `RECEPTION` or `CLINICAL` queues with initial status `CREATED`, appearing in staff dashboards within seconds of call completion.

---

## 9. Verification & Automated Tests
Automated suite located in [`backend/tests/task.test.js`](file:///c:/Users/sumiy/OneDrive/Desktop/web%20development/HackSprint-HealthCall/backend/tests/task.test.js):
- **12/12 Automated Integration Tests Passing**:
  - `ADMIN`: Create operational task and persist in MongoDB.
  - `ADMIN`: Assign task to staff employee.
  - `ADMIN`: View all tasks across all hospital departments.
  - `DOCTOR`: View clinical and assigned tasks.
  - `DOCTOR`: Update clinical task status along allowed state machine.
  - `RECEPTIONIST`: Create appointment-related task and update status.
  - `RECEPTIONIST`: Blocked from creating tasks in unauthorized departments (403).
  - `DEPARTMENT_MANAGER`: View department tasks and assign staff.
  - `PATIENT`: View own task status but blocked from viewing other patients (403).
  - `PATIENT`: Blocked from creating internal operational tasks (403).
  - `VALIDATION`: Prevent illegal status transitions (e.g. `CREATED` → `COMPLETED` 400).
  - `SECURITY`: Unauthenticated request blocked with 401 Unauthorized.
