# User Management Module — CareOps AI Backend

> **Feature**: Feature 2 — User Management System  
> **Tech Stack**: Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs  
> **Branch**: `feature/user-management`

---

## 1. Purpose

The **User Management Module** provides hospital administrators and department supervisors with a secure, centralized API for managing the entire healthcare workforce and patient identity directory within CareOps AI.

This module is responsible for:
1. Provisioning, retrieving, updating, and deactivating user accounts across all 6 platform roles (`PATIENT`, `DOCTOR`, `RECEPTIONIST`, `INSURANCE_EMPLOYEE`, `DEPARTMENT_MANAGER`, `ADMIN`).
2. Enforcing strict Role-Based Access Control (RBAC) boundaries so only authorized hospital administrators can create, modify, or deactivate personnel.
3. Department-level query scoping for `DEPARTMENT_MANAGER` roles to view staff members within their domain while preventing unauthorized access to other departments.
4. Soft deletion and historical record retention to preserve clinical encounters and audit trails.

---

## 2. Architecture

The module adheres to the established CareOps AI layered backend architecture:

```
HTTP Request
     │
     ▼
┌────────────────────────────────────────────────────────┐
│                   User Router                          │
│           (backend/users/user.routes.js)               │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│              Authentication & RBAC                     │
│        • authMiddleware (JWT Verification)             │
│        • requireRole (ADMIN, DEPARTMENT_MANAGER)       │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                 User Controller                        │
│          (backend/users/user.controller.js)            │
│       Input extraction, validation calls, responses    │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                 User Validation Layer                  │
│          (backend/users/user.validation.js)            │
│   Email, password, role enum, department constraints   │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                  User Service                          │
│           (backend/users/user.service.js)              │
│    Department scoping, duplicate check, queries, save  │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                  User Model                            │
│           (backend/models/User.js)                     │
│    Mongoose schema with status field & bcrypt hashing  │
└────────────────────────────────────────────────────────┘
```

### Component Breakdown:
- **`user.routes.js`**: Defines routes under `/api/v1/users`, applying `authMiddleware` globally and `requireRole` on each endpoint.
- **`user.controller.js`**: Sanitizes incoming HTTP payloads, invokes validation functions, and returns structured JSON responses.
- **`user.validation.js`**: Pure validation functions (`validateCreateUser`, `validateUpdateUser`, `validateStatusUpdate`) enforcing email syntax, role validity, department requirements for staff, and password complexity.
- **`user.service.js`**: Business logic layer managing MongoDB queries, duplicate checks, department scoping for managers, and status transitions.
- **`User.js`**: Single unified Mongoose model storing user records with automated timestamps, password hashing, and role/status validation.

---

## 3. Database Changes

The existing `User` model (`backend/models/User.js`) was extended without creating duplicate collections:

### Extended Schema Field: `status`
```javascript
status: {
  type: String,
  enum: {
    values: ["ACTIVE", "INACTIVE", "SUSPENDED"],
    message: "{VALUE} is not a valid user status",
  },
  default: "ACTIVE",
  index: true,
  set: function (val) {
    if (!val) return "ACTIVE";
    return val.toString().toUpperCase().trim();
  },
}
```

### Complete User Document Shape:
```json
{
  "_id": "6724a8f90c12e3456789abcd",
  "name": "Dr. Rahul",
  "email": "rahul@hospital.com",
  "password": "$2a$10$e8w8X...",
  "role": "DOCTOR",
  "department": "Cardiology",
  "status": "ACTIVE",
  "phone": "+1 (555) 392-1102",
  "avatar": "https://...",
  "createdAt": "2026-10-13T08:00:00.000Z",
  "updatedAt": "2026-10-13T08:00:00.000Z"
}
```

---

## 4. API Documentation

Base URL: `/api/v1/users`  
All endpoints require `Authorization: Bearer <JWT_TOKEN>`.

### 4.1 Get All Users (`GET /api/v1/users`)
Retrieves hospital users with optional role, department, status, and keyword search filters.

