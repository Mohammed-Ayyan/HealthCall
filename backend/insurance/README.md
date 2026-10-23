# CareOps AI — Insurance Management System

## 1. Overview & Purpose
The **Insurance Management System** provides a unified revenue cycle management (RCM), prior-authorization adjudication, and eligibility tracking infrastructure for the CareOps AI platform.

Key capabilities:
- **Prior-Authorization & Claims Ledger**: MongoDB persistence for carrier claims across diverse medical categories (Prior-Authorization, Post-Op Surgical Coverage, Medication Approval, Diagnostic Imaging).
- **Adjudication State Machine**: Enforces deterministic lifecycle progression (`SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` → `COMPLETED`).
- **Granular RBAC Security**: Strict permission controls ensuring patients only access their own policies and claims, while insurance specialists review and update adjudication states.
- **Bi-directional Patient Profile Sync**: Automatic synchronization of patient insurance verification status (`Active & Verified` vs. `Action Needed`) upon claim approval or rejection.
- **Speech-to-Claim Sync Hook**: Prepared metadata interface for AI ambient call intelligence to capture insurance claims extracted from phone conversations.

---

## 2. Architecture & Data Flow

```
[Patient Intake / Care Call]
              │
              ▼
[Staff / Doctor Submission]
              │
              ▼
POST /api/v1/insurance/claims ────► [Insurance Controller & Validation]
                                                   │
                                                   ▼
                                      [Insurance Service (RBAC & State Machine)]
                                                   │
                                                   ▼
                                        [MongoDB InsuranceClaim]
                                                   │
        ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
        ▼                                          ▼                                          ▼
[Insurance Portal]                         [Patient Portal]                           [Doctor Portal]
Claims Management & Review               Own Policy & Claim Ledger                   Eligibility Verification
```

---

## 3. Database Model: InsuranceClaim Schema

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `claimNumber` | `String` | Auto | Unique readable claim identifier (e.g. `CLM-2026-X8Y9Z`). |
| `patientId` | `ObjectId` | Yes | Reference to `Patient` collection. |
| `insuranceProvider` | `String` | Yes | Payer name (e.g. "BlueCross BlueShield", "Aetna", "UnitedHealthcare"). |
| `policyNumber` | `String` | Yes | Insurance subscriber policy identification number. |
| `claimAmount` | `Number` | Yes | Monetary value of the claim in USD. |
| `claimReason` | `String` | Yes | Clinical justification, procedure code, or diagnosis description. |
| `claimType` | `Enum` | Yes | `PRIOR_AUTHORIZATION`, `POST_OP_COVERAGE`, `MEDICATION_APPROVAL`, `DIAGNOSTIC_IMAGING`, `GENERAL_CONSULTATION`. |
| `priority` | `Enum` | Yes | `LOW`, `MEDIUM`, `HIGH`, `URGENT` (Default: `MEDIUM`). |
| `status` | `Enum` | Yes | `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED` (Default: `SUBMITTED`). |
| `submittedBy` | `ObjectId` | Yes | Reference to `User` who created the claim. |
| `reviewedBy` | `ObjectId` | No | Reference to `User` (Insurance Specialist / Admin) who adjudicated the claim. |
| `reviewNotes` | `String` | No | Operational remarks left during review. |
| `denialReason` | `String` | No | Carrier or hospital denial explanation when rejected. |
| `serviceDate` | `Date` | Auto | Date medical service took place. |
| `dueDate` | `Date` | No | Carrier SLA deadline. |
| `aiMetadata` | `Mixed` | No | Telephony call ID, transcript snippet, confidence score. |
| `createdAt` | `Date` | Auto | Timestamp of claim submission. |
| `updatedAt` | `Date` | Auto | Timestamp of last status change. |

---

## 4. Lifecycle State Machine & Transitions

```
               ┌───────────────┐
               │   SUBMITTED   │
               └───────┬───────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  ┌──────────────┐            ┌──────────────┐
  │ UNDER_REVIEW │            │   REJECTED   │
  └──────┬───────┘            └──────┬───────┘
         │                           │ (Appeal)
         ├─────────────┐             │
         ▼             ▼             ▼
  ┌──────────────┐     │      ┌──────────────┐
  │   APPROVED   │     └─────►│ UNDER_REVIEW │
  └──────┬───────┘            └──────────────┘
         ▼
  ┌──────────────┐
  │  COMPLETED   │  (Terminal payout stage)
  └──────────────┘
```

