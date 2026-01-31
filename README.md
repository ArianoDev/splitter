# Splitter

Webapp to split group expenses in a simple and transparent way:
- Create a calculation with a group name + participants
- Add expenses with **amount**, **payer**, and **included participants**
- You can **exclude** people from a single expense
- The backend calculates balances and suggests **who should pay how much to whom**, with few transactions
- Data is saved on MongoDB and accessible via a **token in the link**, with no registration
- The “normal” link is **read-only**; editing requires one or more **admin links**

> 🔐 The admin link is the key: share it only with people who should be allowed to edit.

---

## Tech stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: MongoDB + Mongoose
- Docker: separate containers for frontend, backend and MongoDB

---

## Quick start with Docker

Prerequisites: Docker + Docker Compose.

```bash
docker compose up --build
```

Open:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000/api/health

In the included Docker setup:
- The frontend is served by Nginx on `5173`
- Nginx proxies `/api/*` calls to the backend (so no CORS issues in the browser)

---

## Local setup (without Docker)

### 1) MongoDB
Start MongoDB locally (example using Docker):

```bash
docker run --rm -p 27017:27017 mongo:7
```

### 2) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Main variables in `backend/.env`:

- `MONGODB_URI=mongodb://localhost:27017/billzer_splitter`
- `PORT=3000`
- `CORS_ORIGIN=http://localhost:5173`

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Data model (MongoDB)

Collection: `calculations`

- `token` (string, unique): shareable identifier
- `groupName` (string)
- `participants`: array `{ id, name }`
- `expenses`: array `{ id, description, amountCents, payerId, participantIds, createdAt }`

For permission management:

- `admins`: array `{ id, name, tokenHash, createdAt }`
  - `tokenHash` is `sha256(adminToken)` (hex). The real token is not stored in plain text.

Amounts are always stored in **cents** (`amountCents`) to avoid floating point issues.

---

## REST API (backend)

Base URL: `/api`

- `POST /api/calculations`
  - body: `{ groupName: string, participants: string[], adminName?: string }`
  - response: `{ token, adminToken, canEdit: true, calculation, summary }`

- `GET /api/calculations/:token`
  - optional header: `x-admin-token: <adminToken>`
  - response: `{ calculation, summary, canEdit }`

### Mutations (admin required)

For all routes below, include the header:

```
x-admin-token: <adminToken>
```

- `PATCH /api/calculations/:token`
  - body: `{ groupName?: string }`

- `POST /api/calculations/:token/participants`
  - body: `{ name: string }`

- `DELETE /api/calculations/:token/participants/:participantId`

- `POST /api/calculations/:token/expenses`
  - body: `{ description?, amountCents, payerId, participantIds }`

- `PUT /api/calculations/:token/expenses/:expenseId`
  - body: `{ description?, amountCents, payerId, participantIds }`

- `DELETE /api/calculations/:token/expenses/:expenseId`

### Admin management (one or more admins)

- `GET /api/calculations/:token/admins` (admin required)
  - response: `{ admins: [{ id, name, createdAt }] }`

- `POST /api/calculations/:token/admins` (admin required)
  - body: `{ name: string }`
  - response: `{ calculation, summary, adminToken, admin }`
  - Note: `adminToken` is shown **only once**.

- `DELETE /api/calculations/:token/admins/:adminId` (admin required)
  - You cannot remove the last remaining admin.

Responses always include `summary` (balances + transfers) computed by the backend.

---

## Split algorithm

File: `backend/src/services/settlement.ts`

1) **Balance per participant** (paid - owed):
- For each expense:
  - the payer gets `+amountCents`
  - included participants pay `-share`
- Shares are evenly split in cents:
  - `baseShare = floor(amount / N)`
  - leftover cents are distributed as +1 to the first participants (deterministic order)

2) **Transfers (who pays whom)**
- Greedy matching between debtors and creditors:
  - sort creditors (balance > 0) and debtors (balance < 0)
  - match pairs until all balances become zero
- Goal: few transactions and a clear summary.

---

## Tests

Example unit test for the algorithm:

```bash
cd backend
npm test
```

File: `backend/tests/settlement.test.ts`

---
