# Detroit Connect Project Handoff

Last updated: November 5, 2026

This document is the starting point for the next developer. It intentionally
contains no passwords, API keys, OAuth secrets, or private user data.

## Project Location

- Local repository: `/Users/saanchiagarwal/Desktop/Think Projects/detroit-connect-app`
- GitHub: `https://github.com/saanchi-think/detroit-connect-preview`
- Active branch: `codex/desktop-migration`
- Public deployment: not yet configured

After cloning the repository and starting the app, a developer can open
`http://localhost:5200` on that same computer. This is not a public website URL
and will not work for a client or another developer until they run the project
locally. Use the GitHub link above to transfer the code; add the production URL
here after deployment.

Before changing code, read `AGENTS.md`, this file, `README.md`, and
`TESTING.md`, then run `git status --short`.

## Product Summary

Detroit Connect is a community platform for people moving to or living in
Detroit. It includes:

- Public connector profiles and relationship-based recommendations.
- Network requests, accepted connections, and direct messages.
- Community forum posts, comments, replies, likes, sharing, and moderation
  controls.
- Saved profiles, places, and community posts.
- An interactive Detroit neighborhood map.
- In-app notifications, notification preferences, and optional email digests.
- Natural-language search across public profiles and approved community data.
- A populated local preview account for demonstrations without signing in.

## Technology

- Next.js 16.2.10 and React 19.2.4
- TypeScript
- Supabase Auth, Postgres, Row Level Security, Storage, and Realtime
- OpenAI Responses API and embeddings for AI search
- Resend for optional notification email delivery
- Leaflet for the Detroit map
- Playwright for end-to-end tests

## Run Locally

```bash
npm install
npm run dev -- -p 5200
```

To run the populated local preview without authentication:

```bash
npm run seed:active-demo
DETROIT_CONNECT_DATA_MODE=local \
DETROIT_CONNECT_DATA_DIR=.active-demo-data \
NEXT_PUBLIC_DETROIT_CONNECT_PREVIEW_ACCOUNT="Saanchi Agarwal" \
npm run dev -- -p 5205
```

Never commit `.env.local` or any service credentials. Use `.env.example` as the
configuration reference.

## Current Verified State

At this handoff checkpoint:

- `npm run lint` passes.
- `npm run build` passes.
- `npm run test:e2e -- --reporter=line` passes with 37 tests.
- `git diff --check` passes.

The current interface follows the approved clean editorial direction in
`src/app/approved-theme.css`: permanent desktop navigation, compact mobile
navigation, white and light-gray surfaces, deep blue-green type, restrained
gold accents, and controlled page-specific accent colors.

## Latest Notification Work

The latest implementation adds:

- Canonical notification events grouped by conversation or actor.
- Per-notification read and unread controls plus mark all as read.
- Muted forum-thread filtering.
- Recipient-scoped Supabase Realtime refresh for notifications and messages.
- Live notification and message badges without a manual page refresh.
- Email schedules for immediate, daily, weekly, or off.
- Digest filtering for blocked users, muted users, and muted forum threads.

The corresponding migration is:

`supabase/migrations/20260827143511_realtime_notification_controls.sql`

This migration has not yet been applied to the production Supabase project.

## AI Search Status

The deterministic public-profile search and ranking fallback works. The full
conversational answer path is configured for `gpt-5.6-terra`, but the current
OpenAI API account reported that it had no credits remaining during the latest
check. Add API credits before testing generated answers, follow-up memory,
semantic retrieval, or automatic embedding updates.

The application must continue to work with its labeled `Smart match` fallback
when OpenAI is unavailable. Do not send private account fields to the model.

## Production Setup Still Required

1. Apply all Supabase migrations, including
   `20260827143511_realtime_notification_controls.sql`.
2. Configure the production site URL and Supabase public credentials.
3. Configure the server-only notification credentials:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `NOTIFICATION_EMAIL_FROM`
   - `NOTIFICATION_CRON_SECRET`
4. Schedule `POST /api/notifications/digest` every 15 minutes.
5. Configure the AI search credentials and worker:
   - `OPENAI_API_KEY`
   - `OPENAI_SEARCH_MODEL`
   - `OPENAI_EMBEDDING_MODEL`
   - `SEARCH_INDEX_CRON_SECRET`
6. Schedule `POST /api/search/index` every one to five minutes.
7. Configure the production Supabase Auth site URL and callback URL.
8. Verify the Resend sending domain.
9. Deploy the application and run the manual staging checks in `TESTING.md`.

## Required Staging Checks

Use two real accounts in separate browser profiles to verify:

1. Sign-up and OAuth callbacks.
2. Profile creation and public visibility.
3. Connection request send, accept, decline, cancel, and removal.
4. Recommendations and favorites.
5. Messages in both directions, including unread and delivery states.
6. Forum posts, images, comments, replies, likes, sharing, and editing windows.
7. Live notifications without refreshing either browser.
8. Read, unread, mark-all-read, grouping, and thread mute behavior.
9. A real notification email through the scheduled digest endpoint.
10. AI search with an indexed approved source and visible citations.

## Known Product Gaps

- Production hosting and a custom domain still need to be finalized.
- The approved website and file ingestion workflow for AI search is incomplete.
- The administrator moderation experience is not yet complete.
- Forum posts cannot yet be edited or deleted.
- Recommendations do not have a dedicated remove control.
- External email, OAuth, map tiles, and AI responses require staging tests with
  the client-owned services.

## Important Files

- `README.md`: setup, environment, notification, and AI indexing instructions.
- `TESTING.md`: automated coverage and manual staging checklist.
- `.env.example`: required configuration names without secrets.
- `src/app/approved-theme.css`: approved visual system.
- `src/components/app-header.tsx`: shared navigation and live badges.
- `src/lib/notifications/repository.ts`: notification aggregation and state.
- `src/lib/notifications/email-delivery.ts`: email digest selection and delivery.
- `src/lib/search/`: search, retrieval, and AI answer logic.
- `supabase/migrations/`: complete database migration history.

## Handoff Rules

- Preserve the approved interface unless a change is explicitly requested.
- Do not expose or commit credentials.
- Keep Supabase RLS and authenticated ownership rules intact.
- Do not treat local demo behavior as proof that production integrations work.
- Run lint, build, and the relevant Playwright tests before pushing changes.
- Confirm database migrations and external-service behavior in staging before
  claiming production readiness.
