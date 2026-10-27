import { DATA_URLS } from "./config.js";
import { loadSvgSdf, addLayerCompat } from "./utils.js";
import {
  addCadastralLayer,
  setCadastralVisibility
} from "./cadastral.js";

export const facilitySubState = {
  school: {"Sekolah Rendah":true,"Sekolah Menengah":true,"Sekolah Agama":true},
  health: {"Hospital":true,"Klinik Kesihatan":true,"Klinik Ibu dan Anak":true,"Klinik Desa":true}
};

export function applyFacilityFilters(map,prefix="") {
  for (const [group,property,ids] of [
    ["school","web_level",["school-symbol","school-label"]],
    ["health","web_category",["health-symbol","health-label"]]
  ]) {
    const selected=Object.entries(facilitySubState[group]).filter(([,v])=>v).map(([name])=>name);
    const filter=["in",["get",property],["literal",selected]];
    for(const id of ids) if(map.getLayer(prefix+id)) map.setFilter(prefix+id,filter);
  }
}

export const layerState = {
  cityHierarchy: true,
  pbt: true,
  districts: true,
  cadastral: false,
  healthFacilities: true,
  liveTraffic: true,
  police: true,
  civilDefence: true,
  fireStations: true,
  schools: true,
  rail: true,
  railStations: true,
  floodRain: true,
  terrain: true,
  buildings: true
};

