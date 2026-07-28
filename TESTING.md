# Detroit Connect QA Coverage

## Local automated suite

Run `npm run test:e2e` to reset the isolated synthetic fixture and exercise:

- directory search suggestions, profile-type filter, sorting, and pagination across 1,000 profiles
- profile save and remove from favorites
- multiple profile recommendations, profile sharing, and profile-level connection controls
- network search, add, incoming-request acceptance, outgoing-request cancellation, and accepted-connection removal
- direct messages started from profiles and Network, unread filtering, delivery status, and a simulated reply
- notification generation for requests, accepted connections, recommendations, direct messages, post comments, and threaded replies
- forum post creation with up to three images, two independent comments, nested replies, likes, two-minute comment editing, profile links, topic filters, and share-to-DM
- language, neighborhood, and topic filtering across the connector directory
- natural-language homepage search, explicit constraint matching, cited profile sources, and AI-search mobile layout
- notification preference settings and profile community-post activity
- Explore Detroit search suggestions, no-result state, filtering, place selection, and zoom controls
- home search, create-profile submission, validation, image upload, and profile editing
- desktop, phone, and narrow-phone overflow and alignment checks

The suite intentionally uses `DETROIT_CONNECT_DATA_MODE=local` and `.test-data/`; it never writes to the normal demo files or Supabase.

## Manual staging checks

Run these against a separate Supabase staging project, in two browser profiles:

1. Sign in with two Google accounts and confirm the callback returns to Detroit Connect.
2. Create one profile per account and confirm each is visible publicly.
3. Send and accept a connection request between accounts.
4. Save a profile, recommend it, and verify the recommendation appears for the accepted friend.
5. Send messages in both directions and confirm unread/read state and delivery timestamps.
6. Publish a forum post with three images, an independent comment, and a threaded reply from the other account.
7. Edit the new comment within two minutes and confirm editing is unavailable after the window closes.
8. Confirm connection, recommendation, comment, reply, and message notifications appear for the correct account.
9. Change notification preferences and confirm disabled notification categories are suppressed.
10. Remove the connection and confirm both accounts lose network-only relationship state.
11. Configure `OPENAI_API_KEY`, index an approved source, and confirm a factual search answer cites it.

## Remaining limits and product gaps

- The automated two-person journey simulates the second person by updating isolated fixtures. Google sign-in, Supabase row-level security, and both sides of the workflow still need the two-account staging run above.
- New messages and notifications appear after navigation or refresh; Supabase Realtime subscriptions are not implemented.
- AI synthesis and semantic source retrieval require `OPENAI_API_KEY` plus migration `0012_ai_knowledge_search.sql`; without them, the same interface uses deterministic public-profile matching.
- Approved website/file extraction and indexing still require an administrator ingestion workflow before client launch.
- Notifications do not yet have persisted read/unread state, a notification badge, or mark-all-read controls.
- Recommendations can be updated by recommending the same profile again, but there is no explicit remove-recommendation control.
- Comments can be edited for two minutes. Forum posts cannot yet be edited or deleted, and posts/comments cannot yet be reported or moderated.
- Native share, email, SMS, and WhatsApp handoffs depend on the browser and operating system; automated tests cover the in-app DM and clipboard paths.
- Map tiles depend on the external CARTO/OpenStreetMap tile service and should be verified in the deployment environment.
