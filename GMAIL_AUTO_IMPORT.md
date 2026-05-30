# Gmail Auto-Import Setup Guide

## Overview

The expense tracker now supports **automatic background imports** of PayNow Gmail expenses. You have two options:

### Option 1: Auto-Import on Page Load (Already Enabled ✅)

- Automatically fetches new PayNow emails when users visit the home page
- Best for: Development and user-friendly experience
- No setup needed — it just works!

### Option 2: Scheduled Background Imports (Optional)

- Periodically fetches PayNow emails for all connected users, even if they're not using the app
- Best for: Production environments where you want fresh data 24/7
- Requires setting up an external cron service

---

## Setting Up Scheduled Imports

### Step 1: Configure the Secret Key

In your **production `.env.local`** (or `.env.production`), set a secure secret:

```env
GMAIL_AUTO_IMPORT_SECRET="your_super_secret_random_key_here"
```

**For production:** Generate a random secure string:

```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object {[char](Get-Random -Min 48 -Max 123))} -join '')))
```

### Step 2: Choose a Cron Service

Pick one of these **free** cron services:

#### **Option A: cron-job.org** (Recommended - 5 min intervals)

1. Go to https://cron-job.org/en/
2. Click **Sign Up** (free)
3. Create a new cronjob:
   - **Title:** "Expense Tracker - Auto Import PayNow"
   - **URL:** `https://your-domain.com/api/gmail-expenses/auto-import?secret=YOUR_SECRET_KEY`
   - **Execution Time:** Every 1 hour (or adjust as needed)
   - **Notifications:** Enable (optional)
4. Save and **Enable** the job

#### **Option B: EasyCron** (30 second min intervals)

1. Go to https://www.easycron.com/
2. Click **Sign Up** (free)
3. Create a cron job:
   - **Cron Expression:** `0 * * * *` (every hour)
   - **URL:** `https://your-domain.com/api/gmail-expenses/auto-import?secret=YOUR_SECRET_KEY`
4. Save and enable

#### **Option C: AWS EventBridge** (Production)

For enterprise customers, AWS EventBridge provides more control:

1. Create rule with schedule: `rate(1 hour)`
2. Target: HTTP POST to your endpoint with secret in header
3. Refer to AWS documentation for details

### Step 3: Test the Endpoint Manually

Before setting up automated cron:

```bash
# Development (local):
curl "http://localhost:3000/api/gmail-expenses/auto-import?secret=dev_secret_change_in_production"

# Production:
curl "https://your-domain.com/api/gmail-expenses/auto-import?secret=YOUR_SECRET_KEY"
```

**Expected response:**

```json
{
  "success": true,
  "stats": {
    "totalUsers": 2,
    "successful": 2,
    "failed": 0,
    "totalSaved": 5
  },
  "results": [
    {
      "success": true,
      "userId": "abc123",
      "totalMessages": 50,
      "savedCount": 3
    },
    ...
  ]
}
```

### Step 4: Monitor Imports

Check server logs to verify imports are working:

```log
[Gmail Auto-Import] Starting scheduled import for all users...
[Gmail Auto-Import] Complete: { totalUsers: 2, successful: 2, failed: 0, totalSaved: 5 }
```

---

## How It Works

1. **Triggered**: External cron service calls `/api/gmail-expenses/auto-import?secret=XXXXXX`
2. **Validation**: Server verifies the secret key matches
3. **Loop**: For each user with a Gmail connection:
   - Fetch new PayNow emails from Gmail API
   - Extract amount, date, merchant
   - Check for duplicates
   - Save to database (if new)
4. **Response**: Returns stats (users processed, expenses imported, errors)

---

## Recommended Schedules

| Frequency          | Use Case                  | Cron           |
| ------------------ | ------------------------- | -------------- |
| **Every 1 hour**   | Production (good balance) | `0 * * * *`    |
| **Every 6 hours**  | Moderate usage            | `0 */6 * * *`  |
| **Every 12 hours** | Light usage               | `0 */12 * * *` |
| **Every 4 hours**  | Heavy usage               | `0 */4 * * *`  |

---

## Troubleshooting

### "Unauthorized" Error

- ✅ Check secret key is correct
- ✅ Verify `GMAIL_AUTO_IMPORT_SECRET` is set on server
- ✅ Make sure secret matches between `.env` and cron service URL

### "No users with Gmail connected"

- ✅ At least one user must have connected Gmail (via profile page)
- ✅ Check database: `SELECT * FROM "GmailConnection"`

### "Gmail is not connected for this account"

- ✅ User's GmailConnection row exists but refresh token may be expired
- ✅ User should reconnect via profile page

### Cron job not triggering

- ✅ Check cron service dashboard for "Last Execution" status
- ✅ Look at server logs for API requests
- ✅ Test manually with curl command above

---

## For Development

During development, the endpoint is available at:

```
http://localhost:3000/api/gmail-expenses/auto-import?secret=dev_secret_change_in_production
```

You can test it manually instead of setting up a cron job.

---

## Security Notes

- **Always use HTTPS in production** (cron services should support this)
- **Rotate secret key regularly** (update both `.env` and cron service URL)
- **Use a strong random secret** (at least 32 characters)
- **The endpoint logs activity** — check server logs for audit trail

---

## API Reference

**Endpoint:** `GET /api/gmail-expenses/auto-import?secret=<SECRET_KEY>`

**Response (Success):**

```json
{
  "success": true,
  "stats": {
    "totalUsers": 2,
    "successful": 2,
    "failed": 0,
    "totalSaved": 15
  },
  "results": [...]
}
```

**Response (Error):**

```json
{
  "error": "Unauthorized" | "Auto-import not configured on server" | "Unknown error"
}
```

**Status Codes:**

- `200 OK` — Import completed (check stats for details)
- `401 Unauthorized` — Invalid secret
- `500 Internal Server Error` — Server configuration issue

---

## Questions?

If imports aren't working:

1. Test the endpoint manually with curl
2. Check server logs
3. Verify at least one user has Gmail connected
4. Verify secret key is configured correctly

Happy automated expense tracking! 🎉