export async function addPortalLayers(map, prefix = "") {
  const citySource = `${prefix}cities`;
  const healthSource = `${prefix}health`;

  if (!map.getSource(citySource)) {
    map.addSource(citySource, { type: "geojson", data: DATA_URLS.cities });
  }

  if (!map.getLayer(`${prefix}city-circle`)) {
    addLayerCompat(map, {
      id: `${prefix}city-circle`,
      type: "circle",
      source: citySource,
      slot: "top",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 5, 14, 10],
        "circle-color": [
          "match", ["get", "hierarki"],
          "Tier 1", "#D43D48",
          "Tier 2", "#E9AB27",
          "Tier 3", "#9A6953",
          "#7F8C8D"
        ],
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 1.8
      }
    });
  }

  if (!map.getLayer(`${prefix}city-label`)) {
    addLayerCompat(map, {
      id: `${prefix}city-label`,
      type: "symbol",
      source: citySource,
      slot: "top",
      minzoom: 9,
      layout: {
        "text-field": ["coalesce", ["get", "label"], ["get", "nama_bandar"]],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 14],
        "text-offset": [0, 1.3],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.92)",
        "text-halo-width": 1.5
      }
    });
  }

  await loadSvgSdf(map, "hospital-building", DATA_URLS.hospitalIcon);

  if (!map.getSource(healthSource)) {
    map.addSource(healthSource, { type: "geojson", data: DATA_URLS.health });
  }

  if (!map.getLayer(`${prefix}health-symbol`)) {
    addLayerCompat(map, {
      id: `${prefix}health-symbol`,
      type: "symbol",
      source: healthSource,
      slot: "top",
      layout: {
        "icon-image": "hospital-building",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.27, 15, 0.48],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      },
      paint: {
        "icon-color": [
          "match", ["get", "web_category"],
          "Hospital", "#E63946",
          "Klinik Kesihatan", "#1D4ED8",
          "Klinik Ibu dan Anak", "#EC4899",
          "Klinik Desa", "#16A34A",
          "#6B7280"
        ],
        "icon-halo-color": "#FFFFFF",
        "icon-halo-width": 1.4
      }
    });
  }

  if (!map.getLayer(`${prefix}health-label`)) {
    addLayerCompat(map, {
      id: `${prefix}health-label`,
      type: "symbol",
      source: healthSource,
      slot: "top",
      minzoom: 11,
      layout: {
        "text-field": ["get", "web_name"],
        "text-size": 10,
        "text-offset": [0, 1.25],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.94)",
        "text-halo-width": 1.4
      }
    });
  }




  const railSource = `${prefix}rail-transportation`;
  const railCasing = `${prefix}rail-casing`;
  const railLine = `${prefix}rail-line`;

  if (!map.getSource(railSource)) {
    map.addSource(railSource, {
      type: "geojson",
      data: DATA_URLS.rail
    });
  }

  if (!map.getLayer(railCasing)) {
    addLayerCompat(map, {
      id: railCasing,
      type: "line",
      source: railSource,
      slot: "top",
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#FFFFFF",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          7, 4.8,
          11, 7.2,
          15, 10.2
        ],
        "line-opacity": 0.96
      }
    });
  }

  if (!map.getLayer(railLine)) {
    addLayerCompat(map, {
      id: railLine,
      type: "line",
      source: railSource,
      slot: "top",
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": [
          "match", ["get", "line_name"],
          "KTM Double Track", "#F59E0B",
          "Express Rail Link", "#7C3AED",
          "KL Monorail", "#EC4899",
          "LRT Gombak Line", "#16A34A",
          "LRT Kelana Jaya Line", "#E11D48",
          "LRT Kelana Jaya Line Extension", "#FB7185",
          "MRT 1 Sungai Buloh–Kajang", "#0EA5E9",
          "MRT 2 Sungai Buloh–Putrajaya", "#EAB308",
          "BRT Sunway", "#14B8A6",
          "Subang Skypark Line", "#D97706",
          "LRT 3 Damansara–Johan Setia", "#8B5CF6",
          "LRT Ampang Line", "#84CC16",
          "#94A3B8"
        ],
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          7, 2.4,
          11, 4.0,
          15, 6.0
        ],
        "line-dasharray": [2.2, 1.35],
        "line-opacity": 1
      }
    });
  }


  // v8.0.4A: dedicated MRT layers.
  // Drawn separately above the general rail layer so both MRT alignments
  // remain clearly visible on every basemap.
  const mrtKajang = `${prefix}rail-mrt-kajang`;
  const mrtPutrajaya = `${prefix}rail-mrt-putrajaya`;

  if (!map.getLayer(mrtKajang)) {
    addLayerCompat(map, {
      id: mrtKajang,
      type: "line",
      source: railSource,
      slot: "top",
      filter: ["==", ["get", "line_name"], "MRT 1 Sungai Buloh–Kajang"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#0EA5E9",
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 2.8, 11, 4.5, 15, 6.4],
        "line-dasharray": [2.2, 1.35],
        "line-opacity": 1
      }
    });
  }

  if (!map.getLayer(mrtPutrajaya)) {
    addLayerCompat(map, {
      id: mrtPutrajaya,
      type: "line",
      source: railSource,
      slot: "top",
      filter: ["==", ["get", "line_name"], "MRT 2 Sungai Buloh–Putrajaya"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#EAB308",
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 2.8, 11, 4.5, 15, 6.4],
        "line-dasharray": [2.2, 1.35],
        "line-opacity": 1
      }
    });
  }


  const railStationSource = `${prefix}rail-stations`;
  const railStationHalo = `${prefix}rail-station-halo`;
  const railStationCircle = `${prefix}rail-station-circle`;
  const railStationLabel = `${prefix}rail-station-label`;

  if (!map.getSource(railStationSource)) {
    map.addSource(railStationSource, {
      type: "geojson",
      data: DATA_URLS.railStations
    });
  }

  const railStationColor = [
    "match", ["get", "line_name"],
    "MRT Kajang Line", "#0EA5E9",
    "MRT Putrajaya Line", "#EAB308",
    "LRT Kelana Jaya Line", "#E11D48",
    "LRT Ampang Line", "#84CC16",
    "LRT Sri Petaling Line", "#16A34A",
    "LRT Shah Alam Line", "#8B5CF6",
    "KTM Port Klang Line", "#F59E0B",
    "KTM Seremban Line", "#D97706",
    "KLIA Transit", "#7C3AED",
    "KLIA Transit / KLIA Ekspres", "#7C3AED",
    "KL Monorail Line", "#EC4899",
    "BRT Sunway Line", "#14B8A6",
    "#64748B"
  ];

  if (!map.getLayer(railStationHalo)) {
    addLayerCompat(map, {
      id: railStationHalo,
      type: "circle",
      source: railStationSource,
      slot: "top",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4.6, 12, 6.8, 16, 8.6],
        "circle-color": "#FFFFFF",
        "circle-opacity": 0.98
      }
    });
  }

  if (!map.getLayer(railStationCircle)) {
    addLayerCompat(map, {
      id: railStationCircle,
      type: "circle",
      source: railStationSource,
      slot: "top",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2.7, 12, 4.2, 16, 5.4],
        "circle-color": railStationColor,
        "circle-stroke-color": "#0F172A",
        "circle-stroke-width": 0.7
      }
    });
  }

  if (!map.getLayer(railStationLabel)) {
    addLayerCompat(map, {
      id: railStationLabel,
      type: "symbol",
      source: railStationSource,
      slot: "top",
      minzoom: 11,
      layout: {
        "text-field": ["get", "station_name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 15, 11],
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-optional": true
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.96)",
        "text-halo-width": 1.5
      }
    });
  }


  const pbtSource = `${prefix}pbt`;
  const pbtLabelSource = `${prefix}pbt-label-source`;
  const pbtFill = `${prefix}pbt-fill`;
  const pbtLine = `${prefix}pbt-line`;
  const pbtLabel = `${prefix}pbt-label`;

  if (!map.getSource(pbtSource)) {
    map.addSource(pbtSource, {
      type: "geojson",
      data: DATA_URLS.pbt,
      promoteId: "OBJECTID"
    });
  }

  if (!map.getSource(pbtLabelSource)) {
    map.addSource(pbtLabelSource, {
      type: "geojson",
      data: DATA_URLS.pbtLabels,
      promoteId: "OBJECTID"
    });
  }

  if (!map.getLayer(pbtFill)) {
    addLayerCompat(map, {
      id: pbtFill,
      type: "fill",
      source: pbtSource,
      slot: "middle",
      paint: {
        "fill-color": [
          "match",
          ["get", "KATEGORI"],
          "MAJLIS BANDARAYA", "#2563EB",
          "MAJLIS PERBANDARAN", "#0EA5E9",
          "MAJLIS DAERAH", "#14B8A6",
          "#3B82F6"
        ],
        "fill-opacity": 0.08
      }
    });
  }

  if (!map.getLayer(pbtLine)) {
    addLayerCompat(map, {
      id: pbtLine,
      type: "line",
      source: pbtSource,
      slot: "top",
      paint: {
        "line-color": "#1D4ED8",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7, 1.4,
          11, 2.4,
          15, 4
        ],
        "line-opacity": 0.95
      }
    });
  }

  if (!map.getLayer(pbtLabel)) {
    addLayerCompat(map, {
      id: pbtLabel,
      type: "symbol",
      source: pbtLabelSource,
      slot: "top",
      minzoom: 8,
      layout: {
        "text-field": ["get", "web_name"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8, 10,
          13, 14
        ],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-optional": true,
        "symbol-placement": "point"
      },
      paint: {
        "text-color": "#DBEAFE",
        "text-halo-color": "rgba(7,17,31,0.96)",
        "text-halo-width": 1.6
      }
    });
  }


  const districtSource = `${prefix}district`;
  const districtLabelSource = `${prefix}district-label-source`;
  const districtFill = `${prefix}district-fill`;
  const districtLine = `${prefix}district-line`;
  const districtLabel = `${prefix}district-label`;

  if (!map.getSource(districtSource)) {
    map.addSource(districtSource, {
      type: "geojson",
      data: DATA_URLS.districts
    });
  }

  if (!map.getSource(districtLabelSource)) {
    map.addSource(districtLabelSource, {
      type: "geojson",
      data: DATA_URLS.districtLabels
    });
  }

  if (!map.getLayer(districtFill)) {
    addLayerCompat(map, {
      id: districtFill,
      type: "fill",
      source: districtSource,
      slot: "middle",
      paint: {
        "fill-color": "#8B5CF6",
        "fill-opacity": 0.045
      }
    });
  }

  if (!map.getLayer(districtLine)) {
    addLayerCompat(map, {
      id: districtLine,
      type: "line",
      source: districtSource,
      slot: "top",
      paint: {
        "line-color": "#A78BFA",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7, 1.8,
          11, 3,
          15, 4.5
        ],
        "line-dasharray": [2, 1.4],
        "line-opacity": 0.95
      }
    });
  }

  if (!map.getLayer(districtLabel)) {
    addLayerCompat(map, {
      id: districtLabel,
      type: "symbol",
      source: districtLabelSource,
      slot: "top",
      minzoom: 7,
      layout: {
        "text-field": ["get", "web_name"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7, 11,
          13, 15
        ],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-optional": true,
        "symbol-placement": "point"
      },
      paint: {
        "text-color": "#EDE9FE",
        "text-halo-color": "rgba(7,17,31,0.96)",
        "text-halo-width": 1.8
      }
    });
  }

  const policeSource = `${prefix}police`;
  const policeSymbol = `${prefix}police-symbol`;
  const policeLabel = `${prefix}police-label`;

  await loadSvgSdf(map, "police-building", DATA_URLS.policeIcon);

  if (!map.getSource(policeSource)) {
    map.addSource(policeSource, {
      type: "geojson",
      data: DATA_URLS.police
    });
  }

  if (!map.getLayer(policeSymbol)) {
    addLayerCompat(map, {
      id: policeSymbol,
      type: "symbol",
      filter: ["==", ["get", "AGENSI"], "PDRM"],
      source: policeSource,
      slot: "top",
      layout: {
        "icon-image": "police-building",
        "icon-size": [
          "match",
          ["get", "KATEGORI"],
          "IPK", 0.56,
          "IPD", 0.46,
          0.42
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      },
      paint: {
        "icon-color": "#2563EB",
        "icon-halo-color": "#FFFFFF",
        "icon-halo-width": 1.5
      }
    });
  }

  if (!map.getLayer(policeLabel)) {
    addLayerCompat(map, {
      id: policeLabel,
      type: "symbol",
      filter: ["==", ["get", "AGENSI"], "PDRM"],
      source: policeSource,
      slot: "top",
      minzoom: 10,
      layout: {
        "text-field": ["get", "NAMA"],
        "text-size": 10,
        "text-offset": [0, 1.35],
        "text-anchor": "top",
        "text-allow-overlap": false
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.95)",
        "text-halo-width": 1.4
      }
    });
  }


  // Balai Bomba & Penyelamat Negeri Selangor (37 BBP)
  const fireSource = `${prefix}fire-stations`;
  const fireHalo = `${prefix}fire-station-halo`;
  const firePoint = `${prefix}fire-station-point`;
  const fireLabel = `${prefix}fire-station-label`;

  if (!map.getSource(fireSource)) {
    map.addSource(fireSource, {
      type: "geojson",
      data: DATA_URLS.fire
    });
  }

  if (!map.getLayer(fireHalo)) {
    addLayerCompat(map, {
      id: fireHalo,
      type: "circle",
      filter: ["==", ["get", "AGENSI"], "JBPM"],
      source: fireSource,
      slot: "top",
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "KATEGORI"], "BBP / Pejabat Zon"], 8.4,
          7.0
        ],
        "circle-color": "#FFFFFF",
        "circle-opacity": 0.98
      }
    });
  }

  if (!map.getLayer(firePoint)) {
    addLayerCompat(map, {
      id: firePoint,
      type: "circle",
      filter: ["==", ["get", "AGENSI"], "JBPM"],
      source: fireSource,
      slot: "top",
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "KATEGORI"], "BBP / Pejabat Zon"], 5.7,
          4.6
        ],
        "circle-color": [
          "case",
          ["==", ["get", "KATEGORI"], "BBP / Pejabat Zon"], "#991B1B",
          "#DC2626"
        ],
        "circle-stroke-color": "#7F1D1D",
        "circle-stroke-width": 1.0
      }
    });
  }

  if (!map.getLayer(fireLabel)) {
    addLayerCompat(map, {
      id: fireLabel,
      type: "symbol",
      filter: ["==", ["get", "AGENSI"], "JBPM"],
      source: fireSource,
      slot: "top",
      minzoom: 10.5,
      layout: {
        "text-field": ["get", "NAMA"],
        "text-size": 10,
        "text-offset": [0, 1.25],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-optional": true
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(127,29,29,0.96)",
        "text-halo-width": 1.5
      }
    });
  }


  // APM — 10 civil defence facilities from the same verified dashboard source.
  const apmSource = `${prefix}civil-defence`;
  const apmPoint = `${prefix}civil-defence-point`;
  const apmLabel = `${prefix}civil-defence-label`;
  if (!map.getSource(apmSource)) map.addSource(apmSource,{type:"geojson",data:DATA_URLS.civilDefence});
  if (!map.getLayer(apmPoint)) addLayerCompat(map,{
    id:apmPoint,type:"circle",source:apmSource,slot:"top",
    filter:["==",["get","AGENSI"],"APM"],
    paint:{"circle-radius":6,"circle-color":"#16A34A","circle-stroke-color":"#FFFFFF","circle-stroke-width":1.5}
  });
  if (!map.getLayer(apmLabel)) addLayerCompat(map,{
    id:apmLabel,type:"symbol",source:apmSource,slot:"top",minzoom:11,
    filter:["==",["get","AGENSI"],"APM"],
    layout:{"text-field":["get","NAMA"],"text-size":10,"text-offset":[0,1.2],"text-anchor":"top","text-optional":true},
    paint:{"text-color":"#FFFFFF","text-halo-color":"#14532D","text-halo-width":1.5}
  });

  const schoolSource = `${prefix}schools`;
  const schoolSymbol = `${prefix}school-symbol`;
  const schoolLabel = `${prefix}school-label`;

  await loadSvgSdf(map, "school-building", DATA_URLS.schoolIcon);

  if (!map.getSource(schoolSource)) {
    map.addSource(schoolSource, { type: "geojson", data: DATA_URLS.schools });
  }

  if (!map.getLayer(schoolSymbol)) {
    addLayerCompat(map, {
      id: schoolSymbol,
      type: "symbol",
      source: schoolSource,
      slot: "top",
      layout: {
        "icon-image": "school-building",
        "icon-size": ["match", ["get", "web_level"],
          "Sekolah Menengah", 0.42,
          "Sekolah Rendah", 0.34,
          "Sekolah Agama", 0.37,
          0.32],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      },
      paint: {
        "icon-color": ["match", ["get", "web_level"],
          "Sekolah Menengah", "#7C3AED",
          "Sekolah Rendah", "#F59E0B",
          "Sekolah Agama", "#D63B48",
          "#64748B"],
        "icon-halo-color": "#FFFFFF",
        "icon-halo-width": 1.3
      }
    });
  }

  if (!map.getLayer(schoolLabel)) {
    addLayerCompat(map, {
      id: schoolLabel,
      type: "symbol",
      source: schoolSource,
      slot: "top",
      minzoom: 12,
      layout: {
        "text-field": ["get", "web_name"],
        "text-size": 9.5,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": false
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.95)",
        "text-halo-width": 1.4
      }
    });
  }

  const trafficSource = `${prefix}traffic-source`;
  const trafficCasing = `${prefix}traffic-casing`;
  const trafficLine = `${prefix}traffic-line`;

  if (!map.getSource(trafficSource)) {
    map.addSource(trafficSource, {
      type: "vector",
      url: "mapbox://mapbox.mapbox-traffic-v1"
    });
  }

  if (!map.getLayer(trafficCasing)) {
    addLayerCompat(map, {
      id: trafficCasing,
      type: "line",
      source: trafficSource,
      "source-layer": "traffic",
      slot: "top",
      minzoom: 7,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "rgba(15,23,42,0.86)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.8, 12, 4.5, 16, 9],
        "line-opacity": 0.78
      }
    });
  }

  if (!map.getLayer(trafficLine)) {
    addLayerCompat(map, {
      id: trafficLine,
      type: "line",
      source: trafficSource,
      "source-layer": "traffic",
      slot: "top",
      minzoom: 7,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": [
          "match",
          ["get", "congestion"],
          "low", "#22C55E",
          "moderate", "#FACC15",
          "heavy", "#F97316",
          "severe", "#DC2626",
          "#94A3B8"
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.1, 12, 3, 16, 6.4],
        "line-opacity": 0.96
      }
    });
  }

  await addCadastralLayer(map, prefix);
  applyLayerVisibility(map, prefix);

  applyLayerRenderOrder(map, prefix);
}


