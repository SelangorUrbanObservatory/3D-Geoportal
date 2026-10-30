# P3 Lot Kadaster dan Guna Tanah — Audit & Architecture
Tarikh: 30 Oktober 2026. Status: front-end integration foundation, no actual parcel or spatial land-use data.

## Current SUO GeoPortal audit
1. Lot Kadaster 2023: cadastral layer config has enabled=false, empty tiles and URL; source-layer NDCDB_SELANGOR. Panel HTML lists 1,350,128 lots, but no active datasource exists to substantiate a P3 calculation.
2. Land Use 2024: config/landuse-intelligence.json contains statewide area totals, built-up/non-built-up summary and dominant category only. There is NO land-use polygon GeoJSON/vector source in the current app, so no land-use spatial intersection can be calculated.
3. P3 service area: existing Mapbox isochrone geometry in EPSG:4326 is a suitable query geometry for a future dedicated backend.

## Recommended production architecture
A. Data governance / ingest:
- Original approved JUPEM cadastral polygons and detailed land-use polygons remain in SUO secure enterprise storage, not in public GitHub Pages.
- Register provenance, year, agency, permissions, unique parcel_key / approved UPI, source coordinate system and changes over time.
- Validate and repair geometry at ingest, normalize GDM2000/Cassini (if the supplied source is in that CRS) to WGS84 canonical geometry and calculate geodesic hectares.
- Create GiST geometry indexes and B-tree unique parcel keys. Keep confidential title/owner identifiers out of public tiles/API output.

B. Visualization:
- Vector tiles (MVT / XYZ or Mapbox Tileset) drive Mapbox GL JS at relevant zooms. Simplified geometry and minimal approved public properties only.
- Current js/cadastral.js already supports mapboxTileset/vectorTiles/geojson modes. Prefer real vector tiles for roughly 1.35 million parcels, NOT a statewide browser GeoJSON file.
- queryRenderedFeatures/querySourceFeatures only inspect loaded and sometimes clipped or duplicate tile features. Never use them as authoritative full-polygon counts or area totals.

C. Analyses:
- Secure PostGIS API receives a Mapbox isochrone Polygon/MultiPolygon, computes unique parcel intersections, partial-vs-full intersection, intersection area in hectares and land-use category area shares.
- Group parcels by stable parcel_key or vetted UPI. Use positive intersection area to avoid counting boundary-only touches.
- Use ST_Intersects for indexed candidate selection, ST_Intersection for true clipped area, ST_Area(geography) for geodesic m2, divide by 10000 for ha.
- Land use is a distinct polygon dataset. A cadastral KOD_KEGUNA attribute is NOT automatically verified current land-use or zoning.
- Validate that land-use categories are topologically mutually exclusive, or resolve overlaps before category aggregation; account for unclassified areas explicitly.
- Distinguish source years: cadastral 2023 vs land use 2024.

## Suggested canonical tables
- suo_cadastre.parcels_2023(parcel_key PRIMARY KEY, upi, lot, district, mukim, geom geometry(MultiPolygon,4326), source_year, updated_at)
- suo_landuse.landuse_2024(landuse_id PRIMARY KEY, category_code, category_name, geom geometry(MultiPolygon,4326), source_year, updated_at)

Spatial indexes:
    CREATE INDEX parcels_2023_geom_gix ON suo_cadastre.parcels_2023 USING GIST(geom);
    CREATE INDEX landuse_2024_geom_gix ON suo_landuse.landuse_2024 USING GIST(geom);

Illustrative parcel intersection (requires valid canonical polygons and deduplicated parcel rows):
    WITH area AS (
      SELECT ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326) AS geom
    ), hits AS (
      SELECT p.parcel_key,
             ST_Area(ST_Intersection(p.geom, a.geom)::geography)/10000.0 AS clipped_ha,
             ST_Area(p.geom::geography)/10000.0 AS parcel_ha
      FROM suo_cadastre.parcels_2023 p CROSS JOIN area a
      WHERE p.geom && a.geom AND ST_Intersects(p.geom,a.geom)
    )
    SELECT COUNT(DISTINCT parcel_key) FILTER (WHERE clipped_ha > 0) AS parcel_count,
           COUNT(DISTINCT parcel_key) FILTER (
             WHERE clipped_ha > 0 AND clipped_ha < parcel_ha - 0.000001
           ) AS partial_parcel_count,
           COALESCE(SUM(clipped_ha) FILTER (WHERE clipped_ha > 0),0) AS intersected_area_ha
    FROM hits;

For land-use categories, group ST_Area(ST_Intersection(l.geom,a.geom)::geography)/10000 by category_name after validating topology.

## Front-end configuration & API contract
- config/planning-spatial-integration.json defaults fail-closed: analysisApi.enabled=false, cadastral.queryEnabled=false, landUse.queryEnabled=false.
- The existing config/cadastral-layer.json separately gates LOT VISUALIZATION. A configured vector tile does NOT mean complete statistical polygons are available.
- API endpoint recommended behind authenticated SUO reverse proxy: /api/v1/planning/spatial-summary. Host API on SUO infrastructure; GitHub Pages cannot execute PostGIS queries.
- Request JSON keys: version=1.0, spatialReference=EPSG:4326, source=SUO-P3, requested array of cadastral/landUse, geometry GeoJSON Polygon/MultiPolygon.
- Cadastral response: sourceYear, parcelCount, partialParcelCount, intersectedAreaHa.
- Land Use response: sourceYear, totalAreaHa, categories array of {label, areaHa}. These are expected fields; no numeric data is populated until source-backed API is available.
- The browser validates response type/number, displays sourceYear sent by API and warns if it differs from configured dataset year.
- Do NOT hardcode API keys or DB credentials in frontend. Protect CORS origins, access permissions, rate-limit, request vertex/area bounds, and log audit trace.
- Return aggregated data only for general roles, and restrict feature-level record access under JUPEM/agency licensing.
- If query is still disabled/unavailable, keep action disabled and show reason. No invented lot counts.

## Work packages
P3.4-A: verify source metadata, JUPEM data rights, geometry/CRS/UPI and real parcel samples; implement & activate cadastral vector tiles for approved user roles.
P3.4-B: implement authenticated PostGIS parcel summary API and verify intersection counts/areas against GIS desktop benchmarks on one selected PBT.
P3.4-C: onboard validated 2024 land-use polygon data; run clipped category area analytics; compare against published statewide/PBT land-use statistics.
P3.4-D: add parcel–land-use cross-matrix, category filters, and time comparison only after API and topology QA.

## Sources
Mapbox recommended vector tile performance: https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/
Mapbox queryRenderedFeatures only shows map features: https://docs.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/
PostGIS spatial index: https://postgis.net/documentation/faq/spatial-indexes/
PostGIS SQL spatial queries: https://postgis.net/docs/using_postgis_query.html

## QA status
Frontend readiness and schema validation tested in code. End-to-end PostGIS, actual cadastral tiles, land-use polygons, licensing and live browser/mobile tests remain NOT complete.
