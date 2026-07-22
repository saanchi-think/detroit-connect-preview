"use client";

/* eslint-disable @next/next/no-img-element -- the preview uses bundled and Wikimedia place photography. */

import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { SlidersHorizontal, X } from "lucide-react";

type Place = {
  id: string;
  category: string;
  section: string;
  image: string;
  name: string;
  note: string;
  coords: [number, number];
  zoom: number;
};

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

const places: Place[] = [
  {
    id: "downtown",
    category: "neighborhood",
    section: "Neighborhoods",
    image: "images/detroit-downtown-dusk.png",
    name: "Downtown Detroit",
    note: "Civic core, stadiums, plazas",
    coords: [42.3314, -83.0458],
    zoom: 15,
  },
  {
    id: "midtown",
    category: "culture",
    section: "Neighborhoods",
    image: "images/places/midtown.jpg",
    name: "Midtown",
    note: "Museums, cafes, arts corridor",
    coords: [42.3486, -83.0603],
    zoom: 15,
  },
  {
    id: "corktown",
    category: "food",
    section: "Neighborhoods",
    image: "images/places/corktown.jpg",
    name: "Corktown",
    note: "Restaurants, history, local shops",
    coords: [42.3298, -83.0772],
    zoom: 15,
  },
  {
    id: "southwest",
    category: "food",
    section: "Neighborhoods",
    image: "images/places/southwest.jpg",
    name: "Southwest Detroit",
    note: "Food, murals, community roots",
    coords: [42.3127, -83.0969],
    zoom: 14,
  },
  {
    id: "riverfront",
    category: "attraction",
    section: "Waterfront & Parks",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Detroit_Skyline_viewed_from_Windsor_2025-09-01_3.jpg/330px-Detroit_Skyline_viewed_from_Windsor_2025-09-01_3.jpg",
    name: "Detroit Riverfront",
    note: "Walks, skyline, public space",
    coords: [42.3261, -83.0392],
    zoom: 15,
  },
  {
    id: "belle-isle",
    category: "attraction",
    section: "Waterfront & Parks",
    image: "images/places/aquarium.jpg",
    name: "Belle Isle",
    note: "Island park, trails, water views",
    coords: [42.3431, -82.9744],
    zoom: 14,
  },
  {
    id: "campus-martius",
    category: "parks",
    section: "Waterfront & Parks",
    image: "images/places/campus.jpg",
    name: "Campus Martius Park",
    note: "Downtown plaza and events",
    coords: [42.3316, -83.0466],
    zoom: 17,
  },
  {
    id: "belle-isle-aquarium",
    category: "parks",
    section: "Waterfront & Parks",
    image: "images/places/aquarium.jpg",
    name: "Belle Isle Aquarium",
    note: "Historic aquarium in the park",
    coords: [42.3403, -82.9854],
    zoom: 17,
  },
  {
    id: "dia",
    category: "arts",
    section: "Arts & Culture",
    image: "images/places/dia.jpg",
    name: "Detroit Institute of Arts",
    note: "Murals, galleries, major museum",
    coords: [42.3594, -83.0646],
    zoom: 17,
  },
  {
    id: "motown",
    category: "arts",
    section: "Arts & Culture",
    image: "images/places/motown.jpg",
    name: "Motown Museum",
    note: "Detroit music history landmark",
    coords: [42.3643, -83.0892],
    zoom: 17,
  },
  {
    id: "fox-theatre",
    category: "landmark",
    section: "Arts & Culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Fox_Theatre%2C_Detroit.jpg/330px-Fox_Theatre%2C_Detroit.jpg",
    name: "Fox Theatre",
    note: "Historic theater and shows",
    coords: [42.3383, -83.0524],
    zoom: 17,
  },
  {
    id: "eastern-market",
    category: "food",
    section: "Food Districts",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Detroit_December_2019_01_%28Eastern_Market_Shed_2%29.jpg/330px-Detroit_December_2019_01_%28Eastern_Market_Shed_2%29.jpg",
    name: "Eastern Market",
    note: "Markets, murals, food district",
    coords: [42.3482, -83.0405],
    zoom: 16,
  },
  {
    id: "michigan-central",
    category: "landmark",
    section: "Landmarks & Architecture",
    image: "images/places/michigan-central.jpg",
    name: "Michigan Central Station",
    note: "Innovation landmark in Corktown",
    coords: [42.3283, -83.0777],
    zoom: 17,
  },
  {
    id: "guardian-building",
    category: "landmark",
    section: "Landmarks & Architecture",
    image: "images/places/guardian.jpg",
    name: "Guardian Building",
    note: "Art Deco architecture icon",
    coords: [42.3293, -83.0468],
    zoom: 17,
  },
  {
    id: "comerica-park",
    category: "sports",
    section: "Sports & Events",
    image: "images/places/comerica.jpg",
    name: "Comerica Park",
    note: "Baseball, skyline views, game days",
    coords: [42.339, -83.0485],
    zoom: 17,
  },
  {
    id: "ford-field",
    category: "sports",
    section: "Sports & Events",
    image: "images/places/ford-field.jpg",
    name: "Ford Field",
    note: "Football, concerts, major events",
    coords: [42.34, -83.0456],
    zoom: 17,
  },
];

const placeById = Object.fromEntries(places.map((place) => [place.id, place]));

function isNeighborhoodMarker(id: string) {
  const place = placeById[id];
  return place?.category === "neighborhood" || ["midtown", "corktown", "southwest"].includes(id);
}

