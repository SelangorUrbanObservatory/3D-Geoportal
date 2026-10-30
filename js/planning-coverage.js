import { DATA_URLS } from "./config.js";
import { loadGeoJSON, pointInFeature } from "./spatial-query.js";

const FACILITY_GROUPS = Object.freeze([
  { key: "school", cacheKey: "schools", url: DATA_URLS.schools, label: "Pendidikan", property: "web_level" },
  { key: "health", cacheKey: "health", url: DATA_URLS.health, label: "Kesihatan", property: "web_category" },
  { key: "safety", cacheKey: "police", url: DATA_URLS.police, label: "Keselamatan", property: "AGENSI" }
]);

// Distribute visual markers across the original record order, instead of
// plotting only the first 80 records (which can be geographically clustered).
function sampleForMap(items, limit = 80) {
  if (items.length <= limit) return items;
  return Array.from({ length: limit }, (_, i) =>
    items[Math.floor(i * items.length / limit)]);
}

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
    visibleFacilities: grouped.flatMap(group => sampleForMap(group.inside, 80)
      .map(f => ({
        type: "Feature",
        properties: {
          role: "facility",
          analysis: "planning",
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


export const PLANNING_COMPARE_MINUTES = Object.freeze([5, 10, 15]);

/**
 * Three Mapbox time contours from one origin.
 * Each point belongs to its earliest enclosing polygon, once only.
 * Cumulative totals sum exclusive bands; not population coverage.
 */
export async function summarizeTravelTimeComparison(polygons, selectedType = "all") {
  if (!["all", "school", "health", "safety"].includes(selectedType)) {
    throw new Error("Jenis kemudahan tidak dikenali.");
  }
  const byMinute = new Map();
  for (const polygon of polygons || []) {
    const minutes = Number(polygon?.properties?.contour);
    if (!PLANNING_COMPARE_MINUTES.includes(minutes) ||
        !["Polygon", "MultiPolygon"].includes(polygon?.geometry?.type) ||
        byMinute.has(minutes)) {
      throw new Error("Kontur 5, 10 dan 15 minit tidak lengkap atau tidak sah.");
    }
    byMinute.set(minutes, polygon);
  }
  if (byMinute.size !== PLANNING_COMPARE_MINUTES.length) {
    throw new Error("Mapbox tidak memulangkan semua kontur 5, 10 dan 15 minit.");
  }
  const groups = selectedType === "all"
    ? FACILITY_GROUPS
    : FACILITY_GROUPS.filter(g => g.key === selectedType);
  const loaded = await Promise.all(groups.map(async group => {
    const source = await loadGeoJSON(group.cacheKey, group.url);
    const records = (source.features || []).filter(validPoint);
    const inBands = new Map(PLANNING_COMPARE_MINUTES.map(m => [m, []]));
    for (const facility of records) {
      const coordinate = facility.geometry.coordinates;
      const earliest = PLANNING_COMPARE_MINUTES.find(minutes =>
        pointInFeature(coordinate, byMinute.get(minutes))
      );
      if (earliest) inBands.get(earliest).push(facility);
    }
    return { group, totalRecords: records.length, inBands };
  }));

  const bands = PLANNING_COMPARE_MINUTES.map((minutes, i) => {
    const perGroup = loaded.map(({ group, inBands }) => ({
      key: group.key,
      label: group.label,
      count: inBands.get(minutes).length
    }));
    return {
      minutes,
      bandLabel: i === 0 ? "0–5 min" : PLANNING_COMPARE_MINUTES[i - 1] + "–" + minutes + " min",
      added: perGroup.reduce((n, g) => n + g.count, 0),
      perGroup
    };
  });
  let cumulative = 0;
  for (const band of bands) {
    cumulative += band.added;
    band.cumulative = cumulative;
  }
  // Display sample only; all records are included in the statistics.
  const markers = loaded.flatMap(({ group, inBands }) =>
    PLANNING_COMPARE_MINUTES.flatMap(minutes => sampleForMap(inBands.get(minutes), 35)
      .map(feature => ({
        type: "Feature",
        properties: {
          role: "facility",
          analysis: "planning",
          group: group.key,
          groupLabel: group.label,
          bandMinutes: minutes,
          name: String(feature.properties?.web_name || feature.properties?.NAMA ||
            feature.properties?.nama || "Kemudahan tanpa nama").trim(),
          typeLabel: String(feature.properties?.[group.property] ||
            "Tidak dinyatakan").trim()
        },
        geometry: feature.geometry
      })))
  );
  return {
    selectedType,
    bands,
    totalInside15: cumulative,
    totalRecords: loaded.reduce((n, row) => n + row.totalRecords, 0),
    markers,
    markerLimitPerGroupPerBand: 35,
    polygons: PLANNING_COMPARE_MINUTES.map(m => byMinute.get(m))
  };
}
