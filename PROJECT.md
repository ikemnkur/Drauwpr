# Drauwper — Project Documentation

> **Drauwper** is a social file-drop platform where creators upload files and set a future release time. Viewers spend credits to accelerate the countdown through a dynamic "burn rate" mechanic powered by real-time momentum.

*Last updated: 2026-04-30*
*Payment Processing (Stripe Sessions + TATUM API) — Updated 2026-04-30*

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
10. [Payment Processing](#10-payment-processing)
11. [Burn Rate / Momentum Engine](#11-burn-rate--momentum-engine)
12. [Account Verification (KYC Lite)](#12-account-verification-kyc-lite)
13. [Development Setup](#13-development-setup)
14. [Environment Variables](#14-environment-variables)

---

## 1. Architecture Overview

```
┌──────────────────────┐       ┌───────────────────────┐
│   React Frontend     │──────▶│   Express.js Backend   │
│   (Vite + TS)        │  API  │   (Node.js)            │
│   localhost:5174      │◀──────│   localhost:4000        │
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
├── vite.config.ts                # Vite config (API proxy → :4000)
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
| `/forgot-password` | ForgotPassword  | Request password reset          |
| `/reset-password`  | ResetPassword   | Reset password from token       |
| `/password-reset`  | ResetPassword   | Alias route for reset flow      |
| `/verify-email`    | Verification    | Email verification entry        |

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
| `/buy-credits`     | BuyCredits          | Buy or redeem credits             |
| `/buy-credits/stripe` | BuyStripe        | Stripe checkout flow              |
| `/buy-credits/crypto` | BuyCrypto        | Crypto purchase flow              |
| `/redeem`          | Redeem              | Redeem credits flow               |
| `/history`         | History             | Contribution history ledger       |
| `/notifications`   | Notifications       | User notifications inbox          |
| `/promo`           | AdsPromo            | Promo hub                         |
| `/promo/create-ad` | PromoCreateAd       | Submit ad promotion               |
| `/promo/sponsor-drop` | PromoSponsorDrop | Submit drop sponsorship           |
| `/contributions`   | ActiveContributions | Drops you've contributed to       |
| `/create`          | CreateDrop          | Create a new drop                 |
| `/drop/:id/edit`   | EditDrop            | Edit a pending drop               |
| `/drop/:id/download` | DropDownload     | Download page (post-release)      |
| `/drop/:id/review` | DropReview          | Review/feedback page              |
| `/plans`           | Plans               | Subscription plan management      |
| `/edit-profile`    | EditProfile         | Edit profile and upload images    |

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
| PUT    | `/api/users/profile`                  | Yes  | Update bio/avatar/banner/socials    |
| POST   | `/api/users/profile/avatar-upload`    | Yes  | Upload avatar image to GCS          |
| POST   | `/api/users/profile/banner-upload`    | Yes  | Upload profile banner image to GCS  |
| POST   | `/api/auth/verify-account`            | No   | Submit crypto TX for verification   |
| POST   | `/api/auth/verification-docs/:user`   | Yes  | Upload face pic + ID (local/ephemeral) |
| POST   | `/api/profile-picture/:username`      | Yes  | Legacy profile upload route (GCS)   |

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
| GET    | `/api/history/promo-charges` | Yes | Promo billing charge history |

### Payment Processing
| Method | Path                              | Auth | Description                              |
|--------|-----------------------------------|------|------------------------------------------|
| POST   | `/api/stripe/create-checkout-session` | Yes  | Create Stripe checkout session       |
| POST   | `/webhook/stripe`                 | No   | Stripe webhook handler (signature verified) |
| GET    | `/api/stripe/check-session/:id`   | Yes  | Poll session status (backup method)      |
| POST   | `/api/purchases/:username`        | Yes  | Submit crypto purchase for verification  |
| GET    | `/api/crypto-rate`                | No   | Get current crypto exchange rates        |
| POST   | `/api/crypto/verify-transaction`  | Yes  | Manually verify crypto transaction       |

### Admin — Payment Review (`server-admin.js`)
| Method | Path                                  | Auth  | Description                         |
|--------|---------------------------------------|-------|-------------------------------------|
| GET    | `/admin/review/purchases`             | Admin | Unified payment review (Stripe + Crypto) |
| POST   | `/admin/api/review/purchases/:id/:action` | Admin | Approve/Hold/Reject purchase    |
| GET    | `/admin/review/stripe`                | Admin | Stripe Payment Intents (reference)  |
| GET    | `/admin/review/crypto`                | Admin | Blockchain transactions (reference) |
| POST   | `/admin/api/review/stripe/sync`       | Admin | Sync Stripe payment intents         |

### Notifications & Routing Notes
- Notification `actionUrl` values for released/downloadable drops now use `/drop/:id/download`.
- Older stored notifications may still contain legacy `/download/:id` links until replaced.

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

## 10. Payment Processing

### Architecture Overview

Drauwper supports two primary payment methods:
1. **Stripe** (Credit/Debit Cards) — Session-based checkout with webhook verification
2. **Cryptocurrency** (BTC, ETH, LTC, SOL) — TATUM API with legacy API fallback

### Stripe Payment Flow

#### Primary: Checkout Session + Webhooks
```
User initiates purchase → Create Checkout Session
  ↓
Stripe Hosted Page → User completes payment
  ↓
Webhook: checkout.session.completed
  ↓
Backend: Award credits + Create wallet transaction
  ↓
User sees updated balance
```

**Implementation:**
- Creates Stripe Checkout Session with `success_url` and `cancel_url`
- Session ID stored in `CreditPurchases.stripeCheckoutSessionId`
- **Primary verification:** Webhook handler at `/webhook/stripe` (signature verification required)
- Credits awarded immediately upon successful webhook event
- Wallet transaction created with proper audit trail

#### Backup: Session Polling
If webhooks fail or are delayed, a fallback polling mechanism checks session status:
- Polls Stripe API every 3 seconds for session completion
- Max 10 attempts (30 seconds total)
- Awards credits if session status is `'complete'` and payment status is `'paid'`
- Prevents duplicate awards by checking existing records

**Benefits:**
- Ensures credits are awarded even if webhooks fail
- Provides immediate user feedback
- Duplicate-proof via database constraints

### Cryptocurrency Payment Flow

#### Primary: TATUM API Integration

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│  Payment Verification (Real-time)                       │
│  ↓                                                       │
│  1. TATUM API (Primary) ──────→ Blockchain Data         │
│     • Multi-chain support (BTC, LTC, ETH, SOL)          │
│     • Unified API interface                             │
│     • Real-time webhook notifications                   │
│  ↓                                                       │
│  2. If TATUM fails:                                     │
│     Legacy APIs (Fallback) ──→ Blockchain Data          │
│     • BTC: Blockstream Esplora                          │
│     • LTC: Litecoin Esplora                             │
│     • ETH: Etherscan                                    │
│     • SOL: Solana RPC                                   │
│  ↓                                                       │
│  3. Cache in database (BTC_TX, LTC_TX, ETH_TX, SOL_TX)  │
│  ↓                                                       │
│  4. Verify transaction:                                 │
│     • Direction: inbound to platform wallet             │
│     • Amount: matches expected payment                  │
│     • Address: correct receiving wallet                 │
│  ↓                                                       │
│  5. Award credits + Create wallet transaction           │
└─────────────────────────────────────────────────────────┘
```

**TATUM API Features:**
- **Primary Method:** Unified blockchain API for all supported chains
- **Endpoints:**
  - Transaction history: `/v3/{chain}/transaction/address/{address}`
  - Real-time webhooks: `/webhooks/crypto-payments`
- **Benefits:**
  - Faster response times vs. chain-specific APIs
  - Better reliability with webhook support
  - Unified error handling
  - Multi-chain support with single integration

**Fallback APIs:**
- **BTC:** Blockstream Esplora (`https://blockstream.info/api/`)
- **LTC:** Litecoin Esplora (`https://litecoinspace.org/api/`)
- **ETH:** Etherscan API (requires API key)
- **SOL:** Solana RPC (`https://api.mainnet-beta.solana.com`)

**Transaction Verification Process:**
1. Check database cache first (fast path)
2. If not found, fetch from TATUM API (primary)
3. If TATUM fails, fall back to chain-specific API
4. Verify transaction properties:
   - `direction === 'inbound'`
   - `toAddress === RECEIVING_WALLETS[chain]`
   - Transaction confirmed on blockchain
5. Award credits if verified, otherwise queue for manual review

**Cron Job Synchronization:**
- Runs every 30 minutes via `FetchRecentTransactionsCron()`
- Syncs latest 100 transactions per chain
- Updates blockchain transaction cache tables
- Automatic TATUM-first with fallback to legacy APIs

**Manual Review Flow:**
If automatic verification fails:
1. Purchase recorded with `status: 'processing'`
2. Admin review at `/admin/review/purchases`
3. Admin can:
   - **Approve:** Award credits + create wallet transaction
   - **Hold:** Keep in pending state
   - **Reject:** Mark as failed/refunded
4. User receives notification of outcome

### Payment Method Tables

#### Stripe Tables
- `CreditPurchases` — Purchase records with `stripeCheckoutSessionId`, `stripePaymentIntentId`
- `stripeTransactions` — Raw Stripe webhook events (audit log)
- `subscriptions` — Subscription management

#### Crypto Tables
- `CreditPurchases` — Purchase records with `txHash`, `walletAddress`, `currency`
- `BTC_TX`, `LTC_TX`, `ETH_TX`, `SOL_TX` — Blockchain transaction cache
  - Columns: `txHash`, `direction`, `amount`, `fromAddress`, `toAddress`, `created_at`
- `verificationTxLog` — Crypto micro-payment verification attempts

### Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# TATUM API (Primary crypto method)
TATUM_API_KEY=your_tatum_api_key

# Legacy Crypto APIs (Fallback)
ETHERSCAN_API_KEY=your_etherscan_key

# Receiving Wallets
WALLET_BTC=bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6
WALLET_LTC=ltc1qgg5aggedmvjx0grd2k5shg6jvkdzt9dtcqa4dh
WALLET_ETH=0x9a61f30347258A3D03228F363b07692F3CBb7f27
WALLET_SOL=qaSpvAumg2L3LLZA8qznFtbrRKYMP1neTGqpNgtCPaU
```

### Admin Payment Review

**Unified Purchases Page:** `/admin/review/purchases`
- Shows ALL payment methods (Stripe + Crypto) in one interface
- Filters: Status (pending/completed/failed), Payment Method (all/stripe/crypto)
- Actions: Approve, Hold, Reject
- Displays `stripeCheckoutSessionId` for Stripe or `txHash` for crypto

**Blockchain Transactions Page:** `/admin/review/crypto`
- Shows actual blockchain transactions from all chain tables
- Filters: Chain (BTC/LTC/ETH/SOL), Direction (inbound/outbound)
- Read-only reference for checking payment history
- Real-time sync from TATUM + legacy APIs

**Reference Pages:**
- `/admin/review/stripe` — Stripe Payment Intents (raw Stripe data)
- `/admin/review/crypto` — Blockchain transactions (raw blockchain data)
- Both are reference-only, actions performed on Purchases page

---

## 11. Burn Rate / Momentum Engine

### Formula

$$v = 1 + M$$

$$M_{\text{new}} = \left(M_{\text{old}} \cdot e^{-kt}\right) + \frac{\text{Contribution}}{\text{GoalAmount} \times \text{Sensitivity}}$$

- Countdown doesn't start until the **Spark Threshold** (minimum goal) is met.
- Below 80% of goal: BurnRateGauge shows a **snowflake** icon (cold/blue).
- At or above 80%: switches to **flame** icon (hot/orange).
- Excess credits beyond the goal feed directly into Momentum.
- Momentum decays exponentially over time — continuous contributions needed to maintain speed.

---

## 12. Account Verification (KYC Lite)

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

## 13. Development Setup

```bash
# Frontend (from project root)
npm install
npm run dev          # → localhost:5174

# Backend (from server/)
cd server
npm install
node server.js       # → localhost:4000
```

Vite proxies `/api/*` requests to `localhost:4000` in development (configured in `vite.config.ts`).

---

## 14. Environment Variables

### Frontend (`.env` in project root)
| Variable         | Description                    | Default        |
|------------------|--------------------------------|----------------|
| `VITE_API_URL`   | Backend API base URL           | `''` (proxy)   |

### Backend (`server/.env`)
| Variable                         | Description                                      |
|----------------------------------|--------------------------------------------------|
| `DB_HOST`, `DB_USER`, `DB_PASS`  | MySQL connection                                 |
| `DB_NAME`                        | Database name                                    |
| `JWT_SECRET`                     | JWT signing secret                               |
| `JWT_EXPIRES_IN`                 | Token expiry (default `7d`)                      |
| `GCS_BUCKET`                     | Google Cloud Storage bucket name                 |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCS service account JSON                 |
| `VERIFICATION_CODE_EXPIRY_MINUTES` | Email verification code TTL (default 30)       |
| **Payment Processing:**          |                                                  |
| `STRIPE_SECRET_KEY`              | Stripe API secret key (sk_test_... or sk_live_...) |
| `STRIPE_WEBHOOK_SECRET`          | Stripe webhook signing secret (whsec_...)        |
| `TATUM_API_KEY`                  | TATUM API key for crypto transactions (primary)  |
| `ETHERSCAN_API_KEY`              | Etherscan API key (fallback for ETH)            |
| **Receiving Wallets:**           |                                                  |
| `WALLET_BTC`                     | Bitcoin receiving address                        |
| `WALLET_LTC`                     | Litecoin receiving address                       |
| `WALLET_ETH`                     | Ethereum receiving address                       |
| `WALLET_SOL`                     | Solana receiving address                         |

---

*Drauwper v0.2 — Active Development*