- **Authorization**: `ADMIN`, `DEPARTMENT_MANAGER`
- **Department Manager Scoping**: Automatically scoped to the manager's assigned department.

**Query Parameters**:
- `role`: Filter by canonical role (e.g., `?role=DOCTOR`)
- `department`: Filter by department (e.g., `?department=Cardiology`)
- `status`: Filter by status (e.g., `?status=ACTIVE`)
- `search`: Case-insensitive search on `name` or `email` (e.g., `?search=Rahul`)

**Request**:
```http
GET /api/v1/users?department=Cardiology&status=ACTIVE HTTP/1.1
Authorization: Bearer <TOKEN>
```

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "users": [
    {
      "id": "6724a8f90c12e3456789abcd",
      "name": "Dr. Rahul",
      "email": "rahul@hospital.com",
      "role": "DOCTOR",
      "department": "Cardiology",
      "status": "ACTIVE",
      "phone": "+1 (555) 392-1102",
      "avatar": "",
      "createdAt": "2026-10-13T08:00:00.000Z"
    }
  ]
}
```

---

### 4.2 Get Single User (`GET /api/v1/users/:id`)
Retrieves specific user details.

- **Authorization**: `ADMIN`, `DEPARTMENT_MANAGER` (manager can only view users inside their department).

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "user": {
    "id": "6724a8f90c12e3456789abcd",
    "name": "Sarah",
    "email": "sarah@hospital.com",
    "role": "DEPARTMENT_MANAGER",
    "department": "Insurance",
    "status": "ACTIVE"
  }
}
```

---

### 4.3 Create User (`POST /api/v1/users`)
Provisions a new hospital user account with encrypted credentials.

- **Authorization**: `ADMIN ONLY` (Managers receive `403 Forbidden`).

**Request**:
```http
POST /api/v1/users HTTP/1.1
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "Dr. Rahul",
  "email": "rahul@hospital.com",
  "password": "securePassword123",
  "role": "DOCTOR",
  "department": "Cardiology",
  "phone": "+1 (555) 392-1102"
}
```

**Success Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "6724a8f90c12e3456789abcd",
    "name": "Dr. Rahul",
    "email": "rahul@hospital.com",
    "role": "DOCTOR",
    "department": "Cardiology",
    "status": "ACTIVE"
  }
}
```

---

### 4.4 Update User (`PATCH /api/v1/users/:id`)
Modifies editable fields: `name`, `phone`, `department`, `role`, `avatar`.  
*(Password modifications are strictly blocked through this endpoint).*

- **Authorization**: `ADMIN ONLY`

**Request**:
```http
PATCH /api/v1/users/6724a8f90c12e3456789abcd HTTP/1.1
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "Dr. Rahul Sharma",
  "phone": "+1 (555) 999-0011",
  "department": "Cardiology Interventional"
}
```

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": "6724a8f90c12e3456789abcd",
    "name": "Dr. Rahul Sharma",
    "email": "rahul@hospital.com",
    "role": "DOCTOR",
    "department": "Cardiology Interventional",
    "status": "ACTIVE",
    "phone": "+1 (555) 999-0011"
  }
}
```

---

### 4.5 Change User Status (`PATCH /api/v1/users/:id/status`)
Transitions an account between `ACTIVE`, `INACTIVE`, and `SUSPENDED`.

- **Authorization**: `ADMIN ONLY`

**Request**:
```http
PATCH /api/v1/users/6724a8f90c12e3456789abcd/status HTTP/1.1
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "status": "SUSPENDED"
}
```

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "User status updated successfully",
  "user": {
    "id": "6724a8f90c12e3456789abcd",
    "name": "Dr. Rahul Sharma",
    "status": "SUSPENDED"
  }
}
```

---

### 4.6 Soft Delete User (`DELETE /api/v1/users/:id`)
Soft deactivates account by setting `status = "INACTIVE"`. Preserves data integrity for historical patient cases and audit ledgers.

- **Authorization**: `ADMIN ONLY`

**Request**:
```http
DELETE /api/v1/users/6724a8f90c12e3456789abcd HTTP/1.1
Authorization: Bearer <ADMIN_TOKEN>
```

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "user": {
    "id": "6724a8f90c12e3456789abcd",
    "name": "Dr. Rahul Sharma",
    "status": "INACTIVE"
  }
}
```

