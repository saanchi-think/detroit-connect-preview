"use client";

/* eslint-disable @next/next/no-img-element -- vinext serves these bundled preview assets directly. */

import {
  Bookmark,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star,
  Store,
  Users,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ExploreMap } from "./explore-map";

type View = "home" | "connectors" | "forum" | "explore" | "friends" | "favorites" | "profile";
type ConnectorType = "Person" | "Vendor" | "Organization";
type AvatarKey = "tire" | "boat" | "car" | "pizza";

type Connector = {
  id: string;
  name: string;
  role: string;
  neighborhood: string;
  type: ConnectorType;
  topics: string[];
  initials: string;
  color: string;
  recommendedBy?: string;
  friendRecommendations?: string[];
  experience?: string;
  workedWithNote?: string;
};

type ForumPost = {
  id: number;
  initials: string;
  author: string;
  meta: string;
  topic: string;
  title: string;
  body: string;
  comments: number;
};

type ForumComment = {
  id: string;
  initials: string;
  author: string;
  meta: string;
  body: string;
};

const connectors: Connector[] = [
  {
    id: "maria",
    name: "Maria Rodriguez",
    role: "Community development manager",
    neighborhood: "Southwest Detroit",
    type: "Person",
    topics: ["Housing", "Schools", "Neighborhoods"],
    initials: "MR",
    color: "blue",
    recommendedBy: "Priya Lawson + 2 friends",
    friendRecommendations: ["Priya Lawson", "Jordan Smith"],
    experience: "Priya worked with Maria during a Midtown rental search and praised her neighborhood guidance.",
    workedWithNote: "Helped with a Midtown rental search · May 2026",
  },
  {
    id: "darnell",
    name: "Darnell Thompson",
    role: "Small business advisor",
    neighborhood: "Corktown",
    type: "Person",
    topics: ["Business", "Taxes", "Permits"],
    initials: "DT",
    color: "gold",
    recommendedBy: "Marcus Lee",
    friendRecommendations: ["Marcus Lee"],
    experience: "Marcus relied on Darnell for permit and tax guidance while launching a small business.",
  },
  {
    id: "aisha",
    name: "Aisha Hassan",
    role: "Family services navigator",
    neighborhood: "Warrendale",
    type: "Person",
    topics: ["Medical", "Childcare", "City services"],
    initials: "AH",
    color: "purple",
    recommendedBy: "Jordan Smith",
    friendRecommendations: ["Jordan Smith"],
    experience: "Jordan recommends Aisha for navigating childcare and family health resources.",
  },
  {
    id: "motor-city-moving",
    name: "Motor City Moving Co.",
    role: "Residential moving and storage",
    neighborhood: "New Center",
    type: "Vendor",
    topics: ["Moving", "Storage", "Utilities"],
    initials: "MM",
    color: "coral",
    recommendedBy: "Priya Lawson + 3 others",
    friendRecommendations: ["Priya Lawson", "Marcus Lee"],
    experience: "Priya and Marcus both used this team for local moves and noted their clear communication.",
    workedWithNote: "Handled an apartment move · April 2026",
  },
  {
    id: "detroit-housing-network",
    name: "Detroit Housing Network",
    role: "Housing education nonprofit",
    neighborhood: "Midtown",
    type: "Organization",
    topics: ["Renting", "Home buying", "Legal"],
    initials: "DH",
    color: "navy",
  },
  {
    id: "cedar-tax",
    name: "Cedar Tax & Accounting",
    role: "Personal and small business tax services",
    neighborhood: "Downtown",
    type: "Vendor",
    topics: ["Taxes", "Finances", "Business"],
    initials: "CT",
    color: "green",
  },
];

const initialPosts: ForumPost[] = [
  {
    id: 1,
    initials: "MR",
    author: "Maria Rodriguez",
    meta: "Southwest Detroit connector | 12 min ago",
    topic: "Housing",
    title: "Renter-friendly neighborhoods near reliable transit?",
    body: "My sister is moving for a healthcare job. She wants a quiet place, transit access, and groceries nearby. What areas should she compare first?",
    comments: 8,
  },
  {
    id: 2,
    initials: "AK",
    author: "Amara King",
    meta: "Small business mentor | 34 min ago",
    topic: "Business",
    title: "Who helps new food businesses understand Detroit permits?",
    body: "We need plain-English guidance on licensing, inspections, shared kitchens, and neighborhood events for a new pop-up concept.",
    comments: 5,
  },
  {
    id: 3,
    initials: "DT",
    author: "Devon Taylor",
    meta: "New to Detroit | 1 hr ago",
    topic: "Moving",
    title: "Moving checklist for the first two weeks?",
    body: "What should I do first after arriving: utilities, parking, license updates, doctors, neighborhood groups, or something else?",
    comments: 11,
  },
];

