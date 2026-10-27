import { DATA_URLS } from "./config.js";
import {
  loadGeoJSON,
  pointInFeature,
  findDistrictByName,
  findPbtByName
} from "./spatial-query.js";

export const ATTRIBUTE_LAYER_REGISTRY = {
  schools: {
    label: "sekolah",
    url: DATA_URLS.schools,
    nameField: "web_name",
    fields: {
      web_type: {
        label: "Status/Jenis Warta",
        values: {
          tiada: ["tiada warta", "tidak diwartakan", "belum warta", "belum diwartakan", "tanpa warta"],
          TM_KPM: ["tm kpm", "tm_kpm"],
          "W.S62": ["w.s62", "ws62", "warta s62"],
          "166(4)": ["166(4)", "seksyen 166"],
          SUKSel: ["suksel", "suk selangor"]
        }
      },
      web_level: {
        label: "Tahap Sekolah",
        values: {
          "Sekolah Rendah": ["sekolah rendah", "rendah"],
          "Sekolah Menengah": ["sekolah menengah", "menengah"]
        }
      },
      web_ppd: {
        label: "PPD",
        dynamicPrefix: "ppd"
      },
      web_district: {
        label: "Daerah"
      },
      web_pbt: {
        label: "PBT"
      }
    }
  },
  health: {
    label: "kemudahan kesihatan",
    url: DATA_URLS.health,
    nameField: "web_name",
    fields: {
      web_category: {
        label: "Kategori",
        values: {
          Hospital: ["hospital"],
          "Klinik Kesihatan": ["klinik kesihatan"],
          "Klinik Ibu dan Anak": ["klinik ibu dan anak", "kia"],
          "Klinik Desa": ["klinik desa"]
        }
      },
      web_sector: {
        label: "Sektor",
        values: {
          Kerajaan: ["kerajaan", "kkm"],
          Swasta: ["swasta"]
        }
      },
      web_operator: {
        label: "Operator",
        values: {
          KKM: ["operator kkm", "bawah kkm"],
          Swasta: ["operator swasta"]
        }
      },
      web_district: {
        label: "Daerah"
      }
    }
  },
  police: {
    label: "lokasi keselamatan",
    url: DATA_URLS.police,
    nameField: "web_name",
    fields: {
      web_hierarchy: {
        label: "Hierarki",
        values: {
          IPK: ["ipk"],
          IPD: ["ipd"]
        }
      }
    }
  },
  cities: {
    label: "bandar DPN3",
    url: DATA_URLS.cities,
    nameField: "nama_bandar",
    fields: {
      hierarki: {
        label: "Tier DPN3",
        values: {
          "Tier 1": ["tier 1", "tier satu", "tier pertama"],
          "Tier 2": ["tier 2", "tier dua", "tier kedua"],
          "Tier 3": ["tier 3", "tier tiga", "tier ketiga"]
        }
      },
      daerah: {
        label: "Daerah"
      }
    }
  }
};

const PBT_ALIASES = {
  mbsa: "MBSA",
  mbpj: "MBPJ",
  mbsj: "MBSJ",
  mbdk: "MBDK",
  mpaj: "MPAJ",
  mpkj: "MPKJ",
  mps: "MPS",
  mpsepang: "MPSp",
  mpsp: "MPSp",
  mpkl: "MPKL",
  mpks: "MPKS",
  mphs: "MPHS",
  mdsb: "MDSB"
};

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function equals(a, b) {
  return normalize(a) === normalize(b);
}

function includesPhrase(text, phrases) {
  return phrases.some((phrase) => text.includes(normalize(phrase)));
}

function detectRegisteredFilters(layer, text) {
  const registry = ATTRIBUTE_LAYER_REGISTRY[layer];
  const filters = [];

  for (const [field, metadata] of Object.entries(registry?.fields || {})) {
    for (const [value, aliases] of Object.entries(metadata.values || {})) {
      if (includesPhrase(text, aliases)) {
        filters.push({
          field,
          operator: "equals",
          value,
          label: metadata.label
        });
        break;
      }
    }
  }

  return filters;
}

const PPD_VALUES = [
  "PPD PETALING PERDANA",
  "PPD PETALING UTAMA",
  "PPD HULU LANGAT",
  "PPD KLANG",
  "PPD GOMBAK",
  "PPD KUALA SELANGOR",
  "PPD KUALA LANGAT",
  "PPD HULU SELANGOR",
  "PPD SABAK BERNAM",
  "PPD SEPANG"
];