/**
 * Synchronize actual Mapbox draw order with Layer Contents priority.
 * Transport overlay order: Live Traffic < Rail < Rail Stations.
 */
export function applyLayerRenderOrder(map, prefix = "") {
  const moveTop = (id) => {
    if (!map.getLayer(id)) return;
    try { map.moveLayer(id); } catch (_) {}
  };

  // Move from lower to higher display priority.
  moveTop(`${prefix}traffic-casing`);
  moveTop(`${prefix}traffic-line`);
  moveTop(`${prefix}traffic`);

  moveTop(`${prefix}rail-casing`);
  moveTop(`${prefix}rail-line`);
  moveTop(`${prefix}rail-mrt-kajang`);
  moveTop(`${prefix}rail-mrt-putrajaya`);

  moveTop(`${prefix}rail-station-halo`);
  moveTop(`${prefix}rail-station-circle`);
  moveTop(`${prefix}rail-station-label`);

  // Kemudahan masyarakat mesti kekal jelas di atas overlay pengangkutan.
  moveTop(`${prefix}school-symbol`);
  moveTop(`${prefix}school-label`);
  moveTop(`${prefix}health-symbol`);
  moveTop(`${prefix}health-label`);
  moveTop(`${prefix}police-symbol`);
  moveTop(`${prefix}police-label`);
  moveTop(`${prefix}fire-station-halo`);
  moveTop(`${prefix}fire-station-point`);
  moveTop(`${prefix}fire-station-label`);
  moveTop(`${prefix}civil-defence-point`);
  moveTop(`${prefix}civil-defence-label`);
}