const initialPostComments: Record<number, ForumComment[]> = {
  1: [
    {
      id: "1-1",
      initials: "JL",
      author: "Jordan Lee",
      meta: "8 min ago",
      body: "Take a look at New Center and Woodbridge. Both make everyday errands manageable, and the QLINE is nearby for trips downtown.",
    },
    {
      id: "1-2",
      initials: "SB",
      author: "Simone Brooks",
      meta: "5 min ago",
      body: "East English Village is quieter, but I would compare commute times carefully. Midtown may be the easiest place to start without a car.",
    },
    {
      id: "1-3",
      initials: "MR",
      author: "Maria Rodriguez",
      meta: "2 min ago",
      body: "Thank you. Midtown and New Center sound like the best first two areas for her to visit.",
    },
  ],
  2: [
    {
      id: "2-1",
      initials: "DL",
      author: "Darnell Lee",
      meta: "21 min ago",
      body: "Detroit Means Business has a clear startup checklist. I would also contact the Buildings, Safety Engineering and Environmental Department before signing a kitchen lease.",
    },
    {
      id: "2-2",
      initials: "NK",
      author: "Nia King",
      meta: "14 min ago",
      body: "Eastern Market's food business resources are useful for pop-ups and can help explain which permits apply to temporary events.",
    },
  ],
  3: [
    {
      id: "3-1",
      initials: "AH",
      author: "Aisha Hassan",
      meta: "48 min ago",
      body: "Start utilities before move-in day, then update your license and voter registration. Parking rules depend on the neighborhood and building.",
    },
    {
      id: "3-2",
      initials: "TC",
      author: "Theo Carter",
      meta: "39 min ago",
      body: "Join your neighborhood association early. It is often the fastest way to learn trash schedules, block clubs, and trusted local services.",
    },
    {
      id: "3-3",
      initials: "EP",
      author: "Elena Patel",
      meta: "26 min ago",
      body: "I would add changing your vehicle insurance address to the first-week list so your coverage stays accurate.",
    },
  ],
};

const helperTopics = {
  living: ["Housing", "Renting", "Buying a home", "Utilities", "Neighborhood recommendations"],
  family: ["Schools", "Childcare", "Youth programs", "College preparation"],
  career: ["Job search", "Entrepreneurship", "Small business resources", "Networking", "Workforce development"],
  community: ["Faith communities", "Arts & culture", "Recreation", "Volunteer opportunities", "Community organizations"],
  navigation: ["Transportation", "City services", "Permits", "Taxes", "Public safety"],
};

const profileSkills = ["Marketing", "Construction", "Education", "Technology", "Real estate", "Finance", "Healthcare", "Legal"];
const profileAvailability = ["Messages", "Calls", "Coffee chats", "Mentoring", "Not currently available"];
const helperTopicGroups = [
  { label: "Living in Detroit", topics: helperTopics.living },
  { label: "Family & Education", topics: helperTopics.family },
  { label: "Career & Business", topics: helperTopics.career },
  { label: "Community Life", topics: helperTopics.community },
  { label: "City Navigation", topics: helperTopics.navigation },
];
const profileAvatarOptions: Array<{ id: AvatarKey; label: string }> = [
  { id: "tire", label: "Tire avatar" },
  { id: "boat", label: "Lake boat avatar" },
  { id: "car", label: "Racing car avatar" },
  { id: "pizza", label: "Deep dish pizza avatar" },
];

const navItems: Array<{ id: View; label: string }> = [
  { id: "home", label: "Home" },
  { id: "forum", label: "Community Forum" },
  { id: "explore", label: "Explore Detroit" },
  { id: "friends", label: "Friends" },
  { id: "favorites", label: "Favorites" },
];

const friends = [
  { initials: "PL", name: "Priya Lawson", area: "Midtown" },
  { initials: "ML", name: "Marcus Lee", area: "East Village" },
  { initials: "JS", name: "Jordan Smith", area: "Corktown" },
];

