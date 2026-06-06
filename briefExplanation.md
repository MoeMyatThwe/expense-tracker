# Authentication Feature Explanation

The authentication feature lets users access the expense tracker in two ways:

1. Continue with Google
2. Sign in or sign up with email and password

The app uses Supabase Authentication as the main authentication provider. Supabase handles the secure login, signup, Google OAuth, email verification, password reset, and session/token management. The app then syncs the authenticated Supabase user into the app database so the user can own expenses, categories, family data, Gmail connections, and membership records.

## Tech Stack Used

### Frontend UX

- Next.js App Router: Used for pages such as `/auth`, `/auth/callback`, and `/auth/reset-password`.
- React: Used to manage form state, loading state, error state, and authentication context.
- Supabase JavaScript Client: Used in the browser to call Supabase Auth methods.
- Framer Motion: Used for small animations on the authentication screen, logo, cards, and feedback panels.
- Tailwind CSS / shadcn-style UI components: Used for buttons, inputs, labels, and responsive layout.
- Sonner: Used for toast messages such as successful sign in, password reset email sent, and errors.
- Lucide React: Used for icons such as eye/eye-off, mail, and lock.
- Next Image: Used to load the app logo and theme assets.

### Backend / Data

- Supabase Auth: Handles the real authentication identity, sessions, OAuth, and password reset.
- Supabase PostgreSQL: Stores the app's relational data.
- Prisma: Used by backend API routes to create or update the matching app user record in the database.
- Next.js API Routes: Used for app-specific user syncing through `/api/users`.

## Why Supabase Is Used

Supabase is used because it provides ready-made secure authentication features:

- Email/password signup and login
- Google OAuth provider support
- Email verification
- Password reset emails
- Session and token management
- User identity storage

This means the app does not manually store passwords or implement OAuth security from scratch. Supabase handles the sensitive authentication work, and the app focuses on connecting the authenticated user to expense-tracking data.

# --------------------------------------

# Category Page Feature Explanation

## What This Feature Does

The category page lets users manage the labels they use to organize their records. A user can:

1. View their categories
2. Create a new category
3. Choose an icon for the category
4. Edit an existing category
5. Delete a category

Categories are user-specific. This means each logged-in user has their own category list, and one user's categories do not affect another user's categories.


## Tech Stack Used

### Frontend UX

- Next.js App Router: Used for the `/categories` page.
- React: Used for page state such as category list, selected icon, edit mode, loading state, and modal state.
- Supabase JavaScript Client: Used to get the current session and access token.
- Tailwind CSS / shadcn-style UI components: Used for inputs, selects, cards, dropdown menus, and buttons.
- Framer Motion: Used for page entrance animations.
- Lucide React: Used for action icons such as add, edit, delete, menu, and cancel.
- Next Image: Used by `CategoryIcon` to show custom Cinnamoroll-themed category images.
- Operation Modal: Used to show success and error feedback after create, update, or delete.
- Confirmation Modal: Used before deleting a category.

### Backend / Data

- Supabase Auth: Used to verify which user is making the request.
- Next.js API Routes: Used for category CRUD endpoints.
- Prisma: Used to read and write categories in the PostgreSQL database.
- Supabase PostgreSQL: Stores the `Category` records.
- Zod validation: Used through category validation schemas before saving data.

#--------------------------------------------------


# Settings / Profile Page, Membership, and PayNow Connection Explanation

## What This Feature Does

The settings/profile page is the control center for the user's account. From this page, the user can:

1. View their account email
2. Change app appearance settings
3. Change language and text size
4. Change password
5. Manage family settings
6. Connect or disconnect Gmail for PayNow import
7. View and manage membership status
8. Start Stripe payment for premium membership
9. View payment history
10. Cancel auto-renew membership


## Tech Stack Used

### Frontend UX

