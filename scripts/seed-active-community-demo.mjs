import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectDirectory = process.cwd();
const dataDirectory = path.resolve(projectDirectory, ".active-demo-data");

if (
  !dataDirectory.startsWith(`${projectDirectory}${path.sep}`) ||
  path.basename(dataDirectory) !== ".active-demo-data"
) {
  throw new Error("Refusing to seed data outside this project's active demo folder.");
}

const LOCAL_USER_ID = "local-dev-user";
const SELF_PROFILE_ID = "f0000000-0000-4000-8000-000000001000";
const profileId = (index) => `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`;

async function writeJson(filename, value) {
  await writeFile(
    path.join(dataDirectory, filename),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

await rm(dataDirectory, { force: true, recursive: true });
await mkdir(dataDirectory, { recursive: true });

const generated = spawnSync(
  process.execPath,
  [
    "scripts/generate-synthetic-connectors.mjs",
    "--count",
    "1000",
    "--output",
    ".active-demo-data/local-dev-store.json",
  ],
  { cwd: projectDirectory, stdio: "inherit" },
);

if (generated.status !== 0) {
  process.exit(generated.status ?? 1);
}

const connectorPath = path.join(dataDirectory, "local-dev-store.json");
const connectors = JSON.parse(await readFile(connectorPath, "utf8"));
connectors[connectors.length - 1] = {
  id: SELF_PROFILE_ID,
  owner_id: LOCAL_USER_ID,
  kind: "person",
  status: "published",
  name: "Saanchi Agarwal",
  headline: "Detroit newcomer and community connector",
  bio: "Building a practical Detroit network around trusted introductions, useful local knowledge, and neighbor-to-neighbor support.",
  organization_name: "Think Technologies",
  email: "saanchi@example.test",
  phone: null,
  website_url: "https://example.test/detroit-connect",
  preferred_contact_method: "Messages",
  neighborhood: "Midtown",
  zip_code: "48201",
  years_connected: "1-3 years",
  languages: ["English", "Hindi"],
  topics: ["Business", "Moving", "Neighborhoods", "Community"],
  skills: ["Technology", "Community building", "Project strategy"],
  availability: ["Messages", "Coffee chats", "Introductions"],
  trust_badges: ["Email verified", "Active community member"],
  created_at: "2026-02-14T14:30:00.000Z",
  updated_at: "2026-08-04T19:20:00.000Z",
  avatar_key: "car",
  avatar_url: null,
  friend_signal: "Active in the Detroit Connect community",
};
await writeJson("local-dev-store.json", connectors);

await writeJson("local-dev-friends.json", [
  {
    id: "local-friend-nia",
    user_id: LOCAL_USER_ID,
    display_name: "Nia Patel",
    email: "nia.patel@example.com",
    detail: "Midtown resident connector",
    status: "accepted",
    created_at: "2026-05-10T15:00:00.000Z",
    updated_at: "2026-08-04T18:35:00.000Z",
  },
  {
    id: "local-friend-marcus",
    user_id: LOCAL_USER_ID,
    display_name: "Marcus Bell",
    email: "marcus.bell@example.com",
    detail: "Bagley homeowner",
    status: "accepted",
    created_at: "2026-05-17T14:00:00.000Z",
    updated_at: "2026-07-31T17:20:00.000Z",
  },
  {
    id: "local-friend-lina",
    user_id: LOCAL_USER_ID,
    display_name: "Lina Chen",
    email: "lina.chen@example.com",
    detail: "Corktown business owner",
    status: "accepted",
    created_at: "2026-06-03T16:00:00.000Z",
    updated_at: "2026-08-02T13:10:00.000Z",
  },
  {
    id: "local-jalen",
    user_id: LOCAL_USER_ID,
    display_name: "Jalen Parker",
    email: "jalen.parker@example.com",
    detail: "Woodbridge neighborhood guide",
    status: "accepted",
    created_at: "2026-06-18T19:00:00.000Z",
    updated_at: "2026-08-03T16:42:00.000Z",
  },
  {
    id: "local-nina",
    user_id: LOCAL_USER_ID,
    display_name: "Nina Sanders",
    email: "nina.sanders@example.com",
    detail: "Eastern Market business guide",
    status: "accepted",
    created_at: "2026-07-02T18:00:00.000Z",
    updated_at: "2026-08-01T21:05:00.000Z",
  },
  {
    id: "local-request-andre",
    user_id: LOCAL_USER_ID,
    display_name: "Andre Brooks",
    email: "andre.brooks@example.com",
    detail: "East English Village resident",
    status: "pending",
    direction: "incoming",
    created_at: "2026-08-05T13:15:00.000Z",
    updated_at: "2026-08-05T13:15:00.000Z",
  },
  {
    id: "local-priya",
    user_id: LOCAL_USER_ID,
    display_name: "Priya Mehta",
    email: "priya.mehta@example.com",
    detail: "Newcomer support connector",
    status: "pending",
    direction: "outgoing",
    created_at: "2026-08-04T20:40:00.000Z",
    updated_at: "2026-08-04T20:40:00.000Z",
  },
]);

await writeJson("local-dev-recommendations.json", [
  {
    id: "active-recommendation-maria",
    user_id: LOCAL_USER_ID,
    recommender_name: "Nia Patel",
    connector_profile_id: profileId(1),
    note: "Maria gives thoughtful housing guidance and knows Southwest Detroit block by block.",
    created_at: "2026-08-04T17:25:00.000Z",
  },
  {
    id: "active-recommendation-darnell",
    user_id: LOCAL_USER_ID,
    recommender_name: "Marcus Bell",
    connector_profile_id: profileId(2),
    note: "Darnell makes utilities, permits, and city services much easier to understand.",
    created_at: "2026-08-03T15:40:00.000Z",
  },
  {
    id: "active-recommendation-aisha",
    user_id: LOCAL_USER_ID,
    recommender_name: "Lina Chen",
    connector_profile_id: profileId(3),
    note: "Aisha is my first call for permits, startup questions, and practical referrals.",
    created_at: "2026-08-02T18:10:00.000Z",
  },
  {
    id: "active-recommendation-priya",
    user_id: LOCAL_USER_ID,
    recommender_name: "Jalen Parker",
    connector_profile_id: profileId(12),
    note: "Priya is generous with newcomer checklists and neighborhood introductions.",
    created_at: "2026-08-01T16:50:00.000Z",
  },
  {
    id: "active-recommendation-self",
    user_id: "local-nia",
    recommender_name: "Nia Patel",
    connector_profile_id: SELF_PROFILE_ID,
    note: "Saanchi brings people together and follows through on useful community introductions.",
    created_at: "2026-08-04T21:05:00.000Z",
  },
  {
    id: "active-recommendation-you-amara",
    user_id: LOCAL_USER_ID,
    recommender_name: "You",
    connector_profile_id: profileId(4),
    note: "Amara explains Detroit's small-business ecosystem in clear, practical steps.",
    created_at: "2026-08-04T14:15:00.000Z",
  },
  {
    id: "active-recommendation-you-devon",
    user_id: LOCAL_USER_ID,
    recommender_name: "You",
    connector_profile_id: profileId(5),
    note: "Devon recently completed a move and shares a very useful first-month checklist.",
    created_at: "2026-08-02T12:30:00.000Z",
  },
]);

await writeJson("local-dev-favorites.json", [
  { user_id: LOCAL_USER_ID, connector_profile_id: profileId(1), created_at: "2026-08-05T12:10:00.000Z" },
  { user_id: LOCAL_USER_ID, connector_profile_id: profileId(3), created_at: "2026-08-04T16:30:00.000Z" },
  { user_id: LOCAL_USER_ID, connector_profile_id: profileId(8), created_at: "2026-08-03T11:45:00.000Z" },
  { user_id: LOCAL_USER_ID, connector_profile_id: profileId(12), created_at: "2026-08-01T19:05:00.000Z" },
]);

await writeJson("local-dev-favorite-places.json", [
  { user_id: LOCAL_USER_ID, place_id: "corktown", created_at: "2026-08-05T10:10:00.000Z" },
  { user_id: LOCAL_USER_ID, place_id: "riverfront", created_at: "2026-08-04T10:10:00.000Z" },
  { user_id: LOCAL_USER_ID, place_id: "michigan-central", created_at: "2026-08-03T10:10:00.000Z" },
  { user_id: LOCAL_USER_ID, place_id: "eastern-market", created_at: "2026-08-02T10:10:00.000Z" },
]);

const forumPosts = [
  {
    id: "active-forum-own-introductions",
    author_id: LOCAL_USER_ID,
    initials: "SA",
    avatar_class: "avatar-gold",
    name: "Saanchi Agarwal",
    topic: "Community",
    title: "Which newcomer meetups make it easiest to meet neighbors?",
    body: "I am putting together a short list for people arriving this fall. I would love recommendations for welcoming, low-pressure events across Midtown, Corktown, and Southwest Detroit.",
    image_urls: ["/images/places/campus.jpg", "/images/places/corktown.jpg"],
    created_at: "2026-08-04T19:10:00.000Z",
    updated_at: "2026-08-04T19:10:00.000Z",
  },
  {
    id: "active-forum-housing",
    author_id: "local-maria",
    initials: "MR",
    avatar_class: "avatar-blue",
    name: "Maria Rodriguez",
    topic: "Housing",
    title: "A practical way to compare neighborhoods before signing a lease",
    body: "Visit once during the day and once after work. Check the grocery route, parking rules, transit frequency, and the walk from your actual front door rather than a landmark.",
    image_urls: ["/images/places/southwest.jpg"],
    created_at: "2026-08-04T16:45:00.000Z",
    updated_at: "2026-08-04T16:45:00.000Z",
  },
  {
    id: "active-forum-business",
    author_id: "local-amara",
    initials: "AK",
    avatar_class: "avatar-coral",
    name: "Amara King",
    topic: "Business",
    title: "Shared kitchens and permit help for a weekend food pop-up",
    body: "A friend is testing a three-weekend concept. Who has recently used a shared kitchen and can explain the licensing sequence in plain English?",
    image_urls: ["/images/places/campus.jpg"],
    created_at: "2026-08-04T13:20:00.000Z",
    updated_at: "2026-08-04T13:20:00.000Z",
  },
  {
    id: "active-forum-moving",
    author_id: "local-devon",
    initials: "DT",
    avatar_class: "avatar-blue",
    name: "Devon Taylor",
    topic: "Moving",
    title: "What I wish I had handled in my first week in Detroit",
    body: "Utilities and parking came first, but joining the neighborhood email list was the thing that made everything else easier. People immediately shared trash schedules and local contacts.",
    image_urls: [],
    created_at: "2026-08-03T20:05:00.000Z",
    updated_at: "2026-08-03T20:05:00.000Z",
  },
  {
    id: "active-forum-schools",
    author_id: "local-priya",
    initials: "PM",
    avatar_class: "avatar-gold",
    name: "Priya Mehta",
    topic: "Schools",
    title: "Questions to ask during a school visit",
    body: "Beyond curriculum, ask how families receive updates, how transportation works, what after-school options fill quickly, and who helps a new child settle in.",
    image_urls: [],
    created_at: "2026-08-03T15:25:00.000Z",
    updated_at: "2026-08-03T15:25:00.000Z",
  },
  {
    id: "active-forum-own-ai",
    author_id: LOCAL_USER_ID,
    initials: "SA",
    avatar_class: "avatar-gold",
    name: "Saanchi Agarwal",
    topic: "Business",
    title: "Looking for feedback on a community technology meetup",
    body: "Would an evening session about practical AI tools for neighborhood organizations be useful? I am considering a small pilot with live examples and plenty of time for questions.",
    image_urls: ["/images/places/michigan-central.jpg"],
    created_at: "2026-08-02T17:40:00.000Z",
    updated_at: "2026-08-02T17:40:00.000Z",
  },
  {
    id: "active-forum-transit",
    author_id: "local-jalen",
    initials: "JP",
    avatar_class: "avatar-coral",
    name: "Jalen Parker",
    topic: "City Services",
    title: "Transit tips for someone working downtown without a car",
    body: "Tell me the work schedule and neighborhood shortlist. The best option changes quite a bit between regular weekday hours and late shifts.",
    image_urls: [],
    created_at: "2026-08-01T18:30:00.000Z",
    updated_at: "2026-08-01T18:30:00.000Z",
  },
  {
    id: "active-forum-weekend",
    author_id: "local-nia",
    initials: "NP",
    avatar_class: "avatar-blue",
    name: "Nia Patel",
    topic: "Community",
    title: "A relaxed Detroit Saturday for visiting family",
    body: "We are thinking Eastern Market in the morning, the riverfront after lunch, and one indoor stop if it rains. What would you add or change?",
    image_urls: ["/images/places/campus.jpg"],
    created_at: "2026-07-31T14:15:00.000Z",
    updated_at: "2026-07-31T14:15:00.000Z",
  },
];

const forumComments = [
  { id: "active-comment-1", post_id: "active-forum-own-introductions", parent_comment_id: null, author_id: "local-nia", name: "Nia Patel", initials: "NP", avatar_class: "avatar-blue", body: "The Midtown walking group is very easy to join. I can introduce you to the organizer.", created_at: "2026-08-04T19:24:00.000Z" },
  { id: "active-comment-2", post_id: "active-forum-own-introductions", parent_comment_id: "active-comment-1", author_id: LOCAL_USER_ID, name: "Saanchi Agarwal", initials: "SA", avatar_class: "avatar-gold", body: "That would be perfect. Is the next walk open to new residents?", created_at: "2026-08-04T19:31:00.000Z" },
  { id: "active-comment-3", post_id: "active-forum-own-introductions", parent_comment_id: "active-comment-2", author_id: "local-nia", name: "Nia Patel", initials: "NP", avatar_class: "avatar-blue", body: "Yes. I just sent you the details in a message.", created_at: "2026-08-04T19:38:00.000Z" },
  { id: "active-comment-4", post_id: "active-forum-own-introductions", parent_comment_id: null, author_id: "local-jalen", name: "Jalen Parker", initials: "JP", avatar_class: "avatar-coral", body: "Woodbridge has a monthly porch meetup that is intentionally newcomer-friendly.", created_at: "2026-08-04T20:02:00.000Z" },
  { id: "active-comment-5", post_id: "active-forum-housing", parent_comment_id: null, author_id: "local-marcus", name: "Marcus Bell", initials: "MB", avatar_class: "avatar-gold", body: "Also check snow parking rules and whether the block has an active neighborhood group.", created_at: "2026-08-04T17:05:00.000Z" },
  { id: "active-comment-6", post_id: "active-forum-housing", parent_comment_id: null, author_id: LOCAL_USER_ID, name: "Saanchi Agarwal", initials: "SA", avatar_class: "avatar-gold", body: "This is exactly the kind of practical checklist I was hoping to save. Thank you.", created_at: "2026-08-04T17:18:00.000Z" },
  { id: "active-comment-7", post_id: "active-forum-business", parent_comment_id: null, author_id: "local-nina", name: "Nina Sanders", initials: "NS", avatar_class: "avatar-blue", body: "Eastern Market has a clear starter guide. I can message you the right contact.", created_at: "2026-08-04T13:47:00.000Z" },
  { id: "active-comment-8", post_id: "active-forum-business", parent_comment_id: "active-comment-7", author_id: "local-amara", name: "Amara King", initials: "AK", avatar_class: "avatar-coral", body: "Please do. The shared-kitchen sequence is the part we are unsure about.", created_at: "2026-08-04T14:02:00.000Z" },
  { id: "active-comment-9", post_id: "active-forum-moving", parent_comment_id: null, author_id: "local-priya", name: "Priya Mehta", initials: "PM", avatar_class: "avatar-gold", body: "The neighborhood list is underrated. Ours helped with recycling, parking, and a reliable electrician in one week.", created_at: "2026-08-03T20:28:00.000Z" },
  { id: "active-comment-10", post_id: "active-forum-schools", parent_comment_id: null, author_id: "local-maria", name: "Maria Rodriguez", initials: "MR", avatar_class: "avatar-blue", body: "I would add language support and how the school communicates last-minute schedule changes.", created_at: "2026-08-03T16:00:00.000Z" },
  { id: "active-comment-11", post_id: "active-forum-own-ai", parent_comment_id: null, author_id: "local-lina", name: "Lina Chen", initials: "LC", avatar_class: "avatar-coral", body: "Yes, especially if examples include volunteer coordination and grant reporting. @Saanchi Agarwal I can help invite two neighborhood groups.", created_at: "2026-08-02T18:04:00.000Z" },
  { id: "active-comment-12", post_id: "active-forum-own-ai", parent_comment_id: null, author_id: "local-marcus", name: "Marcus Bell", initials: "MB", avatar_class: "avatar-gold", body: "Please keep it beginner-friendly. A short worksheet people can take home would help.", created_at: "2026-08-02T18:22:00.000Z" },
  { id: "active-comment-13", post_id: "active-forum-transit", parent_comment_id: null, author_id: "local-devon", name: "Devon Taylor", initials: "DT", avatar_class: "avatar-blue", body: "My shifts end at 10 p.m. Would that change your Midtown recommendation?", created_at: "2026-08-01T18:49:00.000Z" },
  { id: "active-comment-14", post_id: "active-forum-transit", parent_comment_id: "active-comment-13", author_id: "local-jalen", name: "Jalen Parker", initials: "JP", avatar_class: "avatar-coral", body: "Yes. I would compare the late route and the last-mile walk before deciding.", created_at: "2026-08-01T19:03:00.000Z" },
  { id: "active-comment-15", post_id: "active-forum-weekend", parent_comment_id: null, author_id: LOCAL_USER_ID, name: "Saanchi Agarwal", initials: "SA", avatar_class: "avatar-gold", body: "The Guardian Building is a great indoor stop and keeps the day geographically simple.", created_at: "2026-07-31T15:02:00.000Z" },
];

await writeJson("local-dev-forum.json", {
  posts: forumPosts,
  comments: forumComments,
  likes: [
    ["active-forum-own-introductions", "local-nia"],
    ["active-forum-own-introductions", "local-jalen"],
    ["active-forum-own-introductions", "local-marcus"],
    ["active-forum-housing", LOCAL_USER_ID],
    ["active-forum-housing", "local-marcus"],
    ["active-forum-business", LOCAL_USER_ID],
    ["active-forum-moving", LOCAL_USER_ID],
    ["active-forum-schools", "local-maria"],
    ["active-forum-own-ai", "local-lina"],
    ["active-forum-own-ai", "local-marcus"],
    ["active-forum-weekend", LOCAL_USER_ID],
  ].map(([post_id, user_id], index) => ({ post_id, user_id, created_at: `2026-08-04T${String(8 + index).padStart(2, "0")}:00:00.000Z` })),
  commentLikes: [
    ["active-comment-1", LOCAL_USER_ID],
    ["active-comment-5", LOCAL_USER_ID],
    ["active-comment-7", "local-amara"],
    ["active-comment-11", LOCAL_USER_ID],
  ].map(([comment_id, user_id], index) => ({ comment_id, user_id, created_at: `2026-08-04T${String(19 + index).padStart(2, "0")}:00:00.000Z` })),
  savedPosts: [
    { post_id: "active-forum-housing", user_id: LOCAL_USER_ID, created_at: "2026-08-04T17:19:00.000Z" },
    { post_id: "active-forum-business", user_id: LOCAL_USER_ID, created_at: "2026-08-04T14:05:00.000Z" },
    { post_id: "active-forum-weekend", user_id: LOCAL_USER_ID, created_at: "2026-07-31T15:05:00.000Z" },
  ],
  subscriptions: [
    { post_id: "active-forum-housing", user_id: LOCAL_USER_ID, status: "following", created_at: "2026-08-04T17:19:00.000Z", updated_at: "2026-08-04T17:19:00.000Z" },
    { post_id: "active-forum-business", user_id: LOCAL_USER_ID, status: "following", created_at: "2026-08-04T14:05:00.000Z", updated_at: "2026-08-04T14:05:00.000Z" },
  ],
  mentions: [
    { id: "active-mention-1", actor_id: "local-lina", actor_name: "Lina Chen", mentioned_user_id: LOCAL_USER_ID, mentioned_name: "Saanchi Agarwal", profile_href: "/profile", post_id: "active-forum-own-ai", comment_id: "active-comment-11", created_at: "2026-08-02T18:04:00.000Z" },
  ],
});

const conversations = [
  ["active-conversation-nia", "friend:local-friend-nia", "local-friend-nia", "2026-08-05T14:22:00.000Z", []],
  ["active-conversation-maria", profileId(1), "local-maria", "2026-08-04T18:12:00.000Z", []],
  ["active-conversation-darnell", profileId(2), "local-darnell", "2026-08-03T16:34:00.000Z", []],
  ["active-conversation-lina", "friend:local-friend-lina", "local-friend-lina", "2026-08-02T19:08:00.000Z", []],
  ["active-conversation-aisha", profileId(3), "local-aisha", "2026-08-01T15:48:00.000Z", []],
  ["active-conversation-priya", profileId(12), "local-priya", "2026-07-28T14:05:00.000Z", [LOCAL_USER_ID]],
].map(([id, connector_profile_id, member_two_id, updated_at, archived_by]) => ({
  id,
  connector_profile_id,
  member_one_id: LOCAL_USER_ID,
  member_two_id,
  created_at: updated_at,
  updated_at,
  archived_by,
}));

const messages = [
  ["active-message-nia-1", "active-conversation-nia", "local-friend-nia", "The Midtown walking group meets Thursday at 6:30. I added you to the welcome note.", "2026-08-05T14:18:00.000Z", null],
  ["active-message-nia-2", "active-conversation-nia", "local-friend-nia", "I can also introduce you to Maya, who organizes the newcomer table.", "2026-08-05T14:22:00.000Z", null],
  ["active-message-maria-1", "active-conversation-maria", LOCAL_USER_ID, "Could you help me compare two Southwest Detroit blocks for a friend moving in September?", "2026-08-04T17:40:00.000Z", "2026-08-04T17:44:00.000Z"],
  ["active-message-maria-2", "active-conversation-maria", "local-maria", "Absolutely. Send me the cross streets and commute priorities.", "2026-08-04T17:53:00.000Z", "2026-08-04T17:58:00.000Z"],
  ["active-message-maria-3", "active-conversation-maria", LOCAL_USER_ID, "Transit, groceries, and a quieter evening feel are the big three.", "2026-08-04T18:01:00.000Z", "2026-08-04T18:03:00.000Z"],
  ["active-message-maria-4", "active-conversation-maria", "local-maria", "Great. I will send a short comparison tomorrow morning.", "2026-08-04T18:12:00.000Z", null],
  ["active-message-darnell-1", "active-conversation-darnell", LOCAL_USER_ID, "Do you have a checklist for switching utilities after a move?", "2026-08-03T16:10:00.000Z", "2026-08-03T16:14:00.000Z"],
  ["active-message-darnell-2", "active-conversation-darnell", "local-darnell", "Yes. I am sending the current city-services version now.", "2026-08-03T16:34:00.000Z", "2026-08-03T17:02:00.000Z"],
  ["active-message-lina-1", "active-conversation-lina", "local-friend-lina", "I liked your community technology meetup idea.", "2026-08-02T18:40:00.000Z", "2026-08-02T18:45:00.000Z"],
  ["active-message-lina-2", "active-conversation-lina", LOCAL_USER_ID, "Thank you. I want it to feel practical, not like a sales presentation.", "2026-08-02T18:52:00.000Z", "2026-08-02T18:54:00.000Z"],
  ["active-message-lina-3", "active-conversation-lina", "local-friend-lina", "That is exactly why two neighborhood groups said they would attend.", "2026-08-02T19:08:00.000Z", "2026-08-02T19:20:00.000Z"],
  ["active-message-aisha-1", "active-conversation-aisha", LOCAL_USER_ID, "Lina recommended you for a startup permit question. Is email or chat easier?", "2026-08-01T15:22:00.000Z", "2026-08-01T15:26:00.000Z"],
  ["active-message-aisha-2", "active-conversation-aisha", "local-aisha", "Chat is perfect. Tell me the business type and neighborhood first.", "2026-08-01T15:48:00.000Z", "2026-08-01T16:02:00.000Z"],
  ["active-message-priya-1", "active-conversation-priya", "local-priya", "Here is the first-week checklist we discussed. Feel free to forward it.", "2026-07-28T14:05:00.000Z", "2026-07-28T16:10:00.000Z"],
].map(([id, conversation_id, sender_id, body, created_at, read_at]) => ({
  id,
  conversation_id,
  sender_id,
  body,
  created_at,
  delivered_at: new Date(new Date(created_at).getTime() + 2000).toISOString(),
  read_at,
  is_forwarded: false,
}));

const reactions = [
  ["active-message-nia-2", LOCAL_USER_ID, "👍"],
  ["active-message-maria-4", "local-maria", "🙌"],
  ["active-message-lina-1", LOCAL_USER_ID, "❤️"],
].map(([message_id, user_id, emoji]) => ({
  message_id,
  user_id,
  emoji,
  created_at: "2026-08-05T14:24:00.000Z",
}));

await writeJson("local-dev-messages.json", { conversations, messages, reactions });

console.log(`Seeded an active Detroit Connect community in ${dataDirectory}`);
