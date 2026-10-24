# BajiHears: Moderator Engine — Owner Setup Guide

This guide provides simple, numbered instructions for the BajiHears founder to configure and operate the moderation engine.

---

### 1. Assign Your Moderator Account

To access the private moderation dashboard, your Google account must be on the server-side allowlist.

1. Note the Google email address you use to sign in (e.g. `yourname@gmail.com`), or your Supabase User ID UUID.
2. In your local `.env.local` (for development) and in Cloudflare Workers Settings (for production), add:
   ```env
   MODERATOR_EMAILS="yourname@gmail.com"
   ```
   *(Multiple emails can be separated by commas: `MODERATOR_EMAILS="owner@gmail.com,backup@gmail.com"`)*
3. Alternatively, you can use your immutable Supabase User UUID:
   ```env
   MODERATOR_USER_IDS="11111111-2222-3333-4444-555555555555"
   ```

---

### 2. Configure Telegram Alert Notifications (Recommended)

To receive real-time alerts on your phone whenever a post is flagged or reported:

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, choose a name (e.g. `BajiHears Moderation Bot`), and copy the HTTP API **Token**.
3. Start a chat with [@userinfobot](https://t.me/userinfobot) to find your numeric **Id** (Chat ID).
4. Send `/start` to your new bot so it has permission to message you.
5. In Cloudflare Workers (or `.env.local`), configure:
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
   TELEGRAM_CHAT_ID="987654321"
   ```
6. *(Optional Webhook)*: If you use Discord, Slack, or another service, set:
   ```env
   MODERATION_WEBHOOK_URL="https://your-webhook-endpoint.com/moderation"
   ```

---

### 3. Apply the Database Migration to Supabase

1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/qsloqqvdunfuyqqdmgil).
2. Go to the **SQL Editor** in the left menu.
3. Open or paste the contents of:
   `supabase/migrations/20261024000000_production_moderation_engine.sql`
4. Click **Run**.
5. The tables `post_reports`, `moderation_notifications`, view `moderation_queue`, view `echo_moderation_queue`, and all atomic procedures will be created.

---

### 4. Accessing the Admin Dashboard

1. Navigate to:
   ```
   https://bajihears.app/admin/moderation
   ```
   *(Or `http://localhost:3000/admin/moderation` locally)*
2. If you are not signed in, click **Sign in with Google**.
3. If your account is authorized, the moderation dashboard will open immediately.
4. If you see an `Access Restricted (403)` screen, verify that the email you signed in with matches `MODERATOR_EMAILS`.

---

### 5. Reviewing Reports & Flagged Items

The dashboard displays accurate, database-derived metric cards at the top:
- **Unresolved:** Total cases needing review.
- **Auto-Flagged:** Confessions held in review by automated filters.
- **Reported Posts:** Published confessions on The Wall with community reports.
- **Echo Reports:** Replies with community reports.
- **Quarantined:** Content hidden from public visibility.
- **Resolved 24h:** Total actions taken in the last 24 hours.

Filter tabs allow you to focus on specific categories:
- **All Unresolved:** Everything requiring attention.
- **Reported Posts:** Public confessions with reader reports.
- **Reported Echoes:** Reader replies (showing parent confession context).
- **Auto-Flagged:** Content held by keyword filters with zero reports.
- **Audit History:** Full log of past decisions with timestamps.

---

### 6. Taking Moderation Actions

For each item in the queue, select the appropriate action button:

- **Approve & Publish:**
  - Releases held or quarantined content and publishes it to The Wall.
  - Automatically marks open reports as actioned.
- **Hide / Quarantine:**
  - Immediately hides published content from public feeds while retaining it for further review.
- **Reject / Remove:**
  - Removes inappropriate content from public visibility without destroying audit evidence.
- **Restore:**
  - Restores mistakenly rejected or hidden content back to published status.
- **Dismiss Reports:**
  - Keeps content published and marks incoming reports as dismissed (use when reports are false or harmless).

*A confirmation modal will appear before changing visibility to prevent accidental taps on mobile screens.*

---

### 7. Verifying Notification Alerts

1. After configuring your Telegram credentials, submit a test report on a post or Echo.
2. Within 1 minute (the Cloudflare Worker cron schedule), your Telegram bot will send a notification with:
   - Event type (e.g. `POST REPORTED` or `QUARANTINED`)
   - Category and priority
   - Report count and reason
   - Text snippet preview
   - Direct link to `https://bajihears.app/admin/moderation`
3. Click the link to open the dashboard and resolve the report.

---

### 8. Checking System Health

- **Queue Health:** If the `Unresolved` count is `0`, all community reports and flags are resolved.
- **Audit Verification:** Click the **Audit History** tab to verify that your actions are being recorded with your moderator ID and timestamp.
- **Public Visibility Check:** Quarantined or rejected confessions will return a `404 Not Found` if queried directly and will not appear on The Wall or in category feeds.
