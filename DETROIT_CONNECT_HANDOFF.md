# Detroit Connect Project Handoff

Last updated: July 24, 2026

This file is the continuation guide for a new ChatGPT/Codex session. It contains
no passwords, API keys, OAuth secrets, or private user data.

## Start Here

The active application is:

`/Users/saanchiagarwal/Documents/Think Technologies/detroit-connect-app`

Do not continue development in the older HTML experiment folders. They are
visual history and references, not the production application.

Before changing code:

1. Read `AGENTS.md`.
2. Read this file and `README.md`.
3. Run `git status --short`.
4. Run the app at `http://localhost:5200`.
5. Confirm the current page visually before making design changes.
6. Preserve accepted design and copy unless the user explicitly asks to
   experiment.

## Product Summary

Detroit Connect is a relationship-based community directory for people moving
to or living in Detroit.

Users should be able to:

- Find individual helpers, vendors, and community organizations.
- Search by the kind of help they need.
- View detailed public connector profiles.
- Save useful connector profiles.
- Add friends and see their recommendations or past experiences.
- Recommend connectors to accepted friends.
- Ask questions, comment, and share posts in the Community Forum.
- Explore Detroit neighborhoods and landmarks on an interactive map.
- Create and manage their own connector profile.
- Receive notifications about relevant network activity.

The initial audience is approximately 200 users, with room to scale.

## Product Principles

- Easy to understand for adults and people who do not use the internet often.
- Clear navigation, readable type, and familiar controls.
- Minimal explanatory copy; avoid unnecessary subheaders and feature narration.
- Modern, urban, polished, and Detroit-specific without becoming visually busy.
- Warm and inviting, but still credible enough for a city or client-sponsored
  platform.
- Relationship signals should matter: friends, recommendations, and prior
  experience are central to discovery.
- Ask only for profile information that improves matching. Let users enrich
  optional details later.

## Approved Visual Direction

The approved current theme is the clean editorial layout implemented in:

- `src/app/approved-theme.css`
- `src/components/app-header.tsx`
- `src/app/page.tsx`

Key visual decisions:

- Permanent left navigation rail on desktop.
- Compact top navigation plus bottom navigation on mobile.
- White and very light gray page canvas.
- Deep blue-green typography and navigation.
- Restrained gold accents.
- Square or lightly framed interface elements rather than soft pill-heavy UI.
- Strong editorial typography with generous but controlled whitespace.
- Detroit skyline image on the homepage.
- Homepage search is the primary action.
- Interior pages use controlled accent colors:
  - Forum: muted red/coral.
  - Friends: blue with restrained secondary accents.
  - Favorites: gold.
  - Notifications: muted purple.

Do not restore the older floating capsule header, beige template, dark
holographic homepage, or oversized photo-led hero. Those were earlier
experiments that the user moved away from.

## Main Navigation

The shared navigation should remain consistent across all pages:

1. Home
2. Community Forum
3. Explore Detroit
4. Friends
5. Favorites
6. Notifications
7. My Profile or Create Profile

The shared navigation component is `src/components/app-header.tsx`.

## Current Pages

| Route | Purpose | Current state |
| --- | --- | --- |
| `/` | Editorial homepage and search entry | Built and approved |
| `/login` | Email and Google authentication | Built |
| `/connectors` | Browse and filter profiles | Built |
| `/search` | Natural-language search with ranked profiles and citations | Built |
| `/connectors/[id]` | Public connector profile | Built |
| `/create-profile` | Extensive connector profile form | Built |
| `/profile` | Redirect to the signed-in user's profile | Built |
| `/favorites` | Saved connector profiles | Built |
| `/friends` | Friend requests and recommendations | Built |
| `/forum` | Posts, comments, and sharing | Built |
| `/notifications` | Network activity | Built |
| `/explore` | Interactive Detroit map | Built |
| `/auth/callback` | Supabase OAuth callback | Built |

## Important UX Decisions

### Homepage Search

The homepage search submits to `/search`. Natural-language intent parsing,
constraint-aware connector ranking, citation display, and a collapsible source
panel are implemented. With `OPENAI_API_KEY`, the server uses the OpenAI
Responses API to synthesize an answer from public profiles and approved
knowledge excerpts. Without the key, it uses deterministic profile matching
and labels the result `Smart match`.

### Profiles

Profiles can represent:

- Individual helpers.
- Vendors or service providers.
- Community organizations.

Public profiles should emphasize:

- Name and role.
- Neighborhood.
- Profile type.
- Topics they can help with.
- Languages.
- Neighborhood expertise.
- Availability.
- Trust and verification information.
- Friend recommendations or prior experience.

Clicking a profile anywhere in results, Favorites, Friends, or Forum should
lead to that person's public profile.

### Favorites

Favorites currently save connector profiles, not map locations.

### Friends and Recommendations

Friends are used to surface:

- People a friend recommends.
- Connectors a friend previously worked with.
- Context explaining why the recommendation is relevant.

