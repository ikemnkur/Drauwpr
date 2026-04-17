# Drauwper — Project Scope & Structure

> **Drauwper** (a playful misspelling of "Dropper") is a social file-drop platform where creators upload files and set a future release time. Viewers spend credits to accelerate the countdown through a dynamic "burn rate" mechanic.

---

## 1. Core Concept

| Term | Definition |
|------|-----------|
| **Drop** | A file/document/app/game uploaded by a creator with a scheduled future release. |
| **Burn Rate** | The speed at which the countdown clock advances. Base rate is 1:1 real-time. |
| **Momentum** | A dynamic multiplier fuelled by viewer contributions. Decays exponentially over hours. |
| **Credits** | In-app currency. **1,000 credits = $1.00 USD**. |
| **Spark Threshold** | Minimum contribution goal that must be met before the countdown timer starts. |

---

## 2. The Momentum Burn Formula

### Burn Rate

$$v = 1 + M$$

- **Base Rate:** 1 second of real time = 1 second of clock time.
- **Momentum (M):** Increases with contributions, decays exponentially.

### Momentum Update

$$M_{\text{new}} = \left(M_{\text{old}} \cdot e^{-kt}\right) + \frac{\text{Contribution}}{\text{GoalAmount} \times \text{Sensitivity}}$$

| Parameter | Purpose |
|-----------|---------|
| $k$ | Decay constant — controls how fast momentum fades (tunable). |
| $t$ | Time elapsed since last update (seconds). |
| Sensitivity | Prevents small donations from instantly collapsing a long timer. |

---

## 3. Credit System & Threshold Release

### Spark Threshold
- The countdown **does not start** until a **Minimum Contribution Goal** is met.
- Ensures the creator receives baseline support before the file becomes available.

### Excess Credits
- Contributions above the minimum goal are converted to **Momentum Units** driving the burn rate.

### Refund / Safety Net
- If the minimum goal is **not met** within a host-defined expiry window (default 7 days), all credits are **returned** to contributor wallets.

---

## 4. Post-Drop Pricing Models

| Model | Mechanic | Benefit |
|-------|----------|---------|
| **Contributor Discount** | `Price = BasePrice × (1 − floor(UserContribution^1.5) / TotalGoal)` | Early supporters get a permanent proportional discount. |
| **Time-Based Decay** | Price drops X% every 24 hours post-release. | "Patient" users wait for a deal; hype users pay day-one premium. |
| **Volume-Based Decay** | Price drops after every 1,000 downloads. | Rewards community virality — more shares → cheaper price. |
| **Large Contributor Rewards** | Tiered perks for top contributors. | Premium download speeds, commission on post-sales, shout-outs. |
| **Wait Penalty** | Cost to contribute increases ≤1% per day as expiry nears. | Discourages last-minute swarms. |

---

## 5. Finances

- **Currency:** Credit-based — 1,000 credits = $1 USD.
- **Payment Methods:** Stripe (card), Cryptocurrency.
- **Revenue Streams:** Credit purchases, post-drop download fees, premium creator plans (future).

---

## 6. Application Pages & UI

### 6.1 Drop Feature Page *(pre-release)*
- Product trailer / hero media
- Product info & promo description
- **Analogue clock** — large, showing estimated time to drop (`DD:HH:MM:SS`)
- **Burn rate indicator** with flame icon 🔥
- Goal amount shown as **percentage bar**
- Contributor count
- Expiry date *(visible only when minimum goal has **not** been met)*
- Contribution form / actions

### 6.2 Drop Download Page *(post-release)*
- Product info & trailer
- List of contributors (honour roll)
- Paid download button
- Dynamic price display

### 6.3 Drop Review Page *(post-download)*
- Comment / feedback submission
- Like / Dislike buttons
- Quality rating slider (0–100%)

### 6.4 Standard Pages
| Page | Notes |
|------|-------|
| **Dashboard** | Search drops, waitlist/favourites |
| **Active Contributions** | View live drops you've contributed to |
| **Login / Register / Verify** | Auth flows |
| **Account** | Profile, settings, wallet balance |
| **Buy Credits** | Stripe / crypto purchase flow |
| **Help / Info** | FAQ, how burn-rate works, terms |
| **Contribution History** | Past and active contribution ledger |

---

## 7. Tech Stack (Mock-Up)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| State | React Context (mock data) |
| Icons | Lucide React |
| Charts/Gauges | Custom SVG components |

> This mock-up uses **simulated data only** — no backend or database. It demonstrates the UI, page flow, and burn-rate visualisation.

---

## 8. Project Directory Structure

```
Drauwpr/
├── PROJECT_SCOPE.md          # This file
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types.ts                # Shared TypeScript types
    ├── data/
    │   └── mock.ts             # Mock drops, users, contributions
    ├── engine/
    │   └── burnRate.ts         # Momentum & burn-rate calculations
    ├── context/
    │   └── AppContext.tsx       # Global state provider
    ├── components/
    │   ├── Layout.tsx           # Shell with nav
    │   ├── Navbar.tsx
    │   ├── AnalogClock.tsx      # SVG countdown clock
    │   ├── BurnRateGauge.tsx    # Flame-style burn indicator
    │   ├── GoalProgress.tsx     # Percentage bar
    │   ├── ContributorList.tsx
    │   ├── ContributeForm.tsx
    │   ├── PriceDisplay.tsx
    │   ├── ReviewForm.tsx
    │   └── RatingSlider.tsx
    └── pages/
        ├── Dashboard.tsx
        ├── DropFeature.tsx      # Pre-release drop page
        ├── DropDownload.tsx     # Post-release download page
        ├── DropReview.tsx       # Review / feedback page
        ├── ActiveContributions.tsx
        ├── Login.tsx
        ├── Register.tsx
        ├── Account.tsx
        ├── BuyCredits.tsx
        ├── Help.tsx
        └── History.tsx
```

---

## 9. Future Considerations (Out of Scope for Mock-Up)

- Backend API (Node/Express or Python/FastAPI)
- Database (PostgreSQL + Redis for real-time burn state)
- File storage (S3-compatible)
- WebSocket for live burn-rate updates
- Stripe & crypto payment integration
- Creator analytics dashboard
- Mobile-responsive / PWA
- Admin moderation tools
- Anti-fraud / rate-limiting on contributions

---

*Document created: 2026-03-30 — Drauwper v0.1 Mock-Up Scope*
