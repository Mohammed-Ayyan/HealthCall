# CareOps AI — Authentication & Role-Based Access Control (RBAC) Module

> **Feature**: Feature 1 — Authentication & RBAC Engine  
> **Tech Stack**: Node.js, Express.js, MongoDB, Mongoose, JSON Web Tokens (JWT), bcryptjs  
> **Branch**: `feature/auth-rbac`

---

## 1. Purpose

The **Authentication & RBAC Module** serves as the foundational security layer for CareOps AI. Hospitals connect diverse stakeholders with varying operational privileges—patients, clinical doctors, receptionists, insurance adjusters, department supervisors, and hospital administrators.

This module guarantees that:
1. Every actor is cryptographically authenticated via salted bcrypt password hashing and tamper-proof JSON Web Tokens (JWT).
2. All users are assigned a strict, validated role constant (`USER_ROLES`).
3. Private endpoints are guarded by token-verification middleware.
4. Role permissions are enforced deterministically, preventing unauthorized access across patient records, clinical queues, or executive administrative consoles.
5. Future backend developers (Feature 2: Workflow, Feature 3: Patient Management, Feature 4: Telephony, etc.) have a standardized identity context attached to `req.user`.

---

## 2. Architecture

The module adheres to a clean, decoupled layered architecture:

```
HTTP Request
     │
     ▼
┌────────────────────────────────────────────────────────┐
│                      Express Router                    │
│                (backend/routes/authRoutes.js)          │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                  Security Middleware                   │
│        • authMiddleware.js (JWT extraction & lookup)   │
│        • roleMiddleware.js (RBAC & permission checks)  │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                   Auth Controller                      │
│            (backend/controllers/authController.js)     │
│         Handles HTTP req/res, status codes, cookies    │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                    Auth Service                        │
│              (backend/services/authService.js)         │
│     Business logic, validation, duplicate checks, JWT  │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│                     User Model                         │
│               (backend/models/User.js)                 │
│      Mongoose schema, pre-save bcrypt, comparePassword │
└────────────────────────────────────────────────────────┘
```

### Component Roles:
- **Routes (`backend/routes/authRoutes.js`)**: Maps public (`/register`, `/login`, `/logout`) and protected (`/me`, `/doctor-only`, `/admin-only`) HTTP routes to controller methods.
- **Middleware (`backend/middleware/`)**:
  - `authMiddleware.js`: Extracts Bearer token from the `Authorization` header, verifies the cryptographic signature with `jwt.verify`, looks up the user in MongoDB, and attaches `req.user`.
  - `roleMiddleware.js`: Exposes `requireRole(...roles)` and `requirePermission(perm)` to block unauthorized requests with `403 Forbidden`.
  - `errorMiddleware.js`: Catches Mongoose duplicate key (`E11000`), validation errors, JWT expiration, and returns unified JSON envelopes.
- **Controllers (`backend/controllers/authController.js`)**: Sanitizes HTTP input, invokes service methods, and formats response JSON with appropriate HTTP status codes (`200`, `201`, `400`, `401`, `403`, `409`).
- **Services (`backend/services/authService.js`)**: Encapsulates core business rules, email normalization, password complexity enforcement, duplicate email detection, and JWT generation.
- **Models (`backend/models/User.js`)**: Mongoose schema specifying field types, indexes, pre-save hashing, and JSON projection (omits `password` and `__v`).

---

## 3. Database Schema

### User Model (`models/User.js`)

```javascript
{
  _id: ObjectId,
  name: String,        // Required, 2-100 characters, trimmed
  email: String,       // Required, unique, lowercase, regex-validated, indexed
  password: String,    // Required, min 6 characters, bcrypt hashed, select: false
  role: String,        // Required, enum from USER_ROLES, default: "PATIENT", indexed
  department: String,  // Optional (e.g., "Cardiology", "Reception", "Billing")
  phone: String,       // Optional phone contact string
  avatar: String,      // Optional URL string
  createdAt: Date,     // Automatic ISO-8601 timestamp
  updatedAt: Date      // Automatic ISO-8601 timestamp
}
```

### Password Security Implementation
- **Never Plaintext**: Passwords are never stored or logged in plain text.
- **Pre-Save Hook**: Mongoose pre-save middleware checks `this.isModified("password")`. If modified, generates a salt with `bcrypt.genSalt(10)` and hashes the password via `bcrypt.hash(this.password, salt)`.
- **Comparison**: Instance method `user.comparePassword(candidatePassword)` uses `bcrypt.compare()` for constant-time comparison during login.

---

## 4. API Documentation

Base URL: `/api/v1/auth`

### 4.1 Register (`POST /api/v1/auth/register`)
Creates a new hospital user account.

**Request**:
```http
POST /api/v1/auth/register HTTP/1.1
Content-Type: application/json

{
  "name": "Rahul Sharma",
  "email": "rahul@test.com",
  "password": "password123",
  "role": "PATIENT",
  "department": ""
}
```

**Success Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6724a8f90c12e3456789abcd",
    "name": "Rahul Sharma",
    "email": "rahul@test.com",
    "role": "PATIENT",
    "department": ""
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing name, invalid email, password < 6 chars, or unrecognized role.
- `409 Conflict`: `{"success": false, "message": "An account with this email address already exists"}`.

---

### 4.2 Login (`POST /api/v1/auth/login`)
Authenticates existing credentials and returns a 7-day JWT.

**Request**:
```http
POST /api/v1/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "doctor@test.com",
  "password": "password123"
}
```

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6724a8f90c12e3456789abce",
    "name": "Dr. Aris Thorne",
    "email": "doctor@test.com",
    "role": "DOCTOR",
    "department": "Cardiology",
    "phone": "+1 (555) 749-2101",
    "avatar": ""
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing email or password.
- `401 Unauthorized`: `{"success": false, "message": "Invalid email or password"}`.

