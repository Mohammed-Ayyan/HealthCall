# CareOps AI — Healthcare Operations Analytics Module

## Architecture Overview
The Analytics module aggregates live telemetry directly from MongoDB collections (`users`, `patients`, `tasks`, `insurance_claims`, `appointments`) without mock or synthetic numbers.

```
┌────────────────────────────────────────────────────────┐
│             Admin / Department Manager Console         │
└───────────────────────────┬────────────────────────────┘
                            │ Bearer JWT (ADMIN / MANAGER)
                            ▼
┌────────────────────────────────────────────────────────┐
│           Healthcare Analytics Engine & APIs           │
│   GET /api/v1/analytics/overview                       │
│   GET /api/v1/analytics/tasks                          │
│   GET /api/v1/analytics/patients                       │
│   GET /api/v1/analytics/users                          │
└───────────────────────────┬────────────────────────────┘
                            │ Live Aggregation Pipelines
                            ▼
┌────────────────────────────────────────────────────────┐
│                     MongoDB Collections                │
│   users • patients • tasks • insurance_claims • depts  │
└────────────────────────────────────────────────────────┘
```

## Security & RBAC Enforcement
- Restricts access strictly to `ADMIN` and `DEPARTMENT_MANAGER` roles.
- Non-managerial accounts (`DOCTOR`, `RECEPTIONIST`, `PATIENT`) are rejected with `403 Forbidden`.
- Unauthenticated requests are rejected with `401 Unauthorized`.
