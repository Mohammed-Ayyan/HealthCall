# CareOps AI — Admin Operations & Governance Module

## Architecture Overview
The Admin Operations & Governance module establishes centralized administrative oversight, dynamic telemetry monitoring, department lifecycle management, and RBAC governance across the CareOps AI platform.

```
┌──────────────────────────────────────────────────────────────┐
│                    Hospital Executive & Admin                │
└───────────────────────────────┬──────────────────────────────┘
                                │ Bearer JWT (role: ADMIN)
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               Admin Operations & Governance APIs             │
│   GET   /api/v1/admin/overview                               │
│   GET   /api/v1/admin/roles                                  │
│   GET   /api/v1/admin/permissions                            │
│   GET   /api/v1/admin/rules                                  │
│   PATCH /api/v1/admin/rules/:id                              │
│                                                              │
│   Department Management APIs                                 │
│   POST   /api/v1/departments                                 │
│   GET    /api/v1/departments                                 │
│   GET    /api/v1/departments/:id                             │
│   PATCH  /api/v1/departments/:id                             │
│   DELETE /api/v1/departments/:id                             │
└───────────────────────────────┬──────────────────────────────┘
                                │ Aggregation & Management
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                 MongoDB Living State Collections             │
│   users • patients • doctors • tasks • insurance_claims      │
│   departments • system_rules                                 │
└──────────────────────────────────────────────────────────────┘
```

## Security & RBAC Enforcement
- **Strict Role Gate:** All endpoints under `/api/v1/admin/*` and department mutations (`POST`, `PATCH`, `DELETE` under `/api/v1/departments/*`) require authenticated requests with the `ADMIN` role.
- **Access Violation:** Non-admin roles (Doctor, Receptionist, Patient, Insurance Employee, Department Manager) attempting administrative operations are blocked with `403 Forbidden`.
- **Unauthenticated Requests:** Requests lacking valid Bearer JWT tokens are rejected with `401 Unauthorized`.