function TypeIcon({ type }: { type: ConnectorType }) {
  if (type === "Vendor") return <Store size={15} />;
  if (type === "Organization") return <Building2 size={15} />;
  return <CircleUserRound size={15} />;
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [directoryConnectors, setDirectoryConnectors] = useState(connectors);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | ConnectorType>("All");
  const [saved, setSaved] = useState(() => new Set(["maria"]));
  const [workedWith, setWorkedWith] = useState(() => new Set(["maria", "motor-city-moving"]));
  const [friendView, setFriendView] = useState<"recommendations" | "worked">("recommendations");
  const [selectedFriend, setSelectedFriend] = useState("All friends");
  const [posts, setPosts] = useState(initialPosts);
  const [openCommentPost, setOpenCommentPost] = useState<number | null>(null);
  const [openSharePost, setOpenSharePost] = useState<number | null>(null);
  const [postComments, setPostComments] = useState<Record<number, ForumComment[]>>(initialPostComments);
  const [forumTopic, setForumTopic] = useState("All");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>("tire");
  const [toast, setToast] = useState("");

  const filteredConnectors = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return directoryConnectors.filter((connector) => {
      const matchesType = typeFilter === "All" || connector.type === typeFilter;
      const haystack = [connector.name, connector.role, connector.neighborhood, connector.type, ...connector.topics]
        .join(" ")
        .toLowerCase();
      return matchesType && terms.every((term) => haystack.includes(term));
    });
  }, [directoryConnectors, query, typeFilter]);

  const favoriteConnectors = directoryConnectors.filter((connector) => saved.has(connector.id));
  const recommendedConnectors = directoryConnectors.filter((connector) => {
    if (!connector.friendRecommendations?.length) return false;
    return selectedFriend === "All friends" || connector.friendRecommendations.includes(selectedFriend);
  });
  const workedWithConnectors = directoryConnectors.filter((connector) => workedWith.has(connector.id));
  const visiblePosts = forumTopic === "All" ? posts : posts.filter((post) => post.topic === forumTopic);

  function announce(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate("connectors");
  }

  function toggleFavorite(id: string) {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        announce("Removed from favorites");
      } else {
        next.add(id);
        announce("Saved to favorites");
      }
      return next;
    });
  }

  function toggleWorkedWith(id: string) {
    setWorkedWith((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        announce("Removed from worked-with history");
      } else {
        next.add(id);
        announce("Added to worked-with history");
      }
      return next;
    });
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const body = String(form.get("body") || "").trim();
    const topic = String(form.get("topic") || "City Services");
    if (!title || !body) return;
    setPosts((current) => [
      { id: Date.now(), initials: "YOU", author: "You", meta: "Just now", topic, title, body, comments: 0 },
      ...current,
    ]);
    event.currentTarget.reset();
    setForumTopic("All");
    announce("Your post is now visible");
  }

  function submitComment(event: FormEvent<HTMLFormElement>, postId: number) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = String(form.get("comment") || "").trim();
    if (!body) return;

    setPostComments((current) => ({
      ...current,
      [postId]: [
        ...(current[postId] ?? []),
        {
          id: `${postId}-${Date.now()}`,
          initials: "YOU",
          author: "You",
          meta: "Just now",
          body,
        },
      ],
    }));
    setPosts((current) => current.map((post) => (
      post.id === postId ? { ...post, comments: post.comments + 1 } : post
    )));
    event.currentTarget.reset();
    announce("Comment posted");
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("firstName") || "").trim();
    const lastName = String(form.get("lastName") || "").trim();
    const neighborhood = String(form.get("neighborhood") || "Detroit").trim();
    const profileType = String(form.get("profileType") || "Individual helper");
    const topics = form.getAll("topics").map(String);
    const otherTopic = String(form.get("otherTopic") || "").trim();
    const jobTitle = String(form.get("jobTitle") || "").trim();

    if (!firstName || !lastName || !neighborhood) return;

    const type: ConnectorType = profileType.startsWith("Vendor")
      ? "Vendor"
      : profileType.startsWith("Community")
        ? "Organization"
        : "Person";
    const profileTopics = [...topics, ...(otherTopic ? [otherTopic] : [])].slice(0, 3);
    const name = `${firstName} ${lastName}`;
    const newConnector: Connector = {
      id: `profile-${Date.now()}`,
      name,
      role: jobTitle || (type === "Person" ? "Detroit community connector" : profileType),
      neighborhood,
      type,
      topics: profileTopics.length ? profileTopics : ["Community support"],
      initials: `${firstName[0]}${lastName[0]}`.toUpperCase(),
      color: selectedAvatar === "car" ? "coral" : selectedAvatar === "pizza" ? "gold" : selectedAvatar === "boat" ? "blue" : "navy",
    };

    setDirectoryConnectors((current) => [newConnector, ...current]);
    setQuery(name);
    setTypeFilter("All");
    event.currentTarget.reset();
    navigate("connectors");
    announce("Profile created");
  }

  async function copyPostLink(post: ForumPost) {
    const url = `https://saanchi-think.github.io/detroit-connect-preview/#post-${post.id}`;

    try {
      await navigator.clipboard.writeText(url);
      announce("Post link copied");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      textArea.remove();
      announce(copied ? "Post link copied" : "Unable to copy the link");
    }
  }

  return (
    <main className={`site-shell view-${view}`}>
      <Header activeView={view} navigate={navigate} />

      {view === "home" && (
        <section className="home-view" aria-labelledby="home-title">
          <div className="home-navy" aria-hidden="true" />
          <div className="home-copy">
            <span className="eyebrow">Newcomer network / local guide / 2026</span>
            <h1 id="home-title">
              <span>Detroit</span>
              <span>Connect</span>
            </h1>
            <p>A premium relocation network for trusted local helpers, neighborhood insight, and practical guidance.</p>
            <form className="ai-search" onSubmit={handleSearch}>
              <label>
                <span>AI search</span>
                <input
                  aria-label="Search Detroit Connect"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="What do you need help finding in Detroit?"
                  type="search"
                  value={query}
                />
              </label>
              <button aria-label="Search connectors" type="submit">
                <Sparkles size={21} />
              </button>
            </form>
            <button className="browse-link" onClick={() => navigate("connectors")} type="button">
              Browse all connectors <ChevronRight size={17} />
            </button>
          </div>
          <figure className="home-photo">
            <img alt="Detroit skyline at dusk" src="images/detroit-downtown-dusk.png" />
          </figure>
          <div className="home-index" aria-hidden="true">
            <span>42.3314 N</span>
            <span>83.0458 W</span>
          </div>
        </section>
      )}

      {view === "connectors" && (
        <section className="content-view connectors-view" aria-labelledby="connectors-title">
          <PageLead eyebrow="Local network" title="Connectors" />
          <form className="directory-search" onSubmit={handleSearch}>
            <Search size={19} />
            <input
              aria-label="Search connectors"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Housing, schools, business..."
              type="search"
              value={query}
            />
            <select
              aria-label="Profile type"
              onChange={(event) => setTypeFilter(event.target.value as "All" | ConnectorType)}
              value={typeFilter}
            >
              <option>All</option>
              <option>Person</option>
              <option>Vendor</option>
              <option>Organization</option>
            </select>
            <button type="submit">Search</button>
          </form>
          <div className="result-meta">
            <span>{filteredConnectors.length} trusted profiles</span>
            {query && <button onClick={() => setQuery("")} type="button">Clear search</button>}
          </div>
          <ConnectorGrid connectors={filteredConnectors} saved={saved} workedWith={workedWith} toggleFavorite={toggleFavorite} toggleWorkedWith={toggleWorkedWith} announce={announce} />
        </section>
      )}

      {view === "profile" && (
        <CreateProfileView
          onSubmit={submitProfile}
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
        />
      )}

      {view === "favorites" && (
        <section className="content-view" aria-labelledby="favorites-title">
          <PageLead eyebrow="Your shortlist" title="Favorites" />
          {favoriteConnectors.length ? (
            <ConnectorGrid connectors={favoriteConnectors} saved={saved} workedWith={workedWith} toggleFavorite={toggleFavorite} toggleWorkedWith={toggleWorkedWith} announce={announce} />
          ) : (
            <EmptyState
              icon={<Bookmark size={24} />}
              title="No saved profiles yet"
              action="Browse connectors"
              onAction={() => navigate("connectors")}
            />
          )}
        </section>
      )}

      {view === "friends" && (
        <section className="content-view friends-view" aria-labelledby="friends-title">
          <PageLead eyebrow="Trusted connections" title="Your network" />
          <div className="friends-layout">
            <section className="recommendations" aria-label="Connections and recommendations">
              <div className="friend-view-tabs" role="tablist" aria-label="Network views">
                <button
                  aria-selected={friendView === "recommendations"}
                  className={friendView === "recommendations" ? "active" : ""}
                  onClick={() => setFriendView("recommendations")}
                  role="tab"
                  type="button"
                >
                  <Users size={16} /> Friends&apos; recommendations <span>{recommendedConnectors.length}</span>
                </button>
                <button
                  aria-selected={friendView === "worked"}
                  className={friendView === "worked" ? "active" : ""}
                  onClick={() => setFriendView("worked")}
                  role="tab"
                  type="button"
                >
                  <Check size={16} /> Worked with <span>{workedWithConnectors.length}</span>
                </button>
              </div>

              {friendView === "recommendations" ? (
                <>
                  <div className="section-label"><Star size={17} /> {selectedFriend === "All friends" ? "Recommended by people you know" : `Recommended by ${selectedFriend}`}</div>
                  {recommendedConnectors.length ? (
                    <ConnectorGrid connectors={recommendedConnectors} saved={saved} workedWith={workedWith} toggleFavorite={toggleFavorite} toggleWorkedWith={toggleWorkedWith} announce={announce} contextMode="recommendation" />
                  ) : (
                    <div className="network-empty">No recommendations from this friend yet.</div>
                  )}
                </>
              ) : (
                <>
                  <div className="section-label"><Check size={17} /> People and services you have worked with</div>
                  {workedWithConnectors.length ? (
                    <ConnectorGrid connectors={workedWithConnectors} saved={saved} workedWith={workedWith} toggleFavorite={toggleFavorite} toggleWorkedWith={toggleWorkedWith} announce={announce} contextMode="history" />
                  ) : (
                    <div className="network-empty">Your worked-with history is empty.</div>
                  )}
                </>
              )}
            </section>
            <aside className="friends-panel">
              <div className="aside-title">
                <span>Your friends</span>
                <button aria-label="Add a friend" onClick={() => announce("Friend invite copied")} type="button"><Plus size={17} /></button>
              </div>
              <button
                className={`friend-filter-all ${selectedFriend === "All friends" ? "active" : ""}`}
                onClick={() => {
                  setSelectedFriend("All friends");
                  setFriendView("recommendations");
                }}
                type="button"
              >
                All recommendations <span>{directoryConnectors.filter((item) => item.friendRecommendations?.length).length}</span>
              </button>
              {friends.map(({ initials, name, area }) => (
                <button
                  aria-pressed={selectedFriend === name}
                  className={`friend-row ${selectedFriend === name ? "active" : ""}`}
                  key={name}
                  onClick={() => {
                    setSelectedFriend(name);
                    setFriendView("recommendations");
                  }}
                  type="button"
                >
                  <span>{initials}</span>
                  <div><strong>{name}</strong><small>{area}</small></div>
                  <span className="friend-count">{directoryConnectors.filter((item) => item.friendRecommendations?.includes(name)).length}</span>
                </button>
              ))}
              <button className="friend-add" onClick={() => announce("Friend invite copied")} type="button">
                <Plus size={16} /> Add by name or email
              </button>
            </aside>
          </div>
        </section>
      )}

      {view === "forum" && (
        <section className="content-view forum-view" aria-labelledby="forum-title">
          <PageLead eyebrow="Neighbor to neighbor" title="Ask & Answer" />
          <div className="forum-layout">
            <nav className="topic-nav" aria-label="Forum topics">
              {["All", "Housing", "Schools", "Business", "Moving", "City Services"].map((topic) => (
                <button className={forumTopic === topic ? "active" : ""} key={topic} onClick={() => setForumTopic(topic)} type="button">
                  {topic}
                </button>
              ))}
            </nav>
            <div className="forum-feed">
              <form className="post-composer" onSubmit={submitPost}>
                <div className="composer-heading"><Plus size={18} /><strong>Start a conversation</strong></div>
                <input aria-label="Post title" name="title" placeholder="What would you like help with?" required />
                <textarea aria-label="Post details" name="body" placeholder="Add the details neighbors need to answer." required />
                <div>
                  <label className="topic-select">
                    <span>Select relevant tag</span>
                    <span className="select-control">
                      <select aria-label="Select relevant tag" defaultValue="" name="topic" required>
                        <option disabled value="">Choose a tag</option>
                        <option>Housing</option><option>Schools</option><option>Business</option><option>Moving</option><option>City Services</option>
                      </select>
                      <ChevronDown aria-hidden="true" size={16} />
                    </span>
                  </label>
                  <button type="submit">Post request</button>
                </div>
              </form>
              {visiblePosts.map((post) => (
                <article className="forum-post" id={`post-${post.id}`} key={post.id}>
                  <header>
                    <span className="post-avatar">{post.initials}</span>
                    <div><strong>{post.author}</strong><small>{post.meta}</small></div>
                    <span className="post-topic">{post.topic}</span>
                  </header>
                  <h2>{post.title}</h2>
                  <p>{post.body}</p>
                  <footer>
                    <button
                      aria-expanded={openCommentPost === post.id}
                      onClick={() => setOpenCommentPost((current) => current === post.id ? null : post.id)}
                      type="button"
                    >
                      <MessageCircle size={16} /> Comments <span>{post.comments}</span>
                    </button>
                    <button
                      aria-expanded={openSharePost === post.id}
                      onClick={() => setOpenSharePost((current) => current === post.id ? null : post.id)}
                      type="button"
                    >
                      <Share2 size={16} /> Share
                    </button>
                  </footer>
                  {openSharePost === post.id && (
                    <div className="share-panel">
                      <input
                        aria-label={`Share link for ${post.title}`}
                        readOnly
                        value={`https://saanchi-think.github.io/detroit-connect-preview/#post-${post.id}`}
                      />
                      <button onClick={() => void copyPostLink(post)} type="button">Copy link</button>
                      <a href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(`Thought you might find this Detroit Connect post helpful: https://saanchi-think.github.io/detroit-connect-preview/#post-${post.id}`)}`}>Email</a>
                    </div>
                  )}
                  {openCommentPost === post.id && (
                    <section className="comment-thread" aria-label={`Comments on ${post.title}`}>
                      <div className="comment-thread-heading">
                        <strong>Recent comments</strong>
                        <span>{post.comments}</span>
                      </div>
                      {(postComments[post.id] ?? []).map((comment) => (
                        <div className="comment-entry" key={comment.id}>
                          <span>{comment.initials}</span>
                          <div>
                            <strong>{comment.author}</strong>
                            <small>{comment.meta}</small>
                            <p>{comment.body}</p>
                          </div>
                        </div>
                      ))}
                      <form className="comment-form" onSubmit={(event) => submitComment(event, post.id)}>
                        <textarea aria-label={`Comment on ${post.title}`} name="comment" placeholder="Add a helpful reply" required />
                        <div>
                          <button onClick={() => setOpenCommentPost(null)} type="button">Close</button>
                          <button type="submit">Post comment</button>
                        </div>
                      </form>
                    </section>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {view === "explore" && (
        <ExploreMap onClose={() => navigate("home")} />
      )}

      {toast && <div aria-live="polite" className="toast"><Check size={17} /> {toast}</div>}
    </main>
  );
}

function CreateProfileView({
  onSubmit,
  selectedAvatar,
  setSelectedAvatar,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedAvatar: AvatarKey;
  setSelectedAvatar: (avatar: AvatarKey) => void;
}) {
  return (
    <section className="create-profile-view" aria-labelledby="create-profile-title">
      <div className="profile-page-inner">
        <header className="profile-hero">
          <h1 id="create-profile-title">Create profile</h1>
          <div className="profile-photo-orbit" aria-label="Profile picture preview">
            <div className="profile-photo-circle">
              <ProfileAvatar avatar={selectedAvatar} />
            </div>
            <div className="avatar-options" aria-label="Default profile picture options">
              {profileAvatarOptions.map((avatar) => (
                <button
                  aria-label={avatar.label}
                  aria-pressed={selectedAvatar === avatar.id}
                  className={selectedAvatar === avatar.id ? "is-selected" : ""}
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  type="button"
                >
                  <ProfileAvatar avatar={avatar.id} />
                </button>
              ))}
            </div>
          </div>
        </header>

        <form className="profile-form" aria-label="Create Detroit Connect profile" onSubmit={onSubmit}>
          <section className="form-section">
            <div className="section-intro">
              <span className="step">01</span>
              <h2>Match Basics</h2>
            </div>
            <div className="field-grid two">
              <label>
                <span>Profile type</span>
                <select defaultValue="Individual helper" name="profileType">
                  <option>Individual helper</option>
                  <option>Vendor / service provider</option>
                  <option>Community organization</option>
                </select>
              </label>
              <label>
                <span>Neighborhood</span>
                <input name="neighborhood" placeholder="Southwest Detroit" required type="text" />
              </label>
              <label>
                <span>ZIP code</span>
                <input inputMode="numeric" name="zipCode" placeholder="48216" type="text" />
              </label>
              <label>
                <span>Detroit connection</span>
                <select defaultValue="Current resident" name="detroitConnection">
                  <option>Current resident</option>
                  <option>Moving to Detroit</option>
                  <option>Former resident</option>
                  <option>Supporter / partner</option>
                </select>
              </label>
              <label>
                <span>Here to</span>
                <select defaultValue="Help others" name="hereTo">
                  <option>Help others</option>
                  <option>Find help</option>
                  <option>Both</option>
                </select>
              </label>
              <label>
                <span>Neighborhood expertise</span>
                <input name="neighborhoodExpertise" placeholder="Southwest Detroit, Corktown, Midtown" type="text" />
              </label>
              <label>
                <span>Languages spoken</span>
                <input name="languages" placeholder="English, Spanish" type="text" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="section-intro">
              <span className="step">02</span>
              <h2>Connection Areas</h2>
            </div>
            <div className="topic-groups">
              {helperTopicGroups.map((group) => (
                <fieldset key={group.label}>
                  <legend>{group.label}</legend>
                  {group.topics.map((topic) => (
                    <label key={topic}>
                      <input name="topics" type="checkbox" value={topic} /> {topic}
                    </label>
                  ))}
                </fieldset>
              ))}
              <label className="other-field">
                <span>Other topic</span>
                <input name="otherTopic" placeholder="Add a topic" type="text" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="section-intro">
              <span className="step">03</span>
              <h2>Identity</h2>
            </div>
            <div className="field-grid two">
              <label>
                <span>First name</span>
                <input name="firstName" placeholder="Maria" required type="text" />
              </label>
              <label>
                <span>Last name</span>
                <input name="lastName" placeholder="Rodriguez" required type="text" />
              </label>
              <label>
                <span>Email</span>
                <input name="email" placeholder="maria@example.com" type="email" />
              </label>
              <label>
                <span>Phone number <em>optional</em></span>
                <input name="phone" placeholder="(313) 555-0148" type="tel" />
              </label>
              <label>
                <span>Preferred contact</span>
                <select defaultValue="Email" name="preferredContact">
                  <option>Email</option>
                  <option>Phone</option>
                  <option>Platform messaging</option>
                </select>
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="section-intro">
              <span className="step">04</span>
              <h2>Community Background</h2>
            </div>
            <div className="field-grid two">
              <label>
                <span>Current employer</span>
                <input name="currentEmployer" placeholder="Detroit nonprofit, startup, school..." type="text" />
              </label>
              <label>
                <span>Industry</span>
                <input name="industry" placeholder="Community development" type="text" />
              </label>
              <label>
                <span>Job title</span>
                <input name="jobTitle" placeholder="Community Development Manager" type="text" />
              </label>
              <label>
                <span>Organization type</span>
                <input name="organizationType" placeholder="Nonprofit, business, school..." type="text" />
              </label>
            </div>
            <div className="tag-panel">
              <span>Skills</span>
              <div className="tag-list">
                {profileSkills.map((skill) => (
                  <label key={skill}>
                    <input name="skills" type="checkbox" value={skill} /> {skill}
                  </label>
                ))}
              </div>
            </div>
            <label className="wide-field">
              <span>Organizations & affiliations</span>
              <textarea name="organizations" placeholder="Neighborhood association, nonprofit, alumni group, faith organization..." />
            </label>
          </section>

          <section className="form-section">
            <div className="section-intro">
              <span className="step">05</span>
              <h2>Availability</h2>
            </div>
            <div className="field-grid two">
              <label>
                <span>Years connected to Detroit</span>
                <select defaultValue="New to Detroit" name="yearsConnected">
                  <option>New to Detroit</option>
                  <option>1-3 years</option>
                  <option>4-10 years</option>
                  <option>10+ years</option>
                  <option>Lifelong Detroiter</option>
                </select>
              </label>
            </div>
            <div className="tag-panel">
              <span>Available for</span>
              <div className="tag-list">
                {profileAvailability.map((item) => (
                  <label key={item}>
                    <input name="availability" type="checkbox" value={item} /> {item}
                  </label>
                ))}
              </div>
            </div>
            <div className="action-row">
              <button className="primary-button" type="submit">Create profile</button>
            </div>
          </section>
        </form>
      </div>
    </section>
  );
}

function ProfileAvatar({ avatar }: { avatar: AvatarKey }) {
  if (avatar === "tire") {
    return (
      <svg aria-hidden="true" className="profile-avatar-graphic" viewBox="0 0 24 24">
        <circle className="avatar-back" cx="12" cy="12" r="10" />
        <circle className="tire-wall" cx="12" cy="12" r="6.4" />
        <circle className="tire-hole" cx="12" cy="12" r="2.7" />
        <path className="tire-tread" d="M12 5.6v2" /><path className="tire-tread" d="M12 16.4v2" />
        <path className="tire-tread" d="M5.6 12h2" /><path className="tire-tread" d="M16.4 12h2" />
        <path className="tire-tread" d="m7.5 7.5 1.4 1.4" /><path className="tire-tread" d="m15.1 15.1 1.4 1.4" />
      </svg>
    );
  }

  if (avatar === "boat") {
    return (
      <svg aria-hidden="true" className="profile-avatar-graphic" viewBox="0 0 24 24">
        <circle className="avatar-back boat-back" cx="12" cy="12" r="10" />
        <path className="boat-sail" d="M12 6.2v7.1" /><path className="boat-sail" d="M12 7.1 7.7 13.3H12" />
        <path className="boat-sail" d="M13 8.2l3.9 5.1H13" />
        <path className="boat-hull" d="M5.2 14.2h13.6l-1.8 2.4c-.7.9-1.8 1.4-3 1.4H10c-1.2 0-2.3-.5-3-1.4l-1.8-2.4Z" />
        <path className="water-line" d="M6 18.8c1.2-.7 2.4-.7 3.6 0s2.4.7 3.6 0 2.4-.7 3.6 0" />
      </svg>
    );
  }

  if (avatar === "car") {
    return (
      <svg aria-hidden="true" className="profile-avatar-graphic" viewBox="0 0 24 24">
        <circle className="avatar-back car-back" cx="12" cy="12" r="10" />
        <path className="speed-mark" d="M3.2 10.1h4.1" /><path className="speed-mark" d="M2.8 13h3.2" />
        <path className="race-body" d="M4.5 15.2h15.1l-1.1-3.1-4.1-.7-2.4-2.3H8.7L6.4 12l-1.9 3.2Z" />
        <path className="race-window" d="M9.2 10.2h2.6l1.3 1.4H8.2l1-1.4Z" />
        <circle cx="7.7" cy="15.5" r="1.6" /><circle cx="16.6" cy="15.5" r="1.6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="profile-avatar-graphic" viewBox="0 0 24 24">
      <circle className="avatar-back pizza-back" cx="12" cy="12" r="10" />
      <path className="pizza-crust" d="M6.1 6.8c3.8-1.6 8-1.6 11.8 0" />
      <path className="pizza-slice" d="M6.5 7.5h11L12 18.2 6.5 7.5Z" />
      <path className="pizza-cheese" d="M10.4 11.1c.6.6 1.1 1.5 1 2.8" />
      <circle className="pizza-topping" cx="9.5" cy="9.8" r=".7" /><circle className="pizza-topping" cx="14.5" cy="10.4" r=".7" />
      <circle className="pizza-topping" cx="12" cy="13.2" r=".7" />
    </svg>
  );
}

function Header({ activeView, navigate }: { activeView: View; navigate: (view: View) => void }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate("home")} type="button">
        <span className="brand-mark">DC</span><span>Detroit Connect</span>
      </button>
      <nav aria-label="Primary navigation">
        {navItems.map((item) => (
          <button className={activeView === item.id ? "active" : ""} key={item.id} onClick={() => navigate(item.id)} type="button">{item.label}</button>
        ))}
      </nav>
      <button className={`profile-button ${activeView === "profile" ? "active" : ""}`} onClick={() => navigate("profile")} type="button">Create profile</button>
    </header>
  );
}

function PageLead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <header className="page-lead"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></header>;
}

function ConnectorGrid({ connectors: items, saved, workedWith, toggleFavorite, toggleWorkedWith, announce, contextMode }: { connectors: Connector[]; saved: Set<string>; workedWith: Set<string>; toggleFavorite: (id: string) => void; toggleWorkedWith: (id: string) => void; announce: (message: string) => void; contextMode?: "recommendation" | "history" }) {
  return (
    <div className="connector-grid">
      {items.map((connector) => (
        <article className="connector-card" key={connector.id}>
          <header>
            <span className={`connector-avatar avatar-${connector.color}`}>{connector.initials}</span>
            <button aria-label={saved.has(connector.id) ? `Remove ${connector.name} from favorites` : `Save ${connector.name}`} onClick={() => toggleFavorite(connector.id)} type="button">
              <Heart fill={saved.has(connector.id) ? "currentColor" : "none"} size={18} />
            </button>
          </header>
          <span className="type-label"><TypeIcon type={connector.type} /> {connector.type}</span>
          <h2>{connector.name}</h2>
          <p>{connector.role}</p>
          <span className="location"><MapPin size={15} /> {connector.neighborhood}</span>
          <div className="topic-list">{connector.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>
          {connector.recommendedBy && <div className="recommended"><Users size={15} /> {connector.recommendedBy}</div>}
          {contextMode === "recommendation" && connector.experience && (
            <div className="experience-note"><Star size={15} /><p>{connector.experience}</p></div>
          )}
          {contextMode === "history" && (
            <div className="experience-note history-note"><Check size={15} /><p>{connector.workedWithNote || "Saved to your worked-with history."}</p></div>
          )}
          <div className="connector-actions">
            <button
              aria-pressed={workedWith.has(connector.id)}
              className={`worked-button ${workedWith.has(connector.id) ? "active" : ""}`}
              onClick={() => toggleWorkedWith(connector.id)}
              type="button"
            >
              <Check size={15} /> {workedWith.has(connector.id) ? "Worked with" : "Add to history"}
            </button>
            <button className="view-profile" onClick={() => announce(`${connector.name}'s profile opened`)} type="button">View profile <ChevronRight size={16} /></button>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action: string; onAction: () => void }) {
  return <div className="empty-state">{icon}<h2>{title}</h2><button onClick={onAction} type="button">{action}</button></div>;
}
