-- Internal P3 MBSA cadastral pilot. Run only after licensed source is imported securely.
-- The repo DOES NOT contain cadastral geometries, owner names, lot titles or UPI values.
-- Staging GPKG layer: mbsa_parcels_upi_unique; native source CRS EPSG:3380.
-- Example GDAL import on authorized SUO server (never check passwords into git):
-- CREATE SCHEMA IF NOT EXISTS suo_cadastre;
-- ogr2ogr -f PostgreSQL 'PG:host=SUO_DB dbname=SUO user=APPROVED_INGEST_ROLE' \
--   MBSA_2023_P3_RESTRICTED.gpkg mbsa_parcels_upi_unique \
--   -nln suo_cadastre.mbsa_parcels_2023 -nlt PROMOTE_TO_MULTI \
--   -t_srs EPSG:4326 -lco GEOMETRY_NAME=geom -overwrite

CREATE INDEX IF NOT EXISTS mbsa_parcels_2023_geom_gix
  ON suo_cadastre.mbsa_parcels_2023 USING GIST (geom);
CREATE UNIQUE INDEX IF NOT EXISTS mbsa_parcels_2023_upi_uniq
  ON suo_cadastre.mbsa_parcels_2023 (upi);
ANALYZE suo_cadastre.mbsa_parcels_2023;

-- Validated server-side geometry input (EPSG:4326) from a single P3 isochrone.
-- Bind the GeoJSON geometry parameter, and enforce request size, vertices and role limits.
WITH area AS (
  SELECT ST_SetSRID(ST_GeomFromGeoJSON(:isochrone_geometry),4326) geom
), hits AS (
  SELECT p.upi,
    ST_Area(ST_Intersection(p.geom,a.geom)::geography)/10000.0 clip_ha,
    ST_Area(p.geom::geography)/10000.0 parcel_ha
  FROM suo_cadastre.mbsa_parcels_2023 p
  JOIN area a ON p.geom && a.geom AND ST_Intersects(p.geom,a.geom)
)
SELECT COUNT(*) FILTER (WHERE clip_ha>0) parcel_count,
  COUNT(*) FILTER (WHERE clip_ha>0 AND clip_ha<parcel_ha-0.000001) partial_parcel_count,
  COALESCE(SUM(clip_ha) FILTER (WHERE clip_ha>0),0) intersected_area_ha
FROM hits;
