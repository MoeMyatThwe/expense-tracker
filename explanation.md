# Authentication Feature Explanation

## What This Feature Does

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

## Files Involved

- `app/auth/page.tsx`: The login/signup page UI.
- `app/contexts/auth-context.tsx`: The main authentication logic used by the app.
- `lib/supabase.ts`: Creates the Supabase client using environment variables.
- `app/auth/callback/page.tsx`: Completes OAuth sign in after Google redirects back to the app.
- `app/auth/reset-password/page.tsx`: Lets users enter a new password after using a reset link.
- `app/api/users/route.ts`: Creates or updates the app-level user record after Supabase authentication.
- `lib/app-user.ts`: Safely syncs Supabase users into the Prisma `User` table.
- `prisma/schema.prisma`: Defines the app `User` model and relations.

## Step-by-Step Backend Flow: Email Sign Up

1. The user opens `/auth` and selects the Sign Up tab.

2. The user enters an email and password.

3. `app/auth/page.tsx` calls the `signUp` function from `AuthContext`.

4. `AuthContext` calls:

   ```ts
   supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: `${getPublicAppUrl()}/auth/callback`,
     },
   });
   ```

5. Supabase creates an authentication user in Supabase Auth.

6. If email confirmation is enabled, Supabase sends a verification email to the user.

7. The UI shows a message telling the user to check their email.

8. When the user verifies the email, Supabase redirects back to the app using the configured callback URL.

9. The app then checks the Supabase session.

10. If the session exists, the app syncs the user into the local app database by calling `/api/users`.

11. `/api/users` uses Prisma through `ensureAppUser` to create or update a row in the app `User` table.

This last database sync is important because Supabase Auth stores identity, but the app database needs its own `User` row so expenses, categories, memberships, and family data can be linked to that user.

## Step-by-Step Backend Flow: Email Sign In

1. The user opens `/auth` and selects the Sign In tab.

2. The user enters email and password.

3. `app/auth/page.tsx` calls `signIn` from `AuthContext`.

4. `AuthContext` calls:

   ```ts
   supabase.auth.signInWithPassword({
     email: email.trim().toLowerCase(),
     password,
   });
   ```

5. Supabase checks the credentials.

6. If the credentials are valid, Supabase returns a session.

7. The app calls `supabase.auth.getSession()` to read the current logged-in session.

8. The app saves the user in React state through `setUser`.

9. The app calls `/api/users` to make sure the user exists in the Prisma database.

10. The user is redirected to the main ledger page `/`.

## Step-by-Step Backend Flow: Continue with Google

1. The user clicks Continue with Google on `/auth`.

2. `app/auth/page.tsx` calls `signInWithProvider("google")` from `AuthContext`.

3. `AuthContext` calls:

   ```ts
   supabase.auth.signInWithOAuth({
     provider: "google",
     options: {
       redirectTo: `${getPublicAppUrl()}/auth/callback`,
     },
   });
   ```

4. Supabase redirects the browser to Google's OAuth screen.

5. The user chooses a Google account and approves the sign-in.

6. Google sends the result back to Supabase.

7. Supabase redirects the browser back to:

   ```txt
   /auth/callback
   ```

8. `app/auth/callback/page.tsx` reads the OAuth `code` from the URL.

9. The callback page exchanges that code for a Supabase session:

   ```ts
   supabase.auth.exchangeCodeForSession(code);
   ```

10. The callback page checks whether a session exists using `supabase.auth.getSession()`.

11. If the session exists, the user is redirected to `/`.

12. `AuthContext` detects the session through `onAuthStateChange`.

13. The app syncs the authenticated user to the app database through `/api/users`.

## What Happens in `/api/users`

After any successful authentication method, the frontend sends the Supabase user ID and email to `/api/users`.

That route:

1. Validates the request body.
2. Calls `ensureAppUser`.
3. Uses Prisma to upsert the user into the app database.

The database user model starts like this:

```prisma
model User {
  id    String @id
  email String @unique
}
```

The Supabase user ID becomes the app database user ID. This keeps all app data connected to the authenticated user.

## Session Handling

The app keeps the login state using `AuthContext`.

When the app loads, it calls:

```ts
supabase.auth.getSession();
```

This checks whether the browser already has a valid Supabase session.

The app also listens for login/logout changes using:

```ts
supabase.auth.onAuthStateChange(...)
```

This means if a user signs in, signs out, or returns from Google OAuth, the app can update the UI automatically.

## Password Reset Flow

1. The user clicks Forgot password.

