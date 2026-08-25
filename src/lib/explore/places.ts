export type DetroitPlace = {
  id: string;
  category: string;
  section: string;
  thumb: string;
  name: string;
  note: string;
  type: string;
  description: string;
  mood: string;
  bestFor: string;
  coords: [number, number];
  zoom: number;
};

export const detroitPlaces: DetroitPlace[] = [
  {
    id: "downtown",
    category: "neighborhood",
    section: "Neighborhoods",
    thumb: "thumb-downtown",
    name: "Downtown Detroit",
    note: "Civic core, stadiums, plazas",
    type: "Neighborhood signal",
    description:
      "The civic and entertainment core: riverwalk access, office towers, stadiums, public plazas, restaurants, and quick connections to transit.",
    mood: "High energy",
    bestFor: "First weekend",
    coords: [42.3314, -83.0458],
    zoom: 15,
  },
  {
    id: "midtown",
    category: "culture",
    section: "Neighborhoods",
    thumb: "thumb-midtown",
    name: "Midtown",
    note: "Museums, cafes, arts corridor",
    type: "Culture corridor",
    description:
      "Museums, Wayne State, galleries, libraries, cafes, hospitals, and a strong walkable arts-and-education spine.",
    mood: "Creative",
    bestFor: "Museums and cafes",
    coords: [42.3486, -83.0603],
    zoom: 15,
  },
  {
    id: "corktown",
    category: "food",
    section: "Neighborhoods",
    thumb: "thumb-corktown",
    name: "Corktown",
    note: "Restaurants, history, local shops",
    type: "Historic district",
    description:
      "Detroit's oldest neighborhood mixes restored homes, restaurants, small businesses, and Motor City history.",
    mood: "Warm and local",
    bestFor: "Dinner plans",
    coords: [42.3298, -83.0772],
    zoom: 15,
  },
  {
    id: "southwest",
    category: "food",
    section: "Neighborhoods",
    thumb: "thumb-southwest",
    name: "Southwest Detroit",
    note: "Food, murals, community roots",
    type: "Food and community",
    description:
      "A layered community district known for food, murals, family networks, small businesses, and cultural roots.",
    mood: "Neighborly",
    bestFor: "Food and murals",
    coords: [42.3127, -83.0969],
    zoom: 14,
  },
  {
    id: "riverfront",
    category: "attraction",
    section: "Waterfront & Parks",
    thumb: "thumb-riverfront",
    name: "Detroit Riverfront",
    note: "Walks, skyline, public space",
    type: "Attraction layer",
    description:
      "A bright public edge for walking, biking, skyline views, parks, plazas, and easy newcomer orientation.",
    mood: "Open air",
    bestFor: "Walks and views",
    coords: [42.3261, -83.0392],
    zoom: 15,
  },
  {
    id: "belle-isle",
    category: "attraction",
    section: "Waterfront & Parks",
    thumb: "thumb-belle",
    name: "Belle Isle",
    note: "Island park, trails, water views",
    type: "Park and island",
    description:
      "A landmark island park with water views, trails, picnic space, family attractions, and a sense of escape.",
    mood: "Restorative",
    bestFor: "Weekend reset",
    coords: [42.3431, -82.9744],
    zoom: 14,
  },
  {
    id: "campus-martius",
    category: "parks",
    section: "Waterfront & Parks",
    thumb: "thumb-campus",
    name: "Campus Martius Park",
    note: "Downtown plaza and events",
    type: "Downtown park",
    description:
      "A central downtown gathering place for events, seasonal programming, public seating, and city energy.",
    mood: "Central",
    bestFor: "Meeting up",
    coords: [42.3316, -83.0466],
    zoom: 17,
  },
  {
    id: "belle-isle-aquarium",
    category: "parks",
    section: "Waterfront & Parks",
    thumb: "thumb-aquarium",
    name: "Belle Isle Aquarium",
    note: "Historic aquarium in the park",
    type: "Park attraction",
    description:
      "A historic aquarium inside Belle Isle Park, pairing family-friendly discovery with island views.",
    mood: "Curious",
    bestFor: "Family visit",
    coords: [42.3403, -82.9854],
    zoom: 17,
  },
  {
    id: "dia",
    category: "arts",
    section: "Arts & Culture",
    thumb: "thumb-dia",
    name: "Detroit Institute of Arts",
    note: "Murals, galleries, major museum",
    type: "Arts landmark",
    description:
      "One of Detroit's major cultural anchors, known for world-class galleries and the Detroit Industry Murals.",
    mood: "Iconic",
    bestFor: "Museum day",
    coords: [42.3594, -83.0646],
    zoom: 17,
  },
  {
    id: "motown",
    category: "arts",
    section: "Arts & Culture",
    thumb: "thumb-music",
    name: "Motown Museum",
    note: "Detroit music history landmark",
    type: "Music landmark",
    description:
      "The historic Hitsville U.S.A. house where Detroit's Motown sound became a global cultural force.",
    mood: "Legendary",
    bestFor: "Music history",
    coords: [42.3643, -83.0892],
    zoom: 17,
  },
  {
    id: "fox-theatre",
    category: "landmark",
    section: "Arts & Culture",
    thumb: "thumb-fox",
    name: "Fox Theatre",
    note: "Historic theater and shows",
    type: "Entertainment landmark",
    description:
      "A grand historic theater in the District Detroit area with concerts, comedy, Broadway shows, and events.",
    mood: "Grand",
    bestFor: "Night out",
    coords: [42.3383, -83.0524],
    zoom: 17,
  },
  {
    id: "eastern-market",
    category: "food",
    section: "Food Districts",
    thumb: "thumb-food",
    name: "Eastern Market",
    note: "Markets, murals, food district",
    type: "Food district",
    description:
      "A beloved market district with food vendors, murals, weekend markets, small businesses, and local flavor.",
    mood: "Lively",
    bestFor: "Saturday morning",
    coords: [42.3482, -83.0405],
    zoom: 16,
  },
  {
    id: "michigan-central",
    category: "landmark",
    section: "Landmarks & Architecture",
    thumb: "thumb-station",
    name: "Michigan Central Station",
    note: "Innovation landmark in Corktown",
    type: "Innovation landmark",
    description:
      "A restored Corktown landmark now tied to Detroit's mobility, technology, and innovation story.",
    mood: "Future-facing",
    bestFor: "Architecture walk",
    coords: [42.3283, -83.0777],
    zoom: 17,
  },
  {
    id: "guardian-building",
    category: "landmark",
    section: "Landmarks & Architecture",
    thumb: "thumb-guardian",
    name: "Guardian Building",
    note: "Art Deco architecture icon",
    type: "Architecture landmark",
    description:
      "A downtown Art Deco landmark with dramatic color, tilework, murals, and Detroit architectural history.",
    mood: "Elegant",
    bestFor: "Architecture stop",
    coords: [42.3293, -83.0468],
    zoom: 17,
  },
  {
    id: "comerica-park",
    category: "sports",
    section: "Sports & Events",
    thumb: "thumb-comerica",
    name: "Comerica Park",
    note: "Baseball, skyline views, game days",
    type: "Sports venue",
    description:
      "Home of the Detroit Tigers, with game-day energy, downtown views, and nearby restaurants and bars.",
    mood: "Game day",
    bestFor: "Baseball",
    coords: [42.339, -83.0485],
    zoom: 17,
  },
  {
    id: "ford-field",
    category: "sports",
    section: "Sports & Events",
    thumb: "thumb-ford",
    name: "Ford Field",
    note: "Football, concerts, major events",
    type: "Sports venue",
    description:
      "Home of the Detroit Lions and a major downtown venue for concerts, events, and citywide moments.",
    mood: "Big event",
    bestFor: "Football",
    coords: [42.34, -83.0456],
    zoom: 17,
  },
];

export const detroitPlaceById = Object.fromEntries(
  detroitPlaces.map((place) => [place.id, place]),
) as Record<string, DetroitPlace>;

export function getDetroitPlacesByIds(placeIds: string[]) {
  return placeIds
    .map((placeId) => detroitPlaceById[placeId])
    .filter((place): place is DetroitPlace => Boolean(place));
}
