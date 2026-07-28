"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";

const filters = [
  { value: "all", label: "All" },
  { value: "neighborhood", label: "Neighborhoods" },
  { value: "attraction", label: "Attractions" },
  { value: "culture", label: "Culture" },
  { value: "food", label: "Food" },
  { value: "landmark", label: "Landmarks" },
  { value: "arts", label: "Arts" },
  { value: "sports", label: "Sports" },
  { value: "parks", label: "Parks" },
];

const initialPlaceId = "downtown";

type Place = {
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

const places: Place[] = [
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

const placeById = Object.fromEntries(places.map((place) => [place.id, place]));

function isNeighborhoodMarker(id: string) {
  const item = placeById[id];
  return item?.category === "neighborhood" || id === "midtown" || id === "corktown" || id === "southwest";
}

function categoryMatches(place: Place, filter: string) {
  return filter === "all" || place.category === filter || (filter === "neighborhood" && isNeighborhoodMarker(place.id));
}

function zoomStatusFor(zoom: number) {
  return zoom >= 15 ? "Street detail" : zoom >= 13 ? "District detail" : "City view";
}

export function ExploreMap() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activePlaceId, setActivePlaceId] = useState(initialPlaceId);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [mapReady, setMapReady] = useState(false);
  const [zoomStatus, setZoomStatus] = useState("City view");
  const [zoomLevel, setZoomLevel] = useState(13);
  const searchRef = useRef<HTMLFormElement | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, Leaflet.Marker>>({});

  const visiblePlaces = useMemo(() => places.filter((place) => categoryMatches(place, activeFilter)), [activeFilter]);
  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    return places
      .filter((place) =>
        [place.name, place.note, place.section, place.type, place.category]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 6);
  }, [searchQuery]);
  const activePlace = placeById[activePlaceId] ?? places[0];
  const visibleSections = [...new Set(visiblePlaces.map((place) => place.section))];

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapElementRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !mapElementRef.current) return;

      leafletRef.current = L;
      const detroitBounds = L.latLngBounds([42.245, -83.205], [42.455, -82.875]);
      const map = L.map(mapElementRef.current, {
        center: [42.3358, -83.0496],
        zoom: 13,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: detroitBounds,
        maxBoundsViscosity: 0.92,
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: true,
      });

      map.fitBounds(detroitBounds, {
        animate: false,
        paddingTopLeft: [24, 24],
        paddingBottomRight: [24, 24],
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
        subdomains: "abcd",
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      }).addTo(map);

      const markerLayer = L.layerGroup().addTo(map);
      const markerIcon = (id: string) => {
        const isNeighborhood = isNeighborhoodMarker(id);
        const markerClass = isNeighborhood ? " marker-neighborhood" : ` marker-${placeById[id].category}`;
        return L.divIcon({
          className: `detroit-marker${markerClass}${id === initialPlaceId ? " is-selected" : ""}`,
          html: isNeighborhood ? `<span></span>${placeById[id].name}` : "<span></span>",
          iconSize: undefined,
        });
      };

      places.forEach((place) => {
        const marker = L.marker(place.coords, { icon: markerIcon(place.id), title: place.name })
          .addTo(markerLayer)
          .on("click", () => setActivePlaceId(place.id));
        if (!isNeighborhoodMarker(place.id)) {
          marker.bindTooltip(place.name, {
            direction: "top",
            offset: [0, -18],
            opacity: 1,
            sticky: true,
            className: "detroit-tooltip",
          });
        }
        markersRef.current[place.id] = marker;
      });

      const updateZoomStatus = () => {
        const nextZoom = map.getZoom();
        setZoomLevel(nextZoom);
        setZoomStatus(zoomStatusFor(nextZoom));
      };

      map.on("zoomend", updateZoomStatus);
      updateZoomStatus();

      mapRef.current = map;
      markerLayerRef.current = markerLayer;
      setMapReady(true);
    }

    initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    if (!L || !markerLayerRef.current) return;

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const place = placeById[id];
      const isNeighborhood = isNeighborhoodMarker(id);
      const markerClass = isNeighborhood ? " marker-neighborhood" : ` marker-${place.category}`;
      marker.setIcon(
        L.divIcon({
          className: `detroit-marker${markerClass}${id === activePlaceId ? " is-selected" : ""}`,
          html: isNeighborhood ? `<span></span>${place.name}` : "<span></span>",
          iconSize: undefined,
        }),
      );

      if (categoryMatches(place, activeFilter)) {
        marker.addTo(markerLayerRef.current!);
      } else {
        markerLayerRef.current!.removeLayer(marker);
      }
    });
  }, [activeFilter, activePlaceId, mapReady]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(activePlace.coords, activePlace.zoom, { duration: 0.7 });
  }, [activePlace]);

  useEffect(() => {
    function closeSearch(event: PointerEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setActiveSearchIndex(-1);
      }
    }

    document.addEventListener("pointerdown", closeSearch);
    return () => document.removeEventListener("pointerdown", closeSearch);
  }, []);

  function changeZoom(delta: 1 | -1) {
    const map = mapRef.current;

    if (!map) return;

    const nextZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + delta));
    map.setZoom(nextZoom, { animate: false });
    setZoomLevel(nextZoom);
    setZoomStatus(zoomStatusFor(nextZoom));
  }

  function selectSearchPlace(place: Place) {
    setActiveFilter(place.category);
    setActivePlaceId(place.id);
    setSearchQuery(place.name);
    setSearchOpen(false);
    setActiveSearchIndex(-1);
    setFilterOpen(false);
  }

  return (
    <section className="explore-hero" aria-labelledby="explore-title">
      <div className="copy-panel">
        <form
          aria-label="Search Detroit places"
          className="map-search"
          onSubmit={(event) => {
            event.preventDefault();
            const match = searchSuggestions[activeSearchIndex] ?? searchSuggestions[0];
            if (match) selectSearchPlace(match);
          }}
          ref={searchRef}
          role="search"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16l4 4" />
          </svg>
          <input
            aria-activedescendant={
              activeSearchIndex >= 0 && searchSuggestions[activeSearchIndex]
                ? `map-search-${searchSuggestions[activeSearchIndex].id}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls="map-search-suggestions"
            aria-expanded={searchOpen}
            aria-label="Search Detroit places"
            autoComplete="off"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(Boolean(event.target.value.trim()));
              setActiveSearchIndex(-1);
            }}
            onFocus={() => {
              if (searchQuery.trim()) setSearchOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSearchOpen(false);
                setActiveSearchIndex(-1);
                return;
              }

              if (event.key === "ArrowDown" && searchSuggestions.length > 0) {
                event.preventDefault();
                setSearchOpen(true);
                setActiveSearchIndex((current) => (current + 1) % searchSuggestions.length);
                return;
              }

              if (event.key === "ArrowUp" && searchSuggestions.length > 0) {
                event.preventDefault();
                setSearchOpen(true);
                setActiveSearchIndex((current) =>
                  current <= 0 ? searchSuggestions.length - 1 : current - 1,
                );
              }
            }}
            placeholder="Search Detroit places..."
            role="combobox"
            type="search"
            value={searchQuery}
          />
          {searchOpen ? (
            <div className="map-search-suggestions" id="map-search-suggestions" role="listbox">
              {searchSuggestions.length > 0 ? (
                searchSuggestions.map((place, index) => (
                  <button
                    aria-selected={activeSearchIndex === index}
                    className={activeSearchIndex === index ? "is-active" : ""}
                    id={`map-search-${place.id}`}
                    key={place.id}
                    onClick={() => selectSearchPlace(place)}
                    onPointerMove={() => setActiveSearchIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span className={`map-search-thumb ${place.thumb}`} aria-hidden="true" />
                    <span>
                      <strong>{place.name}</strong>
                      <small>{place.note}</small>
                    </span>
                    <em>{place.section}</em>
                  </button>
                ))
              ) : (
                <p>No Detroit places found</p>
              )}
            </div>
          ) : null}
        </form>
        <button
          className="filter-launch"
          type="button"
          aria-label="Open filters"
          aria-expanded={filterOpen}
          onFocus={() => setFilterOpen(true)}
          onPointerDown={() => setFilterOpen(true)}
          onClick={() => setFilterOpen(true)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 7h12" />
            <path d="M8 12h8" />
            <path d="M10 17h4" />
          </svg>
          <span>9</span>
        </button>
        <h1 id="explore-title">Explore Detroit</h1>
        <div className={`filter-row ${filterOpen ? "is-open" : ""}`} aria-label="Map filters">
          {filters.map((filter) => (
            <button
              className={`filter ${activeFilter === filter.value ? "is-active" : ""}`}
              key={filter.value}
              type="button"
              onClick={() => {
                setActiveFilter(filter.value);
                setFilterOpen(false);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className={`result-list ${activeFilter === "all" ? "" : "is-filtered"}`} aria-label="Detroit map results">
          {visibleSections.map((section) => (
            <div className="result-group" key={section}>
              <div className="result-section-title">{section}</div>
              {visiblePlaces
                .filter((place) => place.section === section)
                .map((place) => (
                  <button
                    className={`result-card ${activePlace.id === place.id ? "is-active" : ""}`}
                    key={place.id}
                    type="button"
                    onClick={() => setActivePlaceId(place.id)}
                  >
                    <span className={`thumb ${place.thumb}`} aria-hidden="true" />
                    <span>
                      <strong>{place.name}</strong>
                      <small>{place.note}</small>
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>

      <section className="map-console" aria-label="Interactive Detroit map">
        <div className="map-toolbar">
          <span>Holographic city model</span>
          <div className="toolbar-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="map-stage">
          <div ref={mapElementRef} className="leaflet-map" aria-label="Detailed Detroit street map" />
        </div>
        <div className="walkers" aria-hidden="true">
          <i className="walker walker-one" />
          <i className="walker walker-two" />
          <i className="walker walker-three" />
        </div>
        <div className="map-controls" aria-label="Map controls">
          <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-1)}>
            -
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => changeZoom(1)}>
            +
          </button>
        </div>
        <div className="zoom-status" aria-live="polite">
          {zoomStatus}
          <span className="sr-only">, zoom level {zoomLevel}</span>
        </div>
      </section>

      <aside className="place-card" aria-live="polite">
        <span className="card-kicker">{activePlace.type}</span>
        <h2>{activePlace.name}</h2>
        <p>{activePlace.description}</p>
        <div className="place-meta">
          <span>{activePlace.mood}</span>
          <span>{activePlace.bestFor}</span>
        </div>
      </aside>
    </section>
  );
}
