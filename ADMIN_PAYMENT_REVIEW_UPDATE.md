# Admin Payment Review System Update

## Summary
Updated the admin payment review system to centralize all purchase approvals in the CreditPurchases table, with Stripe and Crypto tables serving as reference data only.

## Changes Made

### 1. Database Schema Update
**File:** `server/DB/PurchasedCredits.sql`
- Added `stripeCheckoutSessionId` field to CreditPurchases table
- This field stores the Stripe checkout session ID for purchases made via Stripe

**Migration Required:**
```sql
ALTER TABLE CreditPurchases 
ADD COLUMN stripeCheckoutSessionId VARCHAR(255) DEFAULT NULL 
AFTER stripeChargeId;
```

### 2. Backend Payment Processing
**File:** `server/server.js`

#### Updated verify-stripe-payment endpoint (lines ~5890-5920)
- Now passes `stripeCheckoutSessionId` to `stripeCreditPurchases` function
- Changed from storing session ID in `session_id` field to dedicated `stripeCheckoutSessionId` field

#### Updated stripeCreditPurchases function (lines ~5975-6080)
- Added `stripeCheckoutSessionId` parameter to destructuring
- Now saves checkout session ID to database when creating purchases
- Maintains support for both checkout session and payment intent identification

### 3. Admin Panel Updates
**File:** `server/server-admin.js`

#### New Navigation Item
- Added "💰 Purchases" link to admin navigation menu (before Stripe and Crypto)

#### New Credit Purchases Review Page (`/review/purchases`)
**Features:**
- Shows ALL purchases from CreditPurchases table (Stripe + Crypto)
- Displays appropriate transaction identifiers:
  - For Stripe: `checkout_session_id` or `payment_intent_id`
  - For Crypto: `tx_hash`
- Filterable by:
  - Status (All, Pending, Completed, Failed)
  - Payment Method (All, Stripe, Crypto)
- Sortable by date, amount, credits, user
- Search functionality for ID, user, or transaction
- Approve/Hold/Reject actions for all purchases

#### New API Endpoint (`/api/review/purchases/:id/:action`)
**Actions:**
- `approve`: Marks purchase as completed, credits user account, creates wallet transaction
- `reject`: Marks purchase as failed, sends rejection notification
- `processing`: Sets purchase to hold status

**Features:**
- Prevents double-approval of completed purchases
- Creates notifications for users on approval/rejection
- Creates wallet transaction records for approved purchases
- Transaction-safe with Knex transactions

#### Updated Stripe Review Page (`/review/stripe`)
**Changes:**
- Changed title to "Stripe Data Reference"
- Added notice: "For payment approval/review, see the Purchases page"
- Removed Approve/Hold/Reject action buttons from payments table
- Removed Actions column from payments table
- Removed action buttons from subscriptions table
- Made "Purchase Row" column link to Purchases page when clicked
- Kept "Sync Stripe Now" functionality for data updates

#### Updated Crypto Review Page (`/review/crypto`)
**Changes:**
- Changed title to "Crypto Purchases Reference"
- Added notice: "For payment approval/review, see the Purchases page"
- Removed Approve/Hold/Reject action buttons
- Removed Actions column from table
- Kept read-only view of crypto purchases for reference

### 4. Workflow Changes

#### Old Workflow
1. Stripe payments → Review in Stripe page → Approve to update CreditPurchases
2. Crypto payments → Review in Crypto page → Approve to update CreditPurchases
3. Two separate review interfaces with different logic

#### New Workflow
1. All payments (Stripe + Crypto) → Automatically inserted into CreditPurchases
2. Admin reviews in unified **Purchases** page
3. Stripe/Crypto pages available as reference data only
4. Single approval logic for all payment types

## Benefits

1. **Centralized Approval**: All purchase approvals happen in one place
2. **Consistency**: Same approval logic for Stripe and Crypto purchases
3. **Better Data Model**: CreditPurchases is the source of truth, not external data
4. **Checkout Session Support**: Now properly tracks Stripe checkout sessions
5. **Clearer Purpose**: Reference tables are clearly marked as read-only

## Testing Required

1. **Database Migration**: Run ALTER TABLE statement on production database
2. **Stripe Payment Flow**:
   - Complete a Stripe checkout
   - Verify `stripeCheckoutSessionId` is saved in CreditPurchases
   - Check purchase appears in `/review/purchases` page
   - Test approve/reject actions
3. **Crypto Payment Flow**:
   - Complete a crypto payment
   - Verify purchase appears in `/review/purchases` page
   - Test approve/reject actions
4. **Navigation**:
   - Verify "Purchases" link appears in admin menu
   - Verify Stripe/Crypto pages show as "Reference" only
5. **Notifications**:
   - Verify users receive notification on approval/rejection
6. **Credits**:
   - Verify credits are added to user account only once on approval
   - Verify wallet transaction is created

## Notes

- The old Stripe/Crypto review API endpoints (`/api/review/stripe/payment/:id/:action` and `/api/review/crypto/:id/:action`) still exist but are no longer accessible from the UI
- stripeTransactions table remains for Stripe sync data but is no longer used for approvals
- The `session_id` field in CreditPurchases still stores user session ID, not checkout session
