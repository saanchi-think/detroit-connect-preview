# Detroit Connect

Detroit Connect is a relationship-based directory for finding local helpers, saving connector profiles, building a trusted friend circle, sharing recommendations, and asking the Detroit community for help.

## Stack

- Next.js 16 and React 19
- Supabase Auth
- Supabase Postgres with Row Level Security
- Local JSON demo data when Supabase is not configured

## Local development

```bash
npm install
npm run dev -- -p 5200
```

Open [http://localhost:5200](http://localhost:5200).

Without Supabase environment variables, the app runs in demo mode. Demo mode is useful for interface work but is not a multi-user backend.

## Synthetic test directory

Create 1,000 deterministic, clearly synthetic connector profiles for local UI work:

```bash
npm run seed:demo
DETROIT_CONNECT_DATA_MODE=local DETROIT_CONNECT_DATA_DIR=.demo-data npm run dev -- -p 5201
```

This uses `example.test` contact details only and does not modify Supabase or the normal `data/` directory.

For a staging Supabase project, use `supabase/seed/1000_synthetic_connector_profiles.sql`. It is idempotent and does not create auth users. Never run it in production. The paired removal script only deletes profiles marked as synthetic.

## Active local preview

Start a populated preview account without signing in. It uses an isolated local data folder with a profile, saved items, network activity, messages, forum posts, and notifications.

```bash
npm run seed:active-demo
DETROIT_CONNECT_DATA_MODE=local DETROIT_CONNECT_DATA_DIR=.active-demo-data NEXT_PUBLIC_DETROIT_CONNECT_PREVIEW_ACCOUNT="Saanchi Agarwal" npm run dev -- -p 5205
```

Open [http://127.0.0.1:5205](http://127.0.0.1:5205). This never sends demo actions or data to Supabase.

## Connect Supabase

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations` in numeric order.
3. Optionally run `supabase/seed.sql` in a staging project to load the three demo connectors.
4. Copy `.env.example` to `.env.local` and add the project URL and anon key.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:5200
```

The service-role key is not required for normal user workflows. Never expose it in browser code or commit it to Git.

## Notification delivery

In-app notifications work with the standard Supabase configuration. Optional email delivery requires these server-only environment variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
NOTIFICATION_EMAIL_FROM="Detroit Connect <notifications@your-domain.com>"
NOTIFICATION_CRON_SECRET=a-long-random-secret
```

Run `supabase/migrations/0016_notification_delivery.sql` before enabling email delivery. It adds notification events, per-user email preferences, digest frequency, read state, and the `mark_all_notifications_read()` database function.

Schedule a production cron job to call the digest endpoint every 15 minutes:

```bash
curl -X POST https://your-domain.com/api/notifications/digest \
  -H "Authorization: Bearer $NOTIFICATION_CRON_SECRET"
```

The endpoint sends only users whose selected schedule is due: immediately, daily, or weekly. Email delivery is off by default and must be enabled by each user in Settings.

## Automatic AI search indexing

Run `supabase/migrations/0020_search_operations.sql` after the hybrid-search migration. Profile, forum, comment, and recommendation changes then enter a durable embedding queue automatically. Failed jobs retry with exponential backoff and appear in the administrator search-health panel.

The server worker needs these private variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
SEARCH_INDEX_CRON_SECRET=a-different-long-random-secret
```

Schedule the worker every one to five minutes. It processes up to 96 documents per invocation:

```bash
curl -X POST https://your-domain.com/api/search/index \
  -H "Authorization: Bearer $SEARCH_INDEX_CRON_SECRET"
```

Search analytics capture response time, result counts, result clicks, and answer feedback. Email addresses and phone-like strings are masked before a query is stored. IP addresses are not collected by the application.

## Auth configuration

In Supabase Auth URL Configuration, add:

- Site URL: the deployed Detroit Connect URL
- Local redirect URL: `http://localhost:5200/auth/callback`
- Production redirect URL: `https://your-domain.com/auth/callback`

For Google sign-in:

1. Create a Google OAuth client for a web application.
2. Add the Supabase callback URL shown on the Supabase Google provider page to the Google client's authorized redirect URIs.
3. Add the local and production site origins to the Google client's authorized JavaScript origins.
4. Enable Google in Supabase Auth Providers and add the Google client ID and client secret.

New accounts automatically receive a `user_profiles` row through the database trigger in migration `0004_production_accounts.sql`.

## Production behavior

When Supabase is configured:

- Connector profiles require a signed-in owner.
- Favorites, friendships, recommendations, and forum posts are stored in Postgres.
- Row Level Security protects all user-owned mutations.
- Friend lookup uses an authenticated database function instead of exposing the user table.
- Failed database writes return an error instead of silently falling back to local JSON.

When Supabase is not configured, local JSON files keep the visual prototype usable.

## Verification

```bash
npm run check
```

Run the isolated interaction suite with:

```bash
npm run test:e2e
```

The test suite starts its own local app on port 5202, forces local data mode, creates a fresh `.test-data` directory, and checks the implemented directory, profile, favorites, recommendation, network, forum, message, notification, share, map, home search, and profile-creation workflows.

Google OAuth and real email delivery are tested manually with staging accounts because they depend on external providers.

Before client delivery, test with two real accounts in separate browser sessions:

1. Sign up and create one connector profile per account.
2. Save and remove a favorite.
3. Send, accept, decline, and cancel friend requests.
4. Recommend a connector and confirm it appears for the accepted friend.
5. Publish a forum post and confirm its author name is visible publicly.
