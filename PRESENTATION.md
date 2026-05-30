# PayNow Expense Tracker Presentation Notes

## 1) Code Map: Which File Does What

Use this section first in your presentation to explain how the app is organized.

### Frontend Pages

- `app/page.tsx` - Main home/dashboard page. This is where the user sees expenses, summary cards, and the main UI.
- `app/auth/page.tsx` - Sign in / sign up page. It handles email login and Google OAuth login.
- `app/profile/page.tsx` - User profile page. This is where the user connects PayNow Gmail and manages account settings.
- `app/analytics/page.tsx` - Analytics page for charts and spending insights.
- `app/categories/page.tsx` - Category management page.

### Authentication and State

- `app/contexts/auth-context.tsx` - Stores auth state and exposes functions like sign in, sign up, logout, and provider login.
- `components/language-provider.tsx` - Handles translations and localization strings.
- `components/theme-provider.tsx` - Handles theme switching.

### API Routes

- `app/api/expenses/route.ts` - Create and list expenses.
- `app/api/expenses/[id]/route.ts` - Update or delete a single expense.
- `app/api/categories/route.ts` - Create and list categories.
- `app/api/categories/[id]/route.ts` - Update or delete a category.
- `app/api/stats/route.ts` - Returns analytics data.
- `app/api/gmail/oauth/start/route.ts` - Starts the Gmail OAuth flow.
- `app/api/gmail/oauth/callback/route.ts` - Handles Gmail OAuth callback.
- `app/api/gmail-expenses/route.ts` - Reads imported Gmail expenses.
- `app/api/gmail-expenses/token/route.ts` - Receives and stores Gmail OAuth token.
- `app/api/stripe/checkout/route.ts` - Starts Stripe checkout.
- `app/api/stripe/portal/route.ts` - Opens Stripe billing portal.
- `app/api/stripe/membership/route.ts` - Handles membership actions.

### Core Logic / Helpers

- `lib/prisma.ts` - Prisma client used to read and write database data.
- `lib/gmail-oauth.ts` - Creates Gmail OAuth client, encrypts tokens, saves Gmail connection, and restores access.
- `lib/validation.ts` - Zod schemas for validating incoming request data.
- `lib/rate-limit.ts` - Simple request rate limiter to reduce abuse.
- `lib/supabase.ts` - Supabase client setup.
- `lib/stripe.ts` - Stripe helper functions.
- `lib/utils.ts` - Shared utility functions.

### UI Components

- `components/expense-dialog.tsx` - Form modal to create or edit an expense.
- `components/expense-card.tsx` - Shows one expense item.
- `components/expense-charts.tsx` - Displays charts and analytics.
- `components/receipt-import-dialog.tsx` - UI for importing receipts.
- `components/stat-card.tsx` - Summary statistic cards.
- `components/app-shell.tsx` - Main shell layout used across pages.
- `components/bottom-nav.tsx` - Mobile navigation.
- `components/theme-toggle.tsx` - Theme switch button.
- `components/ui/*` - Reusable UI primitives like Button, Input, Dialog, Select, etc.

### Database

- `prisma/schema.prisma` - Defines tables such as Expense, Category, User, Membership, and GmailConnection.
- `prisma/migrations/*` - Database migration history.

### Security and Data Flow

1. User signs in through `app/auth/page.tsx`.
2. Auth state is stored in `app/contexts/auth-context.tsx`.
3. Pages call API routes under `app/api/*`.
4. API routes validate input with `lib/validation.ts`.
5. API routes use `lib/prisma.ts` to save or fetch data.
6. Gmail OAuth is handled in `lib/gmail-oauth.ts` and `app/api/gmail/*`.
7. Sensitive Gmail tokens are encrypted before saving to the database.

## 2) 5-Minute Speaking Script

Use this if you want a simple explanation in presentation order.

### Intro

"This is PayNow Expense Tracker. It is a full-stack app for managing expenses, importing PayNow Gmail transactions, scanning receipts, and handling subscriptions."

### How the app is built

"The app is split into three layers. The first layer is the UI in `app/` and `components/`. The second layer is the API in `app/api/`. The third layer is the helper and database logic in `lib/` and `prisma/`."

### What happens when a user logs in

"When the user opens `app/auth/page.tsx`, they can sign in with email or Google. The auth state is stored in `app/contexts/auth-context.tsx`, which manages the user session for the whole app."

### What happens when a user adds an expense

"When the user submits an expense form, the frontend sends the data to `app/api/expenses/route.ts`. That route validates the request using Zod in `lib/validation.ts`, checks rate limits in `lib/rate-limit.ts`, and then uses Prisma in `lib/prisma.ts` to save the expense in PostgreSQL."

### What happens when a user connects Gmail

"On the profile page in `app/profile/page.tsx`, the user clicks Connect PayNow Gmail. That starts the Gmail OAuth flow in `app/api/gmail/oauth/start/route.ts`. The OAuth helper in `lib/gmail-oauth.ts` creates the Google login URL, handles the callback, encrypts the refresh token, and stores it in the database."

### Gmail refresh tokens & why an account may already look "connected"

- **How refresh works:** After OAuth completes the server receives tokens from Google and `saveGmailConnection()` stores the user's *refresh token* (encrypted) in the `GmailConnection` row for that application user. When the server needs to call Gmail it uses `getAuthorizedGmailClient(userId)` which loads the encrypted refresh token, decrypts it, and calls `auth.setCredentials({ refresh_token })`. The Google client library will then exchange the refresh token for an access token automatically when making API calls.

- **Where the token is stored:** The code writes an `encryptedRefreshToken` into the `GmailConnection` table (see `prisma.schema` model `GmailConnection`). The server never persists the plaintext token; it stores the encrypted value using the app's encryption key.

