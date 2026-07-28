import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const defaultOutput = ".demo-data/local-dev-store.json";
const countFlagIndex = process.argv.indexOf("--count");
const outputFlagIndex = process.argv.indexOf("--output");
const requestedCount = Number(process.argv[countFlagIndex + 1] ?? "1000");
const count = Number.isInteger(requestedCount) && requestedCount >= 12 ? requestedCount : 1000;
const output = process.argv[outputFlagIndex + 1] ?? defaultOutput;

const firstNames = [
  "Avery",
  "Brianna",
  "Caleb",
  "Danielle",
  "Elijah",
  "Farah",
  "Gabriel",
  "Hana",
  "Isaiah",
  "Jasmine",
  "Kai",
  "Leila",
  "Marcus",
  "Nia",
  "Omar",
  "Priya",
  "Quinn",
  "Renee",
  "Sasha",
  "Theo",
];
const lastNames = [
  "Adams",
  "Bennett",
  "Campbell",
  "Davis",
  "Ellis",
  "Foster",
  "Grant",
  "Hughes",
  "Irving",
  "Johnson",
  "Kim",
  "Lopez",
  "Mitchell",
  "Nguyen",
  "Owens",
  "Patel",
  "Robinson",
  "Singh",
  "Taylor",
  "Walker",
];
const neighborhoods = [
  "Midtown",
  "Corktown",
  "Southwest Detroit",
  "Downtown",
  "New Center",
  "Bagley",
  "East English Village",
  "Rosedale Park",
  "Woodbridge",
  "West Village",
];
const topicSets = [
  ["Housing", "Neighborhoods"],
  ["Schools", "Childcare"],
  ["Business", "Networking"],
  ["Moving", "Transportation"],
  ["City Services", "Utilities"],
  ["Finances", "Taxes"],
  ["Medical", "Healthcare"],
  ["Legal", "Permits"],
  ["Arts & Culture", "Community"],
  ["Jobs", "Workforce development"],
];
const languageSets = [
  ["English"],
  ["English", "Spanish"],
  ["English", "Arabic"],
  ["English", "Bengali"],
  ["English", "French"],
];
const skillSets = [
  ["Community outreach", "Local knowledge"],
  ["Real estate", "Tenant support"],
  ["Small business", "Operations"],
  ["Education", "Family services"],
  ["Public benefits", "City navigation"],
];

