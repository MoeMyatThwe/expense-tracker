# Architecture & Technology Decisions

A technical deep-dive into how PayNow Expense Tracker works, why we chose each technology, and how the pieces fit together. **Read time: ~5 minutes.**

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                         │
│  (Next.js App Router + React + TypeScript + Tailwind CSS)       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────────────┐
│              Next.js API Routes (Serverless)                    │
│  - Authentication (Supabase Auth)                               │
│  - Expense CRUD (with Zod validation + rate limiting)           │
│  - Gmail OAuth integration                                      │
│  - Stripe webhooks                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │ SQL / Direct DB
┌──────────────────────▼──────────────────────────────────────────┐
│              Data Layer                                         │
│  - PostgreSQL (Supabase)                                        │
│  - Prisma ORM (type-safe queries)                               │
│  - Row-Level Security (RLS) policies                            │
└──────────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│         External Services                                       │
│  - Google APIs (Gmail, OAuth)                                   │
│  - Stripe (payments & subscriptions)                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### Why Supabase Auth?

- **Justification**: Enterprise-grade authentication without managing auth servers
- **Key benefits**:
  - Built-in Google OAuth support
  - Session management (JWT + refresh tokens)
  - Row-level security (RLS) native to database
  - Free tier for small apps

**Flow**:

1. User clicks "Sign In with Google"
2. Redirected to Supabase-managed OAuth consent (or custom consent screen)
3. Google returns auth code
4. Next.js API exchanges code for Supabase session
5. Session stored in cookies (secure, HTTP-only)
6. All subsequent API calls authenticated via session

**Code entry point**: [app/contexts/auth-context.tsx](app/contexts/auth-context.tsx)

---

## 💰 Expense Management & Validation

### Why Zod?

- **Justification**: Type-safe API validation that mirrors TypeScript types
- **Key benefits**:
  - Declarative schema definitions
  - Automatic runtime validation
  - TypeScript integration (inferred types)
  - Custom error messages

**Example schema** ([lib/validation.ts](lib/validation.ts)):

```typescript
const expenseCreateSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  categoryId: z.string().uuid(),
  date: z.string().datetime(),
});
```

### Why Prisma?

- **Justification**: Type-safe ORM that generates types from schema
- **Key benefits**:
  - Auto-generated TypeScript types
  - Query builder prevents SQL injection
  - Migrations built-in
  - Excellent developer experience

**Example** ([app/api/expenses/route.ts](app/api/expenses/route.ts)):

```typescript
const expense = await prisma.expense.create({
  data: {
    ...validatedData,
    userId: user.id,
  },
});
```

### Why Rate Limiting?

- **Justification**: Prevent abuse and DDoS attacks
- **Implementation**: In-memory rate limiter ([lib/rate-limit.ts](lib/rate-limit.ts))
- **Limits**: 10 requests per minute per IP for write operations

**Code**:

```typescript
const { success } = limiter.check(clientIp, 10);
if (!success)
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
```

---

## 📧 Gmail Integration & OAuth

### Why a Separate OAuth Client for Gmail?

- **Justification**:
  - Supabase handles user sign-in; app needs separate Gmail API access
  - Different scopes (email vs gmail.readonly)
  - Different redirect URIs
  - Cleaner separation of concerns

**Flow**:

1. User authenticated via Supabase (Google sign-in)
2. User clicks "Connect Gmail" on profile
3. App initiates separate Google OAuth flow (different client ID)
4. User grants gmail.readonly scope
5. App exchanges authorization code for refresh token
6. **Refresh token encrypted** with AES-256-GCM and stored in DB per user
7. App uses stored token to fetch Gmail emails periodically

### Why AES-256-GCM Encryption?

- **Justification**: Protect sensitive refresh tokens at rest
- **Key benefits**:
  - Industry-standard authenticated encryption
  - Prevents unauthorized decryption
  - Authenticated (ensures integrity)

**Code** ([lib/gmail-oauth.ts](lib/gmail-oauth.ts)):

```typescript
function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}
```

### Why googleapis Library?

- **Justification**: Official Google API client
- **Key benefits**:
  - Handles OAuth 2.0 spec compliance
  - Type-safe Gmail API calls
  - Automatic token refresh