- **No hard-coded email in code:** There is no hard-coded Gmail account in the source. The app only uses the OAuth client ID/secret from env (the app-level credentials) and per-user encrypted refresh tokens saved in the database. If you see a specific Gmail account (for example `kiwikate003@gmail.com`) appearing as "connected" it means a `GmailConnection` row already exists for that application user.

- **Why a connection might appear before you click Connect:**
	- A previous test or seeded data created a `GmailConnection` for that user in the database.
	- You (or someone) previously completed the OAuth flow while signed into the same Supabase user, so the connection remains.
	- The app is running with a development/test user account (shared credentials) so the UI shows the connected email.
	- A background job or manual import created the `GmailConnection` row.

- **How to inspect and fix it:**
	1. Check the `GmailConnection` rows in the database (Supabase dashboard / Prisma Studio) and look at the `userId` and `googleEmail` columns to see which app user is connected.
	2. Call the status endpoint in the UI or `GET /api/gmail/oauth/status` (authenticated) to see the connection object returned by the server.
	3. If it is a leftover test row, delete the row (via Supabase UI or `prisma`/SQL) to remove the connection.
	4. Re-run the OAuth flow from the profile page to connect the desired Gmail account.

- **Debug tips:**
	- Use the debug endpoint `/api/debug/gmail` (added earlier) to verify the server-side client ID and the redirect URI the app uses.
	- Check server logs for OAuth callback activity (the callback routes log errors and success redirects). Look for `saveGmailConnection` calls and the `googleEmail` value returned by `gmail.users.getProfile`.

This summary explains why the app can show a connected Gmail even before clicking the Connect button, and how refresh tokens let the server access Gmail on behalf of the user without re-authorizing each time.

### Why the libraries were chosen

"I chose Next.js because it lets me build the frontend and backend in one project. I chose Prisma because it gives type-safe database queries. I chose Supabase because it provides auth and PostgreSQL. I chose Zod because it validates data safely. I chose Stripe for payments, and googleapis for Gmail integration."

### Closing

"So the main goal of the app is to reduce manual expense tracking. The Gmail import, receipt scanning, analytics, and secure auth all work together to save the user time and improve accuracy."

## 3) Feature-to-File Explanation

Use this table when you want to answer "which file does what?"

| Feature               | Main File                               | What it does                           |
| --------------------- | --------------------------------------- | -------------------------------------- |
| Sign in               | `app/auth/page.tsx`                     | Login and signup UI                    |
| Auth state            | `app/contexts/auth-context.tsx`         | Stores session and login functions     |
| Expense CRUD          | `app/api/expenses/route.ts`             | Creates and lists expenses             |
| Expense update/delete | `app/api/expenses/[id]/route.ts`        | Edits or removes one expense           |
| Categories            | `app/api/categories/route.ts`           | Manages expense categories             |
| Gmail connect         | `app/api/gmail/oauth/start/route.ts`    | Starts Gmail OAuth                     |
| Gmail callback        | `app/api/gmail/oauth/callback/route.ts` | Receives Google callback               |
| Gmail token save      | `lib/gmail-oauth.ts`                    | Encrypts and stores Gmail token        |
| Validation            | `lib/validation.ts`                     | Checks request data before DB write    |
| Rate limit            | `lib/rate-limit.ts`                     | Prevents API abuse                     |
| Database              | `prisma/schema.prisma`                  | Defines tables and relations           |
| UI components         | `components/*`                          | Reusable forms, cards, dialogs, charts |

## 4) Why These Files Matter Most

- `app/profile/page.tsx` is where the Gmail connect flow starts.
- `app/api/gmail/oauth/start/route.ts` is where the OAuth URL is created.
- `lib/gmail-oauth.ts` is where tokens are encrypted and stored.
- `app/api/expenses/route.ts` is where expense data is validated and saved.
- `prisma/schema.prisma` shows the complete data model.
- `lib/validation.ts` and `lib/rate-limit.ts` show security and reliability.

## 5) Short Summary You Can Say Out Loud

"I built the app with a clean separation between pages, API routes, helper logic, and database schema. The user interacts with pages in `app/`, requests are processed by `app/api/`, shared logic lives in `lib/`, and the database structure is defined in `prisma/schema.prisma`. This makes the app easier to maintain, safer, and easier to explain."

## 2) What to Say in the Presentation

You can explain the app like this:

"The app is split into three main layers. The first layer is the UI inside the `app/` and `components/` folders. The second layer is the API inside `app/api/`, which handles expenses, categories, Gmail import, and Stripe. The third layer is the helper and database logic inside `lib/` and `prisma/`."

"For example, when a user adds an expense, the form on the frontend sends a request to `app/api/expenses/route.ts`. That route checks the input using Zod in `lib/validation.ts`, then uses Prisma in `lib/prisma.ts` to save the data in PostgreSQL."

"For Gmail, the user clicks Connect Gmail from the profile page. That triggers `app/api/gmail/oauth/start/route.ts`, which creates the OAuth URL using `lib/gmail-oauth.ts`. After Google sends the callback, the token is encrypted and stored securely."

## 3) Why These Files Matter

- `app/auth/page.tsx` shows how login works.
- `app/profile/page.tsx` shows where Gmail connection happens.
- `app/api/expenses/route.ts` shows the main CRUD flow.
- `lib/gmail-oauth.ts` is the most important file for Gmail integration.
- `lib/validation.ts` and `lib/rate-limit.ts` show security and stability.
- `prisma/schema.prisma` shows the database design.

## 4) Short Presentation Flow

1. Start with the code map.
2. Explain the frontend pages.
3. Explain the API routes.
4. Explain the helper files.
5. Explain Gmail OAuth and security.
6. End with the main features and why the library choices were good.