function dateFor(index) {
  const date = new Date(Date.UTC(2023, 0, 1, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString();
}

function syntheticId(index) {
  return `f0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function sampleRecord(index, record) {
  const timestamp = dateFor(index + 1);

  return {
    id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
    owner_id: null,
    kind: record.kind,
    status: "published",
    name: record.name,
    headline: record.headline,
    bio: `Synthetic test profile for ${record.name}.`,
    organization_name: null,
    email: `${record.name.toLowerCase().replaceAll(" ", ".")}@example.test`,
    phone: null,
    website_url: "https://example.test/detroit-connect",
    preferred_contact_method: "Email",
    neighborhood: record.neighborhood,
    zip_code: record.zipCode,
    years_connected: "10+ years",
    languages: record.languages,
    topics: record.topics,
    skills: ["Community outreach"],
    availability: ["Messages"],
    trust_badges: ["Synthetic test profile"],
    created_at: timestamp,
    updated_at: timestamp,
    avatar_key: null,
    friend_signal: record.friendSignal,
  };
}

function generatedRecord(index) {
  const sourceIndex = index - 3;
  const kind = sourceIndex % 4 === 3 ? "organization" : "person";
  const firstName = firstNames[sourceIndex % firstNames.length];
  const lastName = lastNames[Math.floor(sourceIndex / firstNames.length) % lastNames.length];
  const neighborhood = neighborhoods[sourceIndex % neighborhoods.length];
  const topics = topicSets[sourceIndex % topicSets.length];
  const title =
    kind === "person" ? `${topics[0]} connector` : `${topics[0]} community resource`;
  const name =
    kind === "organization"
      ? `${neighborhood} ${topics[0]} Collective ${String(sourceIndex + 1).padStart(3, "0")}`
      : `${firstName} ${lastName} ${String(sourceIndex + 1).padStart(3, "0")}`;
  const timestamp = dateFor(index + 1);

  return {
    id: syntheticId(index + 1),
    owner_id: null,
    kind,
    status: "published",
    name,
    headline: title,
    bio: `Synthetic Detroit Connect profile for ${topics.join(" and ")} in ${neighborhood}.`,
    organization_name: kind === "person" ? null : `${neighborhood} Network`,
    email: `profile-${String(index + 1).padStart(4, "0")}@example.test`,
    phone: null,
    website_url: "https://example.test/detroit-connect",
    preferred_contact_method: sourceIndex % 3 === 0 ? "Messages" : "Email",
    neighborhood,
    zip_code: `482${String((sourceIndex % 28) + 1).padStart(2, "0")}`,
    years_connected: ["New to Detroit", "1-3 years", "4-10 years", "10+ years", "Lifelong Detroiter"][sourceIndex % 5],
    languages: languageSets[sourceIndex % languageSets.length],
    topics,
    skills: skillSets[sourceIndex % skillSets.length],
    availability: sourceIndex % 4 === 0 ? ["Messages", "Coffee chats"] : ["Messages"],
    trust_badges: ["Synthetic test profile"],
    created_at: timestamp,
    updated_at: timestamp,
    avatar_key: [null, "tire", "boat", "car", "pizza"][sourceIndex % 5],
    friend_signal: sourceIndex % 3 === 0 ? "Recommended in this test dataset" : "Open to helping newcomers",
  };
}

const featuredProfiles = [
  {
    kind: "person",
    name: "Maria Rodriguez",
    headline: "Community development connector",
    neighborhood: "Southwest Detroit",
    zipCode: "48209",
    languages: ["English", "Spanish"],
    topics: ["Housing", "Schools", "Neighborhoods"],
    friendSignal: "Recommended by Nia",
  },
  {
    kind: "person",
    name: "Darnell Williams",
    headline: "City services navigator",
    neighborhood: "Bagley",
    zipCode: "48221",
    languages: ["English"],
    topics: ["Utilities", "City Services", "Moving"],
    friendSignal: "Recommended in your Detroit circle",
  },
  {
    kind: "person",
    name: "Aisha King",
    headline: "Small business advisor",
    neighborhood: "New Center",
    zipCode: "48202",
    languages: ["English"],
    topics: ["Business", "Permits", "Finances"],
    friendSignal: "Saved by Lina",
  },
  {
    kind: "person",
    name: "Amara King",
    headline: "Small business mentor",
    neighborhood: "New Center",
    zipCode: "48202",
    languages: ["English"],
    topics: ["Business", "Permits", "Networking"],
    friendSignal: "Active in the community forum",
  },
  {
    kind: "person",
    name: "Devon Taylor",
    headline: "New resident connector",
    neighborhood: "Corktown",
    zipCode: "48216",
    languages: ["English"],
    topics: ["Moving", "Transportation", "Neighborhoods"],
    friendSignal: "Active in the community forum",
  },
  {
    kind: "person",
    name: "Jalen Parker",
    headline: "Neighborhood guide",
    neighborhood: "Woodbridge",
    zipCode: "48208",
    languages: ["English"],
    topics: ["Housing", "Transit", "Neighborhoods"],
    friendSignal: "Shared local advice in the forum",
  },
  {
    kind: "person",
    name: "Nina Sanders",
    headline: "Small business program guide",
    neighborhood: "Eastern Market",
    zipCode: "48207",
    languages: ["English"],
    topics: ["Business", "Permits", "City Services"],
    friendSignal: "Shared local advice in the forum",
  },
  {
    kind: "person",
    name: "Nia Patel",
    headline: "Midtown resident connector",
    neighborhood: "Midtown",
    zipCode: "48201",
    languages: ["English", "Gujarati"],
    topics: ["Community", "Neighborhoods", "Housing"],
    friendSignal: "In your friend circle",
  },
  {
    kind: "person",
    name: "Marcus Bell",
    headline: "Homeowner and city services guide",
    neighborhood: "Bagley",
    zipCode: "48221",
    languages: ["English"],
    topics: ["Housing", "Utilities", "City Services"],
    friendSignal: "In your friend circle",
  },
  {
    kind: "person",
    name: "Lina Chen",
    headline: "Local business owner",
    neighborhood: "Corktown",
    zipCode: "48216",
    languages: ["English", "Mandarin"],
    topics: ["Business", "Networking", "Community"],
    friendSignal: "In your friend circle",
  },
  {
    kind: "person",
    name: "Andre Brooks",
    headline: "Neighborhood resident connector",
    neighborhood: "East English Village",
    zipCode: "48224",
    languages: ["English"],
    topics: ["Neighborhoods", "Housing", "Community"],
    friendSignal: "Sent you a friend request",
  },
  {
    kind: "person",
    name: "Priya Mehta",
    headline: "Newcomer support connector",
    neighborhood: "Midtown",
    zipCode: "48201",
    languages: ["English", "Hindi"],
    topics: ["Moving", "Utilities", "Neighborhoods"],
    friendSignal: "Shared local advice in the forum",
  },
];

const records = [
  ...featuredProfiles.map((profile, index) => sampleRecord(index, profile)),
  ...Array.from(
    { length: count - featuredProfiles.length },
    (_, index) => generatedRecord(index + featuredProfiles.length),
  ),
];

const resolvedOutput = path.resolve(process.cwd(), output);
await mkdir(path.dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(`Wrote ${records.length} synthetic connector profiles to ${resolvedOutput}`);