### Transition Matrix
- `SUBMITTED` → `UNDER_REVIEW`, `REJECTED`
- `UNDER_REVIEW` → `APPROVED`, `REJECTED`
- `APPROVED` → `COMPLETED`, `REJECTED`
- `REJECTED` → `UNDER_REVIEW` (Re-opened upon appeal submission)
- `COMPLETED` → Terminal (finalized)

---

## 5. API Endpoints Specification

Base path: `/api/v1/insurance` (Protected by `authMiddleware`)

### 1. Create Insurance Claim
- **Endpoint**: `POST /api/v1/insurance/claims`
- **Allowed Roles**: `ADMIN`, `INSURANCE_EMPLOYEE`, `DOCTOR`, `RECEPTIONIST`, `DEPARTMENT_MANAGER`
- **Payload**:
  ```json
  {
    "patientId": "6acea83403ac5bd985e80b64",
    "insuranceProvider": "BlueCross BlueShield",
    "policyNumber": "BCBS-9021-8849",
    "claimAmount": 3450.00,
    "claimReason": "Laparoscopic appendectomy pre-authorization and surgical coverage",
    "claimType": "PRIOR_AUTHORIZATION",
    "priority": "HIGH"
  }
  ```
- **Response** (HTTP 201):
  ```json
  {
    "success": true,
    "message": "Insurance claim submitted successfully",
    "claim": {
      "id": "6aceabf1595ed8abfe29f701",
      "claimNumber": "CLM-2026-P8Q3R",
      "status": "SUBMITTED",
      "claimAmount": 3450,
      "patientId": { "id": "...", "name": "Rahul Sharma", "mrn": "MRN-884920" }
    }
  }
  ```

### 2. Get Claims Ledger
- **Endpoint**: `GET /api/v1/insurance/claims`
- **Allowed Roles**: All authenticated roles (Patients strictly scoped to own claims)
- **Query Params**: `?status=UNDER_REVIEW&priority=HIGH&insuranceProvider=BlueCross`

### 3. Get Single Claim
- **Endpoint**: `GET /api/v1/insurance/claims/:id`
- **Allowed Roles**: Staff, or Patient who owns the claim.

### 4. Update Claim Status
- **Endpoint**: `PATCH /api/v1/insurance/claims/:id/status`
- **Allowed Roles**: `ADMIN`, `INSURANCE_EMPLOYEE`
- **Payload**:
  ```json
  {
    "status": "APPROVED",
    "reviewNotes": "All clinical records verified; prior-authorization granted."
  }
  ```

### 5. Get Patient Insurance & Eligibility
- **Endpoint**: `GET /api/v1/insurance/patient/:id`
- **Allowed Roles**: Staff, or Patient who owns the record.
- **Response** (HTTP 200):
  ```json
  {
    "success": true,
    "patient": {
      "id": "...",
      "name": "Rahul Sharma",
      "mrn": "MRN-884920",
      "insuranceProvider": "BlueCross Premier PPO",
      "insuranceStatus": "Active & Verified",
      "policyNumber": "POL-884920"
    },
    "summary": {
      "totalClaims": 2,
      "pendingClaims": 1,
      "approvedClaims": 1,
      "rejectedClaims": 0,
      "totalClaimedAmount": 4750
    },
    "claims": [ ... ]
  }
  ```

---

## 6. RBAC Permission & Visibility Matrix

| Role | View Claims | Create Claims | Update Status | View Any Patient Insurance | View Own Insurance |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Admin** | Universal | Yes | Yes | Yes | Yes |
| **Insurance Employee** | Universal | Yes | Yes | Yes | Yes |
| **Doctor** | Universal (Read) | Yes | No (403) | Yes | Yes |
| **Receptionist** | Universal (Read) | Yes | No (403) | Yes | Yes |
| **Patient** | Own Only | No (403) | No (403) | No (403) | Yes |

---

## 7. Testing & Verification
Automated test suite is located at [`backend/tests/insurance.test.js`](file:///c:/Users/sumiy/OneDrive/Desktop/web%20development/HackSprint-HealthCall/backend/tests/insurance.test.js):
- `Admin creates claim`: Persists in MongoDB with status `SUBMITTED`.
- `Insurance employee views claims`: Can list and filter all claims.
- `Insurance employee updates status`: Successfully executes state machine transitions (`SUBMITTED` → `UNDER_REVIEW` → `APPROVED`).
- `Patient views own insurance`: Accesses personal claim history and policy details.
- `Patient cannot view others`: Blocked with HTTP 403 when requesting claims or insurance of another patient.
- `Doctor has correct access`: Can view claims and patient insurance, but blocked from updating status (HTTP 403).
- `Unauthorized roles blocked`: Requests without tokens receive HTTP 401.