---

## 5. Permission System & Security Rules

| Role | Access to `/api/v1/users` | Capabilities |
|---|:---:|---|
| **ADMIN** | Full Access | Can view all users, filter across all departments, create staff accounts, update roles/departments, change status, and soft delete. |
| **DEPARTMENT_MANAGER** | Scoped Access | Can view users strictly within their own department. Cannot create users (403), cannot update profiles or change roles (403), cannot delete users (403). |
| **DOCTOR** | Blocked (403) | Cannot access user management endpoints. |
| **RECEPTIONIST** | Blocked (403) | Cannot access user management endpoints. |
| **INSURANCE_EMPLOYEE** | Blocked (403) | Cannot access user management endpoints. |
| **PATIENT** | Blocked (403) | Cannot access user management endpoints. |
| **UNAUTHENTICATED** | Blocked (401) | Rejected with `401 Authentication required`. |

---

## 6. Frontend Integration

### Replacement: `mockUserService.ts` ➔ `apiUserService.ts`
The frontend client layer in `src/features/platform/users/apiUserService.ts` provides complete drop-in compatibility for existing UI components:

```typescript
import { apiUserService } from "@/features/platform/users/apiUserService";

// 1. Fetch filtered users from backend
const users = await apiUserService.getUsers({ department: "Cardiology", status: "ACTIVE" });

// 2. Create staff member
const created = await apiUserService.createUser({
  name: "Dr. James Wilson",
  email: "james.w@hospital.com",
  role: "Doctor",
  department: "Cardiology",
});

// 3. Update staff details
const updated = await apiUserService.updateUser("6724a8f90c12e3456789abcd", {
  phone: "+1 (555) 777-8899",
});

// 4. Soft deactivate user
await apiUserService.deleteUser("6724a8f90c12e3456789abcd");
```

Existing components continue importing from `mockUserService.ts`, which bridges directly to `apiUserService` while maintaining offline fallback for local sandbox demonstrations.

---

## 7. Setup & Testing Instructions

### Local Execution:
```bash
# 1. Install dependencies
cd backend
npm install

# 2. Run in development mode
npm run dev
```

### Running Test Suite:
```bash
cd backend
npm test
```

### Verified Test Cases (`backend/tests/users.test.js`):
- `✔ Admin: View all hospital users`
- `✔ Admin: Filter users by role, department, status, and search query`
- `✔ Admin: Create a new doctor account with department and bcrypt encryption`
- `✔ Admin: Reject creation with duplicate email or missing required fields`
- `✔ Admin: Update user profile, department, and role`
- `✔ Admin: Block password modification via PATCH /api/v1/users/:id`
- `✔ Admin: Change user status (ACTIVE -> SUSPENDED)`
- `✔ Admin: Soft delete user (sets status to INACTIVE, keeps record)`
- `✔ Manager: View only users in their own department`
- `✔ Manager: Blocked from creating new users (403 Forbidden)`
- `✔ Manager: Blocked from updating users or changing roles (403 Forbidden)`
- `✔ Manager: Blocked from deleting users (403 Forbidden)`
- `✔ Manager: Blocked from viewing user details outside department (403 Forbidden)`
- `✔ Doctor: Blocked from accessing user management (403 Forbidden)`
- `✔ Patient: Blocked from accessing user management (403 Forbidden)`
- `✔ Unauthorized: Request without token blocked (401 Unauthorized)`

---

## 8. Future Improvements

1. **Advanced Elastic/Full-Text Search**: Implement fuzzy phonetics matching for multilingual physician and patient names.
2. **Bulk CSV Staff Provisioning**: Administrator wizard for onboarding entire clinical departments at once.
3. **Immutable Audit Integration**: Automatic event dispatch to Feature 7 (Audit Logs) on user creation, status changes, and deactivation.
