import { DATA_URLS } from "./config.js";
import { loadGeoJSON, pointInFeature } from "./spatial-query.js";

const FACILITY_GROUPS = Object.freeze([
  { key: "school", cacheKey: "schools", url: DATA_URLS.schools, label: "Pendidikan", property: "web_level" },
  { key: "health", cacheKey: "health", url: DATA_URLS.health, label: "Kesihatan", property: "web_category" },
  { key: "safety", cacheKey: "police", url: DATA_URLS.police, label: "Keselamatan", property: "AGENSI" }
]);

function validPoint(f) {
  const p = f?.geometry?.coordinates;
  return f?.geometry?.type === "Point" &&
    Array.isArray(p) && p.length >= 2 &&
    Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

/**
 * A facility-record count *inside a Mapbox network isochrone*, not
 * population coverage, service sufficiency, a service-standard score,
 * or a drive-time calculation to every facility.
 */
export async function summarizePlanningCoverage(polygon, selectedType = "all") {
  if (!["Polygon", "MultiPolygon"].includes(polygon?.geometry?.type)) {
    throw new Error("Isochrone bukan poligon yang sah.");
  }
  if (!["all", "school", "health", "safety"].includes(selectedType)) {
    throw new Error("Jenis kemudahan tidak dikenali.");
  }

  const selectedGroups = selectedType === "all"
    ? FACILITY_GROUPS
    : FACILITY_GROUPS.filter(group => group.key === selectedType);

  // Fail visibly if a requested dataset is unavailable; never report
  // zero for missing data or silently calculate a misleading partial total.
  const grouped = await Promise.all(selectedGroups.map(async group => {
    const source = await loadGeoJSON(group.cacheKey, group.url);
    const records = (source.features || []).filter(validPoint);
    const inside = records.filter(f =>
      pointInFeature(f.geometry.coordinates, polygon)
    );
    const categories = new Map();
    for (const f of inside) {
      const key = String(f.properties?.[group.property] || "Tidak dinyatakan").trim();
      categories.set(key, (categories.get(key) || 0) + 1);
    }
    return {
      key: group.key,
      label: group.label,
      totalRecords: records.length,
      insideCount: inside.length,
      categories: [...categories].sort((a, b) => b[1] - a[1]).slice(0,6)
        .map(([label, count]) => ({ label, count })),
      inside
    };
  }));

  return {
    selectedType,
    insideCount: grouped.reduce((sum, group) => sum + group.insideCount, 0),
    totalRecords: grouped.reduce((sum, group) => sum + group.totalRecords, 0),
    groups: grouped.map(({inside, ...group}) => group),
    // Mark a limited sample as map points to keep mobile rendering fast.
    // The full count is ALWAYS based on all records, not this sample.
    visibleFacilities: grouped.flatMap(group => group.inside.slice(0,80)
      .map(f => ({
        type: "Feature",
        properties: {
          role: "facility",
          group: group.key,
          groupLabel: group.label,
          name: String(f.properties?.web_name || f.properties?.NAMA ||
            f.properties?.nama || "Kemudahan tanpa nama").trim(),
          typeLabel: String(f.properties?.[FACILITY_GROUPS.find(g =>
            g.key === group.key)?.property] || "Tidak dinyatakan").trim()
        },
        geometry: f.geometry
      }))),
    markerLimitPerGroup: 80
  };
}
