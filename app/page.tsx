"use client";

/* eslint-disable @next/next/no-img-element -- vinext serves these bundled preview assets directly. */

import {
  ArrowLeft,
  Bookmark,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Heart,
  Landmark,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star,
  Store,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type View = "home" | "connectors" | "forum" | "explore" | "friends" | "favorites";
type ConnectorType = "Person" | "Vendor" | "Organization";

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
    recommendedBy: "Priya and 2 friends",
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
    recommendedBy: "4 community members",
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

const places = [
  { name: "Michigan Central", category: "Landmarks", image: "images/places/michigan-central.jpg", x: 36, y: 61 },
  { name: "Detroit Institute of Arts", category: "Arts", image: "images/places/dia.jpg", x: 55, y: 31 },
  { name: "Motown Museum", category: "Arts", image: "images/places/motown.jpg", x: 43, y: 24 },
  { name: "Campus Martius", category: "Things to do", image: "images/places/campus.jpg", x: 68, y: 61 },
  { name: "Corktown", category: "Neighborhoods", image: "images/places/corktown.jpg", x: 45, y: 69 },
  { name: "Southwest Detroit", category: "Neighborhoods", image: "images/places/southwest.jpg", x: 27, y: 76 },
];

const navItems: Array<{ id: View; label: string }> = [
  { id: "home", label: "Home" },
  { id: "forum", label: "Community Forum" },
  { id: "explore", label: "Explore Detroit" },
  { id: "friends", label: "Friends" },
  { id: "favorites", label: "Favorites" },
];

function TypeIcon({ type }: { type: ConnectorType }) {
  if (type === "Vendor") return <Store size={15} />;
  if (type === "Organization") return <Building2 size={15} />;
  return <CircleUserRound size={15} />;
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | ConnectorType>("All");
  const [saved, setSaved] = useState(() => new Set(["maria"]));
  const [posts, setPosts] = useState(initialPosts);
  const [openCommentPost, setOpenCommentPost] = useState<number | null>(null);
  const [openSharePost, setOpenSharePost] = useState<number | null>(null);
  const [postComments, setPostComments] = useState<Record<number, ForumComment[]>>(initialPostComments);
  const [forumTopic, setForumTopic] = useState("All");
  const [exploreFilter, setExploreFilter] = useState("All");
  const [selectedPlace, setSelectedPlace] = useState(places[0]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");

  const filteredConnectors = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return connectors.filter((connector) => {
      const matchesType = typeFilter === "All" || connector.type === typeFilter;
      const haystack = [connector.name, connector.role, connector.neighborhood, connector.type, ...connector.topics]
        .join(" ")
        .toLowerCase();
      return matchesType && terms.every((term) => haystack.includes(term));
    });
  }, [query, typeFilter]);

  const favoriteConnectors = connectors.filter((connector) => saved.has(connector.id));
  const visiblePosts = forumTopic === "All" ? posts : posts.filter((post) => post.topic === forumTopic);
  const visiblePlaces = exploreFilter === "All" ? places : places.filter((place) => place.category === exploreFilter);

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
      <Header activeView={view} navigate={navigate} onCreateProfile={() => setProfileOpen(true)} />

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
          <ConnectorGrid connectors={filteredConnectors} saved={saved} toggleFavorite={toggleFavorite} announce={announce} />
        </section>
      )}

      {view === "favorites" && (
        <section className="content-view" aria-labelledby="favorites-title">
          <PageLead eyebrow="Your shortlist" title="Favorites" />
          {favoriteConnectors.length ? (
            <ConnectorGrid connectors={favoriteConnectors} saved={saved} toggleFavorite={toggleFavorite} announce={announce} />
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
          <PageLead eyebrow="Trusted by your circle" title="Recommendations" />
          <div className="friends-layout">
            <section className="recommendations" aria-label="Friend recommendations">
              <div className="section-label"><Star size={17} /> Recommended by people you know</div>
              <ConnectorGrid connectors={connectors.filter((item) => item.recommendedBy)} saved={saved} toggleFavorite={toggleFavorite} announce={announce} />
            </section>
            <aside className="friends-panel">
              <div className="aside-title">
                <span>Your friends</span>
                <button aria-label="Add a friend" onClick={() => announce("Friend invite copied")} type="button"><Plus size={17} /></button>
              </div>
              {[
                ["PL", "Priya Lawson", "Midtown"],
                ["ML", "Marcus Lee", "East Village"],
                ["JS", "Jordan Smith", "Corktown"],
              ].map(([initials, name, area]) => (
                <div className="friend-row" key={name}>
                  <span>{initials}</span>
                  <div><strong>{name}</strong><small>{area}</small></div>
                  <MessageCircle size={16} />
                </div>
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
        <section className="explore-view" aria-labelledby="explore-title">
          <aside className="places-panel">
            <button className="back-link" onClick={() => navigate("home")} type="button"><ArrowLeft size={17} /> Home</button>
            <span className="eyebrow">Explore the city</span>
            <h1 id="explore-title">Detroit, up close.</h1>
            <div className="explore-filters">
              {["All", "Landmarks", "Arts", "Things to do", "Neighborhoods"].map((filter) => (
                <button className={exploreFilter === filter ? "active" : ""} key={filter} onClick={() => setExploreFilter(filter)} type="button">{filter}</button>
              ))}
            </div>
            <div className="place-list">
              {visiblePlaces.map((place) => (
                <button className={selectedPlace.name === place.name ? "active" : ""} key={place.name} onClick={() => setSelectedPlace(place)} type="button">
                  <img alt="" src={place.image} />
                  <span><small>{place.category}</small><strong>{place.name}</strong></span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          </aside>
          <div className="city-map" aria-label="Interactive map of Detroit places">
            <div className="river">Detroit River</div>
            <div className="map-label label-downtown">Downtown</div>
            <div className="map-label label-midtown">Midtown</div>
            <div className="map-label label-corktown">Corktown</div>
            {visiblePlaces.map((place) => (
              <button
                aria-label={place.name}
                className={`map-marker ${selectedPlace.name === place.name ? "active" : ""}`}
                key={place.name}
                onClick={() => setSelectedPlace(place)}
                style={{ left: `${place.x}%`, top: `${place.y}%` }}
                title={place.name}
                type="button"
              >
                {place.category === "Neighborhoods" ? <MapPin size={19} /> : <Landmark size={17} />}
              </button>
            ))}
            <article className="map-preview">
              <img alt={selectedPlace.name} src={selectedPlace.image} />
              <div><small>{selectedPlace.category}</small><strong>{selectedPlace.name}</strong></div>
            </article>
            <div className="map-key"><span><i className="landmark-dot" /> Landmark</span><span><i className="neighborhood-dot" /> Neighborhood</span></div>
          </div>
        </section>
      )}

      {profileOpen && (
        <div className="modal-layer" role="presentation" onMouseDown={() => setProfileOpen(false)}>
          <section aria-labelledby="profile-title" className="profile-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <button aria-label="Close" className="modal-close" onClick={() => setProfileOpen(false)} type="button"><X size={19} /></button>
            <span className="eyebrow">Join the network</span>
            <h2 id="profile-title">Create a connector profile</h2>
            <div className="profile-preview-avatar">DC</div>
            <label>Name<input placeholder="Your full name" /></label>
            <label>Neighborhood<input placeholder="Neighborhood or ZIP code" /></label>
            <label>How can you help?<input placeholder="Housing, schools, business..." /></label>
            <button onClick={() => { setProfileOpen(false); announce("Profile preview saved"); }} type="button">Continue</button>
          </section>
        </div>
      )}

      {toast && <div aria-live="polite" className="toast"><Check size={17} /> {toast}</div>}
    </main>
  );
}

function Header({ activeView, navigate, onCreateProfile }: { activeView: View; navigate: (view: View) => void; onCreateProfile: () => void }) {
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
      <button className="profile-button" onClick={onCreateProfile} type="button">Create profile</button>
    </header>
  );
}

function PageLead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <header className="page-lead"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></header>;
}

function ConnectorGrid({ connectors: items, saved, toggleFavorite, announce }: { connectors: Connector[]; saved: Set<string>; toggleFavorite: (id: string) => void; announce: (message: string) => void }) {
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
          <button className="view-profile" onClick={() => announce(`${connector.name}'s profile opened`)} type="button">View profile <ChevronRight size={16} /></button>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action: string; onAction: () => void }) {
  return <div className="empty-state">{icon}<h2>{title}</h2><button onClick={onAction} type="button">{action}</button></div>;
}