Friend requests support send, accept, decline, and cancel workflows.

### Community Forum

Forum users can:

- Select a topic.
- Add a post title and details.
- Publish a post.
- View prior comments.
- Add a comment.
- Share a post link.

Avoid adding extra explanatory headings or cluttering post actions.

### Explore Detroit

The Explore page uses Leaflet and a detailed street map. Neighborhood and
landmark markers are visually distinct.

Known issue: the heart symbols beside map results are decorative CSS and do not
save anything. They currently create a false interactive affordance. Remove
them unless a real Saved Places feature is being built.

The existing Favorites page is for connector profiles. If Saved Places is
added, it should be clearly separated from connector favorites.

## Technology Stack

- Next.js `16.2.10`
- React `19.2.4`
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- `@supabase/ssr`
- Leaflet for the Detroit map
- Lucide React for interface icons
- Zod for validation
- ESLint

Package scripts:

```bash
npm run dev
npm run build
npm run lint
npm run check
```

Local development command:

```bash
cd "/Users/saanchiagarwal/Documents/Think Technologies/detroit-connect-app"
npm install
npm run dev -- -p 5200
```

Local URL:

`http://localhost:5200`

## Application Modes

The application has two explicit data modes.

### Supabase Production Mode

Used when the required public Supabase environment variables exist.

- Authentication is real.
- Connector profiles require an authenticated owner.
- Favorites, friends, recommendations, forum posts, and comments persist in
  Postgres.
- RLS protects account and relationship data.
- Failed writes should surface a real error.

### Local Demo Mode

Used when Supabase environment variables are absent.

- Sample connector data and local JSON keep the visual interface usable.
- It is for design and interface work only.
- It is not a production or multi-user backend.

Do not mistake successful demo-mode behavior for production backend
verification.

## Supabase Project

Known project reference:

`bhkbihvepgybjunajlzu`

The local `.env.local` currently has all three expected variables set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Never commit `.env.local`, OAuth secrets, the service-role key, or user
credentials.

The app does not require the service-role key for normal user workflows.

## Database Migrations

Run migrations in numeric order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_friend_recommendations_rls.sql`
3. `supabase/migrations/0003_friend_request_controls.sql`
4. `supabase/migrations/0004_production_accounts.sql`
5. `supabase/migrations/0005_backend_hardening.sql`

Optional starter data:

`supabase/seed.sql`

Core tables and data surfaces:

- `user_profiles`
- `public_member_profiles`
- `connector_profiles`
- `favorite_profiles`
- `friendships`
- `profile_recommendations`
- `forum_posts`
- `forum_comments`

Important backend behavior:

- New auth users receive a `user_profiles` row through a database trigger.
- `public_member_profiles` prevents private account fields from being exposed.
- `find_member(search_term)` supports authenticated member lookup.
- Friendship pairs and recommendations have uniqueness protection.
- RLS policies distinguish public reads from user-owned mutations.
- Forum authors can manage their own posts and comments.

Database types live in `src/lib/database.types.ts`. Keep them aligned with the
live Supabase schema whenever migrations change.

## Authentication

Supported authentication:

- Email-based account flow.
- Google OAuth through Supabase.

Required Supabase URL configuration:

- Local callback: `http://localhost:5200/auth/callback`
- Production callback: `https://YOUR-DOMAIN/auth/callback`

Google Cloud must contain the Supabase callback URL as an authorized redirect
URI and the local/production app origins as authorized JavaScript origins.

Google authentication and Supabase URL configuration were set up during the
previous session. Reconfirm them after moving ownership, changing domains, or
deploying.

## Backend Code Map

- `src/lib/supabase/client.ts`: browser Supabase client.
- `src/lib/supabase/server.ts`: server Supabase client.
- `src/lib/supabase/config.ts`: environment configuration check.
- `src/lib/auth/user.ts`: current-user helpers.
- `src/lib/connectors/repository.ts`: connector reads and profile ownership.
- `src/lib/favorites/`: favorite actions and repository.
- `src/lib/friends/`: friend and recommendation workflows.
- `src/lib/forum/`: posts and comments.
- `src/lib/notifications/repository.ts`: notification aggregation.
- `src/app/create-profile/actions.ts`: profile form submission.
- `src/app/login/actions.ts`: authentication actions.
- `src/proxy.ts`: auth session refresh and request proxy behavior.

## Verification Status

The production app was added to Git in this checkpoint:

`e18f0b0 Build production-ready Detroit Connect app`

At that checkpoint:

- `npm run lint` passed.
- `npm run build` passed.
- `npm run check` passed.
- All application routes built successfully.
- The approved theme was visually checked on Home, Forum, Friends, Explore, and
  Create Profile.
- Two-user relationship workflows were tested in the previous session.
- Temporary relational QA records were removed after testing.

Re-run the two-user workflow after account migration or deployment because
OAuth domains, cookies, redirect URLs, and RLS behavior can differ from local
testing.

