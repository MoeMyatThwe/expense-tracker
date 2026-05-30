# PayNow Expense Tracker

A modern, full-featured expense tracking application with Gmail integration, receipt scanning, and subscription management. Designed for seamless expense management with intelligent automation and secure data handling.

## 🎯 Features

### Core Expense Management

- **Expense Tracking** - Create, update, delete, and organize expenses with detailed categorization
- **Smart Categories** - Custom expense categories with icons, color coding, and flexible organization
- **Gmail Integration** - Automatically import PayNow transaction emails to create expenses
- **Receipt Scanning** - OCR-powered receipt scanning for quick expense logging
- **Analytics Dashboard** - Visual insights with charts, trends, and spending patterns
- **Multi-currency Support** - Track and manage expenses across different currencies
- **Search & Filter** - Advanced filtering by category, date range, and amount

### Gmail & Email Integration

- **PayNow Gmail Connection** - Securely connect your Gmail account for automatic transaction imports
- **OAuth 2.0 Authentication** - Secure Google OAuth flow with account chooser
- **Encrypted Token Storage** - AES-256-GCM encrypted refresh tokens stored per user
- **Automatic Email Parsing** - Extract transaction details automatically from PayNow emails
- **Session Persistence** - Maintain Gmail connections across sessions

### User Management & Security

- **Supabase Authentication** - Secure user authentication with Google OAuth
- **User Profiles** - Manage personal settings and preferences
- **Role-Based Access Control (RLS)** - Row-level security policies in PostgreSQL
- **Data Validation** - Zod schema validation for all API requests
- **Rate Limiting** - Built-in rate limiter to prevent API abuse
- **Security Headers** - CSP, HSTS, X-Frame-Options, and other protective headers
- **Token Encryption** - AES-256-GCM encryption for sensitive tokens

### Subscription & Payments

- **Stripe Integration** - In-app membership and subscription management
- **Payment Portal** - User-friendly payment history and billing dashboard
- **Subscription Management** - Easy subscription creation and cancellation
- **Checkout Flow** - Secure Stripe checkout experience

### Localization & UI/UX

- **Multi-language Support** - Internationalization for multiple languages
- **Theme Support** - Dark and light theme options with user preferences
- **Responsive Design** - Mobile-first, fully responsive UI for all devices
- **Empty States** - Helpful guidance when no data is available
- **Loading States** - Skeleton loaders and smooth transitions
- **Toast Notifications** - Real-time user feedback via Sonner

## 🛠️ Tech Stack

### Frontend Layer

| Technology            | Version | Purpose                               |
| --------------------- | ------- | ------------------------------------- |
| **Next.js**           | 16.1.6  | React framework with App Router & SSR |
| **React**             | 19      | UI library and component framework    |
| **TypeScript**        | Latest  | Type-safe JavaScript for reliability  |
| **Tailwind CSS**      | Latest  | Utility-first CSS framework           |
| **React Context API** | -       | State management for auth & themes    |

### Backend & Database

| Technology             | Version | Purpose                              |
| ---------------------- | ------- | ------------------------------------ |
| **Next.js API Routes** | 16.1.6  | Serverless backend endpoints         |
| **Prisma**             | 5.22.0  | Type-safe ORM for database access    |
| **PostgreSQL**         | Latest  | Relational database via Supabase     |
| **Supabase**           | -       | Backend-as-a-Service (Auth, DB, RLS) |

### Authentication & OAuth

| Technology           | Purpose                                    |
| -------------------- | ------------------------------------------ |
| **Supabase Auth**    | User authentication and session management |
| **Google OAuth 2.0** | Social sign-in and Gmail API access        |
| **googleapis**       | Google API client library                  |

### Validation & Security

| Technology               | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| **Zod**                  | TypeScript-first schema validation              |
| **crypto (Node.js)**     | Token encryption (AES-256-GCM) and HMAC signing |
| **bcrypt** / Node crypto | Password hashing and security                   |

### Payment Processing