function categoryMatches(place: Place, filter: string) {
  return filter === "all" || place.category === filter || (filter === "neighborhood" && isNeighborhoodMarker(place.id));
}

export function ExploreMap({ onClose }: { onClose: () => void }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activePlaceId, setActivePlaceId] = useState("downtown");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomStatus, setZoomStatus] = useState("City view");
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, Leaflet.Marker>>({});

  const visiblePlaces = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return places.filter((place) => (
      categoryMatches(place, activeFilter)
      && (!search || `${place.name} ${place.note} ${place.section}`.toLowerCase().includes(search))
    ));
  }, [activeFilter, searchQuery]);
  const visiblePlaceIds = useMemo(() => new Set(visiblePlaces.map((place) => place.id)), [visiblePlaces]);
  const visibleSections = [...new Set(visiblePlaces.map((place) => place.section))];
  const resolvedActivePlaceId = visiblePlaceIds.has(activePlaceId) ? activePlaceId : (visiblePlaces[0]?.id ?? activePlaceId);

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
        const neighborhood = isNeighborhoodMarker(id);
        const markerClass = neighborhood ? " marker-neighborhood" : ` marker-${placeById[id].category}`;
        return L.divIcon({
          className: `leaflet-div-icon detroit-marker${markerClass} marker-place-${id}${id === "downtown" ? " is-selected" : ""}`,
          html: neighborhood ? `<span></span>${placeById[id].name}` : "<span></span>",
          iconSize: undefined,
        });
      };

      places.forEach((place) => {
        const marker = L.marker(place.coords, { icon: markerIcon(place.id), title: place.name })
          .addTo(markerLayer)
          .on("click", () => setActivePlaceId(place.id));

        if (!isNeighborhoodMarker(place.id)) {
          marker.bindTooltip(place.name, {
            className: "detroit-tooltip",
            direction: "top",
            offset: [0, -18],
            opacity: 1,
            sticky: true,
          });
        }
        markersRef.current[place.id] = marker;
      });

      const updateZoomStatus = () => {
        const zoom = map.getZoom();
        setZoomStatus(zoom >= 15 ? "Street detail" : zoom >= 13 ? "District detail" : "City view");
      };

      map.on("zoomend", updateZoomStatus);
      updateZoomStatus();
      mapRef.current = map;
      markerLayerRef.current = markerLayer;
    }

    void initMap();
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
    const markerLayer = markerLayerRef.current;
    if (!L || !markerLayer) return;

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const place = placeById[id];
      const neighborhood = isNeighborhoodMarker(id);
      const markerClass = neighborhood ? " marker-neighborhood" : ` marker-${place.category}`;
      marker.setIcon(L.divIcon({
        className: `leaflet-div-icon detroit-marker${markerClass} marker-place-${id}${id === resolvedActivePlaceId ? " is-selected" : ""}`,
        html: neighborhood ? `<span></span>${place.name}` : "<span></span>",
        iconSize: undefined,
      }));

      if (visiblePlaceIds.has(id)) marker.addTo(markerLayer);
      else markerLayer.removeLayer(marker);
    });
  }, [resolvedActivePlaceId, visiblePlaceIds]);

  useEffect(() => {
    const activePlace = placeById[resolvedActivePlaceId];
    if (activePlace && mapRef.current) {
      mapRef.current.flyTo(activePlace.coords, activePlace.zoom, { duration: 0.7 });
    }
  }, [resolvedActivePlaceId]);

  return (
    <section className="explore-demo" aria-label="Explore Detroit">
      <aside className="explore-copy-panel">
        <label className="explore-map-search">
          <span className="sr-only">Search Detroit places</span>
          <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>
          <input
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search Detroit places"
            type="search"
            value={searchQuery}
          />
        </label>
        <button
          aria-expanded={filterOpen}
          aria-label="Show map filters"
          className="explore-filter-launch"
          onClick={() => setFilterOpen((current) => !current)}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" size={18} />
          <span>Filters</span>
        </button>
        <div className={`explore-filter-row ${filterOpen ? "is-open" : ""}`} aria-label="Map filters">
          {filters.map((filter) => (
            <button
              className={activeFilter === filter.value ? "is-active" : ""}
              key={filter.value}
              onClick={() => {
                setActiveFilter(filter.value);
                setFilterOpen(false);
              }}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className={`explore-result-list ${activeFilter === "all" && !searchQuery ? "" : "is-filtered"}`} aria-label="Detroit map results">
          {visibleSections.map((section) => (
            <section className="explore-result-group" key={section}>
              <h2>{section}</h2>
              {visiblePlaces.filter((place) => place.section === section).map((place) => (
                <button
                  className={`explore-result-card ${resolvedActivePlaceId === place.id ? "is-active" : ""}`}
                  key={place.id}
                  onClick={() => setActivePlaceId(place.id)}
                  type="button"
                >
                  <img alt="" src={place.image} />
                  <span><strong>{place.name}</strong><small>{place.note}</small></span>
                </button>
              ))}
            </section>
          ))}
          {!visiblePlaces.length && <p className="explore-empty">No places match this search.</p>}
        </div>
      </aside>

      <section className="explore-map-console" aria-label="Interactive Detroit street map">
        <div className="leaflet-map" ref={mapElementRef} />
        <div className="explore-map-controls" aria-label="Map controls">
          <button aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()} type="button">-</button>
          <button aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()} type="button">+</button>
        </div>
        <div className="explore-zoom-status" aria-live="polite">{zoomStatus}</div>
        <button aria-label="Return home" className="explore-map-close" onClick={onClose} type="button"><X size={21} /></button>
      </section>
    </section>
  );
}