export function applyLayerVisibility(map, prefix = "") {
  const items = [
    [`${prefix}city-circle`, layerState.cityHierarchy],
    [`${prefix}city-label`, layerState.cityHierarchy],
    [`${prefix}pbt-fill`, layerState.pbt],
    [`${prefix}pbt-line`, layerState.pbt],
    [`${prefix}pbt-label`, layerState.pbt],
    [`${prefix}district-fill`, layerState.districts],
    [`${prefix}district-line`, layerState.districts],
    [`${prefix}district-label`, layerState.districts],
    [`${prefix}health-symbol`, layerState.healthFacilities],
    [`${prefix}health-label`, layerState.healthFacilities],
    [`${prefix}traffic-casing`, layerState.liveTraffic],
    [`${prefix}traffic-line`, layerState.liveTraffic],
    [`${prefix}civil-defence-point`, layerState.civilDefence],
    [`${prefix}civil-defence-label`, layerState.civilDefence],
    [`${prefix}police-symbol`, layerState.police],
    [`${prefix}police-label`, layerState.police],
    [`${prefix}fire-station-halo`, layerState.fireStations],
    [`${prefix}fire-station-point`, layerState.fireStations],
    [`${prefix}fire-station-label`, layerState.fireStations],
    [`${prefix}school-symbol`, layerState.schools],
    [`${prefix}school-label`, layerState.schools],
    [`${prefix}rail-casing`, layerState.rail],
    [`${prefix}rail-line`, layerState.rail],
    [`${prefix}rail-mrt-kajang`, layerState.rail],
    [`${prefix}rail-mrt-putrajaya`, layerState.rail],
    [`${prefix}rail-station-halo`, layerState.railStations],
    [`${prefix}rail-station-circle`, layerState.railStations],
    [`${prefix}rail-station-label`, layerState.railStations]
  ];

  for (const [id, visible] of items) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }

  applyFacilityFilters(map,prefix);

  setCadastralVisibility(
    map,
    layerState.cadastral,
    prefix
  );

  try {
    map.setConfigProperty("basemap", "show3dObjects", layerState.buildings);
  } catch (_) {}
}

export function enableTerrain(map, sourceId = "terrain-dem") {
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14
    });
  }
  map.setTerrain({ source: sourceId, exaggeration: 1.35 });
}

export function disableTerrain(map) {
  map.setTerrain(null);
}