- Next.js App Router: Used for the `/profile` settings page.
- React: Used for membership state, Gmail connection state, form state, modal state, and loading state.
- Supabase JavaScript Client: Used to get the current authenticated session token.
- Tailwind CSS / shadcn-style UI components: Used for cards, buttons, dialogs, selects, and form inputs.
- Lucide React: Used for settings icons such as user, credit card, Gmail connection, key, language, and logout.
- Sonner: Used for quick success/error toast messages.
- Confirmation Modal: Used before cancelling an auto-renew subscription.
- Operation Modal: Used for success/error feedback after important actions.
- Stripe Checkout redirect: Used when the user starts membership payment.
- Google OAuth redirect: Used when the user connects Gmail for PayNow import.


### Backend / Data

- Supabase Auth: Verifies the current user using the access token.
- Prisma: Reads and writes membership, Gmail connection, and user records.
- Supabase PostgreSQL: Stores app membership and Gmail connection data.
- Stripe API: Creates checkout sessions, billing portal sessions, subscriptions, invoices, and payment history.
- Google OAuth / Gmail API: Connects the user's Gmail account and later reads PayNow emails.
- Node crypto: Encrypts Gmail refresh tokens before saving them.


## PayNow Connection Overview

The PayNow connection is implemented through Gmail OAuth. The user connects Gmail so the app can read PayNow transaction emails from Gmail.

For membership, I use Stripe. The user can choose auto-renew or manual renewal. When they start payment, my backend creates a Stripe Checkout session and redirects the user to Stripe. After payment, Stripe redirects back to the profile page with a session ID. My backend verifies that the Stripe session belongs to the logged-in user, then updates the membership record in my database using Prisma.

For PayNow connection, I use Google OAuth and the Gmail API. The app asks for Gmail readonly permission, so it can read PayNow transaction emails but cannot send or delete emails. When the user connects Gmail, Google returns tokens to my callback route. The refresh token is encrypted before it is stored in the database. After that, the app can use the connection later to import PayNow expenses.

# --------------------------------------------------

# Expense / Ledger Page Explanation

## What This Feature Does

The expense page is the main ledger of the app. It lets users:

1. View all records
2. Add a new record manually
3. Add a record using speech input
4. Edit a record
5. Delete a record
6. Filter records by type
7. Filter records by month and year
8. View personal, family, or all records
9. Refresh PayNow records from Gmail
10. Scan a receipt and import receipt items

The page is called the ledger because it does more than expenses. It also supports income, liabilities, reimbursements, and recurring records.

### Backend / Data

- Supabase Auth: Verifies the logged-in user using the access token.
- Next.js API Routes: Used for expense CRUD and Gmail/receipt import endpoints.
- Prisma: Reads and writes expense records in PostgreSQL.
- Supabase PostgreSQL: Stores personal expenses, family expenses, categories, and user records.
- Zod: Validates expense create and update payloads.
- Google Gmail API: Imports PayNow records from Gmail.
- Python OCR with RapidOCR ONNX Runtime: Extracts receipt text from uploaded receipt images.

## Important Note About Speech-to-Text

For speech-to-text, this app does **not** use a custom AI model or an OpenAI model.

It uses the browser's built-in Web Speech API:

RapidOCR reads text from receipt images.
ONNX Runtime runs the OCR model efficiently.
Your Python script then uses regex and custom logic to extract receipt total, date, merchant, category, and item lines.
So for presentation, you can say:

For receipt scanning, I use the rapidocr-onnxruntime Python OCR library. It extracts text from the receipt image, then my script parses the OCR text to find the merchant, amount, date, and items.

#------------------------

# Analytics Page Explanation

## What This Feature Does

The analytics page helps users understand their spending. It shows:

1. Total spending for the selected month
2. Spending change compared with the previous month
3. Number of expense records
4. Number of spending categories used
5. Category spending breakdown
6. Monthly spending across the selected year
7. A friendly summary message based on spending behavior

# tech stack
 Recharts: Used for the pie chart and bar chart.