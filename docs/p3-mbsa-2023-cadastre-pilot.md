# P3 MBSA 2023 Cadastre — internal pilot onboarding

**Status as of 30 October 2026:** data source was reviewed privately, a de-identified-attribute GeoPackage staging file was prepared, and a server-side PostGIS import/query template is available. **No cadastral geometry or UPI data was published into GitHub**.

## Dataset readiness
- Original source: NDCDB MBSA 2023 ESRI Shapefile in EPSG:3380 (GDM2000 / Selangor Cassini), 3D polygon geometry.
- 150,627 source features; 150,559 distinct UPI.
- 68 duplicated UPI pairs (136 rows); 62 groups have overlapping positive-area geometry. Each duplicate group was unioned into one valid, unique-UPI planning polygon.
- All 150,627 original geometries were valid; all 150,559 staging geometries are valid.
- Native geometry area after UPI union: approximately 19,344.534 ha; this is not MBSA administrative area and is not a measure of MBSA completeness.
- 86,879 source records (~57.7%) have no `KOD_KEGUNA`; do not use that field as a substitute for actual 2024 spatial land-use or zoning data.
- Source contains owner-name and owner-address fields: those were **not included** in the staging output.
- Source `TARIKH_KEM` range contains dates through June 2023, while file metadata reports DBF edit date February 2024. Treat source year / validity separately from filesystem timestamp.

## Staging prepared outside GitHub
- `MBSA_2023_P3_RESTRICTED.gpkg`, layer `mbsa_parcels_upi_unique`, EPSG:3380, 150,559 features; has approved-planning *candidate* fields (UPI, lot number, administrative codes, geometry area, source year, quality marker).
- This staging is **not automatically licensed for public distribution** merely because owner attributes were removed. Keep on a role-restricted SUO server and confirm JUPEM/data-provider access controls.
- Raw owner attributes, original ZIP, and staging GeoPackage must never be committed into the public portal repository.

## Steps to complete P3 lot analysis
1. Verify dataset licence, publication rights, parcel UPI mapping and geometry alignment with official MBSA boundary.
2. Import private staging with a trusted GDAL/ogr2ogr worker from EPSG:3380 into PostGIS EPSG:4326. Sample SQL and commands: `scripts/p3_mbsa_cadastre_postgis.sql`.
3. Confirm `COUNT(*)=150559`, all `UPI` are unique, CRS 4326, geometries valid, GiST spatial index present and suitable query plan used.
4. Implement restricted `POST /api/v1/planning/spatial-summary` backend against the imported parcels. Request only approved, validated P3 isochrone polygons and return aggregated unique parcel count, partial count, clipped intersection area and dataset source year.
5. Test against QGIS/ArcGIS Pro on sample isochrones. Beware source lot shapes cover parcels, **not** MBSA territory continuously. Geometry position and polygon overlap QA required.
6. Activate `analysisApi.enabled` and `cadastral.queryEnabled` in `config/planning-spatial-integration.json` **only** after verified API deploy and permission controls.
7. Publish generalized lot vector tiles from a separately approved minimal-attribute tileset only if licence explicitly permits it; then configure `config/cadastral-layer.json`, sourceLayer and zoom ranges. Rendering uses tiles; statistics always use PostGIS.

## Land use — separate next dataset
Cadastre `KOD_KEGUNA` is incomplete and not equal to official spatial land-use 2024. Obtain category polygon geometry + metadata, normalize CRS, QA topology, then index and spatially intersect with P3 isochrones. Do not infer land-use area from counts of parcel records.

## Safety / scope
This repository contains **no cadastral data files** from the upload. The new staging is accessible only through the private conversation download link. Production database/tiles/API are not currently deployed. Existing P1/P2/P3 functionality is unchanged.
