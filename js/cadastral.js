import { addLayerCompat } from "./utils.js";

const CONFIG_URL = "config/cadastral-layer.json";

let configCache = null;

async function loadConfig() {
  if (configCache) return configCache;

  const response = await fetch(CONFIG_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Gagal memuatkan konfigurasi Lot Kadaster.");
  }

  configCache = await response.json();
  return configCache;
}

function createSourceDefinition(config) {
  if (config.sourceType === "mapboxTileset" && config.url) {
    return {
      type: "vector",
      url: config.url,
      minzoom: config.minzoom ?? 11,
      maxzoom: config.maxzoom ?? 22
    };
  }

  if (
    config.sourceType === "vectorTiles" &&
    Array.isArray(config.tiles) &&
    config.tiles.length
  ) {
    return {
      type: "vector",
      tiles: config.tiles,
      minzoom: config.minzoom ?? 11,
      maxzoom: config.maxzoom ?? 22
    };
  }

  if (config.sourceType === "geojson" && config.url) {
    return {
      type: "geojson",
      data: config.url
    };
  }

  return null;
}

export async function addCadastralLayer(map, prefix = "") {
  const config = await loadConfig();
  const sourceId = `${prefix}cadastral-source`;
  const fillId = `${prefix}cadastral-fill`;
  const lineId = `${prefix}cadastral-line`;
  const labelId = `${prefix}cadastral-label`;

  const sourceDefinition = createSourceDefinition(config);

  if (!config.enabled || !sourceDefinition) {
    return {
      configured: false,
      config,
      reason: "Lot Kadaster MBSA 2023 belum mempunyai endpoint Vector Tile yang diluluskan."
    };
  }

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, sourceDefinition);
  }

  const sourceLayer =
    sourceDefinition.type === "vector"
      ? config.sourceLayer
      : undefined;
  if (sourceDefinition.type === "vector" && !sourceLayer) {
    throw new Error("Nama source-layer kadaster belum ditetapkan.");
  }

  if (!map.getLayer(fillId)) {
    addLayerCompat(map, {
      id: fillId,
      type: "fill",
      source: sourceId,
      ...(sourceLayer
        ? { "source-layer": sourceLayer }
        : {}),
      minzoom: config.minzoom ?? 11,
      slot: "middle",
      paint: {
        "fill-color": "#EAB308",
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11, 0.01,
          14, 0.055,
          17, 0.10
        ]
      }
    });
  }

  if (!map.getLayer(lineId)) {
    addLayerCompat(map, {
      id: lineId,
      type: "line",
      source: sourceId,
      ...(sourceLayer
        ? { "source-layer": sourceLayer }
        : {}),
      minzoom: config.minzoom ?? 11,
      slot: "top",
      paint: {
        "line-color": "#FACC15",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11, 0.15,
          14, 0.45,
          17, 1.15,
          20, 2
        ],
        "line-opacity": 0.92
      }
    });
  }

  if (!map.getLayer(labelId)) {
    addLayerCompat(map, {
      id: labelId,
      type: "symbol",
      source: sourceId,
      ...(sourceLayer
        ? { "source-layer": sourceLayer }
        : {}),
      minzoom: 16,
      slot: "top",
      layout: {
        "text-field": [
          "coalesce",
          ["get", config.fields?.lot || "LOT"],
          ["get", config.fields?.upi || "UPI"],
          ""
        ],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          16, 10,
          20, 12
        ],
        "text-font": [
          "DIN Pro Medium",
          "Arial Unicode MS Regular"
        ],
        "text-allow-overlap": false
      },
      paint: {
        "text-color": "#FEF3C7",
        "text-halo-color": "rgba(15,23,42,0.96)",
        "text-halo-width": 1.3
      }
    });
  }

  return {
    configured: true,
    config
  };
}

export function setCadastralVisibility(
  map,
  visible,
  prefix = ""
) {
  [
    `${prefix}cadastral-fill`,
    `${prefix}cadastral-line`,
    `${prefix}cadastral-label`
  ].forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(
        id,
        "visibility",
        visible ? "visible" : "none"
      );
    }
  });
}

function escapeCadastreText(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Display only explicitly approved fields from cadastral-layer.json.
 *  No owner name/address, land title information, or raw attributes.
 */
export function cadastralPopupHtml(properties, config) {
  const fields = config?.fields || {};
  const value = key => fields[key] && properties?.[fields[key]] != null
    ? String(properties[fields[key]]).trim()
    : "";
  const lot = value("lot") || "tidak dinyatakan";
  const rows = [
    ["Daerah (kod)", value("district")],
    ["Mukim (kod)", value("mukim")],
    ["Seksyen", value("section")]
  ];
  const areaM2 = Number(value("area"));
  if (value("area") && Number.isFinite(areaM2) && areaM2 >= 0) {
    rows.push(["Keluasan geometri",
      (areaM2 / 10000).toLocaleString("ms-MY", {maximumFractionDigits: 4}) +
      " ha"]);
  }
  const year = value("sourceYear") || String(config?.sourceYear || "2023");
  rows.push(["Tahun data", year]);
  const updated = value("updated");
  if (updated) rows.push(["Tarikh sumber", updated.slice(0, 10)]);
  return '<div class="cadastral-popup">' +
    '<strong>Lot ' + escapeCadastreText(lot) + ' · ' +
    escapeCadastreText(config?.coverage || "MBSA") + '</strong>' +
    rows.filter(row => row[1]).map(([label, text]) =>
      '<div class="cadastral-popup-row"><span>' +
      escapeCadastreText(label) + '</span><b>' +
      escapeCadastreText(text) + '</b></div>'
    ).join("") +
    '<small>Maklumat kadaster untuk rujukan perancangan. Tidak membuktikan hak milik atau kegunaan tanah.</small>' +
    '</div>';
}

export async function getCadastralConfig() {
  return loadConfig();
}