2. The app calls:

   ```ts
   supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${getPublicAppUrl()}/auth/reset-password`,
   });
   ```

3. Supabase sends a password reset email.

4. The user clicks the email link and lands on `/auth/reset-password`.

5. The user enters a new password.

6. The app calls:

   ```ts
   supabase.auth.updateUser({ password });
   ```

7. Supabase updates the password securely.

## Authentication UX Explanation

For the user experience, the authentication screen is designed to feel friendly and clear:

- The page has Sign In and Sign Up tabs so the user can switch modes without leaving the page.
- The Google option is placed above the email form because it is the fastest login path.
- Loading states prevent duplicate submissions while Supabase is processing.
- User-friendly error messages convert Supabase errors into readable explanations, such as invalid credentials or unverified email.
- Toast notifications give quick feedback for success and reset email actions.
- Password visibility toggle improves usability.
- The forgot-password modal keeps the user inside the authentication flow.
- The callback page shows a loader while OAuth is being completed, so users are not left on a blank screen.

## Why Supabase Is Used

Supabase is used because it provides ready-made secure authentication features:

- Email/password signup and login
- Google OAuth provider support
- Email verification
- Password reset emails
- Session and token management
- User identity storage

This means the app does not manually store passwords or implement OAuth security from scratch. Supabase handles the sensitive authentication work, and the app focuses on connecting the authenticated user to expense-tracking data.

## Simple Presentation Script

For authentication, my app supports two login methods: email/password and Continue with Google. I use Supabase Auth as the authentication provider. When a user signs up or signs in, the frontend calls Supabase using the Supabase JavaScript client. Supabase validates the credentials or handles the Google OAuth process, then returns a session.

After the session is created, my app uses an authentication context to keep track of the logged-in user. The app also syncs the Supabase user into my own database through a `/api/users` route. This is needed because my expense, category, family, Gmail, and membership tables all need to connect to an app-level user record.

For Google login, Supabase redirects the user to Google, Google sends the user back to my `/auth/callback` page, and then the app exchanges the OAuth code for a Supabase session. Once the session exists, the user is sent to the main expense tracker page.

For the UX, I used Next.js, React, Tailwind CSS, Framer Motion, Sonner toast messages, Lucide icons, and the Supabase client. The goal is to make the login process clear, responsive, and friendly while Supabase handles the secure backend authentication work.

#---------------------------------------------------------------------------------

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

## Files Involved

- `app/categories/page.tsx`: The category management UI.
- `app/api/categories/route.ts`: Handles fetching and creating categories.
- `app/api/categories/[id]/route.ts`: Handles updating and deleting one category.
- `lib/category-options.ts`: Defines default categories, available icon assets, formatting helpers, and category name normalization.
- `components/category-icon.tsx`: Displays the category icon image.
- `lib/app-user.ts`: Makes sure the authenticated Supabase user exists in the app database.
- `prisma/schema.prisma`: Defines the `Category` model.

## Database Model

The category table is connected to the user table. In Prisma, the important part is:

```prisma
model Category {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  icon      String   @default("Package")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, name])
  @@index([userId])
}
```

The `@@unique([userId, name])` rule means the same user cannot have two categories with the same name. But different users can have categories with the same name.

## Step-by-Step Flow: Loading Categories

1. The user opens the category page at `/categories`.

2. `app/categories/page.tsx` checks the auth state using `useAuth`.

3. If the user is not logged in, the page redirects them to `/auth`.

4. If the user is logged in, the page gets the Supabase session:

   ```ts
   supabase.auth.getSession();
   ```

5. The page sends a request to:

   ```txt
   GET /api/categories
   ```

6. The request includes the Supabase access token in the Authorization header:

   ```txt
   Authorization: Bearer <token>
   ```

7. The API route reads the token and asks Supabase who the current user is:

   ```ts
   supabase.auth.getUser(token);
   ```

8. If the token is invalid or missing, the API returns `401 Unauthorized`.

9. If the user is valid, the API calls `ensureUserAndDefaultCategories`.

10. This makes sure the user exists in the app database.

11. If the user has no categories yet, the API creates default categories such as food, groceries, transport, shopping, bills, health, and other.

12. The API then reads categories from the database using Prisma:

   ```ts
   prisma.category.findMany({
     where: { userId: user.id },
     orderBy: [{ createdAt: "asc" }, { name: "asc" }],
   });
   ```

13. The frontend receives the category list and displays them as cards.

## Step-by-Step Flow: Creating a Category

1. The user enters a category name, for example `skincare`.

2. The user chooses an icon from the icon dropdown.

3. The user clicks Add.

4. The frontend sends:

   ```txt
   POST /api/categories
   ```

5. The request body contains:

   ```json
   {
     "name": "skincare",
     "icon": "/assets/cinamoroll_theme/Category/Health.png"
   }
   ```

6. The API checks the Supabase access token.

7. The API validates the input using the category create schema.

8. The category name is normalized using:

   ```ts
   normalizeCategoryName(name)
   ```

   This trims spaces, collapses extra spaces, and converts the name to lowercase.

9. The API checks whether the selected icon is part of the allowed icon list.

10. The API saves the category using Prisma:

   ```ts
   prisma.category.upsert(...)
   ```

11. If the category already exists for that user, the app updates the icon instead of creating a duplicate.

12. The frontend shows a success modal and reloads the category list.

## Step-by-Step Flow: Editing a Category

1. The user opens the menu on a category card.

2. The user clicks Edit.

3. The form is filled with the selected category name and icon.

4. The user changes the name or icon and clicks Update.

5. The frontend sends:

   ```txt
   PATCH /api/categories/:id
   ```

6. The API verifies the Supabase token.

7. The API makes sure the category belongs to the current user:

   ```ts
   where: { id, userId: user.id }
   ```

8. If the category belongs to the user, Prisma updates it.

9. The frontend shows a success modal and refreshes the list.

This ownership check is important because users should only edit their own categories.

## Step-by-Step Flow: Deleting a Category

1. The user opens the menu on a category card.

2. The user clicks Delete.

3. A confirmation modal appears.

4. If the user confirms, the frontend sends:

   ```txt
   DELETE /api/categories/:id
   ```

5. The API verifies the Supabase token.

6. The API deletes the category using both category ID and user ID:

   ```ts
   prisma.category.deleteMany({
     where: { id, userId: user.id },
   });
   ```

7. The frontend removes the deleted category from the local list.

8. The success modal tells the user the category was deleted.

Using both `id` and `userId` protects the endpoint from deleting another user's category.

## Default Categories

The app has default categories in `lib/category-options.ts`, such as:

- food
- groceries
- friends
- family
- transport
- shopping
- entertainment
- bills
- health
- other

These default categories are created only when the user has no categories yet. After that, if a user deletes one default category, the app does not automatically recreate it on every load.

## Category Icons

The app uses custom image assets for category icons. The available icons are defined in:

```txt
lib/category-options.ts
```

The actual rendering happens in:

```txt
components/category-icon.tsx
```

`CategoryIcon` uses Next Image, which helps optimize images and keeps the UI consistent.

## Security and Data Protection

The category API routes protect data in three main ways:

1. They require a valid Supabase access token.
2. They use the Supabase token to identify the current user.
3. They always filter database operations by `userId`.

This means users cannot view, edit, or delete categories that belong to someone else.

## Category UX Explanation

The category page is designed to be easy to scan and easy to use:

- The top form lets users add or update a category without leaving the page.
- The icon dropdown gives visual customization.
- Category cards show the icon and formatted category name.
- A menu button keeps edit/delete actions compact.
- Delete uses a confirmation modal to prevent accidental removal.
- Success and error modals give clear feedback.
- Loading states show a Cinnamoroll-themed loader while data is being fetched.
- The layout uses responsive grid columns so it works on desktop and mobile.

## Simple Presentation Script

For the category page, users can create and manage their own expense categories. The page first checks whether the user is authenticated. If the user is not logged in, they are redirected to the auth page. If they are logged in, the app gets the Supabase session token and sends it to the category API.

On the backend, the API verifies the token with Supabase Auth. Then it uses Prisma to read or update the category records in the PostgreSQL database. Each category is connected to a specific user ID, so every user has their own private category list.

When a new user opens the category page for the first time, the app creates default categories like food, groceries, transport, shopping, and bills. Users can then add their own categories, choose custom themed icons, edit category names, or delete categories.

For the UX, I used React state, Tailwind CSS, shadcn-style UI components, Framer Motion animations, modals, dropdown menus, and custom image icons. The goal is to make category management simple, visual, and safe, while the backend makes sure every operation belongs to the currently logged-in user.

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

This page combines user preferences, account management, payment/membership logic, and Gmail PayNow connection.

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

## Files Involved

- `app/profile/page.tsx`: Main settings/profile page UI.
- `app/api/stripe/membership/route.ts`: Fetches membership status and payment history.
- `app/api/stripe/checkout/route.ts`: Creates a Stripe Checkout session.
- `app/api/stripe/checkout/complete/route.ts`: Confirms payment after Stripe redirects back.
- `app/api/stripe/portal/route.ts`: Opens Stripe Billing Portal for existing customers.
- `app/api/stripe/subscription/cancel/route.ts`: Schedules auto-renew subscription cancellation.
- `lib/stripe.ts`: Stores membership plan config and Stripe helper functions.
- `app/api/gmail/oauth/start/route.ts`: Starts the Gmail OAuth connection flow.
- `app/api/gmail/oauth/callback/route.ts`: Handles Google's callback after Gmail permission is granted.
- `app/api/gmail/oauth/status/route.ts`: Checks or deletes Gmail connection status.
- `lib/gmail-oauth.ts`: Creates Google OAuth client, signs OAuth state, encrypts tokens, and saves Gmail connection.
- `prisma/schema.prisma`: Defines `Membership` and `GmailConnection` models.

## Profile Page Loading Flow

1. The user opens `/profile`.

2. The page checks authentication using `useAuth`.

3. If the user is not logged in, the app redirects to `/auth`.

4. If the user is logged in, the page fetches:

   - Gmail connection status
   - Membership status

5. For both requests, the frontend gets the Supabase access token:

   ```ts
   supabase.auth.getSession();
   ```

6. The token is sent to the API through the Authorization header:

   ```txt
   Authorization: Bearer <token>
   ```

7. Each backend route verifies the token using:

   ```ts
   supabase.auth.getUser(token);
   ```

8. If the token is valid, the backend uses the Supabase user ID to query Prisma records for that user.

## Membership Feature Overview

The membership feature uses Stripe for payment and Prisma for storing the app's membership state.

The plan is defined in `lib/stripe.ts`:

```ts
export const MEMBERSHIP_PLAN = {
  id: "plus_monthly",
  name: "Cinnamoroll Plus",
  description: "Monthly membership for receipt scanning and premium tracking features.",
  currency: "sgd",
  amount: 50,
};
```

There is also a manual one-month membership plan:

```ts
export const MANUAL_MEMBERSHIP_PLAN = {
  id: "plus_manual_month",
  ...
};
```

So the app supports two renewal choices:

1. Auto-renew membership through Stripe subscription
2. Manual one-month membership through a one-time Stripe payment

## Membership Database Model

The membership table is connected to the user:

```prisma
model Membership {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  status               String   @default("inactive")
  plan                 String   @default("plus_monthly")
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

The app stores the Stripe customer ID, subscription ID, membership status, plan type, period end date, and cancellation state.

## Step-by-Step Flow: Fetching Membership Status

1. The profile page calls:

   ```txt
   GET /api/stripe/membership
   ```

2. The backend verifies the Supabase token.

3. The backend reads the user's membership record from Prisma:

   ```ts
   prisma.membership.findUnique({
     where: { userId: user.id },
   });
   ```

4. If the user has a Stripe customer ID, the backend also asks Stripe for:

   - Subscriptions
   - Checkout sessions
   - Invoices

5. If Stripe has a newer subscription status, the backend updates the local membership record.

6. The backend returns:

   - plan details
   - membership data
   - active/inactive state
   - latest billing history

7. The profile page displays the membership status, renewal date, price, and payment history count.

## Step-by-Step Flow: Starting Membership Payment

1. The user chooses auto-renew or manual renewal.

2. The user clicks the membership payment button.

3. The frontend calls:

   ```txt
   POST /api/stripe/checkout
   ```

4. The backend verifies the Supabase token.

5. The backend makes sure the user exists in the app database.

6. The backend checks whether the user already has a Stripe customer ID.

7. If not, it creates a Stripe customer:

   ```ts
   stripe.customers.create({
     email: user.email,
     metadata: { userId: user.id },
   });
   ```

8. The backend creates a Stripe Checkout session.

9. If the user selected auto-renew, Checkout uses subscription mode.

10. If the user selected manual renewal, Checkout uses one-time payment mode.

11. The backend saves or updates a local membership record with status `incomplete`.

12. The backend returns the Stripe Checkout URL.

13. The frontend redirects the browser to Stripe Checkout.

## Step-by-Step Flow: Completing Membership Payment

1. After payment, Stripe redirects the user back to:

   ```txt
   /profile?stripe=success&session_id=...
   ```

2. The profile page detects the `session_id` query parameter.

3. The frontend calls:

   ```txt
   POST /api/stripe/checkout/complete
   ```

4. The backend retrieves the Stripe Checkout session.

5. The backend checks that the Stripe session belongs to the current user:

   ```ts
   checkoutSession.metadata?.userId === user.id
   ```

6. If it is a one-time payment, the app sets membership to active for one month.

7. If it is a subscription payment, the app stores the Stripe subscription ID, status, period end, and cancel state.

8. The profile page refreshes membership status and shows a success message.

## Step-by-Step Flow: Managing Billing

If the user has an auto-renew subscription, the profile page can open Stripe Billing Portal.

1. The frontend calls:

   ```txt
   POST /api/stripe/portal
   ```

2. The backend checks the user's membership record.

3. If a Stripe customer exists, the backend creates a Stripe Billing Portal session.

4. The frontend redirects the user to Stripe's portal.

5. The user can manage billing details through Stripe.

## Step-by-Step Flow: Cancelling Auto-Renew

1. The user clicks Cancel Auto-Renew.

2. A confirmation modal appears.

3. If confirmed, the frontend calls:

   ```txt
   POST /api/stripe/subscription/cancel
   ```

4. The backend verifies the user.

5. The backend finds the user's membership record.

6. The backend calls Stripe to update the subscription:

   ```ts
   stripe.subscriptions.update(subscriptionId, {
     cancel_at_period_end: true,
   });
   ```

7. The backend updates the local membership record.

8. The UI shows a success modal and displays that auto-renew cancellation is scheduled.

## PayNow Connection Overview

The PayNow connection is implemented through Gmail OAuth. The user connects Gmail so the app can read PayNow transaction emails from Gmail.

The app requests this Gmail scope:

```ts
https://www.googleapis.com/auth/gmail.readonly
```

This means the app can read Gmail messages, but it does not ask for permission to send or delete emails.

## PayNow / Gmail Database Model

The Gmail connection is stored in the `GmailConnection` table:

```prisma
model GmailConnection {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  googleEmail           String?
  encryptedRefreshToken String
  scope                 String?
  connectedAt           DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([userId])
}
```

Only one Gmail connection is stored per app user.

## Step-by-Step Flow: Checking PayNow Connection Status

1. The profile page calls:

   ```txt
   GET /api/gmail/oauth/status
   ```

2. The backend verifies the Supabase access token.

3. The backend searches for a Gmail connection:

   ```ts
   prisma.gmailConnection.findUnique({
     where: { userId: user.id },
   });
   ```

4. The backend returns:

   ```json
   {
     "connected": true,
     "connection": {
       "googleEmail": "..."
     }
   }
   ```

5. The profile page displays whether Gmail is connected.

## Step-by-Step Flow: Connecting PayNow Gmail

1. The user clicks Connect Gmail.

2. The frontend calls:

   ```txt
   GET /api/gmail/oauth/start
   ```

3. The backend verifies the Supabase user.

4. The backend creates a Google OAuth client.

5. The backend generates a signed OAuth state containing the app user ID.

6. The backend creates a Google OAuth URL with:

   - Gmail readonly scope
   - offline access
   - consent prompt
   - signed state

7. The backend returns the Google OAuth URL.

8. The frontend redirects the browser to Google.

9. The user selects a Google account and grants permission.

10. Google redirects back to:

   ```txt
   /api/gmail/oauth/callback
   ```

11. The callback route reads the OAuth `code` and `state`.

12. The backend verifies the state signature and checks that it is not expired.

13. The backend exchanges the code for Google tokens.

14. The backend asks Gmail for the connected Google email address.

15. The refresh token is encrypted using AES-256-GCM before saving.

16. Prisma stores or updates the `GmailConnection` row.

17. The user is redirected back to:

   ```txt
   /profile?gmail=connected
   ```

18. The profile page shows a success toast and refreshes Gmail status.

## Token Security

The Gmail refresh token is sensitive because it lets the app access Gmail later.

To protect it:

1. The app does not store the raw refresh token.
2. `lib/gmail-oauth.ts` encrypts the token before saving it.
3. The token is encrypted with AES-256-GCM.
4. OAuth state is signed with HMAC SHA-256 to prevent tampering.
5. OAuth state expires after 10 minutes.

This protects the Gmail connection flow from token leakage and state manipulation.

## Step-by-Step Flow: Disconnecting PayNow Gmail

1. The user clicks Disconnect Gmail.

2. The frontend calls:

   ```txt
   DELETE /api/gmail/oauth/status
   ```

3. The backend verifies the Supabase user.

4. The backend deletes the user's Gmail connection row:

   ```ts
   prisma.gmailConnection.deleteMany({
     where: { userId: user.id },
   });
   ```

5. The frontend updates the UI to show Gmail as disconnected.

## Settings UX Explanation

The settings page is organized into clear account sections:

- Appearance section for theme and text size
- Account section for email and password
- Membership card for premium payment
- Gmail connection card for PayNow import
- Family settings shortcut
- Logout button

The UX uses cards so each setting feels separate and easy to scan. Important actions like cancelling subscription or deleting a connection use confirmation or feedback patterns. Loading states prevent duplicate actions while API calls are running.

## Simple Presentation Script

The settings page is where users manage their account, membership, and PayNow Gmail connection. First, the page checks the Supabase session to make sure the user is logged in. Then it loads membership status from Stripe-related API routes and Gmail connection status from Gmail OAuth API routes.

For membership, I use Stripe. The user can choose auto-renew or manual renewal. When they start payment, my backend creates a Stripe Checkout session and redirects the user to Stripe. After payment, Stripe redirects back to the profile page with a session ID. My backend verifies that the Stripe session belongs to the logged-in user, then updates the membership record in my database using Prisma.

For PayNow connection, I use Google OAuth and the Gmail API. The app asks for Gmail readonly permission, so it can read PayNow transaction emails but cannot send or delete emails. When the user connects Gmail, Google returns tokens to my callback route. The refresh token is encrypted before it is stored in the database. After that, the app can use the connection later to import PayNow expenses.

For the UX, I used React, Next.js, Tailwind CSS, shadcn-style components, Lucide icons, modals, and toast messages. The goal is to keep settings simple, with clear feedback for payments, Gmail connection, password changes, and membership actions.

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

## Tech Stack Used

### Frontend UX

- Next.js App Router: The home page `/` is the main ledger page.
- React: Used for expense list state, filters, modal state, form state, loading state, and edit mode.
- Supabase JavaScript Client: Used to get the current session access token.
- Tailwind CSS / shadcn-style UI components: Used for buttons, selects, dialogs, cards, and inputs.
- Framer Motion: Used for page and card animations.
- Sonner: Used for toast feedback.
- Lucide React: Used for action icons such as add record, wallet, refresh, receipt scan, and lock.
- Custom Cinnamoroll components: Used for themed loaders, modals, category icons, and record cards.

### Backend / Data

- Supabase Auth: Verifies the logged-in user using the access token.
- Next.js API Routes: Used for expense CRUD and Gmail/receipt import endpoints.
- Prisma: Reads and writes expense records in PostgreSQL.
- Supabase PostgreSQL: Stores personal expenses, family expenses, categories, and user records.
- Zod: Validates expense create and update payloads.
- Google Gmail API: Imports PayNow records from Gmail.
- tesseract.js: Extracts receipt text from uploaded receipt images inside the Next.js API route.

## Important Note About Speech-to-Text

For speech-to-text, this app does **not** use a custom AI model or an OpenAI model.

It uses the browser's built-in Web Speech API:

```ts
window.SpeechRecognition || window.webkitSpeechRecognition
```

That means the speech recognition is provided by the user's browser, usually Chrome/Edge. The app uses the transcript returned by the browser and then applies its own simple parsing logic.

The app parses the transcript using:

- regular expressions to find the amount
- keyword matching to detect the category
- string cleanup to turn the spoken sentence into a title

Example:

```txt
"add 12.50 for lunch"
```

The app can extract:

- amount: `12.50`
- title: `lunch`
- category: `food`
- source: `voice`

## Files Involved

- `app/page.tsx`: Main ledger page UI and expense actions.
- `components/expense-dialog.tsx`: Add/edit record dialog, including speech-to-text input.
- `components/expense-card.tsx`: Displays each record card.
- `components/receipt-import-dialog.tsx`: Receipt upload, scan preview, and import UI.
- `app/api/expenses/route.ts`: Fetches and creates expenses.
- `app/api/expenses/[id]/route.ts`: Updates and deletes expenses.
- `app/api/gmail-expenses/route.ts`: Imports PayNow Gmail transactions into expense records.
- `app/api/receipt-scan/route.ts`: Receives receipt image uploads, runs `tesseract.js`, and extracts receipt amount, merchant, date, category, and line items.
- `lib/validation.ts`: Validates expense create and update data.
- `prisma/schema.prisma`: Defines `Expense` and `FamilyExpense`.

## Expense Database Models

The app has two types of expense storage:

1. Personal expenses
2. Family expenses

Personal expenses are stored in the `Expense` table:

```prisma
model Expense {
  id          String   @id @default(cuid())
  userId      String
  title       String
  amount      Float
  category    String
  date        DateTime @default(now())
  description String?
  source      String   @default("manual")
  recordType  String   @default("expense")
  isRecurring Boolean  @default(false)
  recurringInterval String?
  status      String   @default("completed")
  counterparty String?
  gmailId     String?
}
```

Family expenses are stored separately in `FamilyExpense`, because they belong to a family group instead of only one user.

## Record Types

The ledger supports multiple record types:

- expense
- income
- liability
- reimbursement

For normal expenses, the user selects a category. For liabilities and reimbursements, the dialog also asks for a person or organization and a status such as open or settled.

The app also supports recurring records with intervals:

- weekly
- monthly
- yearly

## Step-by-Step Flow: Loading the Ledger

1. The user opens the home page `/`.

2. The page checks authentication using `useAuth`.

3. If the user is not logged in, the app redirects to `/auth`.

4. If the user is logged in, the page loads:

   - categories
   - membership status
   - all expenses
   - analytics/stats

5. To load expenses, the frontend gets the Supabase access token:

   ```ts
   supabase.auth.getSession();
   ```

6. The frontend calls:

   ```txt
   GET /api/expenses
   ```

7. The backend verifies the token:

   ```ts
   supabase.auth.getUser(token);
   ```

8. The backend makes sure the user exists in the app database using `ensureAppUser`.

9. Prisma loads personal expenses for that user.

10. If the user belongs to a family, Prisma also loads family expenses.

11. The backend combines personal and family expenses and returns them to the frontend.

12. The frontend converts date strings into JavaScript `Date` objects and displays the record cards.

## Step-by-Step Flow: Adding a Manual Expense

1. The user clicks Add Record.

2. `ExpenseDialog` opens.

3. The user selects the record type, enters title, amount, category, date, and optional description.

4. On submit, the frontend sends:

   ```txt
   POST /api/expenses
   ```

5. The backend verifies the Supabase token.

6. The backend validates the request body using Zod:

   ```ts
   expenseCreateSchema.safeParse(...)
   ```

7. The backend checks that:

   - title is present
   - amount is a positive number
   - category is present
   - date is valid
   - record type is one of the allowed values

8. If the record is personal, Prisma creates a row in the `Expense` table.

9. If the record is a family record, Prisma creates a row in the `FamilyExpense` table.

10. The frontend shows a success modal and refreshes the ledger and stats.

## Step-by-Step Flow: Speech-to-Text Record Input

1. The user opens the Add Record dialog.

2. If the browser supports speech recognition, the microphone button appears.

3. The user clicks the microphone button.

4. The app creates a browser speech recognition instance:

   ```ts
   new SpeechRecognition()
   ```

5. The app configures it:

   ```ts
   recognition.continuous = false;
   recognition.lang = "en-US";
   recognition.interimResults = false;
   recognition.maxAlternatives = 1;
   ```

6. The user speaks a sentence like:

   ```txt
   spent 8 dollars on lunch
   ```

7. The browser converts speech into text and returns a transcript.

8. The app marks the source as:

   ```ts
   source: "voice"
   ```

9. The app extracts the amount using a regular expression:

   ```ts
   /([0-9]+(\.[0-9]{1,2})?)/
   ```

10. The app removes common words like add, spend, spent, cost, for, with, on, at, dollars, and pesos.

11. The remaining text becomes the title.

12. The app checks category keywords. For example:

   - lunch, dinner, noodles -> food
   - taxi, bus, grab -> transport
   - grocery, supermarket, milk -> groceries
   - movie, game, concert -> entertainment

13. The dialog auto-fills the title, amount, category, and description.

14. The user can still edit the fields manually before saving.

So the speech feature is best described as:

```txt
Browser Web Speech API + custom regex parsing + keyword category detection
```

It is not a trained AI model inside the app.

## Step-by-Step Flow: Editing an Expense

1. The user clicks a record card or the edit option.

2. The app opens `ExpenseDialog` in edit mode.

3. The form is pre-filled with the existing record data.

4. The user changes fields and clicks Save Changes.

5. The frontend sends:

   ```txt
   PUT /api/expenses/:id
   ```

6. The backend verifies the Supabase token.

7. The backend validates the update payload.

8. The backend first checks whether the record is a personal expense owned by the user.

9. If not, it checks whether the record is a family expense in a family where the user is a member.

10. Prisma updates the correct table.

11. The frontend refreshes the ledger and stats.

## Step-by-Step Flow: Deleting an Expense

1. The user clicks Delete on a record.

2. A confirmation modal appears.

3. If confirmed, the frontend sends:

   ```txt
   DELETE /api/expenses/:id
   ```

4. The backend verifies the user.

5. The backend tries to delete a personal expense where `id` and `userId` match.

6. If no personal expense is found, it tries to delete a family expense where the current user is a family member.

7. The frontend refreshes the ledger and stats.

This protects users from deleting records they do not own or cannot access.

## Filtering and Ledger UX

The ledger page supports filters for:

- all records
- expenses
- income
- liabilities
- reimbursements
- recurring records
- year
- month
- my expenses
- family expenses
- all expenses

The filtering is done on the frontend after records are loaded. The app checks each record's date, record type, recurring flag, and personal/family type.

Family filtering is connected to membership. If family features require active membership, the family filter can be disabled and shown with a lock icon.

## PayNow Gmail Import on the Expense Page

The expense page has a Refresh Gmail button.

1. The user clicks Refresh Gmail.

2. The frontend calls:

   ```txt
   GET /api/gmail-expenses?refresh=true
   ```

3. The backend verifies the Supabase token.

4. The backend uses the user's stored Gmail connection.

5. It creates an authorized Gmail client using the encrypted refresh token.

6. It searches Gmail for PayNow-related DBS emails:

   ```txt
   from:ibanking.alert@dbs.com (PAYNOW OR PayNow OR paynow)
   ```

7. It reads each email body.

8. It uses regex parsing to extract:

   - amount
   - transaction date
   - merchant or recipient

9. It creates an expense with:

   ```ts
   source: "gmail"
   recordType: "expense"
   ```

10. It stores the Gmail message ID in `gmailId`.

11. Prisma has a unique rule for `userId` and `gmailId`, so the same email is not imported twice for the same user.

12. The frontend reloads expenses and stats.

## Receipt Scan Feature

The expense page also has a Scan Receipt button.

This feature uses:

```txt
JavaScript OCR with tesseract.js + custom regex/category parsing
```

It does not use an LLM model or a separate Python service in the current code.

### Step-by-Step Flow: Receipt Scan

1. The user clicks Scan Receipt.

2. The receipt import dialog opens.

3. The user uploads a JPG, PNG, or WEBP receipt image.

4. The frontend sends the image as `FormData`:

   ```txt
   POST /api/receipt-scan
   ```

5. The backend verifies the Supabase token.

6. The backend checks file type and file size.

7. The backend temporarily saves the image.

8. The backend runs OCR using `tesseract.js` directly inside the Next.js API route.

9. `tesseract.js` reads text from the image.

10. The script extracts:

   - merchant name
   - total amount
   - date
   - possible item lines
   - possible category

11. The frontend shows the scanned result and selectable item list.

12. The user selects which items to import.

13. For each selected item, the frontend calls:

   ```txt
   POST /api/expenses
   ```

14. Those selected receipt items become normal expense records.

## Expense UX Explanation

The ledger page is designed to make record entry flexible:

- Manual form for precise input
- Speech input for faster entry
- Gmail refresh for PayNow import
- Receipt scan for image-based import
- Tabs for different record types
- Month/year filters for browsing history
- Empty state for new users with no records yet
- Success/error modals for CRUD feedback
- Confirmation modal before deletion

The app also marks each record with a source:

- `manual`
- `voice`
- `gmail`

This helps distinguish how the record was created.

## Simple Presentation Script

The expense page is the main ledger of the app. It supports expenses, income, liabilities, reimbursements, and recurring records. When the page loads, it checks the Supabase session, fetches the user's records through `/api/expenses`, and displays personal and family records together.

For creating records, users can type the data manually or use speech input. For speech-to-text, I use the browser Web Speech API, not a separate AI model. The browser converts speech into text, and my app uses regex and keyword matching to extract the amount, title, and category. For example, if the user says "spent 8 dollars on lunch", the app can detect the amount as 8, title as lunch, and category as food.

For PayNow import, the app uses the Gmail API. After the user connects Gmail from settings, the expense page can refresh Gmail, search for PayNow transaction emails, parse the amount/date/merchant, and save them as expense records. To avoid duplicates, the app stores the Gmail message ID.

For receipt scanning, I use a JavaScript OCR pipeline with `tesseract.js`. The backend temporarily saves the receipt image, runs OCR inside the same Next.js API route, extracts merchant, amount, date, category, and possible line items, then lets the user choose which items to import.

On the backend, all expense actions go through Next.js API routes. The routes verify the Supabase access token, validate the request with Zod, and then use Prisma to create, update, delete, or fetch records from the Supabase PostgreSQL database.

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

The user can choose a year and month, and the page updates the analytics for that selected period.

## Tech Stack Used

### Frontend UX

- Next.js App Router: Used for the `/analytics` page.
- React: Used for selected year/month state, loading state, and stats state.
- Supabase JavaScript Client: Used to get the current session access token.
- Tailwind CSS / shadcn-style UI components: Used for selects, cards, and layout.
- Framer Motion: Used for page, summary, stat card, and chart animations.
- Lucide React: Used for analytics icons.
- Recharts: Used for the pie chart and bar chart.
- Custom Cinnamoroll UI: Used for themed summary banners, stat cards, loaders, and empty states.

### Backend / Data

- Supabase Auth: Verifies the logged-in user.
- Next.js API Route: `/api/stats` calculates analytics data.
- Prisma: Queries expense records from the PostgreSQL database.
- Supabase PostgreSQL: Stores the expense records.
- date-fns: Calculates month/year boundaries and formats date labels.

## Important Note About Analytics

The analytics page does **not** use machine learning or an AI model.

It uses normal database queries and calculations:

- filter expenses by date range
- sum amounts
- compare current month with last month
- group spending by category
- build chart data for Recharts

So for presentation, this feature can be described as:

```txt
Prisma database aggregation + date-fns date calculations + Recharts visualization
```

## Files Involved

- `app/analytics/page.tsx`: Analytics page UI, selected month/year state, and summary logic.
- `app/api/stats/route.ts`: Backend analytics calculation endpoint.
- `components/expense-charts.tsx`: Pie chart and bar chart using Recharts.
- `components/stat-card.tsx`: Displays total, record count, category count, and trend.
- `components/loading-states.tsx`: Shows themed loading UI.
- `lib/validation.ts`: Used by expense routes to keep saved expense data clean before analytics uses it.
- `prisma/schema.prisma`: Defines the expense data model used for calculations.

## Step-by-Step Flow: Loading Analytics

1. The user opens `/analytics`.

2. The page checks authentication using `useAuth`.

3. If the user is not logged in, the page redirects to `/auth`.

4. If the user is logged in, the page chooses the current year and current month by default.

5. The frontend gets the Supabase session:

   ```ts
   supabase.auth.getSession();
   ```

6. The frontend calls:

   ```txt
   GET /api/stats?year=2026&month=06
   ```

7. The request includes the Supabase access token:

   ```txt
   Authorization: Bearer <token>
   ```

8. The backend verifies the user with Supabase Auth.

9. The backend makes sure the user exists in the app database with `ensureAppUser`.

10. The backend calculates the selected month, previous month, and current year date ranges.

11. Prisma loads expenses for those date ranges.

12. The backend calculates totals, category groups, monthly chart data, and percentage change.

13. The frontend receives the stats and displays stat cards, a summary banner, and charts.

## Backend Analytics Calculation

The `/api/stats` route receives:

```txt
year
month
```

Then it creates these date ranges:

- start and end of selected month
- start and end of previous month
- start and end of selected year

It uses `date-fns` functions such as:

```ts
startOfMonth
endOfMonth
subMonths
startOfYear
endOfYear
format
```

Then it queries Prisma for expenses:

```ts
prisma.expense.findMany({
  where: {
    userId: user.id,
    recordType: "expense",
    date: {
      gte: currentMonthStart,
      lte: currentMonthEnd,
    },
  },
});
```

Only records with `recordType: "expense"` are counted in spending analytics. Income, liabilities, and reimbursements are not included in the spending total.

## What the Backend Calculates

### Total This Month

The backend adds all selected-month expense amounts:

```ts
currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
```

### Total Last Month

The backend adds all previous-month expense amounts.

### Percentage Change

The backend compares this month with last month:

```ts
((currentTotal - lastTotal) / lastTotal) * 100
```

If last month has no spending, the change is shown as `0.0`.

### Trend

If change is greater than or equal to zero, trend is `up`.

If spending decreased, trend is `down`.

### Expense Count

The backend counts how many expense records exist in the selected month.

### Category Data

The backend groups selected-month expenses by category.

Example output:

```json
[
  { "name": "food", "value": 120.5 },
  { "name": "transport", "value": 45.2 }
]
```

If a category is empty, missing, or `paynow`, the backend displays it as:

```txt
Undefined Category
```

### Monthly Data

The backend loops through all 12 months of the selected year and calculates total spending for each month.

This becomes the bar chart data.

## Frontend Summary Logic

The analytics page builds a friendly summary message.

It compares:

- current selected month total
- previous month total

The summary can say different things depending on the data:

1. If both months are zero, it shows a no-spending summary.
2. If last month is zero but this month has spending, it says there is no previous comparison.
3. If this month is less than or equal to last month, it shows a good summary.
4. If this month is higher than last month, it shows a warning-style summary.

The summary banner uses different themed images for good and bad summaries.

## Charts Used

The app uses the `recharts` library.

### Category Pie Chart

File:

```txt
components/expense-charts.tsx
```

The category spending chart uses:

```ts
PieChart
Pie
Cell
LabelList
Tooltip
Legend
ResponsiveContainer
```

It shows how the selected month's spending is split across categories.

### Monthly Bar Chart

The monthly spending chart uses:

```ts
BarChart
Bar
CartesianGrid
XAxis
YAxis
Tooltip
ResponsiveContainer
```

It shows total spending for each month in the selected year.

Both charts are responsive because they are wrapped in:

```ts
ResponsiveContainer
```

## Empty Data Handling

If a new user has no expenses yet, the analytics page does not treat that as an error.

Instead, it creates empty stats:

- total is zero
- change is zero
- category data is empty
- monthly chart data contains 12 months with zero values

This keeps the page usable for new accounts.

## Security and Data Protection

The analytics API protects user data by:

1. Requiring a Supabase access token.
2. Verifying the current user through Supabase Auth.
3. Querying Prisma with `userId: user.id`.

This means one user can only see analytics based on their own expenses.

## Analytics UX Explanation

The analytics page is designed to be visual and easy to understand:

- Year and month dropdowns let the user choose the report period.
- Summary banner gives quick interpretation.
- Stat cards show key numbers at a glance.
- Pie chart shows category breakdown.
- Bar chart shows spending across the year.
- Empty states handle new accounts gracefully.
- Loading states make the data-fetching process clear.

## Simple Presentation Script

The analytics page helps users understand their spending patterns. It does not use an AI model. Instead, it uses Prisma queries and date calculations to summarize the user's expense records.

When the user opens the analytics page, the frontend gets the Supabase session token and calls `/api/stats` with the selected year and month. The backend verifies the token with Supabase Auth, then uses Prisma to fetch expense records from the database.

The backend calculates total spending for the selected month, total spending for the previous month, percentage change, expense count, category totals, and monthly totals for the whole year. I use `date-fns` to calculate date ranges like start of month, end of month, and previous month.

For visualization, I use the Recharts library. The pie chart shows spending by category for the selected month, and the bar chart shows monthly spending across the selected year. The page also creates a friendly summary message based on whether the user's spending increased or decreased compared with last month.

--------------------------------------------------------------------------