| Technology | Purpose                                    |
| ---------- | ------------------------------------------ |
| **Stripe** | Payment processing, subscriptions, billing |

## 📦 Key Libraries & Dependencies

### UI Component Libraries

```json
{
  "shadcn/ui": "Composable React component library",
  "lucide-react": "Beautiful and consistent icon library",
  "sonner": "Toast notification system",
  "tailwindcss-animate": "Tailwind CSS animation utilities"
}
```

### Utilities & Helpers

```json
{
  "date-fns": "Modern date manipulation and formatting",
  "clsx": "Utility for constructing className strings",
  "next/font": "Font optimization and loading"
}
```

### API & Data Handling

```json
{
  "googleapis": "Google APIs client library",
  "zod": "TypeScript-first schema validation"
}
```

### Development Tools

```json
{
  "eslint": "Code linting and quality checking",
  "postcss": "CSS transformation and processing",
  "typescript": "TypeScript compiler and type checking"
}
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Google OAuth credentials
- Stripe account (optional, for payments)

### Installation

1. **Clone & Install**:

   ```bash
   git clone <repo-url>
   cd expense-tracker
   npm install
   ```

2. **Environment Setup**:
   Create `.env.local` with:

   ```bash
   # Supabase
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

   # Google OAuth (Gmail)
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail-expenses/token

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
   STRIPE_SECRET_KEY=...
   ```

3. **Database Setup**:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

## 📁 Project Structure

```
expense-tracker/
├── app/                              # Next.js App Router
│   ├── api/                         # API routes
│   │   ├── expenses/               # Expense CRUD
│   │   ├── categories/             # Category management
│   │   ├── gmail/oauth/            # Gmail OAuth flow
│   │   ├── gmail-expenses/         # Gmail import
│   │   ├── stripe/                 # Stripe webhooks
│   │   └── stats/                  # Analytics
│   ├── analytics/                   # Analytics page
│   ├── auth/                        # Auth pages
│   ├── profile/                     # User profile
│   ├── categories/                  # Category management page
│   └── page.tsx                     # Home/Dashboard
├── components/                      # React components
│   ├── ui/                         # shadcn/ui components
│   ├── expense-dialog.tsx          # Expense form modal
│   ├── expense-charts.tsx          # Analytics charts
│   ├── app-shell.tsx               # Main layout
│   └── ...
├── lib/                            # Utilities & helpers
│   ├── prisma.ts                  # Prisma client
│   ├── gmail-oauth.ts             # Gmail OAuth logic
│   ├── validation.ts              # Zod schemas
│   ├── rate-limit.ts              # Rate limiter
│   ├── stripe.ts                  # Stripe utilities
│   └── utils.ts                   # Common helpers
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # DB migrations
└── public/                        # Static assets
```

## 🔗 API Routes

### Expenses

- `GET /api/expenses` - List user expenses with filters
- `POST /api/expenses` - Create new expense
- `PATCH /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### Categories

- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/[id]` - Update category
- `DELETE /api/categories/[id]` - Delete category

### Gmail Integration

- `GET /api/gmail/oauth/start` - Initiate Gmail OAuth flow
- `GET /api/gmail/oauth/callback` - OAuth callback handler
- `GET /api/gmail-expenses` - Fetch imported expenses
- `POST /api/gmail-expenses/token` - Store Gmail OAuth token

### Analytics

- `GET /api/stats` - Get expense statistics and trends

### Payments (Stripe)

- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create billing portal session
- `POST /api/stripe/membership` - Manage membership

## 🔐 Security Features

- ✅ Row-Level Security (RLS) policies in PostgreSQL
- ✅ Zod schema validation on all inputs
- ✅ Rate limiting to prevent abuse
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ AES-256-GCM token encryption
- ✅ HTTPS-only in production
- ✅ Secure OAuth 2.0 flows
- ✅ Session management via Supabase

## 📚 Documentation

- See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup instructions
- See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for project overview

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes with clear commits
3. Test thoroughly
4. Submit a pull request

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Built with ❤️ using Next.js, Supabase, and modern web technologies.**