Two temporary auth test users may still exist in Supabase Auth. Review and
delete them if they are no longer needed.

## Two-User Test Checklist

Use two separate browser sessions or browser profiles:

1. Sign in as User A and User B.
2. Confirm each auth account has a `user_profiles` row.
3. Create one connector profile for each account.
4. Confirm both public connector profiles are readable.
5. Save and remove a favorite.
6. Send a friend request from User A to User B.
7. Accept it as User B.
8. Confirm both users see the accepted friendship.
9. Test decline and cancel with a fresh request if needed.
10. Recommend a connector to the accepted friend.
11. Confirm the recommendation appears in the friend's view.
12. Publish a forum post.
13. Confirm the public author name is correct.
14. Add and read a comment.
15. Confirm notifications and profile links point to the correct destination.
16. Remove temporary QA records when finished.

## Git State and Migration

The Git repository root is:

`/Users/saanchiagarwal/Documents/Think Technologies`

The Detroit Connect app is a directory inside that repository. There is
currently no Git remote configured.

The workspace root contains unrelated files and uncommitted work. When staging
Detroit Connect changes, scope commands to:

```bash
git add -- detroit-connect-app
git status --short -- detroit-connect-app
```

Do not stage or revert unrelated workspace files.

For migration to a personal account:

1. Create a private personal GitHub repository.
2. Add it as a remote.
3. Push the committed history.
4. Sign in to Codex with the personal ChatGPT Pro account.
5. Clone or open the repository.
6. Recreate `.env.local` securely.
7. Reauthorize Supabase MCP and GitHub access.
8. Confirm Supabase project ownership or invite the personal account.
9. Re-run `npm install` and `npm run check`.
10. Re-run the two-user test checklist.

## Current Gaps

The following are not complete production features:

- Homepage search is not yet connected to an LLM.
- No file or website ingestion pipeline exists.
- No semantic/vector search exists.
- No cited AI answer interface exists.
- No collapsible source panel exists.
- There is no complete admin/moderation console.
- Saved map locations are not implemented.
- Production hosting and custom-domain deployment are not complete.
- Automated browser end-to-end tests are not yet part of the repository.
- Accessibility and responsive QA should be repeated before client launch.

## Recommended Next Build

The AI search vertical slice is built. The next production step is approved
source ingestion and quality evaluation.

Build it in this order:

1. Add approved knowledge sources:
   - Uploaded client files.
   - Approved client website URLs.
2. Store documents and metadata in Supabase.
3. Extract text and split it into traceable chunks.
4. Apply migration `0012_ai_knowledge_search.sql` for embeddings and `pgvector` storage.
5. Add source administration, re-indexing, and removal controls.
6. Add retrieval and answer-quality evaluations for approved client content.

Important AI-search guardrails:

- Never send private account fields to the model.
- Keep connector permissions and RLS enforcement outside model prompting.
- Preserve source IDs, URLs, titles, and chunk locations for citations.
- Distinguish connector recommendations from factual client-resource answers.
- Do not present an answer without showing where it came from.
- Add a clear fallback when the approved sources do not contain the answer.

## Suggested Later Milestones

After AI search:

1. Admin and moderation tools.
2. Production deployment and custom domain.
3. Automated end-to-end tests.
4. Accessibility and device QA.
5. Analytics, monitoring, and error reporting.
6. Data-retention and privacy documentation.
7. Client acceptance testing.

## Session Working Style

The user prefers:

- Small, visible steps.
- Scope first when a direction is still open.
- Direct implementation once direction is agreed.
- Named experiments when comparing design options.
- Explicit permission before replacing an accepted design.
- No unnecessary text or decorative interface clutter.
- Browser-visible verification after frontend changes.
- Exact commits at meaningful milestones.

When the user says a version is approved, preserve it. Do not silently replace
accepted copy, navigation, layouts, or imagery during unrelated work.

## Ready-to-Paste Prompt for a New Session

```text
Continue the Detroit Connect project in:
/Users/saanchiagarwal/Documents/Think Technologies/detroit-connect-app

First read AGENTS.md, DETROIT_CONNECT_HANDOFF.md, and README.md. Then inspect
the current Git status and run npm run check. Do not modify or stage unrelated
files elsewhere in the Think Technologies repository.

The approved design is the clean editorial layout in approved-theme.css with
the permanent desktop left navigation, white/light-gray canvas, deep
blue-green typography, restrained gold accents, and page-specific controlled
accents. Do not restore earlier floating-header, beige, dark holographic, or
photo-heavy experimental themes.

Supabase production mode is configured locally. Never expose or commit
.env.local or secrets. Preserve RLS and authenticated ownership rules.

The next major milestone is the AI search and knowledge layer: approved file
uploads and website sources, extraction/chunking, embeddings with pgvector,
hybrid connector plus semantic retrieval, cited answers, and a collapsible
source panel. Before implementing, inspect the existing schema and propose a
tightly scoped plan that preserves all current workflows.
```
