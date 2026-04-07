# beetUs

Piattaforma social per studenti con feed, messaggistica in tempo reale, libreria di libri scolastici usati e assistente AI.

---

## Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Backend | Spring Boot 3.5.6 · Java 25 · PostgreSQL |
| Frontend | Angular 20 · Tailwind CSS · RxJS |
| Real-time | WebSocket (STOMP + SockJS) |
| AI | Google Gemini 2.0 Flash (vision) · Groq llama-3.3-70b (chatbot) |
| Storage | Cloudinary (immagini e audio) |
| Auth | JWT + Refresh Token |
| Push | Web Push API (VAPID) |
| Rate limiting | Bucket4j + Caffeine |
| Deploy | Docker (backend) · PWA (frontend) |

---

## Funzionalità

### Social
- Feed con post, commenti, like e menzioni (`@username`)
- Isolamento per classe (ogni utente vede solo i contenuti della propria classe)
- Ricerca utenti e contenuti

### Messaggistica
- Direct message (DM) con immagini e messaggi vocali (max 2 min)
- Chat di gruppo: creazione, gestione membri, foto profilo, messaggi vocali
- Typing indicator in tempo reale
- Indicatore utenti online

### Libreria libri usati
- Pubblicazione annunci con foto (fronte/retro) e analisi AI automatica
- Filtri: materia, anno, condizione, prezzo massimo
- Sistema di richiesta libro e cambio stato (Disponibile → Richiesto → Venduto)
- Chat venditore-acquirente per ogni libro
- Assistente AI (chatbot) per cercare libri e rispondere a domande

### Notifiche
- Notifiche in-app in tempo reale via WebSocket
- Push notification browser (anche con app chiusa) via VAPID
- Tipi: like, commento, menzione, DM, nuovo post, richiesta libro, messaggio libro, messaggio gruppo

### Admin panel
- Gestione utenti (attivazione, disattivazione, promozione admin)
- Moderazione contenuti: post, commenti, annunci libri, gruppi
- Audit log di tutte le azioni admin
- Statistiche sistema (utenti, post, libri, gruppi)
- Configurazione rate limiting per tipo di endpoint
- Pulizia database

### PWA
- Installabile su Android e iOS (Safari ≥ 16.4)
- Service worker per caching offline
- Push notification su dispositivo installato

---

## Struttura del progetto

```
beetUs/
├── backend/          # Spring Boot API
│   └── src/main/java/com/example/backend/
│       ├── config/           # Security, WebSocket, rate limiting
│       ├── controllers/      # REST endpoints
│       ├── models/           # Entità JPA
│       ├── repositories/     # Spring Data JPA
│       ├── services/         # Business logic
│       ├── dtos/             # Request / Response DTO
│       ├── mappers/          # Entità ↔ DTO
│       ├── security/         # JWT, UserDetails
│       └── events/           # Application events
└── frontend/         # Angular PWA
    └── src/app/
        ├── core/
        │   ├── api/          # HTTP services (un file per dominio)
        │   ├── auth/         # Guards, interceptors, auth service
        │   ├── services/     # WebSocket, Cloudinary, Toast, Dialog, Push
        │   └── stores/       # Signal stores (auth, book, group, notification…)
        ├── features/
        │   ├── admin/        # Dashboard, moderazione, audit log
        │   ├── auth/         # Login, registrazione, reset password
        │   ├── home/         # Feed, crea post
        │   ├── library/      # Libreria libri, chatbot AI, conversazioni
        │   ├── messages/     # DM, gruppi
        │   ├── notifications/
        │   ├── post/
        │   ├── profile-view/
        │   ├── search/
        │   └── settings/     # Profilo, password, tema, notifiche push
        ├── layout/           # Header, main layout
        └── shared/           # Componenti riutilizzabili (book-card, audio-player…)
```

---

## Avvio in sviluppo

### Prerequisiti

- Java 25
- Node.js 20+
- PostgreSQL 15+
- Account Cloudinary
- API key Gemini e Groq
- Chiavi VAPID (`npx web-push generate-vapid-keys`)

### Backend

Crea un file `.env` nella cartella `backend/`:

```env
JDBC_DATABASE_URL=jdbc:postgresql://localhost:5432/beetus_db
DB_USERNAME=postgres
DB_PASSWORD=postgres

JWT_SECRET=cambia-questa-chiave-in-produzione

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=noreply@example.com
MAIL_PASSWORD=password

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

GEMINI_API_KEY=...
GROQ_API_KEY=...

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

CORS_ALLOWED_ORIGINS=http://localhost:4200
APP_FRONTEND_URL=http://localhost:4200
```

Avvia il backend:

```bash
cd backend
./mvnw spring-boot:run
```

L'API sarà disponibile su `http://localhost:8080`.

### Frontend (sviluppo)

```bash
cd frontend
npm install
ng serve
```

L'app sarà disponibile su `http://localhost:4200`.

> **Nota:** Il service worker (e le push notification) è attivo solo nella build di produzione.

### Frontend (build di produzione con push notification)

```bash
cd frontend
ng build
npx http-server dist/frontend/browser -p 4200 -c-1 --spa
```

---

## Build Docker (backend)

```bash
cd backend
docker build -t beetus-backend .
docker run -p 8080:8080 --env-file .env beetus-backend
```

---

## Variabili d'ambiente — riepilogo

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `JDBC_DATABASE_URL` | URL connessione PostgreSQL | `jdbc:postgresql://localhost:5432/beetUs_db` |
| `DB_USERNAME` | Utente database | `postgres` |
| `DB_PASSWORD` | Password database | `postgres` |
| `DDL_AUTO` | Strategia schema JPA | `create-drop` |
| `JWT_SECRET` | Chiave firma JWT | *(obbligatoria)* |
| `JWT_ACCESS_EXPIRATION` | Durata access token (ms) | `1800000` (30 min) |
| `MAIL_HOST` | Server SMTP | *(obbligatorio)* |
| `MAIL_PORT` | Porta SMTP | `587` |
| `MAIL_USERNAME` | Username SMTP | *(obbligatorio)* |
| `MAIL_PASSWORD` | Password SMTP | *(obbligatorio)* |
| `CLOUDINARY_CLOUD_NAME` | Nome cloud Cloudinary | *(obbligatorio)* |
| `CLOUDINARY_API_KEY` | API key Cloudinary | *(obbligatorio)* |
| `CLOUDINARY_API_SECRET` | API secret Cloudinary | *(obbligatorio)* |
| `GEMINI_API_KEY` | API key Google Gemini | *(obbligatorio per AI vision)* |
| `GEMINI_MODEL` | Modello Gemini | `gemini-2.0-flash` |
| `GROQ_API_KEY` | API key Groq | *(obbligatorio per chatbot)* |
| `GROQ_MODEL` | Modello Groq | `llama-3.3-70b-versatile` |
| `VAPID_PUBLIC_KEY` | Chiave pubblica VAPID | *(obbligatorio per push)* |
| `VAPID_PRIVATE_KEY` | Chiave privata VAPID | *(obbligatorio per push)* |
| `CORS_ALLOWED_ORIGINS` | Origini CORS consentite | `http://localhost:4200` |
| `APP_FRONTEND_URL` | URL frontend | `http://localhost:4200` |
| `MAX_STUDENTS` | Limite massimo studenti per classe | `17` |
| `LOG_LEVEL` | Livello log root | `INFO` |
| `APP_LOG_LEVEL` | Livello log applicazione | `DEBUG` |

---

## API principali

| Area | Metodo | Endpoint |
|------|--------|----------|
| Auth | POST | `/api/auth/login` |
| Auth | POST | `/api/auth/register` |
| Post | GET | `/api/posts` |
| Post | POST | `/api/posts` |
| Messaggi | GET | `/api/messages/conversations` |
| Messaggi | POST | `/api/messages` |
| Gruppi | GET | `/api/groups/miei` |
| Gruppi | POST | `/api/groups` |
| Libri | GET | `/api/books` |
| Libri | POST | `/api/books` |
| Conversazioni libro | POST | `/api/books/:id/messages` |
| AI vision | POST | `/api/ai/analizza-libro` |
| AI chatbot | POST | `/api/ai/chatbot` |
| Push | POST | `/api/push/subscribe` |
| Push | POST | `/api/push/unsubscribe` |
| Admin | GET | `/api/admin/users` |
| Admin | GET | `/api/admin/books` |
| Admin | GET | `/api/admin/groups` |

Tutti gli endpoint (eccetto auth) richiedono il token JWT nell'header:
```
Authorization: Bearer <token>
```

---

## Note su iOS

Le push notification su iPhone richiedono:
1. Safari ≥ 16.4
2. App installata come PWA: **Condividi → Aggiungi a schermata Home**
3. Permesso notifiche concesso nelle impostazioni dell'app

---

## Limitazioni note

- I file audio nei messaggi sono esclusive (non combinabili con testo o immagini)
- Messaggi vocali: durata massima 2 minuti
- Immagini upload: massimo 5 MB
- Rate limiting attivo su tutti gli endpoint sensibili (429 Too Many Requests se superato)
- Il modello Gemini è usato solo per l'analisi foto libri (vision); il chatbot usa Groq (nessun limite giornaliero)