**Documentation**: [googleapis GitHub](https://github.com/googleapis/google-api-nodejs-client)

---

## 💳 Payments & Subscriptions

### Why Stripe?

- **Justification**: Industry-leading payment processor
- **Key benefits**:
  - Handles PCI compliance
  - Recurring billing (subscriptions)
  - Webhooks for async events
  - Excellent developer experience

**Flow**:

1. User selects membership tier
2. App creates Stripe Checkout session
3. Redirects user to Stripe-hosted checkout
4. Stripe calls webhook on payment success
5. App creates `Membership` record in DB
6. User gains access to premium features

**Code entry point**: [app/api/stripe/checkout/route.ts](app/api/stripe/checkout/route.ts)

---

## 🎨 Frontend Architecture

### Why Next.js App Router?

- **Justification**: Modern React framework with server/client boundaries
- **Key benefits**:
  - Built-in file-based routing
  - Server components (optional, reduces bundle size)
  - API routes in same repo
  - Vercel deployment (seamless)

### Why React Context API (vs Redux)?

- **Justification**: Simple state management for auth & theme
- **Key benefits**:
  - No extra dependencies
  - Perfect for global state (user, theme)
  - Easy to understand

**Code**: [app/contexts/auth-context.tsx](app/contexts/auth-context.tsx)

### Why shadcn/ui + Tailwind?

- **Justification**: Composable, accessible, and fast components
- **Key benefits**:
  - Copy-paste components (not a dependency)
  - Built on Radix UI (accessibility)
  - Tailwind CSS for utility-first styling
  - Small bundle size

**Example**:

```tsx
<Button onClick={handleClick} variant="outline">
  Sign In
</Button>
```

### Why Sonner (Toast Notifications)?

- **Justification**: Lightweight, accessible notifications
- **Key benefits**:
  - Zero dependencies
  - Customizable
  - Accessible (ARIA labels)

**Code**:

```typescript
toast.success("Expense created!");
```

---

## 🔒 Security Practices

| Feature                | Implementation             | Why                                        |
| ---------------------- | -------------------------- | ------------------------------------------ |
| **Row-Level Security** | PostgreSQL RLS policies    | Users can only access their own data       |
| **CORS**               | Configured in next.config  | Prevent unauthorized cross-origin requests |
| **Security Headers**   | CSP, HSTS, X-Frame-Options | Prevent XSS, clickjacking, MIME sniffing   |
| **Token Encryption**   | AES-256-GCM                | Protect refresh tokens at rest             |
| **Rate Limiting**      | In-memory map              | Prevent brute force & API abuse            |
| **Input Validation**   | Zod schemas                | Reject invalid/malicious input early       |
| **HTTPS Only**         | Enforced in production     | Encrypt data in transit                    |

---

## 📊 Data Flow: Creating an Expense

```
1. User fills form (React component)
   ↓
2. Submit POST /api/expenses
   ↓
3. API validates input with Zod schema
   ↓
4. Check rate limit (IP-based)
   ↓
5. Verify user is authenticated (Supabase session)
   ↓
6. Create expense in DB via Prisma
   ↓
7. RLS policy ensures user can only create own expenses
   ↓
8. Return created expense (JSON) to frontend
   ↓
9. Frontend updates UI with toast notification
```

---

## 🌐 Environment & Deployment

### Why Vercel?

- **Justification**: Seamless Next.js deployment
- **Key benefits**:
  - Git push → auto-deploy
  - Serverless API routes
  - Edge functions (optional)
  - Env var management

### Why Supabase (PostgreSQL)?

- **Justification**: Backend-as-a-Service with compliance
- **Key benefits**:
  - Managed PostgreSQL (automated backups)
  - Auth built-in
  - RLS policies (row-level)
  - Real-time subscriptions (optional)

---

## 🔗 Key Dependencies & Links

### Core Framework

- **[Next.js](https://nextjs.org/docs)** - React framework with App Router
- **[React](https://react.dev)** - UI library
- **[TypeScript](https://www.typescriptlang.org)** - Type safety

### Database & ORM

- **[Prisma](https://www.prisma.io/docs)** - Type-safe ORM
- **[Supabase](https://supabase.com/docs)** - PostgreSQL & Auth SaaS

### Validation & Security

- **[Zod](https://zod.dev)** - Schema validation
- **[Node.js crypto](https://nodejs.org/api/crypto.html)** - Encryption

### UI & Styling

- **[Tailwind CSS](https://tailwindcss.com)** - Utility CSS
- **[shadcn/ui](https://ui.shadcn.com)** - Component library (Radix UI + Tailwind)
- **[Lucide React](https://lucide.dev)** - Icons
- **[Sonner](https://sonner.emilkowal.ski)** - Toast notifications
- **[Framer Motion](https://www.framer.com/motion)** - Animations

### External APIs

- **[googleapis](https://github.com/googleapis/google-api-nodejs-client)** - Google APIs
- **[Stripe](https://stripe.com/docs/stripe-js/react)** - Payments

### Utilities

- **[date-fns](https://date-fns.org)** - Date manipulation
- **[clsx](https://github.com/lukeed/clsx)** - Conditional classNames

---

## 🏗️ Design Patterns Used

### 1. **Server/Client Boundary**

- Server components for data fetching
- Client components (`"use client"`) for interactivity
- API routes as serverless functions

### 2. **Context + Hooks Pattern**

- `AuthContext` provides auth state + methods
- Components use `useAuth()` hook

### 3. **Rate Limiting Pattern**

- Per-IP rate limiter for write operations
- In-memory Map (resets on server restart)

### 4. **Encryption Pattern**

- IV (initialization vector) + ciphertext + auth tag
- Same key for encrypt/decrypt via HMAC

### 5. **OAuth State Validation**

- Signed state parameter prevents CSRF
- Expiry prevents token replay

---

## 📈 Performance Optimizations

| Optimization           | How                       | Why                               |
| ---------------------- | ------------------------- | --------------------------------- |
| **Image optimization** | Next.js `Image` component | Automatic format & size selection |
| **Font optimization**  | `next/font`               | Self-hosted, reduces layout shift |
| **Tree shaking**       | ESM imports               | Only bundle code you use          |
| **React.lazy**         | Code splitting            | Split routes into chunks          |
| **Skeleton loaders**   | UI placeholders           | Better perceived performance      |

---

## 🚀 Next Steps / Future Improvements

1. **Caching**: Add Redis for session management
2. **Real-time**: Supabase real-time subscriptions for live expense updates
3. **Analytics**: Track user behavior (with consent)
4. **Webhooks**: Email notifications on expense milestones
5. **Mobile App**: React Native version sharing backend

---

## 📚 Quick Links

- **[Project README](README.md)** - Features & setup
- **[Prisma Schema](prisma/schema.prisma)** - Database structure
- **[API Routes](app/api)** - Backend endpoints
- **[Components](components)** - UI components
- **[Contexts](app/contexts)** - State management

---

**Last updated**: May 30, 2026
