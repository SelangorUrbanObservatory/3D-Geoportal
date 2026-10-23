/* SUO v9.0.5 — Independent 3D building extrusions.
   Cartographic Mapbox building footprints, not authoritative Selangor building records. */
const SOURCE_ID = "suo-buildings-vector";
const LAYER_ID = "suo-buildings-extrusion";
const VECTOR_URL = "mapbox://mapbox.mapbox-streets-v8";

export function sync3DBuildings(map, { enabled = true, mode = "3d", basemap = "standard", prefix = "" } = {}) {
  if (!map || !map.isStyleLoaded()) return;
  const id = prefix + LAYER_ID;
  const sourceId = prefix + SOURCE_ID;
  const independent = basemap !== "standard";
  const visible = enabled && mode === "3d";
  // Standard owns its native 3D objects. Avoid drawing duplicate buildings.
  try { map.setConfigProperty("basemap", "show3dObjects", visible && !independent); } catch (_) {}
  if (!independent) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
    return;
  }
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: "vector", url: VECTOR_URL });
  }
  if (!map.getLayer(id)) {
    map.addLayer({
      id,
      type: "fill-extrusion",
      source: sourceId,
      "source-layer": "building",
      minzoom: 12,
      filter: ["==", ["get", "extrude"], "true"],
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "fill-extrusion-color": "#d7c8b5",
        "fill-extrusion-height": ["coalesce", ["to-number", ["get", "height"]], 0],
        "fill-extrusion-base": ["coalesce", ["to-number", ["get", "min_height"]], 0],
        "fill-extrusion-opacity": 0.83,
        "fill-extrusion-vertical-gradient": true
      }
    });
  } else {
    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }
}
