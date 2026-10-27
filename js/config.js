export const MAPBOX_TOKEN = "pk.eyJ1IjoiYXBhaTE5ODkiLCJhIjoiY21zODZ2Nzc4MDAzODJ5czk5eDFhOXFpZSJ9.bZ4OwmZqVZKRs_CX3f0tVA";

export const START_VIEW = {
  center: [101.48, 3.18],
  zoom: 10.2,
  pitch: 58,
  bearing: 0
};

export const BASEMAPS = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/satellite-v9",
  hybrid: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
  navigationDay: "mapbox://styles/mapbox/navigation-day-v1",
  navigationNight: "mapbox://styles/mapbox/navigation-night-v1",
  osm: {
    version: 8,
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    sources: {
      osm: {
        type: "raster",
        tiles: [
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm"
      }
    ]
  }
};

export const BASEMAP_LABELS = {
  standard: "Standard",
  satellite: "Satellite",
  hybrid: "Hybrid",
  terrain: "Terrain",
  light: "Light",
  dark: "Dark",
  outdoors: "Outdoors",
  streets: "Streets",
  navigationDay: "Navigation Day",
  navigationNight: "Navigation Night",
  osm: "OpenStreetMap"
};

export const DATA_URLS = {
  cities: "data/hierarki_bandar_selangor_dpn2.geojson",
  urbanConfig: "config/urban-hierarchy.json",
  health: "data/kesihatan/kemudahan_kesihatan_selangor.geojson",
  hospitalIcon: "assets/icons/hospital-building.svg",
  police: "data/keselamatan/kemudahan_keselamatan_dashboard_184.geojson",
  policeIcon: "assets/icons/police-building.svg",
  civilDefence: "data/keselamatan/kemudahan_keselamatan_dashboard_184.geojson",
  fire: "data/keselamatan/kemudahan_keselamatan_dashboard_184.geojson",
  pbt: "data/pentadbiran/sempadan_pbt_selangor_2024.geojson",
  pbtLabels: "data/pentadbiran/label_pbt_selangor_2024.geojson",
  districts: "data/pentadbiran/sempadan_daerah_selangor.geojson",
  districtLabels: "data/pentadbiran/label_daerah_selangor.geojson",
  schools: "data/pendidikan/sekolah_suo_gabungan.geojson",
  schoolIcon: "assets/icons/school-building.svg",
  rail: "data/transport/rail_network_final.geojson",
  railStations: "data/transport/rail_stations_final.geojson"
};
