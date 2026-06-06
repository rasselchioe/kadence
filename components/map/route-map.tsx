"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RideSample } from "@/lib/gpx/preview";
import { useSelection } from "@/components/activity/selection-context";
import { palette } from "@/lib/tokens";

const TILES_URL =
  process.env.NEXT_PUBLIC_MAP_TILES_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "© OpenStreetMap contributors";

const EMPTY: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function RouteMap({
  route,
  samples,
  bounds,
}: {
  route: [number, number][];
  samples: RideSample[];
  bounds: [[number, number], [number, number]];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const { index, setHover, togglePin } = useSelection();
  const idxRef = useRef(index);
  idxRef.current = index;

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [TILES_URL],
            tileSize: 256,
            attribution: ATTRIBUTION,
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            // Desaturate the tiles for the bone/ink look; the route + markers
            // stay in colour because they're vector layers on top.
            paint: { "raster-saturation": -0.9, "raster-opacity": 0.85 },
          },
        ],
      },
      bounds: bounds as maplibregl.LngLatBoundsLike,
      fitBoundsOptions: { padding: 36 },
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      const line: GeoJSON.Feature = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: route },
        properties: {},
      };
      map.addSource("route", { type: "geojson", data: line });
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": palette.paper, "line-width": 6 },
      });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": palette.ink, "line-width": 3 },
      });

      map.addSource("ends", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: route[0] },
              properties: { kind: "start" },
            },
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: route[route.length - 1],
              },
              properties: { kind: "end" },
            },
          ],
        },
      });
      map.addLayer({
        id: "ends",
        type: "circle",
        source: "ends",
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "match",
            ["get", "kind"],
            "start",
            palette.field,
            palette.crimson,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": palette.paper,
        },
      });

      map.addSource("cursor", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "cursor",
        type: "circle",
        source: "cursor",
        paint: {
          "circle-radius": 6,
          "circle-color": palette.crimson,
          "circle-stroke-width": 2,
          "circle-stroke-color": palette.paper,
        },
      });
      readyRef.current = true;
    });

    const onMove = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      let best = -1;
      let bestDist = Infinity;
      for (let i = 0; i < samples.length; i++) {
        const dx = samples[i].lon - lng;
        const dy = samples[i].lat - lat;
        const dd = dx * dx + dy * dy;
        if (dd < bestDist) {
          bestDist = dd;
          best = i;
        }
      }
      if (best >= 0) setHover(best);
    };
    const onLeave = () => setHover(null);
    const onClick = () => {
      if (idxRef.current != null) togglePin(idxRef.current);
    };

    map.on("mousemove", onMove);
    map.on("click", onClick);
    map.getCanvas().addEventListener("mouseleave", onLeave);

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // Init once per ride; handlers read live values via refs/stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the cursor marker as the selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("cursor") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    if (index == null) {
      src.setData(EMPTY);
      return;
    }
    const s = samples[index];
    src.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          properties: {},
        },
      ],
    });
  }, [index, samples]);

  return <div ref={containerRef} className="h-full w-full" />;
}
