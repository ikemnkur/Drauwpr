# Drauwper — Project Documentation

> **Drauwper** is a social file-drop platform where creators upload files and set a future release time. Viewers spend credits to accelerate the countdown through a dynamic "burn rate" mechanic powered by real-time momentum.

*Last updated: 2026-04-02*

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Frontend Routes](#4-frontend-routes)
5. [API Endpoints](#5-api-endpoints)
6. [Data Flow](#6-data-flow)
7. [Database Schema (Key Tables)](#7-database-schema-key-tables)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Credit System](#9-credit-system)
10. [Burn Rate / Momentum Engine](#10-burn-rate--momentum-engine)
11. [Account Verification (KYC Lite)](#11-account-verification-kyc-lite)
12. [Development Setup](#12-development-setup)
13. [Environment Variables](#13-environment-variables)

---

## 1. Architecture Overview

```
┌──────────────────────┐       ┌───────────────────────┐
│   React Frontend     │──────▶│   Express.js Backend   │
│   (Vite + TS)        │  API  │   (Node.js)            │
│   localhost:5174      │◀──────│   localhost:3001        │
└──────────────────────┘       └────────┬──────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │         MySQL (knex)         │
                         │   + Google Cloud Storage     │
                         └─────────────────────────────┘
```

- **Frontend** serves as an SPA via Vite dev server with an API proxy to the backend.
- **Backend** is Express.js with JWT authentication, Busboy for multipart uploads, and knex for MySQL queries.
- **Storage**: Drop files and media go to GCS. Verification documents are stored **locally** on the server (ephemeral — deleted after manual review).

---

## 2. Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React 18 + TypeScript + Vite        |
| Styling      | Tailwind CSS                        |
| Routing      | React Router v6                     |
| State        | React Context + API fetch hooks     |
| Icons        | Lucide React                        |
| Backend      | Node.js + Express.js                |
| Database     | MySQL (mysql2 pool + Knex.js)       |
| Auth         | JWT (jsonwebtoken)                  |
| File Storage | Google Cloud Storage (drops/media)  |
| Uploads      | Busboy (multipart/form-data)        |
| Crypto       | BTC, ETH, LTC, SOL verification     |

---

## 3. Project Structure

```
Drauwpr/
├── PROJECT_SCOPE.md              # Original scope & burn-rate formulas
├── PROJECT.md                    # This file — living documentation
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite config (API proxy → :3001)
├── tsconfig.json
├── index.html
├── public/
│
├── server/
│   ├── server.js                 # Main server — auth, wallet, crypto, uploads
│   ├── server-admin.js           # Admin portal backend (hidden route)
│   ├── drauwper-routes.js        # Drop CRUD, contributions, reviews, downloads
│   ├── email-service.js          # Transactional email (templates in email-templates/)
│   ├── knexfile.js               # Knex DB config
│   ├── package.json              # Backend dependencies
│   ├── config/
│   │   ├── db.js                 # mysql2 pool connection
│   │   └── knex.js               # Knex instance
│   ├── DB/                       # SQL table definitions
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── uploads/                  # Ephemeral upload storage (verification docs)
│   └── email-templates/          # HTML email templates
│
└── src/
    ├── App.tsx                   # Route definitions
    ├── main.tsx                  # Entry point
    ├── index.css                 # Global styles + Tailwind
    ├── types.ts                  # Shared TypeScript interfaces
    ├── lib/
    │   └── api.ts                # API client (JSON + multipart upload)
    ├── context/
    │   ├── AuthContext.tsx        # Auth state, JWT, login/register/logout
    │   └── AppContext.tsx         # Global drops state, contribute action
    ├── hooks/
    │   └── useData.ts            # Dashboard/contribution hooks, mapDrop helper
    ├── engine/
    │   └── burnRate.ts           # Momentum & burn-rate calculations
    ├── data/
    │   └── mock.ts               # Fallback mock data
    ├── components/
    │   ├── Layout.tsx            # App shell with navigation
    │   ├── AnalogClock.tsx       # SVG countdown clock
    │   ├── BurnRateGauge.tsx     # Flame/Snowflake burn indicator
    │   ├── GoalProgress.tsx      # Goal percentage bar
    │   ├── ContributeForm.tsx    # Credit contribution form (API-wired)
    │   ├── ContributorList.tsx   # Top contributors display
    │   ├── PriceDisplay.tsx      # Dynamic price calculator
    │   ├── ReviewForm.tsx        # Review submission form
    │   ├── ProtectedRoute.tsx    # Auth guard wrapper
    │   └── GuestRoute.tsx        # Redirect if already logged in
    └── pages/
        ├── Landing.tsx           # Pre-auth hero page
        ├── Login.tsx             # Email + password login
        ├── Register.tsx          # Account creation
        ├── Dashboard.tsx         # User dashboard, active drops, stats
        ├── Explore.tsx           # Browse featured/trending/newest drops
        ├── DropFeature.tsx       # Drop detail (clock, burn rate, contribute)
        ├── DropDownload.tsx      # Post-release download page
        ├── DropReview.tsx        # Review/feedback page
        ├── CreateDrop.tsx        # New drop creation form
        ├── EditDrop.tsx          # Edit pending drops
        ├── ActiveContributions.tsx # Drops user has contributed to
        ├── Account.tsx           # Profile, balance, verification status
        ├── Verification.tsx      # ID upload + crypto micro-payment KYC
        ├── BuyCredits.tsx        # Buy/Redeem credits (toggle mode)
        ├── History.tsx           # Contribution history ledger
        ├── UserProfile.tsx       # Public creator profile
        ├── Help.tsx              # FAQ and info
        └── AdminPortal.tsx       # Hidden admin tools
```

---

## 4. Frontend Routes

### Public
| Route              | Page            | Description                     |
|--------------------|-----------------|---------------------------------|
| `/`                | Landing         | Pre-auth hero page              |
| `/explore`         | Explore         | Browse and discover drops       |
| `/drop/:id`        | DropFeature     | Drop detail (pre-release)       |
| `/user/:id`        | UserProfile     | Public creator profile          |
| `/help`            | Help            | FAQ and platform info           |

### Guest Only (redirect if logged in)
| Route              | Page            |
|--------------------|-----------------|
| `/login`           | Login           |
| `/register`        | Register        |

### Protected (require auth)
| Route              | Page                | Description                       |
|--------------------|---------------------|-----------------------------------|
| `/dashboard`       | Dashboard           | User home, my drops, stats        |
| `/account`         | Account             | Profile, verification status      |
| `/verify`          | Verification        | ID upload + crypto payment KYC    |
| `/buy-credits`     | BuyCredits          | Buy or redeem credits             |
| `/history`         | History             | Contribution history ledger       |
| `/contributions`   | ActiveContributions | Drops you've contributed to       |
| `/create`          | CreateDrop          | Create a new drop                 |
| `/drop/:id/edit`   | EditDrop            | Edit a pending drop               |
| `/drop/:id/download` | DropDownload     | Download page (post-release)      |
| `/drop/:id/review` | DropReview          | Review/feedback page              |

### Admin
| Route            | Page        | Description                        |
|------------------|-------------|------------------------------------|
| `/sys-ctrl-9x`   | AdminPortal | Hidden admin panel (no layout)     |

---

## 5. API Endpoints

### Authentication (`server.js`)
| Method | Path                                  | Auth | Description                         |
|--------|---------------------------------------|------|-------------------------------------|
| POST   | `/api/auth/login`                     | No   | Login with email + password         |
| POST   | `/api/auth/register`                  | No   | Create account                      |
| POST   | `/api/auth/logout`                    | Yes  | Logout (server-side cleanup)        |
| POST   | `/api/user`                           | Yes  | Refresh user data                   |
| POST   | `/api/auth/verify-account`            | No   | Submit crypto TX for verification   |
| POST   | `/api/auth/verification-docs/:user`   | Yes  | Upload face pic + ID (local/ephemeral) |
| POST   | `/api/profile-picture/:username`      | Yes  | Upload profile picture (GCS)        |

### Drops (`drauwper-routes.js`)
| Method | Path                              | Auth | Description                         |
|--------|-----------------------------------|------|-------------------------------------|
| GET    | `/api/drops`                      | No   | List drops (supports `?limit=`)     |
| GET    | `/api/drops/featured`             | No   | Featured, trending, newest, top creators |
| GET    | `/api/drops/:id`                  | No   | Single drop details                 |
| POST   | `/api/drops`                      | Yes  | Create a new drop                   |
| PUT    | `/api/drops/:id`                  | Yes  | Update a draft/pending drop         |
| DELETE | `/api/drops/:id`                  | Yes  | Delete a drop                       |
| POST   | `/api/drops/:id/contribute`       | Yes  | Contribute credits to a drop        |
| GET    | `/api/drops/:id/contributors`     | No   | List contributors for a drop        |
| GET    | `/api/drops/:id/reviews`          | No   | List reviews for a drop             |
| POST   | `/api/drops/:id/reviews`          | Yes  | Submit a review                     |

### Dashboard & History
| Method | Path                       | Auth | Description                 |
|--------|----------------------------|------|-----------------------------|
| GET    | `/api/dashboard`           | Yes  | User drops + stats          |
| GET    | `/api/users/:id`           | No   | Public user profile         |
| GET    | `/api/users/:id/drops`     | No   | User's public drops         |

---

## 6. Data Flow

### Contribution Flow
```
User clicks "Contribute" → ContributeForm
  ↓
POST /api/drops/:id/contribute  (amount, userId)
  ↓
Backend: deduct credits → insert into contributions → update drop totals → log momentum
  ↓
Response → Frontend: update local state + refreshUser() for balance sync
  ↓
DropFeature: re-fetch contributors + drop data → UI updates
```

### Verification Flow
```
1. User navigates to /verify
2. Uploads face photo + government ID → POST /api/auth/verification-docs/:username
   → Files saved locally to server/uploads/verification/:username/
   → DB: verification = 'pending'
3. User sends 2 micro-payments (exact amounts from registration)
4. Submits transaction hash → POST /api/auth/verify-account
   → Backend checks on-chain TX amounts vs stored amount1 & amount2
   → If match: verification = 'true'
5. Admin reviews docs → deletes from server/uploads/verification/
```

---

## 7. Database Schema (Key Tables)

### `userData`
Primary user table with auth, profile, moderation, and verification fields.

| Key Columns              | Type         | Notes                                |
|--------------------------|--------------|--------------------------------------|
| `id`                     | varchar(10)  | Primary key                          |
| `username`, `email`      | varchar      | Unique                               |
| `passwordHash`           | varchar(255) | bcrypt                               |
| `credits`                | int          | Current balance                      |
| `accountType`            | enum         | free / creator / premium             |
| `verification`           | varchar(10)  | none / false / pending / true        |
| `amount1`, `amount2`     | double       | Crypto verification amounts (USD)    |
| `cryptoAmounts`          | varchar(255) | JSON: per-chain equivalents          |
| `profilePicture`         | varchar(255) | GCS URL                              |

### `drops`
All drop metadata — title, description, file info, goal, contributions, timing.

### `contributions`
Each credit contribution: userId, dropId, amount, timestamp.

### `walletTransactions`
Ledger of all credit movements (purchases, contributions, refunds, redemptions).

### `CreditPurchases`
Credit purchase records with payment method and transaction details.

### `momentumLog`
Historical burn-rate / momentum snapshots per drop for analytics.

---

## 8. Authentication & Authorization

- **JWT** tokens issued on login/register, stored in `localStorage` (`drauwper_token`).
- Token included via `Authorization: Bearer <token>` header on all API calls.
- Backend middleware (`middleware/auth.js`) validates JWT on protected routes.
- `refreshUser()` re-fetches user data via `POST /api/user` to sync balance and verification status.

---

## 9. Credit System

- **Rate:** 1,000 credits = $1.00 USD
- **Purchase:** Stripe (card) or cryptocurrency
- **Redemption:** Only for verified accounts (`verification === 'true'`). Payout via crypto (BTC/ETH/LTC/SOL).
- **Buy/Redeem toggle** on the BuyCredits page — unverified accounts see a prompt to verify.
- **Contribution:** Credits spent on drops are deducted from balance, recorded in `contributions` and `walletTransactions`.

---

## 10. Burn Rate / Momentum Engine

### Formula

$$v = 1 + M$$

$$M_{\text{new}} = \left(M_{\text{old}} \cdot e^{-kt}\right) + \frac{\text{Contribution}}{\text{GoalAmount} \times \text{Sensitivity}}$$

- Countdown doesn't start until the **Spark Threshold** (minimum goal) is met.
- Below 80% of goal: BurnRateGauge shows a **snowflake** icon (cold/blue).
- At or above 80%: switches to **flame** icon (hot/orange).
- Excess credits beyond the goal feed directly into Momentum.
- Momentum decays exponentially over time — continuous contributions needed to maintain speed.

---

## 11. Account Verification (KYC Lite)

Two-step process enabling credit redemption:

1. **Document Upload:** User uploads a face photo and government-issued ID via `/verify`.
   - Files stored locally on the server (`server/uploads/verification/:username/`).
   - **Ephemeral** — deleted immediately after manual admin review.
   - Not stored on GCS to minimize data exposure.

2. **Crypto Micro-Payments:** Two small random amounts ($0.10–$0.20 USD each) are generated at registration.
   - User sends both amounts to the Drauwper wallet address using BTC, ETH, LTC, or SOL.
   - Submits the transaction hash; backend verifies on-chain amounts match (within $0.025 tolerance).
   - On success: `verification` set to `'true'`.

---

## 12. Development Setup

```bash
# Frontend (from project root)
npm install
npm run dev          # → localhost:5174

# Backend (from server/)
cd server
npm install
node server.js       # → localhost:3001
```

Vite proxies `/api/*` requests to `localhost:3001` in development (configured in `vite.config.ts`).

---

## 13. Environment Variables

### Frontend (`.env` in project root)
| Variable         | Description                    | Default        |
|------------------|--------------------------------|----------------|
| `VITE_API_URL`   | Backend API base URL           | `''` (proxy)   |

### Backend (`server/.env`)
| Variable                         | Description                              |
|----------------------------------|------------------------------------------|
| `DB_HOST`, `DB_USER`, `DB_PASS`  | MySQL connection                         |
| `DB_NAME`                        | Database name                            |
| `JWT_SECRET`                     | JWT signing secret                       |
| `JWT_EXPIRES_IN`                 | Token expiry (default `7d`)              |
| `GCS_BUCKET`                     | Google Cloud Storage bucket name         |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCS service account JSON         |
| `VERIFICATION_CODE_EXPIRY_MINUTES` | Email verification code TTL (default 30) |

---

*Drauwper v0.2 — Active Development*
