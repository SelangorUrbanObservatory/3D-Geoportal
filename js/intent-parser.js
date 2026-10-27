const DISTRICTS = [
  "Sabak Bernam",
  "Kuala Selangor",
  "Hulu Selangor",
  "Gombak",
  "Petaling",
  "Klang",
  "Kuala Langat",
  "Hulu Langat",
  "Sepang"
];

const PBT_ALIASES = {
  mbsa: "Majlis Bandaraya Shah Alam",
  mbpj: "Majlis Bandaraya Petaling Jaya",
  mbsj: "Majlis Bandaraya Subang Jaya",
  mbdk: "Majlis Bandaraya Diraja Klang",
  mpaj: "Majlis Perbandaran Ampang Jaya",
  mpkj: "Majlis Perbandaran Kajang",
  mps: "Majlis Perbandaran Selayang",
  mpsepang: "Majlis Perbandaran Sepang",
  mpkl: "Majlis Perbandaran Kuala Langat",
  mpks: "Majlis Perbandaran Kuala Selangor",
  mphs: "Majlis Perbandaran Hulu Selangor",
  mdsb: "Majlis Daerah Sabak Bernam"
};

const HEALTH_TERMS = [
  ["klinik ibu dan anak", "Klinik Ibu dan Anak"],
  ["klinik kesihatan", "Klinik Kesihatan"],
  ["klinik desa", "Klinik Desa"],
  ["hospital", "Hospital"],
  ["kemudahan kesihatan", null],
  ["kesihatan", null]
];

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function detectDistrict(text) {
  for (const district of DISTRICTS) {
    const value = normalize(district);

    if (
      text.includes(`daerah ${value}`) ||
      text.includes(`di ${value}`) ||
      text.includes(`dalam ${value}`) ||
      text.endsWith(value)
    ) {
      return { type: "district", name: district };
    }
  }

  return null;
}

function detectPbt(text) {
  for (const [alias, name] of Object.entries(PBT_ALIASES)) {
    if (text.includes(alias)) {
      return { type: "pbt", name, alias: alias.toUpperCase() };
    }
  }

  for (const name of Object.values(PBT_ALIASES)) {
    if (text.includes(normalize(name))) {
      return { type: "pbt", name };
    }
  }

  return null;
}

function detectHealth(text) {
  for (const [term, category] of HEALTH_TERMS) {
    if (text.includes(term)) {
      return { layer: "health", category };
    }
  }

  return null;
}


function detectSchool(text) {
  if (text.includes("sekolah menengah")) {
    return { layer: "schools", category: "Sekolah Menengah" };
  }

  if (text.includes("sekolah rendah")) {
    return { layer: "schools", category: "Sekolah Rendah" };
  }

  if (text.includes("sekolah") || text.includes("pendidikan")) {
    return { layer: "schools", category: null };
  }

  return null;
}

function detectPolice(text) {
  if (text.includes("ipk")) {
    return { layer: "police", category: "IPK" };
  }

  if (text.includes("ipd")) {
    return { layer: "police", category: "IPD" };
  }

  if (text.includes("polis") || text.includes("keselamatan")) {
    return { layer: "police", category: null };
  }

  return null;
}

function detectLayerCommand(text) {
  const layerMap = [
    ["live traffic", "traffic"],
    ["traffic", "traffic"],
    ["trafik", "traffic"],
    ["flood intelligence", "floodRain"],
    ["banjir", "floodRain"],
    ["lot kadaster", "cadastral"],
    ["kadaster", "cadastral"],
    ["lot tanah", "cadastral"],
    ["sempadan pbt", "pbt"],
    ["sempadan daerah", "districts"],
    ["daerah", "districts"],
    ["pbt", "pbt"],
    ["kesihatan", "healthFacilities"],
    ["sekolah", "schools"],
    ["pendidikan", "schools"],
    ["keselamatan", "police"],
    ["hierarki bandar", "cityHierarchy"],
    ["bandar dpn3", "cityHierarchy"],
    ["terrain", "terrain"],
    ["bangunan 3d", "buildings"]
  ];

  for (const [term, layer] of layerMap) {
    if (text.includes(term)) return layer;
  }

  return null;
}

export function parseIntent(message) {
  const text = normalize(message);
  const district = detectDistrict(text);
  const pbt = detectPbt(text);
  const health = detectHealth(text);
  const school = detectSchool(text);
  const police = detectPolice(text);

  let intent = "unknown";

  if (text.includes("buka kolum kiri")) {
    intent = "openLeftPanel";
  } else if (text.includes("tutup kolum kiri")) {
    intent = "closeLeftPanel";
  } else if (text.includes("buka kolum kanan")) {
    intent = "openRightPanel";
  } else if (text.includes("tutup kolum kanan")) {
    intent = "closeRightPanel";
  } else if (text.includes("focus map")) {
    intent = "focusMap";
  } else if (text.includes("split screen") || text.includes("split")) {
    intent = "split";
  } else if (text.includes("2d")) {
    intent = "view2d";
  } else if (text.includes("3d")) {
    intent = "view3d";
  } else if (
    includesAny(text, ["beza", "perbezaan", "bandingkan", "compare"]) &&
    includesAny(text, ["keluasan", "luas"])
  ) {
    intent = "compareArea";
  } else if (includesAny(text, ["berapa", "jumlah", "bilangan", "kira"])) {
    intent = "count";
  } else if (includesAny(text, ["keluasan", "luas"])) {
    intent = "area";
  } else if (includesAny(text, ["tunjukkan", "paparkan", "highlight", "cari semua", "cari "])) {
    intent = "show";
  } else if (includesAny(text, ["buka", "hidupkan", "aktifkan", "on kan", "onkan"])) {
    intent = "open";
  } else if (includesAny(text, ["tutup", "matikan", "sembunyikan", "off kan", "offkan"])) {
    intent = "close";
  } else if (includesAny(text, ["zoom", "pergi ke", "fly ke", "bawa ke"])) {
    intent = "navigate";
  }

  let subject = health || school || police;

  if (!subject && (pbt || text.includes("pbt"))) {
    subject = { layer: "pbt", category: null };
  }

  if (
    !subject &&
    (
      district ||
      text.includes("sempadan daerah") ||
      text.includes("jumlah daerah") ||
      text.includes("berapa daerah") ||
      text.includes("keluasan daerah")
    )
  ) {
    subject = { layer: "districts", category: null };
  }

  if (!subject && (text.includes("bandar") || text.includes("dpn3"))) {
    subject = { layer: "cities", category: null };
  }

  return {
    raw: message,
    text,
    intent,
    layer: subject?.layer || detectLayerCommand(text),
    category: subject?.category ?? null,
    location: pbt || district,
    comparisonLocations: {
      district,
      pbt
    },
    layerCommand: detectLayerCommand(text),
    asksGovernment:
      text.includes("kerajaan") || text.includes("kkm"),
    asksPrivate:
      text.includes("swasta"),
    schoolSearchTerm:
      school && text.startsWith("cari ")
        ? text.replace(/^cari\s+/, "").trim()
        : null
  };
}

export { DISTRICTS, PBT_ALIASES };
