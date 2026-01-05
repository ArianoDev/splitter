# Splitter

Webapp per dividere spese di gruppo in modo semplice e trasparente:
- Crei un calcolo con nome gruppo + partecipanti
- Inserisci spese con **importo**, **pagatore**, e **partecipanti coinvolti**
- Puoi **escludere** persone da una singola spesa (checkbox)
- Il backend calcola saldi e suggerisce **chi deve pagare quanto e a chi**, con poche transazioni
- I dati sono salvati su MongoDB e accessibili tramite un **token nel link**, senza registrazione

> ⚠️ Chi ha il link può modificare: trattalo come una chiave condivisa.

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

Importi sempre in **cent** (`amountCents`) per evitare problemi di floating point.

---

## API REST (backend)

Base URL: `/api`

- `POST /api/calculations`
  - body: `{ groupName: string, participants: string[] }`
  - response: `{ token, calculation, summary }`

- `GET /api/calculations/:token`
  - response: `{ calculation, summary }`

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
- Aggiungere funzionalità per saldare un debito
- Miglior gestione rimozione partecipante (wizard che aggiorna spese correlate)