---

### 4.3 Current User (`GET /api/v1/auth/me`)
Retrieves the profile of the currently logged-in user.

**Request**:
```http
GET /api/v1/auth/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "id": "6724a8f90c12e3456789abce",
  "name": "Dr. Aris Thorne",
  "email": "doctor@test.com",
  "role": "DOCTOR",
  "department": "Cardiology",
  "phone": "+1 (555) 749-2101",
  "avatar": "",
  "createdAt": "2026-10-13T08:00:00.000Z"
}
```

**Error Responses**:
- `401 Unauthorized`: `{"success": false, "message": "Authentication required"}`.

---

### 4.4 Logout (`POST /api/v1/auth/logout`)
Clears the authentication token or cookie.

**Request**:
```http
POST /api/v1/auth/logout HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 5. JWT Flow

```
1. User submits credentials (email + password)
                ↓
2. authService validates password with bcrypt.compare()
                ↓
3. generateToken(user) creates signed JWT with payload:
   {
     "userId": "6724a8f90c12e3456789abce",
     "role": "DOCTOR"
   }
   Expires in: 7 days
                ↓
4. Client stores JWT in localStorage or httpOnly cookie
                ↓
5. Client attaches header: Authorization: Bearer <token>
                ↓
6. authMiddleware verifies signature via jwt.verify(token, JWT_SECRET)
                ↓
7. Finds user record in MongoDB, sets req.user = { id, role, ... }
                ↓
8. roleMiddleware checks requireRole("DOCTOR") ➔ Proceed to Controller
```

---

## 6. Role System & Permissions Matrix

All roles are stored as strict uppercase constants in `config/roles.js`:

```javascript
const USER_ROLES = Object.freeze({
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
  RECEPTIONIST: "RECEPTIONIST",
  INSURANCE_EMPLOYEE: "INSURANCE_EMPLOYEE",
  DEPARTMENT_MANAGER: "DEPARTMENT_MANAGER",
  ADMIN: "ADMIN",
});
```

### Granular Capability Matrix (`config/permissions.js`)

| Role | Permitted Capabilities | Target Dashboard |
|---|---|---|
| **PATIENT** | View own profile, request appointments, view care history | `/patient/dashboard` |
| **DOCTOR** | View assigned patients, manage followups, create AI care briefs | `/doctor/dashboard` |
| **RECEPTIONIST** | Manage intake queue, execute call actions, view patient directory | `/reception/dashboard` |
| **INSURANCE_EMPLOYEE** | Manage insurance requests, verify claims, review prior-authorization | `/insurance/dashboard` |
| **DEPARTMENT_MANAGER** | View departmental workloads, manage capacities, resolve SLA escalations | `/manager/dashboard` |
| **ADMIN** | Global superuser (`*`), RBAC governance, routing thresholds | `/admin/dashboard` |

---

## 7. Frontend Integration

### Transition from `mockAuthService` to Real Backend API

The frontend includes a drop-in API client at `src/features/platform/auth/apiAuthService.ts`:

```typescript
import { apiAuthService } from "@/features/platform/auth/apiAuthService";

// Register with real backend
const regResult = await apiAuthService.register({
  name: "Dr. Aris Thorne",
  email: "doctor@test.com",
  password: "password123",
  role: "Doctor",
  department: "Cardiology",
});

// Login with real backend
const authResult = await apiAuthService.login({
  email: "doctor@test.com",
  password: "password123",
  role: "Doctor",
});

// Get authenticated user
const currentUser = await apiAuthService.fetchCurrentUser();

// Logout
await apiAuthService.logout();
```

### Backwards Compatibility
Existing frontend components importing `mockAuthService` from `src/features/platform/mockAuthService.ts` continue functioning without any changes. The service delegates to `apiAuthService`, automatically falling back to offline preset accounts if the backend server is not running during local client-only testing.

---

## 8. Environment Variables

Create a `backend/.env` file:

```env
# Server Port
PORT=5000

# Environment Mode
NODE_ENV=development

# MongoDB Connection String
DATABASE_URL=mongodb://127.0.0.1:27017/careops

# JWT Authentication Secret
JWT_SECRET=careops_production_grade_jwt_secret_token_2026

# JWT Expiration Duration
JWT_EXPIRES_IN=7d

# Allowed Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

---

## 9. Testing Instructions

### Run Automated Backend Test Suite

The test suite runs using Node.js's native test runner (`node:test`) and an automated in-memory MongoDB server (`mongodb-memory-server`), ensuring zero external setup requirements:

```bash
cd backend
npm test
```

### Verified Scenarios:
- `✔ 1. Register patient successfully`: Validates account creation, 201 response, password exclusion.
- `✔ 2. Register doctor successfully`: Validates clinical role, department attribution.
- `✔ 3. Login patient with valid credentials`: Validates JWT issuance and user profile.
- `✔ 4. Login doctor with valid credentials`: Validates doctor credential check.
- `✔ 5. Reject login with invalid password`: Validates 401 response and security message.
- `✔ 6. Reject registration with duplicate email`: Validates 409 conflict detection.
- `✔ 7. Reject registration with missing required fields`: Validates 400 validation response.
- `✔ 8. Block access to protected route when token is missing`: Validates 401 "Authentication required".
- `✔ 9. Block access to role-protected route when role does not match`: Validates 403 "You do not have permission".
- `✔ 10. Verify /me endpoint and /logout endpoint`: Validates identity resolution and session clearance.

### Run Server in Development Mode:
```bash
cd backend
npm run dev
```
Server runs on [http://localhost:5000](http://localhost:5000) with live health check at [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health).
