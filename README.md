# Splitter

Webapp per dividere spese di gruppo in modo semplice e trasparente:
- Crei un calcolo con nome gruppo + partecipanti
- Inserisci spese con **importo**, **pagatore**, e **partecipanti coinvolti**
- Puoi **escludere** persone da una singola spesa (checkbox)
- Il backend calcola saldi e suggerisce **chi deve pagare quanto e a chi**, con poche transazioni
- I dati sono salvati su MongoDB e accessibili tramite un **token nel link**, senza registrazione
- Il link "normale" è **sola lettura**; per modificare servono uno o più **link admin**

> 🔐 Il link admin è la chiave: condividilo solo con chi deve poter modificare.

---

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: MongoDB + Mongoose
- Docker: container separati per frontend, backend e mongo

---

## Avvio rapido con Docker

Prerequisiti: Docker + Docker Compose.

```bash
docker compose up --build
```

Apri:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000/api/health

Nel setup Docker incluso:
- Il frontend è servito da Nginx su `5173`
- Nginx fa proxy delle chiamate `/api/*` verso il backend (quindi niente CORS lato browser)

---

## Avvio locale (senza Docker)

### 1) MongoDB
Avvia MongoDB localmente (esempio con Docker):

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

Variabili principali in `backend/.env`:

- `MONGODB_URI=mongodb://localhost:27017/billzer_splitter`
- `PORT=3000`
- `CORS_ORIGIN=http://localhost:5173`

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Apri http://localhost:5173

---

## Modello dati (MongoDB)

Collezione: `calculations`

- `token` (string, unico): identificatore condivisibile
- `groupName` (string)
- `participants`: array `{ id, name }`
- `expenses`: array `{ id, description, amountCents, payerId, participantIds, createdAt }`

Per la gestione permessi:

- `admins`: array `{ id, name, tokenHash, createdAt }`
  - `tokenHash` è `sha256(adminToken)` (in hex). Il token reale non viene salvato in chiaro.

Importi sempre in **cent** (`amountCents`) per evitare problemi di floating point.

---

## API REST (backend)

Base URL: `/api`

- `POST /api/calculations`
  - body: `{ groupName: string, participants: string[], adminName?: string }`
  - response: `{ token, adminToken, canEdit: true, calculation, summary }`

- `GET /api/calculations/:token`
  - opzionale header: `x-admin-token: <adminToken>`
  - response: `{ calculation, summary, canEdit }`

### Mutazioni (richiedono admin)

Per tutte le rotte qui sotto, includi l'header:

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

### Gestione admin (uno o più admin)

- `GET /api/calculations/:token/admins` (richiede admin)
  - response: `{ admins: [{ id, name, createdAt }] }`

- `POST /api/calculations/:token/admins` (richiede admin)
  - body: `{ name: string }`
  - response: `{ calculation, summary, adminToken, admin }`
  - Nota: `adminToken` viene mostrato **solo una volta**.

- `DELETE /api/calculations/:token/admins/:adminId` (richiede admin)
  - Non è possibile rimuovere l'ultimo admin.

La risposta include sempre `summary` (saldi + trasferimenti) calcolata dal backend.

---

## Algoritmo di ripartizione

File: `backend/src/services/settlement.ts`

1) **Saldo per partecipante** (paid - owed):
- Per ogni spesa:
  - il pagatore riceve `+amountCents`
  - i partecipanti coinvolti pagano `-quota`
- La quota è una divisione equa in centesimi:
  - `baseShare = floor(amount / N)`
  - i centesimi rimanenti vengono distribuiti +1 ai primi partecipanti (ordine deterministico)

2) **Trasferimenti (chi paga chi)**
- Greedy matching tra debitori e creditori:
  - ordina creditori (saldo > 0) e debitori (saldo < 0)
  - abbina a coppie finché tutti i saldi tornano a zero
- Obiettivo: poche transazioni e riepilogo chiaro.

---

## Test

Esempio di unit test sull’algoritmo:

```bash
cd backend
npm test
```

File: `backend/tests/settlement.test.ts`

---

## Note e idee di estensione

- “Tour” iniziale: overlay guidato al primo accesso
- Export CSV/JSON
- Miglior gestione rimozione partecipante (wizard che aggiorna spese correlate)

