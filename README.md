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

The test suite starts its own local app on port 5202, forces local data mode, creates a fresh `.test-data` directory, and checks the implemented directory, profile, favorites, recommendation, friend, forum, share, map, home search, and profile-creation workflows.

`Like` and direct-message interactions are not yet product features, so they are intentionally listed as gaps rather than treated as passing tests. Google OAuth is tested manually with two real staging accounts because it redirects through Google.

Before client delivery, test with two real accounts in separate browser sessions:

1. Sign up and create one connector profile per account.
2. Save and remove a favorite.
3. Send, accept, decline, and cancel friend requests.
4. Recommend a connector and confirm it appears for the accepted friend.
5. Publish a forum post and confirm its author name is visible publicly.