function detectPpdFilter(text) {
  const normalizedText = normalize(text);

  for (const value of PPD_VALUES) {
    if (normalizedText.includes(normalize(value))) {
      return {
        field: "web_ppd",
        operator: "equals",
        value,
        label: "PPD"
      };
    }
  }

  return null;
}

function detectPbtCodeFilter(text) {
  for (const [alias, value] of Object.entries(PBT_ALIASES)) {
    if (text.includes(alias)) {
      return {
        field: "web_pbt",
        operator: "equals",
        value,
        label: "PBT"
      };
    }
  }

  return null;
}

function deduplicateFilters(filters) {
  const seen = new Set();

  return filters.filter((filter) => {
    const key = `${filter.field}|${filter.operator}|${normalize(filter.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function inferAttributeQuery(parsedQuery) {
  const layer = parsedQuery.layer;
  const registry = ATTRIBUTE_LAYER_REGISTRY[layer];

  if (!registry) {
    return {
      supported: false,
      layer,
      filters: []
    };
  }

  const text = normalize(parsedQuery.text || parsedQuery.raw);
  const filters = detectRegisteredFilters(layer, text);

  if (layer === "schools") {
    const ppd = detectPpdFilter(text);
    const pbt = detectPbtCodeFilter(text);
    if (ppd) filters.push(ppd);
    if (pbt) filters.push(pbt);
  }

  if (parsedQuery.location?.type === "district") {
    filters.push({
      field: "web_district",
      operator: "equals",
      value: parsedQuery.location.name,
      label: "Daerah",
      spatialBoundary: "district"
    });
  }

  if (
    layer === "health" &&
    parsedQuery.location?.type === "pbt"
  ) {
    filters.push({
      field: "__spatial_pbt__",
      operator: "within",
      value: parsedQuery.location.name,
      label: "PBT",
      spatialBoundary: "pbt"
    });
  }

  if (
    layer === "schools" &&
    parsedQuery.schoolSearchTerm
  ) {
    filters.push({
      field: registry.nameField,
      operator: "contains",
      value: parsedQuery.schoolSearchTerm,
      label: "Nama"
    });
  }

  return {
    supported: true,
    layer,
    layerLabel: registry.label,
    nameField: registry.nameField,
    filters: deduplicateFilters(filters),
    hasFilters: filters.length > 0
  };
}

function matchesAttribute(feature, filter) {
  const value = feature.properties?.[filter.field];

  if (filter.operator === "equals") {
    return equals(value, filter.value);
  }

  if (filter.operator === "contains") {
    return normalize(value).includes(normalize(filter.value));
  }

  return true;
}

export async function executeAttributeQuery(attributeQuery) {
  const registry = ATTRIBUTE_LAYER_REGISTRY[attributeQuery.layer];

  if (!registry) {
    throw new Error("Layer tidak didaftarkan dalam Attribute Query Engine.");
  }

  const data = await loadGeoJSON(
    `attribute-${attributeQuery.layer}`,
    registry.url
  );

  let features = data.features || [];

  for (const filter of attributeQuery.filters) {
    if (filter.spatialBoundary === "district") {
      const boundary = await findDistrictByName(filter.value);

      if (boundary) {
        features = features.filter((feature) =>
          feature.geometry?.type === "Point" &&
          pointInFeature(feature.geometry.coordinates, boundary)
        );
      } else {
        features = features.filter((feature) =>
          equals(feature.properties?.web_district, filter.value)
        );
      }
      continue;
    }

    if (filter.spatialBoundary === "pbt") {
      const boundary = await findPbtByName(filter.value);

      if (boundary) {
        features = features.filter((feature) =>
          feature.geometry?.type === "Point" &&
          pointInFeature(feature.geometry.coordinates, boundary)
        );
      }
      continue;
    }

    features = features.filter((feature) =>
      matchesAttribute(feature, filter)
    );
  }

  return features;
}

export function formatAttributeFilters(filters) {
  if (!filters.length) return "tanpa penapis atribut";

  return filters
    .map((filter) => {
      if (filter.spatialBoundary === "district") {
        return `Daerah = ${filter.value}`;
      }

      if (filter.spatialBoundary === "pbt") {
        return `Dalam PBT = ${filter.value}`;
      }

      const operator =
        filter.operator === "contains"
          ? "mengandungi"
          : "=";

      return `${filter.label} ${operator} ${filter.value}`;
    })
    .join("; ");
}

export function attributeQueryExplanation(attributeQuery) {
  return {
    layer: attributeQuery.layerLabel,
    filters: formatAttributeFilters(attributeQuery.filters),
    method: attributeQuery.filters.some((f) => f.spatialBoundary)
      ? "Penapisan atribut + point-in-polygon"
      : "Penapisan atribut GeoJSON"
  };
}
