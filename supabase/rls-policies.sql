-- Supabase Row Level Security policies for expense-tracker
-- Run this in the Supabase SQL editor after your tables exist.

alter table public."User" enable row level security;
alter table public."Expense" enable row level security;
alter table public."Category" enable row level security;
alter table public."Membership" enable row level security;
alter table public."GmailConnection" enable row level security;

-- User table
create policy "Users can read own profile"
  on public."User"
  for select
  using (auth.uid()::text = id);

create policy "Users can insert own profile"
  on public."User"
  for insert
  with check (auth.uid()::text = id);

create policy "Users can update own profile"
  on public."User"
  for update
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

-- Expense table
create policy "Users can read own expenses"
  on public."Expense"
  for select
  using (auth.uid()::text = "userId");

create policy "Users can insert own expenses"
  on public."Expense"
  for insert
  with check (auth.uid()::text = "userId");

create policy "Users can update own expenses"
  on public."Expense"
  for update
  using (auth.uid()::text = "userId")
  with check (auth.uid()::text = "userId");

create policy "Users can delete own expenses"
  on public."Expense"
  for delete
  using (auth.uid()::text = "userId");

-- Category table
create policy "Users can read own categories"
  on public."Category"
  for select
  using (auth.uid()::text = "userId");

create policy "Users can insert own categories"
  on public."Category"
  for insert
  with check (auth.uid()::text = "userId");

create policy "Users can update own categories"
  on public."Category"
  for update
  using (auth.uid()::text = "userId")
  with check (auth.uid()::text = "userId");

create policy "Users can delete own categories"
  on public."Category"
  for delete
  using (auth.uid()::text = "userId");

-- Membership table
create policy "Users can read own membership"
  on public."Membership"
  for select
  using (auth.uid()::text = "userId");

create policy "Users can insert own membership"
  on public."Membership"
  for insert
  with check (auth.uid()::text = "userId");

create policy "Users can update own membership"
  on public."Membership"
  for update
  using (auth.uid()::text = "userId")
  with check (auth.uid()::text = "userId");

-- Gmail connection table
create policy "Users can read own gmail connection"
  on public."GmailConnection"
  for select
  using (auth.uid()::text = "userId");

create policy "Users can insert own gmail connection"
  on public."GmailConnection"
  for insert
  with check (auth.uid()::text = "userId");

create policy "Users can update own gmail connection"
  on public."GmailConnection"
  for update
  using (auth.uid()::text = "userId")
  with check (auth.uid()::text = "userId");

create policy "Users can delete own gmail connection"
  on public."GmailConnection"
  for delete
  using (auth.uid()::text = "userId");
