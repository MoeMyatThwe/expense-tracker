# Expense Tracker Setup Guide

## Quick Start

Your expense tracker is almost ready! Follow these steps to complete the setup.

### 1. Set up Supabase Database

1. Go to [supabase.com](https://supabase.com) and sign in or create an account
2. Click "New Project"
3. Fill in:
   - Project name: `expense-tracker` (or any name you like)
   - Database password: (create a strong password)
   - Region: Choose closest to you
4. Click "Create new project" and wait ~2 minutes

### 2. Get Your Database Connection Strings

Once your project is ready:

1. Go to Project Settings > Database
2. Find "Connection string" section
3. Select "URI" tab
4. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password
5. This is your `DATABASE_URL`
6. For `DIRECT_URL`, use the same URL but ensure it includes `:5432` port

### 3. Get Your API Keys

1. Go to Project Settings > API
2. Copy these values:
   - **Project URL**: This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Update .env.local File

Edit `.env.local` in the root directory:

```env
DATABASE_URL="postgresql://postgres.[your-project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[your-project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[your-project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

### 5. Push Database Schema

```bash
npx prisma db push
```

This will create the `Expense` table in your Supabase database.

### 6. Start the Development Server

```bash
npm run dev
```

### 7. Open Your App

Go to [http://localhost:3000](http://localhost:3000)

## Features Available

### Standard Features
- Toggle Dark Mode - Click the sun/moon icon
- Beautiful Expense Cards - Each expense shown in an interactive card
- Add/Edit/Delete Expenses - Click "Add Expense" button or menu on cards
- Loading States - Skeleton screens while data loads
- Empty States - Helpful message when no expenses exist
- Toast Notifications - Success/error messages for all actions
- Responsive Design - Works on phone, tablet, and desktop

### Advanced Features
- Interactive Graphs - Pie chart for categories, bar chart for monthly trends
- Smooth Animations - Page transitions and micro-interactions
- Real-time Statistics - Total spending, expense count, category breakdown

## Project Structure

```
expense-tracker/
├── app/
│   ├── api/
│   │   ├── expenses/
│   │   │   ├── route.ts              # GET & POST expenses
│   │   │   └── [id]/route.ts         # PUT & DELETE expense
│   │   └── stats/route.ts            # Get statistics
│   ├── layout.tsx                     # Root layout with theme
│   ├── page.tsx                       # Main page
│   └── globals.css                    # Global styles
├── components/
│   ├── ui/                            # Shadcn components
│   ├── empty-state.tsx                # Empty state component
│   ├── expense-card.tsx               # Expense card
│   ├── expense-charts.tsx             # Charts
│   ├── expense-dialog.tsx             # Add/Edit dialog
│   ├── loading-states.tsx             # Skeletons
│   ├── stat-card.tsx                  # Stats card
│   ├── theme-provider.tsx             # Theme provider
│   └── theme-toggle.tsx               # Dark mode toggle
├── lib/
│   ├── prisma.ts                      # Prisma client
│   ├── supabase.ts                    # Supabase client
│   └── utils.ts                       # Utilities
└── prisma/
    └── schema.prisma                  # Database schema
```

## Troubleshooting

### "Failed to fetch expenses" error
- Check that your `.env.local` file has the correct DATABASE_URL
- Verify you ran `npx prisma db push`
- Check that your Supabase project is active

### Dark mode not working
- Make sure `ThemeProvider` is in layout.tsx
- Clear browser cache and reload

### Charts not showing
- Add some expenses first
- Charts only appear when you have expenses

### Build errors
- Run `npm install` again
- Delete `.next` folder and restart dev server
- Check that all files were created correctly

## Next Steps

### Customize Your App

#### Change Colors
Edit `app/globals.css` to customize the color scheme

#### Add More Categories
Edit `components/expense-dialog.tsx` and `components/expense-card.tsx`

#### Add Authentication
- Install `@supabase/auth-helpers-nextjs`
- Follow Supabase auth docs

### Deploy to Production

#### Deploy to Vercel (Recommended)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables from `.env.local`
5. Deploy!

## Support

Need help? Check these resources:
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Shadcn/ui Docs](https://ui.shadcn.com)

Enjoy your expense tracker!
